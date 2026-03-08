import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const FALLBACK_COLORS = [
    [0.0, 0.85, 1.0], [1.0, 0.35, 0.55], [0.4, 1.0, 0.7],
    [0.95, 0.6, 0.0], [0.6, 0.4, 1.0], [1.0, 0.85, 0.2],
    [0.0, 0.7, 0.95], [1.0, 0.45, 0.85], [0.3, 0.95, 0.85],
    [0.85, 0.3, 0.3], [0.5, 0.8, 1.0], [1.0, 0.65, 0.3],
    [0.35, 0.35, 0.95], [0.0, 0.9, 0.7], [0.9, 0.5, 0.9],
]

// Parse hex color string to [r, g, b] in 0-1 range
function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null
    const m = hex.match(/^#?([0-9A-Fa-f]{6})$/)
    if (!m) return null
    const n = parseInt(m[1], 16)
    return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
}

/**
 * NeonDistrictBorders — Dual-layer glowing border lines between districts.
 * Uses district's own color from data when available.
 * 1 draw call total, 0 useFrame (static).
 */
export default function NeonDistrictBorders() {
    const cityData = useStore(s => s.cityData)

    const { positions, colors } = useMemo(() => {
        if (!cityData?.districts?.length) return { positions: null, colors: null }

        const posArr = []
        const colArr = []

        cityData.districts.forEach((district, di) => {
            if (!district.boundary || district.boundary.length < 3) return
            const c = hexToRgb(district.color) || FALLBACK_COLORS[di % FALLBACK_COLORS.length]
            const dimC = [c[0] * 0.3, c[1] * 0.3, c[2] * 0.3]
            const pts = district.boundary

            for (let i = 0; i < pts.length; i++) {
                const a = pts[i]
                const b = pts[(i + 1) % pts.length]
                // Ground glow layer
                posArr.push(a.x, 0.06, a.y, b.x, 0.06, b.y)
                colArr.push(...dimC, ...dimC)
                // Bright neon layer
                posArr.push(a.x, 0.3, a.y, b.x, 0.3, b.y)
                colArr.push(...c, ...c)
            }
        })

        return {
            positions: new Float32Array(posArr),
            colors: new Float32Array(colArr),
        }
    }, [cityData])

    if (!positions || positions.length === 0) return null

    return (
        <lineSegments>
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
                opacity={0.65}
                depthWrite={false}
                linewidth={1}
            />
        </lineSegments>
    )
}
