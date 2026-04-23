import React, { useMemo, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import { detectDeviceTier } from '../../../shared/perf/deviceTier'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import CameraController from './CameraController'
import Ground from './Ground'
import HologramPanel from './HologramPanel'
import MothershipCore from './MothershipCore'
import HolographicCityName from './HolographicCityName'
import EnergyCoreReactor from './EnergyCoreReactor'
import HeroLandmarks from './HeroLandmarks'
import LandmarkPanel from './LandmarkPanel'
import DistrictLabels from './DistrictLabels'
import StreetLamps from './StreetLamps'
import DataStreams from './DataStreams'
import AtmosphericParticles from './AtmosphericParticles'
import DistrictFloors from './DistrictFloors'

import UfoAvatar from './UfoAvatar'

/**
 * NebulaSky — camera-locked inverted sphere painted with a gradient + nebula
 * shader. Depth test disabled so it always paints before everything else,
 * regardless of logarithmicDepthBuffer or far-plane scaling.
 */
function NebulaSky() {
    const meshRef = useRef()

    // Lock to camera so we never fall outside the sky sphere.
    useFrame(({ camera }) => {
        if (meshRef.current) meshRef.current.position.copy(camera.position)
    })

    // Deep-space sky — single smooth gradient with a faint violet wash.
    // Previous version had a bright saturated "horizon band" (#3a6bc5)
    // that dominated the whole view when the camera was level; that's
    // what read as "just blue" and stripey. One continuous smoothstep
    // fixes both the banding and the hot-blue band.
    const material = useMemo(() => new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: {
            // Magical twilight sky — never reads as pure black. Every stop
            // has real hue so the sphere feels alive even at the zenith.
            uZenith:  { value: new THREE.Color('#1a2150') },  // deep twilight indigo
            uMid:     { value: new THREE.Color('#253373') },  // rich royal navy
            uHorizon: { value: new THREE.Color('#456abe') },  // soft hero blue
            uBelow:   { value: new THREE.Color('#0d1230') },  // barely-navy void
            uNebula:  { value: new THREE.Color('#9055e8') },  // luminous violet wash
        },
        vertexShader: `
            varying vec3 vPos;
            void main() {
                vPos = normalize(position);
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: `
            uniform vec3 uZenith;
            uniform vec3 uMid;
            uniform vec3 uHorizon;
            uniform vec3 uBelow;
            uniform vec3 uNebula;
            varying vec3 vPos;
            void main() {
                float h = vPos.y; // -1 below, 0 horizon, 1 zenith
                vec3 color;
                // Single wide smoothstep from horizon through mid to zenith
                // means no visible banding between colors.
                if (h >= 0.0) {
                    float tMid = smoothstep(0.0, 0.35, h);
                    float tZen = smoothstep(0.35, 1.0, h);
                    color = mix(mix(uHorizon, uMid, tMid), uZenith, tZen);
                } else {
                    color = mix(uHorizon, uBelow, smoothstep(0.0, -0.35, h));
                }

                // Luminous nebula wash — two overlapping blobs biased to
                // opposite sides of the dome. Asymmetric like a real
                // night sky, soft enough to never fight the buildings.
                float nebulaA = smoothstep(0.1, 0.65, h) *
                                smoothstep(1.0, 0.55, h) *
                                (0.55 + 0.45 * vPos.x);
                float nebulaB = smoothstep(0.2, 0.8, h) *
                                smoothstep(1.0, 0.7, h) *
                                (0.55 - 0.45 * vPos.z);
                color += uNebula * (nebulaA * 0.28 + nebulaB * 0.18);

                // Cool-blue horizon bloom — atmospheric glow effect.
                float bloom = smoothstep(-0.08, 0.06, h) * smoothstep(0.28, 0.08, h);
                color += vec3(0.22, 0.34, 0.62) * bloom * 0.65;

                // Upper-sky warm highlight band — subtle, gives depth
                // so the zenith never reads as flat.
                float upper = smoothstep(0.55, 0.9, h);
                color += vec3(0.08, 0.06, 0.14) * upper;

                gl_FragColor = vec4(color, 1.0);
            }
        `,
    }), [])

    return (
        <mesh ref={meshRef} frustumCulled={false} renderOrder={-1000}>
            <sphereGeometry args={[500, 32, 16]} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

/**
 * AnimationPump — In frameloop="demand" mode, periodically invalidates
 * to drive shader-time uniforms and subtle rotations. Runs at a low 10fps
 * idle rate since decorative animations are slow/subtle. Camera controls
 * handle high-fps invalidation during user interaction independently.
 */
function AnimationPump() {
    const invalidate = useThree(s => s.invalidate)
    const lastRef = useRef(0)
    useEffect(() => {
        let raf
        const tick = (t) => {
            if (t - lastRef.current >= 200) {
                lastRef.current = t
                invalidate()
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [invalidate])
    return null
}

/**
 * CameraFloorGuard — keeps the camera + orbit target above the ground plane.
 * Runs in useFrame so it catches pan, dolly, and rotate transitions equally.
 */
function CameraFloorGuard({ floorY = 3, targetFloorY = 6 }) {
    useFrame(({ camera, controls }) => {
        if (camera.position.y < floorY) camera.position.y = floorY
        if (controls?.target && controls.target.y < targetFloorY) {
            controls.target.y = targetFloorY
        }
    })
    return null
}

/**
 * ShaderWarmup — forces every material in the scene to compile its GPU program
 * on the very first render, so the user never sees the one-frame hitch when a
 * new shader first rolls into view. Runs once per cityData change, cheap (<16ms
 * on mid-range hardware) because Three.js just does a gl.compile pass.
 */
function ShaderWarmup() {
    const { gl, scene, camera } = useThree()
    const cityData = useStore(s => s.cityData)
    useEffect(() => {
        if (!cityData?.buildings?.length) return
        // Defer one tick so the new meshes are actually in the scene graph.
        const raf = requestAnimationFrame(() => {
            try {
                gl.compile(scene, camera)
            } catch {
                // gl.compile is best-effort; never fatal
            }
        })
        return () => cancelAnimationFrame(raf)
    }, [cityData, gl, scene, camera])
    return null
}

function ScreenshotHandler() {
    const { gl, scene, camera } = useThree()
    const screenshotRequest = useStore(s => s.screenshotRequest)

    useEffect(() => {
        if (!screenshotRequest) return

        // Force synchronous render to ensure buffer is full even with preserveDrawingBuffer=false
        gl.render(scene, camera)

        const dataUrl = gl.domElement.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `codebase-city-snapshot-${Date.now()}.png`
        link.href = dataUrl
        link.click()
    }, [screenshotRequest, gl, scene, camera])

    return null
}


/**
 * CityScene - Premium Cinematic City Environment
 *
 * Tier-aware: on low-tier devices (≤2 GB RAM, ≤2 cores, or weak GPU) we
 * drop the decoration layer entirely, pick a 1-layer starfield, and skip
 * the shader-warmup pass. On mid-tier, decorations are trimmed. On high
 * tier, full fidelity.
 */
const CityScene = React.memo(function CityScene() {
    const cityData = useStore(s => s.cityData)
    const clearSelection = useStore(s => s.clearSelection)
    const showRoads = useStore(s => s.showRoads)
    const tier = useMemo(() => detectDeviceTier(), [])
    const low = tier.tier === 'low'
    const high = tier.tier === 'high'

    const buildingCount = cityData?.buildings?.length || 0

    const cityRadius = useMemo(() => {
        if (!buildingCount) return 100
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(100, maxR + 50)
    }, [cityData, buildingCount])

    return (
        <group>
            <AnimationPump />
            <ScreenshotHandler />
            {/* Shader warmup is expensive on low-tier GPUs (forces compile of
                EVERY material at once); skip it and let shaders compile on
                first use instead. */}
            {!low && <ShaderWarmup />}
            <CameraFloorGuard />

            <group onPointerMissed={clearSelection}>
                <InstancedCity />
                {showRoads && <Roads />}
                <Ground />
                {!low && <DistrictFloors />}
                <HologramPanel />
                <LandmarkPanel />
                {/* Always-kept core — affordable everywhere */}
                <EnergyCoreReactor />
                <MothershipCore />
                <HolographicCityName />
                <UfoAvatar />

                {/* Mid/high-tier decorations */}
                {!low && <DistrictLabels />}
                {!low && <StreetLamps />}
                {!low && <HeroLandmarks buildings={cityData?.buildings} />}

                {/* High-tier-only decorations */}
                {high && <DataStreams />}
                {high && (
                    <AtmosphericParticles
                        count={Math.min(180, Math.max(40, Math.floor(Math.sqrt(buildingCount || 1) * 4)))}
                        spread={cityRadius * 1.5}
                    />
                )}
            </group>

            <NebulaSky />
            {/* Starfield: 1 layer low, 2 layers mid, 3 layers high */}
            {low ? (
                <Stars
                    radius={Math.max(cityRadius * 8, 3500)}
                    depth={Math.max(cityRadius * 4, 1800)}
                    count={800}
                    factor={5}
                    saturation={0.5}
                    fade
                    speed={0.2}
                />
            ) : (
                <>
                    <Stars
                        radius={Math.max(cityRadius * 18, 8000)}
                        depth={Math.max(cityRadius * 10, 4000)}
                        count={high ? 7500 : 3500}
                        factor={8}
                        saturation={0.2}
                        fade
                        speed={0.1}
                    />
                    <Stars
                        radius={Math.max(cityRadius * 10, 4500)}
                        depth={Math.max(cityRadius * 5, 2200)}
                        count={high ? 2500 : 1200}
                        factor={5}
                        saturation={0.55}
                        fade
                        speed={0.25}
                    />
                    {high && (
                        <Stars
                            radius={Math.max(cityRadius * 5, 2200)}
                            depth={Math.max(cityRadius * 2.5, 1100)}
                            count={600}
                            factor={3.5}
                            saturation={0.95}
                            fade
                            speed={0.55}
                        />
                    )}
                </>
            )}

            <fog attach="fog" args={['#1a2658', Math.max(cityRadius * 2.5, 2500), Math.max(cityRadius * 10, 50000)]} />
            <CameraController />
        </group>
    )
})

export default CityScene
