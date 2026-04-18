import React, { useRef, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * AtmosphericParticles — Floating dust/data particles for city ambience.
 * Lightweight: uses Points with a small buffer. Moves subtly to create
 * a living, breathing cityscape without noticeable performance cost.
 */
export default React.memo(function AtmosphericParticles({ count = 300, spread = 400 }) {
    const pointsRef = useRef()
    const frameCounter = useRef(0)

    const { positions, velocities } = useMemo(() => {
        const positions = new Float32Array(count * 3)
        const velocities = new Float32Array(count * 3)

        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            positions[i3] = (Math.random() - 0.5) * spread
            positions[i3 + 1] = Math.random() * 80 + 5
            positions[i3 + 2] = (Math.random() - 0.5) * spread

            velocities[i3] = (Math.random() - 0.5) * 0.02
            velocities[i3 + 1] = Math.random() * 0.01 + 0.005
            velocities[i3 + 2] = (Math.random() - 0.5) * 0.02
        }

        return { positions, velocities }
    }, [count, spread])

    useFrame(() => {
        if (!pointsRef.current) return
        // Throttle to every other frame for performance
        frameCounter.current++
        if (frameCounter.current % 2 !== 0) return

        const posArray = pointsRef.current.geometry.attributes.position.array
        const halfSpread = spread / 2

        for (let i = 0; i < count; i++) {
            const i3 = i * 3
            posArray[i3] += velocities[i3]
            posArray[i3 + 1] += velocities[i3 + 1]
            posArray[i3 + 2] += velocities[i3 + 2]

            // Wrap around boundaries
            if (posArray[i3 + 1] > 100) {
                posArray[i3 + 1] = 5
                posArray[i3] = (Math.random() - 0.5) * spread
                posArray[i3 + 2] = (Math.random() - 0.5) * spread
            }
            if (Math.abs(posArray[i3]) > halfSpread) posArray[i3] *= -0.99
            if (Math.abs(posArray[i3 + 2]) > halfSpread) posArray[i3 + 2] *= -0.99
        }
        pointsRef.current.geometry.attributes.position.needsUpdate = true
    })

    return (
        <points ref={pointsRef}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    args={[positions, 3]}
                />
            </bufferGeometry>
            <pointsMaterial
                size={0.8}
                color="#4488ff"
                transparent
                opacity={0.25}
                sizeAttenuation
                depthWrite={false}
                blending={THREE.AdditiveBlending}
            />
        </points>
    )
})
