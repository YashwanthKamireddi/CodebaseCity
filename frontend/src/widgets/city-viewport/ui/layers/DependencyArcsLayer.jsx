import React, { useMemo } from 'react'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../../store/useStore'

export default function DependencyArcsLayer() {
    const { selectedBuilding, graphNeighbors, cityData } = useStore()

    // Create a fast lookup for building positions (Center of Roof)
    const buildingMap = useMemo(() => {
        if (!cityData?.buildings) return new Map()
        const map = new Map()
        cityData.buildings.forEach(b => {
            const h = b.dimensions?.height || 10
            // Position is (x, 0, z) on floor. Top is y + h.
            map.set(b.id, new THREE.Vector3(b.position.x, h, b.position.z))
        })
        return map
    }, [cityData])

    if (!selectedBuilding) return null

    const centerVec = buildingMap.get(selectedBuilding.id)
    if (!centerVec) return null

    return (
        <group>
            {/* Outgoing Dependencies (This file imports X) -> Cyan Arcs */}
            {graphNeighbors.dependencies.map((targetId) => {
                const targetVec = buildingMap.get(targetId)
                if (!targetVec) return null

                const mid = centerVec.clone().lerp(targetVec, 0.5)
                const dist = centerVec.distanceTo(targetVec)
                mid.y += Math.max(10, Math.min(dist * 0.5, 60)) // Arch height

                return (
                    <QuadraticBezierLine
                        key={`out-${targetId}`}
                        start={centerVec}
                        end={targetVec}
                        mid={mid}
                        color="#08f7fe" // Neon Cyan
                        lineWidth={1.5}
                        transparent
                        opacity={0.8}
                    />
                )
            })}

            {/* Incoming Dependents (X imports this file) -> Pink/Red Arcs */}
            {graphNeighbors.dependents.map((sourceId) => {
                const sourceVec = buildingMap.get(sourceId)
                if (!sourceVec) return null

                const mid = sourceVec.clone().lerp(centerVec, 0.5)
                const dist = sourceVec.distanceTo(centerVec)
                mid.y += Math.max(10, Math.min(dist * 0.5, 60))

                return (
                    <QuadraticBezierLine
                        key={`in-${sourceId}`}
                        start={sourceVec}
                        end={centerVec}
                        mid={mid}
                        color="#ff0055" // Neon Red/Pink
                        lineWidth={1.5}
                        transparent
                        opacity={0.6}
                        dashed
                        dashScale={0.5}
                    />
                )
            })}
        </group>
    )
}
