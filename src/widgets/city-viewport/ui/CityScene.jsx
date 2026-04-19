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

    // Clean deep-space gradient — no magenta, no per-fragment noise.
    // Just a smooth zenith-to-horizon falloff; the drei <Stars> field handles
    // visual interest layered above this.
    const material = useMemo(() => new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        depthTest: false,
        fog: false,
        uniforms: {
            uZenith:  { value: new THREE.Color('#02030a') },
            uHorizon: { value: new THREE.Color('#070b18') },
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
            uniform vec3 uHorizon;
            varying vec3 vPos;
            void main() {
                float h = vPos.y;
                float t = smoothstep(-0.2, 0.6, h);
                gl_FragColor = vec4(mix(uHorizon, uZenith, t), 1.0);
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
                count={2000}
                factor={5}
                saturation={0.5}
                fade
                speed={0.2}
            />

            <fog attach="fog" args={['#040810', Math.max(cityRadius * 2.5, 2500), Math.max(cityRadius * 10, 50000)]} />
            <CameraController />
        </group>
    )
})

export default CityScene
