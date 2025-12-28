import React, { useMemo } from 'react'
import * as THREE from 'three'

export default function CityLights({ buildings }) {
    const lights = useMemo(() => {
        if (!buildings) return []

        return buildings
            .filter((_, i) => i % 3 === 0) // Every 3rd building
            .map((b, i) => ({
                id: i,
                position: [
                    b.position.x + (Math.random() - 0.5) * 10,
                    1,
                    b.position.z + (Math.random() - 0.5) * 10
                ],
                color: Math.random() > 0.5 ? '#ffaa44' : '#ffffff',
                intensity: 0.3 + Math.random() * 0.3
            }))
    }, [buildings])

    return (
        <group>
            {/* Street lamps */}
            {lights.map((light) => (
                <group key={light.id} position={light.position}>
                    {/* Lamp post */}
                    <mesh position={[0, 2, 0]}>
                        <cylinderGeometry args={[0.08, 0.1, 4, 8]} />
                        <meshStandardMaterial color="#2a2a2a" />
                    </mesh>

                    {/* Lamp head */}
                    <mesh position={[0, 4, 0]}>
                        <sphereGeometry args={[0.25, 8, 8]} />
                        <meshBasicMaterial color={light.color} />
                    </mesh>

                    {/* Light */}
                    <pointLight
                        position={[0, 3.8, 0]}
                        color={light.color}
                        intensity={light.intensity}
                        distance={12}
                        decay={2}
                    />
                </group>
            ))}
        </group>
    )
}
