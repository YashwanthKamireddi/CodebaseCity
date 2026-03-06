import React, { useMemo, useRef } from 'react'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../store/useStore'

export default function InstancedTrace() {
    const { activeTrace, cityData } = useStore()
    const groupRef = useRef()

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
    }, [activeTrace, cityData])

    // Animate the Data-Flow Kinetics (Streams of light passing through the geometry)
    useFrame((state, delta) => {
        if (groupRef.current) {
            groupRef.current.children.forEach(group => {
                group.children.forEach(lineMesh => {
                    if (lineMesh.material && lineMesh.material.dashed) {
                        lineMesh.material.dashOffset -= delta * 5.0 // Adjust speed of traffic
                    }
                })
            })
        }
    })

    if (segments.length === 0) return null

    return (
        <group ref={groupRef}>
            {segments.map((seg, i) => (
                <group key={i}>
                    {/* Core Beam (Data Packets) */}
                    <QuadraticBezierLine
                        start={seg.start}
                        end={seg.end}
                        mid={seg.control}
                        color="#00ffcc" // Neon Cyan
                        lineWidth={3.5}
                        dashed={true}
                        dashScale={50}
                        dashSize={5}
                        gapSize={10}
                        opacity={1.0}
                        transparent
                    />
                    {/* Glow Halo (Packet Trail) */}
                    <QuadraticBezierLine
                        start={seg.start}
                        end={seg.end}
                        mid={seg.control}
                        color="#3b82f6" // Deep blue halo
                        lineWidth={12}
                        dashed={true}
                        dashScale={50}
                        dashSize={5}
                        gapSize={15}
                        opacity={0.3}
                        transparent
                    />
                </group>
            ))}
        </group>
    )
}
