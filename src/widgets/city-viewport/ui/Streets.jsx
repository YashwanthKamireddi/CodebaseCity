import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import { detectDeviceTier } from '../../../shared/perf/deviceTier'

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

const ROAD_WIDTH = 16          // world units
const PERIMETER_INSET = 80     // distance from city edge to ring road
const ROAD_Y = -0.07           // sits just above DistrictFloors (-0.06)
const JUNCTION_Y = -0.06       // junctions on top to mask the lane lines

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
    return new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
        uniforms: {
            uHigh: { value: highTier ? 1.0 : 0.0 },
        },
        vertexShader: `
            varying vec3 vWorldPos;
            varying vec3 vLocalPos;
            varying vec2 vScale;
            varying float vAxis; // 0 = horizontal (long X), 1 = vertical (long Z)
            void main() {
                vec4 wp = modelMatrix * instanceMatrix * vec4(position, 1.0);
                vWorldPos = wp.xyz;
                vLocalPos = position;
                // Plane is built in XY then rotated -π/2 around X so it
                // lies on world XZ. Column 0 carries world-X scale; column
                // 1 carries world-Z scale (was original Y → world Z after
                // rotate). Column 2 is always 1 (the unit Z) — DON'T read
                // it. This was the "vertical roads silently shaded as
                // horizontal" bug.
                vScale = vec2(length(instanceMatrix[0].xyz),
                              length(instanceMatrix[1].xyz));
                vAxis = vScale.x > vScale.y ? 0.0 : 1.0;
                gl_Position = projectionMatrix * viewMatrix * wp;
            }
        `,
        fragmentShader: `
            uniform float uHigh;
            varying vec3 vWorldPos;
            varying vec3 vLocalPos;
            varying vec2 vScale;
            varying float vAxis;
            void main() {
                // Asphalt base — nearly black, very faint cool tint
                vec3 asphalt = vec3(0.07, 0.075, 0.085);

                // Edge stripes — solid thin bright lines along the road's
                // outer edges so the road's silhouette is crisp from far.
                float edgeFromCenter;
                if (vAxis < 0.5) {
                    // Horizontal road — outer edge is along z (local y)
                    edgeFromCenter = abs(vLocalPos.y) * vScale.y;
                    float halfW = vScale.y * 0.5;
                    float edge = smoothstep(halfW - 0.6, halfW - 0.1, edgeFromCenter);
                    asphalt = mix(asphalt, vec3(0.85, 0.85, 0.88), edge * 0.85);
                } else {
                    edgeFromCenter = abs(vLocalPos.x) * vScale.x;
                    float halfW = vScale.x * 0.5;
                    float edge = smoothstep(halfW - 0.6, halfW - 0.1, edgeFromCenter);
                    asphalt = mix(asphalt, vec3(0.85, 0.85, 0.88), edge * 0.85);
                }

                // Centre line — dashed yellow, only on high tier
                if (uHigh > 0.5) {
                    float centre = vAxis < 0.5
                        ? abs(vLocalPos.y) * vScale.y
                        : abs(vLocalPos.x) * vScale.x;
                    float along = vAxis < 0.5 ? vWorldPos.x : vWorldPos.z;
                    float dashOn = step(0.5, fract(along / 6.0));
                    float lineMask = smoothstep(0.6, 0.0, centre);
                    asphalt = mix(asphalt, vec3(0.95, 0.78, 0.30), lineMask * dashOn * 0.85);
                }

                gl_FragColor = vec4(asphalt, 1.0);
            }
        `,
    })
}

function makeJunctionMaterial() {
    return new THREE.MeshBasicMaterial({
        color: '#0a0c12',
        transparent: true,
        depthWrite: false,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
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
        </group>
    )
})

export default Streets
