/**
 * DistrictFloors — subtle floor plate under each district.
 *
 * Each district gets a shallow box on the ground plane with a glowing top
 * rim in its own color. Makes the city read as real neighborhoods, not a
 * flat field of buildings.
 *
 * Performance:
 *   · One InstancedMesh for the dark floor tiles (one box geometry).
 *   · One merged lineSegments for the rim glow, all districts in one draw.
 *   · 0 useFrame — fully static.
 *   · Gated off on low-tier in CityScene.
 */
import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const FALLBACK_PALETTE = [
    '#5aa8ff', '#ff8b5a', '#5affb4', '#ffd85a', '#b35aff',
    '#ff5aa0', '#5affff', '#ff5a5a', '#a0ff5a', '#5a8aff',
    '#ff5ae0', '#70ff5a', '#5affaa', '#ff9a5a', '#5accff',
]

const PADDING = 8       // how much larger than building footprint
const HEIGHT = 0.5      // floor-plate thickness
const Y_OFFSET = -0.09  // sits just above the main ground

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null
    const m = hex.match(/^#?([0-9A-Fa-f]{6})$/)
    if (!m) return null
    const n = parseInt(m[1], 16)
    return [(n >> 16 & 0xff) / 255, (n >> 8 & 0xff) / 255, (n & 0xff) / 255]
}

const DistrictFloors = React.memo(function DistrictFloors() {
    const cityData = useStore(s => s.cityData)

    const { floors, rimLines } = useMemo(() => {
        if (!cityData?.buildings?.length) return { floors: null, rimLines: null }

        // Group buildings by district_id / directory
        const byDistrict = new Map()
        for (const b of cityData.buildings) {
            const id = b.district_id || b.directory || 'root'
            if (!byDistrict.has(id)) byDistrict.set(id, [])
            byDistrict.get(id).push(b)
        }

        // Axis-aligned bounding rectangle per district
        const districts = []
        let i = 0
        for (const [id, blds] of byDistrict) {
            let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
            for (const b of blds) {
                const halfW = (b.dimensions?.width || 8) / 2
                const halfD = (b.dimensions?.depth || 8) / 2
                const x = b.position.x
                const z = b.position.z || 0
                if (x - halfW < minX) minX = x - halfW
                if (x + halfW > maxX) maxX = x + halfW
                if (z - halfD < minZ) minZ = z - halfD
                if (z + halfD > maxZ) maxZ = z + halfD
            }
            minX -= PADDING; maxX += PADDING
            minZ -= PADDING; maxZ += PADDING

            const districtData = cityData.districts?.find(d =>
                d.id === id ||
                `district_${d.id}` === id ||
                d.id === id.replace('district_', '')
            )
            const hex = districtData?.color || FALLBACK_PALETTE[i % FALLBACK_PALETTE.length]
            districts.push({ id, minX, maxX, minZ, maxZ, hex })
            i++
        }

        if (districts.length === 0) return { floors: null, rimLines: null }

        // ── Floor-plate instance matrices ──
        const tempObj = new THREE.Object3D()
        const matrices = new Float32Array(districts.length * 16)
        for (let k = 0; k < districts.length; k++) {
            const d = districts[k]
            tempObj.position.set((d.minX + d.maxX) / 2, Y_OFFSET, (d.minZ + d.maxZ) / 2)
            tempObj.scale.set(d.maxX - d.minX, HEIGHT, d.maxZ - d.minZ)
            tempObj.rotation.set(0, 0, 0)
            tempObj.updateMatrix()
            tempObj.matrix.toArray(matrices, k * 16)
        }

        // ── Rim lines (top edges of each plate, colored, merged) ──
        const linePoints = []
        const lineColors = []
        for (const d of districts) {
            const rgb = hexToRgb(d.hex) || [0.4, 0.8, 1]
            const y = Y_OFFSET + HEIGHT + 0.02
            const corners = [
                [d.minX, y, d.minZ],
                [d.maxX, y, d.minZ],
                [d.maxX, y, d.maxZ],
                [d.minX, y, d.maxZ],
            ]
            for (let s = 0; s < 4; s++) {
                const a = corners[s]
                const b = corners[(s + 1) % 4]
                linePoints.push(a[0], a[1], a[2], b[0], b[1], b[2])
                lineColors.push(rgb[0], rgb[1], rgb[2], rgb[0], rgb[1], rgb[2])
            }
        }

        return {
            floors: { count: districts.length, matrices },
            rimLines: {
                positions: new Float32Array(linePoints),
                colors: new Float32Array(lineColors),
            },
        }
    }, [cityData])

    const instancedMeshRef = useRef()

    useLayoutEffect(() => {
        if (!floors || !instancedMeshRef.current) return
        const mesh = instancedMeshRef.current
        mesh.instanceMatrix.array.set(floors.matrices)
        mesh.instanceMatrix.needsUpdate = true
        mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6)
    }, [floors])

    if (!floors || !rimLines) return null

    return (
        <group>
            {/* Dark floor tiles — one instanced draw */}
            <instancedMesh ref={instancedMeshRef} args={[null, null, floors.count]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshBasicMaterial
                    color="#0a1226"
                    transparent
                    opacity={0.78}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </instancedMesh>

            {/* Glowing rims — merged line segments, one draw */}
            <lineSegments>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={rimLines.positions.length / 3}
                        array={rimLines.positions}
                        itemSize={3}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        count={rimLines.colors.length / 3}
                        array={rimLines.colors}
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial
                    vertexColors
                    transparent
                    opacity={0.9}
                    depthWrite={false}
                    toneMapped={false}
                />
            </lineSegments>
        </group>
    )
})

export default DistrictFloors
