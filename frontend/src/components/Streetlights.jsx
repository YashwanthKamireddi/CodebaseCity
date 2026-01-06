import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Single streetlight with glowing orb
function Streetlight({ position, seed = 0 }) {
    const lightRef = useRef()
    const glowRef = useRef()

    // Subtle flicker animation
    useFrame((state) => {
        if (lightRef.current && glowRef.current) {
            const flicker = 0.8 + Math.sin(state.clock.elapsedTime * 3 + seed) * 0.2
            lightRef.current.intensity = 2 * flicker
            glowRef.current.material.opacity = 0.6 * flicker
        }
    })

    return (
        <group position={position}>
            {/* Pole */}
            <mesh position={[0, 3, 0]} castShadow>
                <cylinderGeometry args={[0.1, 0.15, 6, 8]} />
                <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.3} />
            </mesh>

            {/* Arm */}
            <mesh position={[0.6, 5.8, 0]} rotation={[0, 0, Math.PI / 4]} castShadow>
                <cylinderGeometry args={[0.08, 0.08, 1.5, 6]} />
                <meshStandardMaterial color="#374151" roughness={0.8} metalness={0.3} />
            </mesh>

            {/* Lamp housing */}
            <mesh position={[1, 5.5, 0]}>
                <cylinderGeometry args={[0.3, 0.4, 0.5, 8]} />
                <meshStandardMaterial color="#1f2937" roughness={0.6} metalness={0.4} />
            </mesh>

            {/* Glowing orb */}
            <mesh ref={glowRef} position={[1, 5.1, 0]}>
                <sphereGeometry args={[0.4, 16, 16]} />
                <meshBasicMaterial
                    color="#fef3c7"
                    transparent
                    opacity={0.6}
                />
            </mesh>

            {/* Outer glow (larger, more transparent) */}
            <mesh position={[1, 5.1, 0]}>
                <sphereGeometry args={[0.8, 16, 16]} />
                <meshBasicMaterial
                    color="#fef3c7"
                    transparent
                    opacity={0.15}
                />
            </mesh>

            {/* Point light */}
            <pointLight
                ref={lightRef}
                position={[1, 5, 0]}
                color="#fef3c7"
                intensity={2}
                distance={20}
                decay={2}
                castShadow
            />
        </group>
    )
}

// Generate streetlight positions around districts
export default function Streetlights({ districts, buildings }) {
    const lightPositions = useMemo(() => {
        if (!districts || districts.length === 0) return []

        const lights = []

        districts.forEach((district, districtIndex) => {
            const cx = district.center?.x || 0
            const cy = district.center?.y || 0
            const size = 35 + (district.building_count || 5) * 4

            // Place 4-8 lights around each district perimeter
            const lightCount = Math.min(8, 4 + Math.floor(district.building_count / 3))

            for (let i = 0; i < lightCount; i++) {
                const angle = (Math.PI * 2 * i) / lightCount + Math.random() * 0.3
                const distance = size * 0.9

                lights.push({
                    id: `light-${districtIndex}-${i}`,
                    position: [
                        cx + Math.cos(angle) * distance,
                        0,
                        cy + Math.sin(angle) * distance
                    ],
                    seed: districtIndex * 10 + i
                })
            }
        })

        // Limit for performance
        return lights.slice(0, 40)
    }, [districts])

    if (lightPositions.length === 0) return null

    return (
        <group>
            {lightPositions.map(light => (
                <Streetlight
                    key={light.id}
                    position={light.position}
                    seed={light.seed}
                />
            ))}
        </group>
    )
}
