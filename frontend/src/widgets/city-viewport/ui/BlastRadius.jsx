import React, { useMemo, useRef } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../store/useStore'

export default function BlastRadius() {
    const { cityData, impactAnalysis, activeIntelligencePanel } = useStore()
    const groupRef = useRef()

    const impactLines = useMemo(() => {
        if (activeIntelligencePanel !== 'impact' || !impactAnalysis || !cityData) return null

        const centerId = impactAnalysis.file_id
        const centerBuilding = cityData.buildings.find(b => b.id === centerId)
        if (!centerBuilding) return null

        const cx = centerBuilding.position.x
        const cz = centerBuilding.position.z
        const cy = (centerBuilding.dimensions?.height || 5) + 2

        const lines = []

        // Helper to generate animated glowing arcs
        const addImpactLines = (levelData, color, heightOffset) => {
            if (!levelData) return
            levelData.forEach(file => {
                const targetBuilding = cityData.buildings.find(b => b.id === file.id)
                if (!targetBuilding) return

                const tx = targetBuilding.position.x
                const tz = targetBuilding.position.z
                const ty = (targetBuilding.dimensions?.height || 5) + heightOffset

                // Create a cool bezier curve arc
                const dx = tx - cx
                const dz = tz - cz
                const dist = Math.sqrt(dx * dx + dz * dz)

                const midX = cx + dx / 2
                const midZ = cz + dz / 2
                const midY = Math.max(cy, ty) + dist * 0.3 // Arc height depends on distance

                const curve = new THREE.QuadraticBezierCurve3(
                    new THREE.Vector3(cx, cy, cz),
                    new THREE.Vector3(midX, midY, midZ),
                    new THREE.Vector3(tx, ty, tz)
                )

                // 50 points for smoothness
                lines.push({
                    points: curve.getPoints(50),
                    color
                })
            })
        }

        addImpactLines(impactAnalysis.levels?.level_1, '#ef4444', 2) // Red
        addImpactLines(impactAnalysis.levels?.level_2, '#f97316', 1) // Orange
        addImpactLines(impactAnalysis.levels?.level_3, '#eab308', 0) // Yellow

        return lines
    }, [impactAnalysis, cityData, activeIntelligencePanel])

    // Animate the opacity for a pulsing effect
    useFrame(({ clock }) => {
        if (groupRef.current) {
            const time = clock.elapsedTime
            groupRef.current.children.forEach((lineGroup, i) => {
                const offset = i * 0.2
                const alpha = 0.5 + Math.sin(time * 3 + offset) * 0.5
                // Each child is a <group> containing 2 <Line> elements
                lineGroup.children?.forEach((lineChild) => {
                    if (lineChild.material) {
                        lineChild.material.opacity = 0.3 + alpha * 0.6
                    }
                    // Drei Line wraps in a group — check nested children too
                    lineChild.children?.forEach((inner) => {
                        if (inner.material) {
                            inner.material.opacity = 0.3 + alpha * 0.6
                        }
                    })
                })
            })
        }
    })

    if (!impactLines || impactLines.length === 0) return null

    return (
        <group ref={groupRef}>
            {impactLines.map((line, i) => (
                <group key={i}>
                    {/* Core Beam */}
                    <Line
                        points={line.points}
                        color={line.color}
                        lineWidth={3}
                        opacity={0.8}
                        transparent
                    />
                    {/* Glow Halo */}
                    <Line
                        points={line.points}
                        color={line.color}
                        lineWidth={10}
                        opacity={0.2}
                        transparent
                    />
                </group>
            ))}
        </group>
    )
}
