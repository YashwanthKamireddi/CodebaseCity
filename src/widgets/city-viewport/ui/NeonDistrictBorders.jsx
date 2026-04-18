import React, { useMemo } from 'react'
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
    let m = hex.match(/^#?([0-9A-Fa-f]{6})$/)
    if (m) {
        const n = parseInt(m[1], 16)
        return [(n >> 16) / 255, ((n >> 8) & 0xff) / 255, (n & 0xff) / 255]
    }
    m = hex.match(/^#?([0-9A-Fa-f]{3})$/)
    if (m) {
        const r = parseInt(m[1][0] + m[1][0], 16)
        const g = parseInt(m[1][1] + m[1][1], 16)
        const b = parseInt(m[1][2] + m[1][2], 16)
        return [r / 255, g / 255, b / 255]
    }
    return null
}

/**
 * NeonDistrictBorders — Dual-layer glowing border lines between districts.
 * Uses district's own color from data when available.
 * 1 draw call total, 0 useFrame (static).
 */
const NeonDistrictBorders = React.memo(function NeonDistrictBorders() {
    const cityData = useStore(s => s.cityData)

    const { positions, colors } = useMemo(() => {
        if (!cityData?.districts?.length) return { positions: null, colors: null }

        const posArr = []
        const colArr = []

        cityData.districts.forEach((district, di) => {
            if (!district.boundary || district.boundary.length < 3) return
            const c = hexToRgb(district.color) || FALLBACK_COLORS[di % FALLBACK_COLORS.length]
            const dimC = [c[0] * 0.5, c[1] * 0.5, c[2] * 0.5]
            const pts = district.boundary

            for (let i = 0; i < pts.length; i++) {
                const a = pts[i]
                const b = pts[(i + 1) % pts.length]
                // Ground glow layer
                posArr.push(a.x, 0.06, a.y, b.x, 0.06, b.y)
                colArr.push(...dimC, ...dimC)
                // Mid neon layer
                posArr.push(a.x, 0.8, a.y, b.x, 0.8, b.y)
                colArr.push(...c, ...c)
                // Bright neon layer — raised for visibility
                posArr.push(a.x, 2.0, a.y, b.x, 2.0, b.y)
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
                opacity={0.85}
                depthWrite={false}
                linewidth={1}
            />
        </lineSegments>
    )
}
)

export default NeonDistrictBorders
