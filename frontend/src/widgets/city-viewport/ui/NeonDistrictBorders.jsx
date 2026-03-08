import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const DISTRICT_COLORS = [
    [0.0, 0.85, 1.0], [1.0, 0.35, 0.55], [0.4, 1.0, 0.7],
    [0.95, 0.6, 0.0], [0.6, 0.4, 1.0], [1.0, 0.85, 0.2],
    [0.0, 0.7, 0.95], [1.0, 0.45, 0.85], [0.3, 0.95, 0.85],
    [0.85, 0.3, 0.3], [0.5, 0.8, 1.0], [1.0, 0.65, 0.3],
    [0.35, 0.35, 0.95], [0.0, 0.9, 0.7], [0.9, 0.5, 0.9],
]

/**
 * NeonDistrictBorders — Dual-layer glowing border lines between districts.
 * Lower line (ground glow) + upper line (bright neon). 1 draw call.
 * Throttled animation at 30fps.
 */
export default function NeonDistrictBorders() {
    const cityData = useStore(s => s.cityData)
    const lineRef = useRef()
    const lastT = useRef(0)

    const { positions, colors } = useMemo(() => {
        if (!cityData?.districts?.length) return { positions: null, colors: null }

        const posArr = []
        const colArr = []

        cityData.districts.forEach((district, di) => {
            if (!district.boundary || district.boundary.length < 3) return
            const c = DISTRICT_COLORS[di % DISTRICT_COLORS.length]
            // Dimmer version for ground glow layer
            const dimC = [c[0] * 0.4, c[1] * 0.4, c[2] * 0.4]
            const pts = district.boundary

            for (let i = 0; i < pts.length; i++) {
                const a = pts[i]
                const b = pts[(i + 1) % pts.length]
                // Ground glow layer
                posArr.push(a.x, 0.08, a.y, b.x, 0.08, b.y)
                colArr.push(...dimC, ...dimC)
                // Bright neon layer
                posArr.push(a.x, 0.25, a.y, b.x, 0.25, b.y)
                colArr.push(...c, ...c)
            }
        })

        return {
            positions: new Float32Array(posArr),
            colors: new Float32Array(colArr),
        }
    }, [cityData])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        if (lineRef.current) {
            lineRef.current.material.opacity = 0.5 + Math.sin(t * 0.4) * 0.12
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
                opacity={0.55}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                linewidth={1}
            />
        </lineSegments>
    )
}
