/**
 * DistrictFloors — tinted neighborhood plates.
 *
 * Flat plane per district sitting just above the main ground, tinted with
 * the district's accent color at very low opacity. Reads as a subtle
 * neighborhood footprint — like a real city block — instead of a stack
 * of floating rectangles.
 *
 * Performance:
 *   · One InstancedMesh of plane geometries (one draw call for all plates).
 *   · Per-instance color via instanceColor attribute — no shader rewrite.
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

const PADDING = 6       // footprint padding (smaller — tighter around buildings)
const Y_OFFSET = -0.06  // just above main ground to avoid z-fight

function hexToRgb(hex) {
    if (!hex || typeof hex !== 'string') return null
    const m = hex.match(/^#?([0-9A-Fa-f]{6})$/)
    if (!m) return null
    const n = parseInt(m[1], 16)
    return [(n >> 16 & 0xff) / 255, (n >> 8 & 0xff) / 255, (n & 0xff) / 255]
}

const DistrictFloors = React.memo(function DistrictFloors() {
    const cityData = useStore(s => s.cityData)

    const data = useMemo(() => {
        if (!cityData?.buildings?.length) return null

        const byDistrict = new Map()
        for (const b of cityData.buildings) {
            const id = b.district_id || b.directory || 'root'
            if (!byDistrict.has(id)) byDistrict.set(id, [])
            byDistrict.get(id).push(b)
        }

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
            districts.push({ minX, maxX, minZ, maxZ, hex })
            i++
        }

        if (districts.length === 0) return null

        const tempObj = new THREE.Object3D()
        const matrices = new Float32Array(districts.length * 16)
        const colors = new Float32Array(districts.length * 3)

        for (let k = 0; k < districts.length; k++) {
            const d = districts[k]
            const w = d.maxX - d.minX
            const dp = d.maxZ - d.minZ
            tempObj.position.set((d.minX + d.maxX) / 2, Y_OFFSET, (d.minZ + d.maxZ) / 2)
            // PlaneGeometry is in the XY plane — rotate to lie flat, then scale
            tempObj.rotation.set(-Math.PI / 2, 0, 0)
            tempObj.scale.set(w, dp, 1)
            tempObj.updateMatrix()
            tempObj.matrix.toArray(matrices, k * 16)

            const rgb = hexToRgb(d.hex) || [0.35, 0.66, 1]
            // Dim the color heavily so plates are subtle hints, not lights
            colors[k * 3 + 0] = rgb[0] * 0.35
            colors[k * 3 + 1] = rgb[1] * 0.35
            colors[k * 3 + 2] = rgb[2] * 0.35
        }

        return { count: districts.length, matrices, colors }
    }, [cityData])

    const meshRef = useRef()

    useLayoutEffect(() => {
        if (!data || !meshRef.current) return
        const mesh = meshRef.current
        mesh.instanceMatrix.array.set(data.matrices)
        mesh.instanceMatrix.needsUpdate = true
        if (!mesh.instanceColor) {
            mesh.instanceColor = new THREE.InstancedBufferAttribute(
                new Float32Array(data.count * 3), 3
            )
        }
        mesh.instanceColor.array.set(data.colors)
        mesh.instanceColor.needsUpdate = true
        mesh.geometry.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 0, 0), 1e6)
    }, [data])

    if (!data) return null

    return (
        <instancedMesh ref={meshRef} args={[null, null, data.count]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                transparent
                opacity={0.22}
                depthWrite={false}
                blending={THREE.NormalBlending}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
            />
        </instancedMesh>
    )
})

export default DistrictFloors
