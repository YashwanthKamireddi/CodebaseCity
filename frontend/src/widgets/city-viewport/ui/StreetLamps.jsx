import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * StreetLamps — Holographic light poles along district boundaries.
 * Placed at regular intervals along road paths. Fully static (0 useFrame).
 * All geometry merged into 2 draw calls total (poles + lights).
 */

const LAMP_SPACING = 100
const LAMP_HEIGHT = 14
const POLE_RADIUS = 0.2
const LIGHT_RADIUS = 0.6

export default React.memo(function StreetLamps() {
    const districts = useStore(s => s.cityData?.districts)

    const lampPositions = useMemo(() => {
        if (!districts?.length) return []

        // Extract bounding boxes
        const boxes = districts.map(d => {
            if (!d.boundary || d.boundary.length < 3) return null
            let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
            for (const p of d.boundary) {
                if (p.x < x0) x0 = p.x
                if (p.x > x1) x1 = p.x
                if (p.y < z0) z0 = p.y
                if (p.y > z1) z1 = p.y
            }
            return { x0, x1, z0, z1 }
        }).filter(Boolean)

        // Place lamps along district perimeter edges
        const OFFSET = 8
        const edges = []
        for (const box of boxes) {
            const x0 = box.x0 - OFFSET, x1 = box.x1 + OFFSET
            const z0 = box.z0 - OFFSET, z1 = box.z1 + OFFSET
            edges.push({ x0, z0: z0, x1, z1: z0 }) // N
            edges.push({ x0, z0: z1, x1, z1: z1 }) // S
            edges.push({ x0, z0, x1: x0, z1 })      // W
            edges.push({ x0: x1, z0, x1, z1 })       // E
        }

        const lamps = []
        const seen = new Set()
        for (const e of edges) {
            const dx = e.x1 - e.x0
            const dz = e.z1 - e.z0
            const len = Math.sqrt(dx * dx + dz * dz)
            if (len < LAMP_SPACING) continue
            const count = Math.floor(len / LAMP_SPACING)
            for (let j = 1; j <= count; j++) {
                const t = j / (count + 1)
                const x = e.x0 + dx * t
                const z = e.z0 + dz * t
                const nx = -dz / len * 3
                const nz = dx / len * 3
                const key = `${Math.round(x + nx)},${Math.round(z + nz)}`
                if (seen.has(key)) continue
                seen.add(key)
                lamps.push({ x: x + nx, z: z + nz })
            }
        }
        return lamps
    }, [districts])

    // Merge all pole cylinders + light spheres into 2 draw calls
    const { poleGeo, lightGeo } = useMemo(() => {
        if (!lampPositions.length) return { poleGeo: null, lightGeo: null }

        const maxLamps = Math.min(lampPositions.length, 80) // Cap for perf
        const poleTemplate = new THREE.CylinderGeometry(POLE_RADIUS, POLE_RADIUS * 1.3, LAMP_HEIGHT, 4, 1)
        const lightTemplate = new THREE.SphereGeometry(LIGHT_RADIUS, 6, 4)

        const polePositions = []
        const poleIndices = []
        const lightPositions = []
        const lightIndices = []
        const lightColors = []
        let poleBase = 0, lightBase = 0

        for (let i = 0; i < maxLamps; i++) {
            const lp = lampPositions[i]

            // Pole
            const pGeo = poleTemplate.clone()
            pGeo.translate(lp.x, LAMP_HEIGHT / 2, lp.z)
            const pArr = pGeo.attributes.position.array
            for (let j = 0; j < pArr.length; j++) polePositions.push(pArr[j])
            const pIdx = pGeo.index.array
            for (let j = 0; j < pIdx.length; j++) poleIndices.push(pIdx[j] + poleBase)
            poleBase += pGeo.attributes.position.count
            pGeo.dispose()

            // Light orb
            const lGeo = lightTemplate.clone()
            lGeo.translate(lp.x, LAMP_HEIGHT + LIGHT_RADIUS, lp.z)
            const lArr = lGeo.attributes.position.array
            for (let j = 0; j < lArr.length; j++) lightPositions.push(lArr[j])
            const lIdx = lGeo.index.array
            for (let j = 0; j < lIdx.length; j++) lightIndices.push(lIdx[j] + lightBase)
            // Cyan-white light color for each vertex
            for (let j = 0; j < lGeo.attributes.position.count; j++) {
                lightColors.push(0.15, 0.55, 0.8)
            }
            lightBase += lGeo.attributes.position.count
            lGeo.dispose()
        }

        poleTemplate.dispose()
        lightTemplate.dispose()

        if (!polePositions.length) return { poleGeo: null, lightGeo: null }

        const pGeo = new THREE.BufferGeometry()
        pGeo.setAttribute('position', new THREE.Float32BufferAttribute(polePositions, 3))
        pGeo.setIndex(poleIndices)

        const lGeo = new THREE.BufferGeometry()
        lGeo.setAttribute('position', new THREE.Float32BufferAttribute(lightPositions, 3))
        lGeo.setAttribute('color', new THREE.Float32BufferAttribute(lightColors, 3))
        lGeo.setIndex(lightIndices)

        return { poleGeo: pGeo, lightGeo: lGeo }
    }, [lampPositions])

    // Dispose merged geometries on unmount
    React.useEffect(() => {
        return () => {
            poleGeo?.dispose()
            lightGeo?.dispose()
        }
    }, [poleGeo, lightGeo])

    if (!poleGeo) return null

    return (
        <group>
            <mesh geometry={poleGeo} raycast={() => null}>
                <meshBasicMaterial color="#0c1525" />
            </mesh>
            {lightGeo && (
                <mesh geometry={lightGeo} raycast={() => null}>
                    <meshBasicMaterial
                        vertexColors
                        transparent
                        opacity={0.9}
                        blending={THREE.AdditiveBlending}
                        depthWrite={false}
                    />
                </mesh>
            )}
        </group>
    )
})
