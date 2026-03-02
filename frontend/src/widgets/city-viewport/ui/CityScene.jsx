import React, { useMemo, useLayoutEffect, useRef } from 'react'
import { ContactShadows, Environment } from '@react-three/drei'
import gsap from 'gsap'
import useStore from '../../../store/useStore'
import AvatarSprites from '../../../features/timeline/ui/AvatarSprites'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import InstancedTrace from './InstancedTrace'
import HolographicXRay from './HolographicXRay'
import CameraController from './CameraController'
import Ground from './Ground'

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
                color="#e0f0ff"        // Cool white with blue tint
                castShadow
                shadow-mapSize={[4096, 4096]}
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
                <HolographicXRay />

                {/* Gource Mode: Social Avatars */}
                <AvatarSprites />

                <Roads />
                <Ground />
            </group>

            {/* ═══════════════════════════════════════════════════════════════
                SHADOWS & ATMOSPHERE
            ═══════════════════════════════════════════════════════════════ */}

            {/* Soft contact shadows for grounding */}
            <ContactShadows
                position={[0, 0.01, 0]}
                resolution={2048}
                scale={400}
                blur={3}
                opacity={0.35}
                far={15}
                color="#000010"
            />

            {/* Atmospheric fog - creates depth and mood */}
            <fog attach="fog" args={['#050810', 60, 450]} />

            {/* Background color - deep space blue */}
            <color attach="background" args={['#030508']} />

            <CameraController />
        </group>
    )
}
