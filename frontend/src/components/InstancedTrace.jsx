import React, { useMemo } from 'react'
import { Line } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../store/useStore'

export default function InstancedTrace() {
    const { activeTrace, cityData, layoutMode } = useStore()

    const points = useMemo(() => {
        if (!activeTrace || !activeTrace.path || !cityData) return null

        // Map path IDs to 3D positions
        return activeTrace.path.map(id => {
            const building = cityData.buildings.find(b => b.id === id)
            if (!building) return null

            const { x, z } = building.position

            // Replicate Grid Logic (must match InstancedCity)
            // TODO: In Galaxy Mode, this will be static grid positions unless we sync physics
            const y = (building.dimensions.height || 5) + 2 // Float above roof

            return new THREE.Vector3(x, y, z)
        }).filter(Boolean)
    }, [activeTrace, cityData, layoutMode])

    if (!points || points.length < 2) return null

    return (
        <group>
            {/* Core Beam */}
            <Line
                points={points}
                color="#facc15" // Yellow/Gold
                lineWidth={3}
                opacity={0.8}
                transparent
                vertexColors={false}
            />
            {/* Glow Halo */}
            <Line
                points={points}
                color="#fbbf24"
                lineWidth={8}
                opacity={0.3}
                transparent
            />
        </group>
    )
}
