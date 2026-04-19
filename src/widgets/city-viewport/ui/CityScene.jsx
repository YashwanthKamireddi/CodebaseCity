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

    // World-class deep-space sky — cool 4-stop gradient with a soft
    // starlit horizon glow. No magenta, no noise, no banding — just a
    // rich, readable backdrop that makes the city pop.
    //
    //   zenith (#04071a)   — near-black indigo at the top of the dome
    //   upper  (#0a1440)   — saturated navy for the upper atmosphere
    //   mid    (#152d6e)   — vivid cobalt at roughly eye level
    //   horizon(#3a5fb5)   — cool blue glow where the ground meets sky
    //   below  (#020409)   — deep void under the horizon so the ground
    //                        silhouette is never washed out
    const material = useMemo(() => new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: {
            uZenith:  { value: new THREE.Color('#04071a') },
            uUpper:   { value: new THREE.Color('#0a1440') },
            uMid:     { value: new THREE.Color('#152d6e') },
            uHorizon: { value: new THREE.Color('#3a5fb5') },
            uBelow:   { value: new THREE.Color('#020409') },
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
            uniform vec3 uUpper;
            uniform vec3 uMid;
            uniform vec3 uHorizon;
            uniform vec3 uBelow;
            varying vec3 vPos;
            void main() {
                float h = vPos.y; // -1 below, 0 horizon, 1 zenith
                vec3 color;
                if (h > 0.45) {
                    color = mix(uUpper, uZenith, smoothstep(0.45, 1.0, h));
                } else if (h > 0.12) {
                    color = mix(uMid, uUpper, smoothstep(0.12, 0.45, h));
                } else if (h > -0.02) {
                    color = mix(uHorizon, uMid, smoothstep(-0.02, 0.12, h));
                } else {
                    color = mix(uBelow, uHorizon, smoothstep(-0.4, -0.02, h));
                }
                // Faint horizon bloom band (cool blue) — gives the sky depth
                // without the buggy magenta we had before.
                float bloom = smoothstep(-0.05, 0.02, h) * smoothstep(0.14, 0.06, h);
                color += vec3(0.08, 0.18, 0.35) * bloom;
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
function CameraFloorGuard({ floorY = 2, targetFloorY = 4 }) {
    useFrame(({ camera, controls }) => {
        if (camera.position.y < floorY) camera.position.y = floorY
        if (controls?.target && controls.target.y < targetFloorY) {
            controls.target.y = targetFloorY
        }
    })
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
                <AtmosphericParticles count={100} spread={cityRadius * 1.5} />
                <EnergyCoreReactor />
                <MothershipCore />
                <HolographicCityName />
                <HeroLandmarks buildings={cityData?.buildings} />

                {/* ── Gamified Interactive Avatar ── */}
                <UfoAvatar />
            </group>

            {/* Stunning gradient nebula backdrop + dense starfield */}
            <NebulaSky />
            <Stars
                radius={Math.max(cityRadius * 10, 4000)}
                depth={Math.max(cityRadius * 5, 2000)}
                count={3500}
                factor={6}
                saturation={0.7}
                fade
                speed={0.25}
            />

            <fog attach="fog" args={['#0f2040', Math.max(cityRadius * 2.5, 2500), Math.max(cityRadius * 10, 50000)]} />
            <CameraController />
        </group>
    )
})

export default CityScene
