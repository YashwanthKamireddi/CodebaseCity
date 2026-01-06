import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../store/useStore'

// Vibrant district colors matching buildings
const DISTRICT_COLORS = {
    api: '#4da6ff',
    services: '#a855f7',
    data: '#22d3ee',
    utils: '#4ade80',
    auth: '#fbbf24',
    ui: '#f472b6',
    tests: '#2dd4bf',
    config: '#818cf8'
}

export default function District({ data }) {
    const focusedDistrict = useStore((state) => state.focusedDistrict)
    const isFocused = focusedDistrict === data.id

    const color = useMemo(() => {
        return DISTRICT_COLORS[data.id] || data.color || '#4b5563'
    }, [data.id, data.color])

    const cx = data.center?.x || 0
    const cy = data.center?.y || 0
    const size = 35 + (data.building_count || 5) * 4

    return (
        <group>
            {/* District ground - subtle colored area */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.05, cy]} receiveShadow>
                <circleGeometry args={[size, 48]} />
                <meshStandardMaterial
                    color={color}
                    transparent
                    opacity={isFocused ? 0.25 : 0.1}
                    roughness={0.8}
                    metalness={0}
                />
            </mesh>

            {/* District border - glowing ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, 0.06, cy]}>
                <ringGeometry args={[size - 1, size, 48]} />
                <meshBasicMaterial
                    color={color}
                    transparent
                    opacity={isFocused ? 0.7 : 0.4}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    )
}
