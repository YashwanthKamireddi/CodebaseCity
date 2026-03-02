import React, { useMemo } from 'react'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

export default function InstancedTrace() {
    const { activeTrace, cityData, layoutMode } = useStore()

    const segments = useMemo(() => {
        if (!activeTrace || !activeTrace.path || !cityData) return []

        const segs = []
        for (let i = 0; i < activeTrace.path.length - 1; i++) {
            const b1 = cityData.buildings.find(b => b.id === activeTrace.path[i])
            const b2 = cityData.buildings.find(b => b.id === activeTrace.path[i + 1])

            if (b1 && b2) {
                const y1 = (b1.dimensions.height || 5) + 2 // Float above roof
                const y2 = (b2.dimensions.height || 5) + 2

                const start = new THREE.Vector3(b1.position.x, y1, b1.position.z)
                const end = new THREE.Vector3(b2.position.x, y2, b2.position.z)

                // Calculate an arc control point
                const midX = (start.x + end.x) / 2
                const midZ = (start.z + end.z) / 2
                const distance = start.distanceTo(end)
                // Height of arc scales with distance for epic look
                const midY = Math.max(y1, y2) + Math.min(distance * 0.5, 150)

                const control = new THREE.Vector3(midX, midY, midZ)
                segs.push({ start, end, control })
            }
        }
        return segs
    }, [activeTrace, cityData, layoutMode])

    if (segments.length === 0) return null

    return (
        <group>
            {segments.map((seg, i) => (
                <group key={i}>
                    {/* Core Beam */}
                    <QuadraticBezierLine
                        start={seg.start}
                        end={seg.end}
                        mid={seg.control}
                        color="#ffffff" // Neon Cyan
                        lineWidth={3}
                        dashed={false}
                        opacity={0.9}
                        transparent
                    />
                    {/* Glow Halo */}
                    <QuadraticBezierLine
                        start={seg.start}
                        end={seg.end}
                        mid={seg.control}
                        color="#3b82f6" // Deep blue halo
                        lineWidth={10}
                        dashed={false}
                        opacity={0.3}
                        transparent
                    />
                </group>
            ))}
        </group>
    )
}
