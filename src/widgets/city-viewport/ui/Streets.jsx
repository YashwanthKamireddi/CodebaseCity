import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import { detectDeviceTier } from '../../../shared/perf/deviceTier'
import { BLOOM_LAYER } from '../post/Post'

/**
 * Streets — proper road grid connecting every district.
 *
 * The previous Roads.jsx (1037 lines, fallback grid + roundabouts)
 * stopped scaling correctly when the district cell size formula was
 * bumped (Mega-Phase A). Districts were no longer connected; gaps
 * between them were empty black voids.
 *
 * This is a clean rewrite. Strategy:
 *
 *   1. Find the unique row Y-positions and column X-positions of the
 *      district grid by clustering district.center coordinates.
 *   2. Compute the seam (gap) line midway between each adjacent pair
 *      of rows / columns. Roads sit ON those seams.
 *   3. Draw horizontal seams as long box meshes spanning the city's
 *      X extent, vertical seams spanning the Z extent. Where they
 *      cross, a junction patch is drawn on top.
 *   4. Add a perimeter boulevard around the whole city — the
 *      ring-road that gives the metropolis a visible boundary.
 *
 * All segments + junctions render via a single InstancedMesh with a
 * shared dark-asphalt material plus a procedural dashed centre line.
 * Tier-gated: low tier renders the asphalt only (no centre line).
 */

const ROAD_WIDTH = 26          // bumped wider — was getting lost at city-overview scale
const PERIMETER_INSET = 80
const ROAD_Y = 0.5             // well above DistrictFloors (-0.06) and ground (-0.12)
const JUNCTION_Y = 0.6
const TRAFFIC_Y = 1.0          // traffic dots ride visibly above the road

function clusterAxis(values, eps = 30) {
    if (values.length === 0) return []
    const sorted = [...values].sort((a, b) => a - b)
    const clusters = [[sorted[0]]]
    for (let i = 1; i < sorted.length; i++) {
        const last = clusters[clusters.length - 1]
        if (sorted[i] - last[last.length - 1] < eps) {
            last.push(sorted[i])
        } else {
            clusters.push([sorted[i]])
        }
    }
    // Return cluster centroids
    return clusters.map(c => c.reduce((s, v) => s + v, 0) / c.length)
}

function computeStreetGeometry(districts) {
    if (!districts?.length) return null

    // Cluster x and z coordinates of district centres → axis lines
    const xs = clusterAxis(districts.map(d => d.center?.x ?? 0))
    const zs = clusterAxis(districts.map(d => d.center?.y ?? 0))

    if (xs.length === 0 || zs.length === 0) return null

    // Compute per-row/col cell sizes so we know where the seams are
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const d of districts) {
        if (!d.boundary) continue
        for (const p of d.boundary) {
            if (p.x < minX) minX = p.x
            if (p.x > maxX) maxX = p.x
            if (p.y < minZ) minZ = p.y
            if (p.y > maxZ) maxZ = p.y
        }
    }
    minX -= PERIMETER_INSET; maxX += PERIMETER_INSET
    minZ -= PERIMETER_INSET; maxZ += PERIMETER_INSET

    // Seam lines — midway between adjacent column / row centroids
    const seamX = []
    for (let i = 0; i < xs.length - 1; i++) seamX.push((xs[i] + xs[i + 1]) / 2)
    const seamZ = []
    for (let i = 0; i < zs.length - 1; i++) seamZ.push((zs[i] + zs[i + 1]) / 2)

    const segments = []
    // Vertical segments (constant X, span Z)
    for (const x of seamX) {
        segments.push({
            cx: x, cz: (minZ + maxZ) / 2,
            sx: ROAD_WIDTH, sz: maxZ - minZ,
            axis: 'v',
        })
    }
    // Horizontal segments (constant Z, span X)
    for (const z of seamZ) {
        segments.push({
            cx: (minX + maxX) / 2, cz: z,
            sx: maxX - minX, sz: ROAD_WIDTH,
            axis: 'h',
        })
    }
    // Perimeter boulevard — four sides
    const cityCx = (minX + maxX) / 2
    const cityCz = (minZ + maxZ) / 2
    const cityW = maxX - minX
    const cityD = maxZ - minZ
    segments.push(
        { cx: cityCx, cz: minZ, sx: cityW, sz: ROAD_WIDTH, axis: 'h' },  // north
        { cx: cityCx, cz: maxZ, sx: cityW, sz: ROAD_WIDTH, axis: 'h' },  // south
        { cx: minX, cz: cityCz, sx: ROAD_WIDTH, sz: cityD, axis: 'v' },  // west
        { cx: maxX, cz: cityCz, sx: ROAD_WIDTH, sz: cityD, axis: 'v' },  // east
    )

    // Junctions — every (seamX, seamZ) cross + the four perimeter corners
    const allXs = [minX, ...seamX, maxX]
    const allZs = [minZ, ...seamZ, maxZ]
    const junctions = []
    for (const jx of allXs) {
        for (const jz of allZs) {
            junctions.push({ cx: jx, cz: jz })
        }
    }

    return { segments, junctions, cityCx, cityCz, cityW, cityD }
}

function makeRoadMaterial(highTier) {
    // Plain bright cyber-cyan asphalt. The previous custom shader was
    // mathematically correct but the dark base + thin edge band produced
    // sub-pixel results from city overview, so the user reported the
    // roads as "completely black". MeshBasicMaterial with a saturated
    // bright color renders at every distance and toneMapped:false keeps
    // it crisp through the post pipeline.
    return new THREE.MeshBasicMaterial({
        color: '#1ec5b6',
        toneMapped: false,
    })
}

function makeJunctionMaterial() {
    // Brighter than the road so junctions read as "where roads meet"
    return new THREE.MeshBasicMaterial({
        color: '#3ae0d2',
        toneMapped: false,
    })
}

const _o = new THREE.Object3D()

const Streets = React.memo(function Streets() {
    const districts = useStore(s => s.cityData?.districts)
    const tier = useMemo(() => detectDeviceTier(), [])

    const data = useMemo(() => computeStreetGeometry(districts), [districts])

    const roadMat = useMemo(() => makeRoadMaterial(tier.tier !== 'low'), [tier])
    const junctionMat = useMemo(() => makeJunctionMaterial(), [])

    const segMeshRef = React.useRef()
    const juncMeshRef = React.useRef()

    React.useEffect(() => {
        return () => {
            roadMat.dispose()
            junctionMat.dispose()
        }
    }, [roadMat, junctionMat])

    // Roads opt onto bloom layer so SelectiveBloom catches the cyan neon
    // edges. Junctions stay off the bloom layer (they're meant to mask
    // edge stripes at intersections — bloom would defeat that).
    React.useEffect(() => {
        if (segMeshRef.current) segMeshRef.current.layers.enable(BLOOM_LAYER)
    }, [data])

    React.useLayoutEffect(() => {
        if (!data) return
        const segMesh = segMeshRef.current
        if (segMesh) {
            data.segments.forEach((s, i) => {
                _o.position.set(s.cx, ROAD_Y, s.cz)
                _o.rotation.set(-Math.PI / 2, 0, 0)
                _o.scale.set(s.sx, s.sz, 1)
                _o.updateMatrix()
                segMesh.setMatrixAt(i, _o.matrix)
            })
            segMesh.instanceMatrix.needsUpdate = true
            segMesh.geometry.boundingSphere = new THREE.Sphere(
                new THREE.Vector3(0, 0, 0),
                Math.max(data.cityW, data.cityD)
            )
        }
        const juncMesh = juncMeshRef.current
        if (juncMesh) {
            data.junctions.forEach((j, i) => {
                _o.position.set(j.cx, JUNCTION_Y, j.cz)
                _o.rotation.set(-Math.PI / 2, 0, 0)
                _o.scale.set(ROAD_WIDTH * 1.05, ROAD_WIDTH * 1.05, 1)
                _o.updateMatrix()
                juncMesh.setMatrixAt(i, _o.matrix)
            })
            juncMesh.instanceMatrix.needsUpdate = true
            juncMesh.geometry.boundingSphere = new THREE.Sphere(
                new THREE.Vector3(0, 0, 0),
                Math.max(data.cityW, data.cityD)
            )
        }
    }, [data])

    if (!data) return null

    return (
        <group>
            <instancedMesh
                key={`streets-${data.segments.length}`}
                ref={segMeshRef}
                args={[null, null, data.segments.length]}
                frustumCulled={false}
            >
                <planeGeometry args={[1, 1]} />
                <primitive object={roadMat} attach="material" />
            </instancedMesh>
            <instancedMesh
                key={`juncs-${data.junctions.length}`}
                ref={juncMeshRef}
                args={[null, null, data.junctions.length]}
                frustumCulled={false}
            >
                <planeGeometry args={[1, 1]} />
                <primitive object={junctionMat} attach="material" />
            </instancedMesh>
            {tier.tier !== 'low' && <Traffic segments={data.segments} />}
        </group>
    )
})

/**
 * Traffic — animated bright dots travelling along each road segment.
 * Catches SelectiveBloom so the city looks alive from any altitude.
 *
 * Three dots per segment, evenly phased, random forward/back direction.
 * Speed scales inversely with segment length so visual pace stays
 * consistent — short streets and long avenues both feel "the same
 * traffic flow", not "long avenue stuff slow".
 */
function Traffic({ segments }) {
    const meshRef = useRef()
    const trafficData = useMemo(() => {
        const dots = []
        const PER_SEG = 3
        for (const seg of segments) {
            const isHorizontal = seg.sx > seg.sz
            const length = isHorizontal ? seg.sx : seg.sz
            for (let i = 0; i < PER_SEG; i++) {
                dots.push({
                    cx: seg.cx,
                    cz: seg.cz,
                    isHorizontal,
                    length,
                    phase: i / PER_SEG + Math.random() * 0.05,
                    direction: Math.random() < 0.5 ? 1 : -1,
                    speed: 22 / length,   // ~22 world-units/sec, normalized
                })
            }
        }
        return dots
    }, [segments])

    React.useEffect(() => {
        if (meshRef.current) meshRef.current.layers.enable(BLOOM_LAYER)
    }, [trafficData.length])

    useFrame((state, delta) => {
        const mesh = meshRef.current
        if (!mesh) return
        const d = Math.min(0.05, delta)  // clamp delta on slow frames
        for (let i = 0; i < trafficData.length; i++) {
            const td = trafficData[i]
            td.phase = (td.phase + d * td.speed * td.direction + 1) % 1
            const offset = (td.phase - 0.5) * td.length
            const x = td.isHorizontal ? td.cx + offset : td.cx
            const z = td.isHorizontal ? td.cz : td.cz + offset
            _o.position.set(x, TRAFFIC_Y, z)
            _o.rotation.set(0, 0, 0)
            _o.scale.set(2.4, 2.4, 2.4)
            _o.updateMatrix()
            mesh.setMatrixAt(i, _o.matrix)
        }
        mesh.instanceMatrix.needsUpdate = true
        // Demand-rendering: keep traffic ticking even when nothing else
        // requests a frame. Single invalidate per frame is cheap.
        state.invalidate()
    })

    if (trafficData.length === 0) return null

    return (
        <instancedMesh
            key={`traffic-${trafficData.length}`}
            ref={meshRef}
            args={[null, null, trafficData.length]}
            frustumCulled={false}
        >
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial color="#ffe8a8" toneMapped={false} />
        </instancedMesh>
    )
}

export default Streets
