import React, { useMemo } from 'react'
import { QuadraticBezierLine } from '@react-three/drei'
import * as THREE from 'three'
import { useArchitectStore } from '../../../../features/architect/model/useArchitectStore'
import useStore from '../../../../store/useStore'

export default function RefactoringLayer() {
    const { isArchitectMode, blastRadius } = useArchitectStore()
    const { cityData } = useStore() // Need access to positions

    // Create a lookup for building positions
    const buildingMap = useMemo(() => {
        if (!cityData?.buildings) return new Map()
        const map = new Map()
        cityData.buildings.forEach(b => {
            const h = b.dimensions?.height || 10
            map.set(b.id, new THREE.Vector3(b.position.x, h, b.position.z))
        })
        return map
    }, [cityData])

    if (!isArchitectMode || blastRadius.length === 0) return null

    return (
        <group>
            {blastRadius.map((edge, i) => {
                const start = buildingMap.get(edge.source)
                const end = buildingMap.get(edge.target)

                if (!start || !end) return null

                const mid = start.clone().lerp(end, 0.5)
                mid.y += 20 // High arc for visibility

                return (
                    <QuadraticBezierLine
                        key={`broken-${i}`}
                        start={start}
                        end={end}
                        mid={mid}
                        color="#ef4444" // Danger Red
                        lineWidth={3} // Thick
                        transparent
                        opacity={0.8}
                        dashed
                        dashScale={0.5}
                        dashOffset={0} // We could animate this for "Warning" effect if we had a ref
                    />
                )
            })}
        </group>
    )
}
