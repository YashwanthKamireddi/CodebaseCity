import React, { useMemo, useLayoutEffect, useRef } from 'react'
import { ContactShadows, Environment } from '@react-three/drei'
import { useFrame, invalidate } from '@react-three/fiber'
import gsap from 'gsap'
import useStore from '../../../store/useStore'
import AvatarSprites from '../../../features/timeline/ui/AvatarSprites'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import InstancedTrace from './InstancedTrace'
import CameraController from './CameraController'
import Ground from './Ground'
import BlastRadius from './BlastRadius'
import FaultLine from './FaultLine'
import TrafficLayer from './layers/TrafficLayer'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

/**
 * AutoInvalidate — Keeps the render loop alive when autoRotate is active.
 * Without this, frameloop="demand" causes the landing page to freeze
 * because OrbitControls autoRotate mutates the camera but nothing calls invalidate().
 */
function AutoInvalidate() {
    const { cityData, selectedBuilding } = useStore()
    const shouldAutoRotate = !cityData || !selectedBuilding

    useFrame(() => {
        if (shouldAutoRotate) {
            invalidate()
        }
    })

    return null
}

/**
 * CityScene - Premium Cinematic City Environment
 *
 * Lighting design inspired by:
 * - Roger Deakins cinematography (Blade Runner 2049)
 * - Apple product renders
 * - Unreal Engine 5 Lumen
 */
export default function CityScene() {
    const { cityData } = useStore()
    const groupRef = useRef()

    // Dynamic fog: compute bounds from buildings
    const cityRadius = useMemo(() => {
        if (!cityData?.buildings?.length) return 100
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(100, maxR + 50)
    }, [cityData])

    return (
        <group>
            {/* ═══════════════════════════════════════════════════════════════
                CINEMATIC LIGHTING SETUP
                Three-point lighting with atmospheric enhancement
            ═══════════════════════════════════════════════════════════════ */}

            {/* Ambient base - very subtle, prevents pure black shadows */}
            <ambientLight intensity={0.25} color="#1a1a2e" />

            {/* Hemisphere - creates natural sky/ground gradient */}
            <hemisphereLight
                color="#1e3a5f"        // Cool sky blue
                groundColor="#0a0a12"  // Dark ground
                intensity={0.5}
            />

            {/* KEY LIGHT - Main directional (moonlight/citylight feel) */}
            <directionalLight
                position={[80, 120, 60]}
                intensity={1.8}
                color="#e0f0ff"
                castShadow
                shadow-mapSize={[2048, 2048]}
                shadow-camera-far={600}
                shadow-camera-left={-250}
                shadow-camera-right={250}
                shadow-camera-top={250}
                shadow-camera-bottom={-250}
                shadow-bias={-0.0001}
                shadow-normalBias={0.02}
            />

            {/* FILL LIGHT - Softer, warmer, from opposite side */}
            <directionalLight
                position={[-100, 80, -80]}
                intensity={0.6}
                color="#ffd4a0"        // Warm amber (city glow bounce)
            />

            {/* RIM LIGHT - Back lighting for depth separation */}
            <directionalLight
                position={[0, 50, -150]}
                intensity={0.5}
                color="#ffffff"        // Cyan accent (neon signs feel)
            />

            {/* ACCENT LIGHT - Top-down for roof definition */}
            <directionalLight
                position={[0, 200, 0]}
                intensity={0.2}
                color="#ffffff"
            />

            {/* POINT LIGHTS - City atmosphere (distant building glow) */}
            <pointLight
                position={[150, 30, 100]}
                intensity={0.8}
                color="#ff6b35"        // Orange (warm building interior)
                distance={200}
                decay={2}
            />
            <pointLight
                position={[-120, 25, -80]}
                intensity={0.6}
                color="#00ff88"        // Green (neon accent)
                distance={150}
                decay={2}
            />
            <pointLight
                position={[80, 20, -120]}
                intensity={0.5}
                color="#ff00ff"        // Magenta (cyberpunk accent)
                distance={120}
                decay={2}
            />

            {/* ═══════════════════════════════════════════════════════════════
                CITY CONTENT
            ═══════════════════════════════════════════════════════════════ */}
            <group ref={groupRef} position={[0, 0, 0]}>
                <InstancedCity />
                <InstancedTrace />

                {/* Gource Mode: Social Avatars */}
                <AvatarSprites />

                <BlastRadius />
                <FaultLine />
                <Roads />
                <TrafficLayer />
                <Ground />
            </group>

            {/* ═══════════════════════════════════════════════════════════════
                SHADOWS & ATMOSPHERE
            ═══════════════════════════════════════════════════════════════ */}

            {/* Soft contact shadows for grounding (512 is sufficient at city scale) */}
            <ContactShadows
                position={[0, 0.01, 0]}
                resolution={512}
                scale={400}
                blur={3}
                opacity={0.35}
                far={15}
                color="#000010"
            />

            {/* Atmospheric fog - creates depth and mood */}
            <fog attach="fog" args={['#050810', cityRadius * 0.3, cityRadius * 3]} />

            {/* Background color - deep space blue */}
            <color attach="background" args={['#030508']} />

            {/* Bloom Post Processing for Visually Stunning Atmosphere */}
            <EffectComposer disableNormalPass>
                <Bloom
                    luminanceThreshold={0.5}
                    mipmapBlur
                    luminanceSmoothing={0.4}
                    intensity={cityData ? 1.5 : 0.4} // Throttle bloom heavily on the landing screen demo city
                />
            </EffectComposer>

            <CameraController />
            <AutoInvalidate />
        </group>
    )
}
