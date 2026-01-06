import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Ambient floating particles around hotspots and the city
export default function Particles({ buildings }) {
    const particlesRef = useRef()

    // Generate particle positions around hotspot buildings
    const { positions, colors, hotspotCenters } = useMemo(() => {
        const hotspots = buildings?.filter(b => b.is_hotspot) || []
        const centers = hotspots.map(b => ({
            x: b.position.x,
            y: b.dimensions.height + 5,
            z: b.position.z
        }))

        const particleCount = Math.min(200, hotspots.length * 30 + 50)
        const positions = new Float32Array(particleCount * 3)
        const colors = new Float32Array(particleCount * 3)

        for (let i = 0; i < particleCount; i++) {
            // Distribute particles around hotspots or randomly in city
            if (centers.length > 0 && i < hotspots.length * 25) {
                const center = centers[i % centers.length]
                const radius = 8 + Math.random() * 8
                const angle = Math.random() * Math.PI * 2
                const height = Math.random() * 15

                positions[i * 3] = center.x + Math.cos(angle) * radius
                positions[i * 3 + 1] = center.y + height
                positions[i * 3 + 2] = center.z + Math.sin(angle) * radius

                // Orange/red for hotspot particles
                colors[i * 3] = 1.0
                colors[i * 3 + 1] = 0.4 + Math.random() * 0.3
                colors[i * 3 + 2] = 0.1
            } else {
                // Random ambient particles
                positions[i * 3] = (Math.random() - 0.5) * 200
                positions[i * 3 + 1] = 2 + Math.random() * 30
                positions[i * 3 + 2] = (Math.random() - 0.5) * 200

                // Cyan/blue ambient particles
                colors[i * 3] = 0.3 + Math.random() * 0.2
                colors[i * 3 + 1] = 0.7 + Math.random() * 0.3
                colors[i * 3 + 2] = 1.0
            }
        }

        return { positions, colors, hotspotCenters: centers }
    }, [buildings])

    // Animate particles floating up and twinkling
    useFrame((state) => {
        if (!particlesRef.current) return

        const positions = particlesRef.current.geometry.attributes.position.array
        const time = state.clock.elapsedTime

        for (let i = 0; i < positions.length / 3; i++) {
            // Float upward slowly
            positions[i * 3 + 1] += 0.02

            // Add gentle swirl
            positions[i * 3] += Math.sin(time + i) * 0.01
            positions[i * 3 + 2] += Math.cos(time + i) * 0.01

            // Reset if too high
            if (positions[i * 3 + 1] > 40) {
                positions[i * 3 + 1] = 2

                // Reposition near a hotspot if available
                if (hotspotCenters.length > 0 && i % 3 === 0) {
                    const center = hotspotCenters[i % hotspotCenters.length]
                    const radius = 8 + Math.random() * 8
                    const angle = Math.random() * Math.PI * 2
                    positions[i * 3] = center.x + Math.cos(angle) * radius
                    positions[i * 3 + 2] = center.z + Math.sin(angle) * radius
                }
            }
        }

        particlesRef.current.geometry.attributes.position.needsUpdate = true
    })

    if (positions.length === 0) return null

    return (
        <points ref={particlesRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-color"
                    count={colors.length / 3}
                    array={colors}
                    itemSize={3}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.4}
                vertexColors
                transparent
                opacity={0.7}
                sizeAttenuation
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </points>
    )
}
