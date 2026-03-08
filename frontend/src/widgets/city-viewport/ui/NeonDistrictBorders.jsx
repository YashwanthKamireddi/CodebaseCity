import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * NeonDistrictBorders — Glowing animated border lines on the ground between districts.
 * Creates the visual separation like city zones/neighborhoods.
 * Optimized: merged into a single LineSegments draw call.
 */
export default function NeonDistrictBorders() {
    const cityData = useStore(s => s.cityData)
    const lineRef = useRef()

    const { positions, colors } = useMemo(() => {
        if (!cityData?.districts?.length) return { positions: null, colors: null }

        const DISTRICT_COLORS = [
            [1.0, 0.42, 0.42], [0.27, 0.72, 0.82], [0.59, 0.81, 0.70],
            [0.31, 0.80, 0.77], [0.87, 0.63, 0.87], [1.0, 0.92, 0.65],
            [0.45, 0.73, 1.0], [0.64, 0.61, 1.0], [0.99, 0.47, 0.66],
            [0.33, 0.90, 0.76], [0.97, 0.71, 0.0], [0.99, 0.26, 0.48],
            [0.42, 0.36, 0.91], [0.0, 0.81, 0.79], [0.88, 0.44, 0.33],
        ]

        const posArr = []
        const colArr = []

        cityData.districts.forEach((district, di) => {
            if (!district.boundary || district.boundary.length < 3) return
            const color = DISTRICT_COLORS[di % DISTRICT_COLORS.length]
            const pts = district.boundary

            for (let i = 0; i < pts.length; i++) {
                const a = pts[i]
                const b = pts[(i + 1) % pts.length]
                // Slightly raised to avoid z-fighting with ground
                posArr.push(a.x, 0.15, a.y, b.x, 0.15, b.y)
                colArr.push(...color, ...color)
            }
        })

        return {
            positions: new Float32Array(posArr),
            colors: new Float32Array(colArr),
        }
    }, [cityData])

    // Animate opacity pulse
    useFrame(({ clock }) => {
        if (lineRef.current) {
            const t = clock.getElapsedTime()
            lineRef.current.material.opacity = 0.4 + Math.sin(t * 0.5) * 0.15
        }
    })

    if (!positions || positions.length === 0) return null

    return (
        <lineSegments ref={lineRef}>
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
            <lineBasicMaterial
                vertexColors
                transparent
                opacity={0.5}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                linewidth={1}
            />
        </lineSegments>
    )
}
