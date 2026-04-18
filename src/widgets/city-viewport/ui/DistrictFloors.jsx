import React, { useMemo, useEffect, useRef } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const _color = new THREE.Color()

/**
 * DistrictFloors — Renders translucent colored ground planes for each district.
 * All districts are merged into ONE floor mesh + ONE border lineSegments = 2 draw calls total.
 */
export default React.memo(function DistrictFloors() {
    const cityData = useStore(s => s.cityData)
    const floorRef = useRef()
    const borderRef = useRef()

    const districts = useMemo(() => {
        if (!cityData?.districts?.length) return []
        return cityData.districts.filter(d => d.boundary?.length >= 3)
    }, [cityData])

    // Merge all floor shapes into a single BufferGeometry with per-vertex color
    const mergedFloor = useMemo(() => {
        if (!districts.length) return null

        const geometries = []
        for (const d of districts) {
            const { boundary, color } = d
            if (!boundary || boundary.length < 3) continue

            const cx = boundary.reduce((s, p) => s + p.x, 0) / boundary.length
            const cy = boundary.reduce((s, p) => s + p.y, 0) / boundary.length

            const shape = new THREE.Shape()
            const expanded = boundary.map(p => {
                const dx = p.x - cx
                const dy = p.y - cy
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                return { x: p.x + (dx / len) * 4, y: p.y + (dy / len) * 4 }
            })
            shape.moveTo(expanded[0].x, expanded[0].y)
            for (let i = 1; i < expanded.length; i++) shape.lineTo(expanded[i].x, expanded[i].y)
            shape.closePath()

            const geo = new THREE.ShapeGeometry(shape)
            // Stamp per-vertex color
            _color.set(color || '#4488ff')
            const colors = new Float32Array(geo.attributes.position.count * 3)
            for (let i = 0; i < geo.attributes.position.count; i++) {
                colors[i * 3] = _color.r
                colors[i * 3 + 1] = _color.g
                colors[i * 3 + 2] = _color.b
            }
            geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
            geometries.push(geo)
        }

        if (!geometries.length) return null
        const merged = mergeBufferGeometries(geometries)
        geometries.forEach(g => g.dispose())
        return merged
    }, [districts])

    // Merge all border line segments into a single BufferGeometry with per-vertex color
    const mergedBorder = useMemo(() => {
        if (!districts.length) return null

        const positions = []
        const colors = []
        for (const d of districts) {
            const { boundary, color } = d
            if (!boundary || boundary.length < 3) continue

            const cx = boundary.reduce((s, p) => s + p.x, 0) / boundary.length
            const cy = boundary.reduce((s, p) => s + p.y, 0) / boundary.length
            _color.set(color || '#4488ff')

            const expanded = boundary.map(p => {
                const dx = p.x - cx
                const dy = p.y - cy
                const len = Math.sqrt(dx * dx + dy * dy) || 1
                return { x: p.x + (dx / len) * 4, y: p.y + (dy / len) * 4 }
            })

            for (let i = 0; i < expanded.length; i++) {
                const a = expanded[i]
                const b = expanded[(i + 1) % expanded.length]
                // lineSegments: each pair of vertices = one segment
                positions.push(a.x, a.y, 0, b.x, b.y, 0)
                colors.push(_color.r, _color.g, _color.b, _color.r, _color.g, _color.b)
            }
        }

        if (!positions.length) return null
        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3))
        geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
        return geo
    }, [districts])

    // Dispose on unmount / data change
    useEffect(() => {
        return () => {
            mergedFloor?.dispose()
            mergedBorder?.dispose()
        }
    }, [mergedFloor, mergedBorder])

    if (!mergedFloor) return null

    return (
        <group>
            <mesh
                ref={floorRef}
                geometry={mergedFloor}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, 0.05, 0]}
            >
                <meshBasicMaterial
                    vertexColors
                    transparent
                    opacity={0.10}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {mergedBorder && (
                <lineSegments
                    ref={borderRef}
                    geometry={mergedBorder}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, 0.08, 0]}
                >
                    <lineBasicMaterial
                        vertexColors
                        transparent
                        opacity={0.50}
                        linewidth={1}
                        blending={THREE.AdditiveBlending}
                    />
                </lineSegments>
            )}
        </group>
    )
})

/**
 * Fallback merge for environments without BufferGeometryUtils on THREE namespace.
 */
function mergeBufferGeometries(geometries) {
    let totalVerts = 0, totalIndices = 0
    for (const g of geometries) {
        totalVerts += g.attributes.position.count
        totalIndices += g.index ? g.index.count : g.attributes.position.count
    }
    const pos = new Float32Array(totalVerts * 3)
    const col = new Float32Array(totalVerts * 3)
    const idx = new Uint32Array(totalIndices)
    let vOff = 0, iOff = 0, vertBase = 0
    for (const g of geometries) {
        const p = g.attributes.position.array
        const c = g.attributes.color.array
        pos.set(p, vOff * 3)
        col.set(c, vOff * 3)
        if (g.index) {
            for (let i = 0; i < g.index.count; i++) idx[iOff++] = g.index.array[i] + vertBase
        } else {
            for (let i = 0; i < g.attributes.position.count; i++) idx[iOff++] = vertBase + i
        }
        vertBase += g.attributes.position.count
        vOff += g.attributes.position.count
    }
    const merged = new THREE.BufferGeometry()
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    merged.setAttribute('color', new THREE.BufferAttribute(col, 3))
    merged.setIndex(new THREE.BufferAttribute(idx, 1))
    return merged
}
