import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const tempColor = new THREE.Color()

/**
 * DistrictFloors — Renders translucent colored ground planes for each district.
 * Creates visual clustering boundaries that make districts readable.
 * Uses additive blending for a subtle neon glow that matches the city aesthetic.
 */
export default function DistrictFloors() {
    const cityData = useStore(s => s.cityData)

    const districts = useMemo(() => {
        if (!cityData?.districts?.length) return []
        return cityData.districts.filter(d => d.boundary?.length >= 3)
    }, [cityData])

    if (districts.length === 0) return null

    return (
        <group>
            {districts.map(district => (
                <DistrictPlane key={district.id} district={district} />
            ))}
        </group>
    )
}

function DistrictPlane({ district }) {
    const { boundary, color, name } = district

    const geometry = useMemo(() => {
        if (!boundary || boundary.length < 3) return null

        // Expand boundary slightly for padding
        const padding = 8
        const cx = boundary.reduce((s, p) => s + p.x, 0) / boundary.length
        const cy = boundary.reduce((s, p) => s + p.y, 0) / boundary.length

        const shape = new THREE.Shape()
        const expanded = boundary.map(p => ({
            x: cx + (p.x - cx) * (1 + padding / Math.max(1, Math.abs(p.x - cx))),
            y: cy + (p.y - cy) * (1 + padding / Math.max(1, Math.abs(p.y - cy)))
        }))

        shape.moveTo(expanded[0].x, expanded[0].y)
        for (let i = 1; i < expanded.length; i++) {
            shape.lineTo(expanded[i].x, expanded[i].y)
        }
        shape.closePath()

        const geo = new THREE.ShapeGeometry(shape)
        return geo
    }, [boundary])

    const borderGeometry = useMemo(() => {
        if (!boundary || boundary.length < 3) return null
        const padding = 8
        const cx = boundary.reduce((s, p) => s + p.x, 0) / boundary.length
        const cy = boundary.reduce((s, p) => s + p.y, 0) / boundary.length

        const points = boundary.map(p => new THREE.Vector3(
            cx + (p.x - cx) * (1 + padding / Math.max(1, Math.abs(p.x - cx))),
            cy + (p.y - cy) * (1 + padding / Math.max(1, Math.abs(p.y - cy))),
            0
        ))
        points.push(points[0].clone()) // Close the loop

        return new THREE.BufferGeometry().setFromPoints(points)
    }, [boundary])

    if (!geometry) return null

    tempColor.set(color || '#4488ff')

    return (
        <group>
            {/* District floor — subtle filled area */}
            <mesh
                geometry={geometry}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.05, 0]}
            >
                <meshBasicMaterial
                    color={color || '#4488ff'}
                    transparent
                    opacity={0.04}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* District border glow — bright edge line */}
            <line
                geometry={borderGeometry}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.08, 0]}
            >
                <lineBasicMaterial
                    color={color || '#4488ff'}
                    transparent
                    opacity={0.25}
                    linewidth={1}
                    blending={THREE.AdditiveBlending}
                />
            </line>
        </group>
    )
}
