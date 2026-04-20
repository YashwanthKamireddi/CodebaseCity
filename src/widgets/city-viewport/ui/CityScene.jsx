import React, { useMemo, useEffect, useRef } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import { Stars } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
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
            uZenith:  { value: new THREE.Color('#02030c') },  // deep void
            uMid:     { value: new THREE.Color('#070a1e') },  // midnight navy
            uHorizon: { value: new THREE.Color('#0d1530') },  // muted sea-of-blue
            uBelow:   { value: new THREE.Color('#010207') },
            uNebula:  { value: new THREE.Color('#4a2a85') },
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

                // Very soft violet nebula wash — painted into the upper dome,
                // slight horizontal asymmetry for a real-sky feel.
                float nebula = smoothstep(0.2, 0.7, h) *
                               smoothstep(1.0, 0.55, h) *
                               (0.45 + 0.55 * vPos.x);
                color += uNebula * nebula * 0.12;

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
 */
const CityScene = React.memo(function CityScene() {
    const cityData = useStore(s => s.cityData)
    const clearSelection = useStore(s => s.clearSelection)
    const showRoads = useStore(s => s.showRoads)

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
            <ShaderWarmup />
            <CameraFloorGuard />

            {/* All materials are MeshBasicMaterial or custom ShaderMaterial — no lit materials exist.
                Lights removed: they had zero visual effect but cost renderer overhead. */}

            <group onPointerMissed={clearSelection}>
                <InstancedCity />
                {showRoads && <Roads />}
                <Ground />
                <HologramPanel />
                <LandmarkPanel />
                <DistrictLabels />
                <StreetLamps />
                <DataStreams />
                <AtmosphericParticles
                    count={Math.min(180, Math.max(40, Math.floor(Math.sqrt(buildingCount || 1) * 4)))}
                    spread={cityRadius * 1.5}
                />
                <EnergyCoreReactor />
                <MothershipCore />
                <HolographicCityName />
                <HeroLandmarks buildings={cityData?.buildings} />

                {/* ── Gamified Interactive Avatar ── */}
                <UfoAvatar />
            </group>

            {/* Stunning gradient nebula backdrop + dense starfield */}
            <NebulaSky />
            {/* Tri-layer starfield — dense cosmic dust + mid-field + close
                bright stars. Three <Stars> still cost ~3 draw calls total and
                give a real sense of cosmic depth when the camera moves. */}
            <Stars
                radius={Math.max(cityRadius * 18, 8000)}
                depth={Math.max(cityRadius * 10, 4000)}
                count={7500}
                factor={8}
                saturation={0.2}
                fade
                speed={0.1}
            />
            <Stars
                radius={Math.max(cityRadius * 10, 4500)}
                depth={Math.max(cityRadius * 5, 2200)}
                count={2500}
                factor={5}
                saturation={0.55}
                fade
                speed={0.25}
            />
            <Stars
                radius={Math.max(cityRadius * 5, 2200)}
                depth={Math.max(cityRadius * 2.5, 1100)}
                count={600}
                factor={3.5}
                saturation={0.95}
                fade
                speed={0.55}
            />

            <fog attach="fog" args={['#060918', Math.max(cityRadius * 2.5, 2500), Math.max(cityRadius * 10, 50000)]} />
            <CameraController />
        </group>
    )
})

export default CityScene
