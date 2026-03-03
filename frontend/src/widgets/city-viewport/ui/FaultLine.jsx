import React, { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../store/useStore'

export default function FaultLine() {
    const { cityData, dependencyReport, activeIntelligencePanel } = useStore()
    const groupRef = useRef()

    const faultLines = useMemo(() => {
        if (activeIntelligencePanel !== 'architecture' || !dependencyReport?.layer_violations || !cityData) {
            return null
        }

        const lines = []
        const violations = dependencyReport.layer_violations

        violations.forEach((violation) => {
            const srcId = violation.source_id
            const tgtId = violation.target_id

            if (!srcId || !tgtId) return

            const srcBuilding = cityData.buildings.find(b => b.id === srcId)
            const tgtBuilding = cityData.buildings.find(b => b.id === tgtId)

            if (!srcBuilding || !tgtBuilding) return

            const sx = srcBuilding.position.x
            const sz = srcBuilding.position.z
            const tx = tgtBuilding.position.x
            const tz = tgtBuilding.position.z

            // Draw a jagged line on the ground (y = 0.5)
            const y = 0.5

            // Generate a jagged fault line
            const numSegments = 12
            const points = []
            points.push(new THREE.Vector3(sx, y, sz))

            for (let i = 1; i < numSegments; i++) {
                const t = i / numSegments
                const lx = sx + (tx - sx) * t
                const lz = sz + (tz - sz) * t

                const dirX = tx - sx
                const dirZ = tz - sz
                const len = Math.sqrt(dirX * dirX + dirZ * dirZ)
                const perpX = -dirZ / len
                const perpZ = dirX / len

                // Add jitter
                const jitterMagnitude = (Math.random() - 0.5) * Math.min(len * 0.15, 10.0)

                points.push(new THREE.Vector3(
                    lx + perpX * jitterMagnitude,
                    y,
                    lz + perpZ * jitterMagnitude
                ))
            }
            points.push(new THREE.Vector3(tx, y, tz))

            lines.push({ points, type: violation.violation_type })
        })

        return lines
    }, [dependencyReport, cityData, activeIntelligencePanel])

    // Animate glowing fault lines
    useFrame(({ clock }) => {
        if (groupRef.current) {
            const time = clock.elapsedTime
            groupRef.current.children.forEach((mesh, i) => {
                const offset = i * 1.5
                // Pulsate aggressively like unstable energy
                const alpha = Math.abs(Math.sin((time * 4) + offset)) * Math.random() * 0.5 + 0.5
                if (mesh.material) {
                    mesh.material.opacity = alpha
                }
            })
        }
    })

    if (!faultLines || faultLines.length === 0) return null

    return (
        <group ref={groupRef}>
            {faultLines.map((line, i) => (
                <group key={i}>
                    {/* Core Plasma */}
                    <Line
                        points={line.points}
                        color="#ff0055"
                        lineWidth={4}
                        opacity={1.0}
                        transparent
                    />
                    {/* Glow Halo 1 */}
                    <Line
                        points={line.points}
                        color="#ff0055"
                        lineWidth={12}
                        opacity={0.3}
                        transparent
                    />
                    {/* Glow Halo 2 */}
                    <Line
                        points={line.points}
                        color="#ff4400"
                        lineWidth={24}
                        opacity={0.1}
                        transparent
                    />
                </group>
            ))}
        </group>
    )
}
