/**
 * Roads.jsx — Tron Expressway System
 *
 * Building-aware road grid with premium futuristic shader visuals.
 * Projects building footprints onto X/Z axes, merges intervals,
 * places roads only in verified free corridors.
 *
 * Features:
 * - Circuit-board surface pattern with animated energy waves
 * - Neon edge barriers with bloom-contributing glow
 * - Holographic lane markings and directional flow arrows
 * - Scanning intersection nodes with rotating rings
 * - Glowing data-stream traffic particles
 * - Safe buffer management (key-based remount prevents GPU resize crashes)
 */
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const ROAD_Y = 0.02
const ROAD_WIDTH = 10
const MIN_CORRIDOR = 8
const BUILDING_MARGIN = 2

/* ═══════════════════════════════════════════════════════════════
   GLSL — Shared Vertex
   ═══════════════════════════════════════════════════════════════ */

const ROAD_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

/* ═══════════════════════════════════════════════════════════════
   GLSL — Road Surface (Tron Expressway)
   ═══════════════════════════════════════════════════════════════ */

const ROAD_FRAG = /* glsl */ `
uniform float uLength;
uniform float uTime;
uniform float uIsAvenue;
varying vec2 vUv;

void main() {
    float u = vUv.x * uLength;
    float v = vUv.y;

    // ─── 1. Carbon-fiber base ───
    vec3 base = vec3(0.012, 0.015, 0.032);
    // Fine grid texture
    float gridX = abs(sin(u * 2.0)) * abs(sin(v * 12.0));
    base += vec3(0.003, 0.005, 0.01) * gridX;

    // ─── 2. Circuit trace pattern (PCB-like) ───
    float t1 = smoothstep(0.001, 0.0, abs(v - 0.18) - 0.0008) * 0.12;
    float t2 = smoothstep(0.001, 0.0, abs(v - 0.82) - 0.0008) * 0.12;
    // Vertical connectors (periodic along road)
    float vConn = smoothstep(0.002, 0.0, abs(fract(u * 0.08) - 0.5) - 0.001) * 0.06;
    float circuits = t1 + t2 + vConn * step(0.18, v) * step(v, 0.82);

    // ─── 3. Neon edge barriers (bright for bloom) ───
    float ew = 0.018;
    float eAA = 0.012;
    float edgeL = smoothstep(ew + eAA, ew * 0.3, v);
    float edgeR = smoothstep(1.0 - ew - eAA, 1.0 - ew * 0.3, v);
    float edges = max(edgeL, edgeR);
    float edgePulse = 0.65 + 0.35 * sin(u * 0.18 - uTime * 2.8);
    vec3 edgeColor = vec3(0.0, 0.9, 1.0) * edgePulse * 1.8;

    // Edge underglow (wider soft spread)
    float glowL = smoothstep(0.10, 0.0, v) * 0.12;
    float glowR = smoothstep(0.90, 1.0, v) * 0.12;

    // ─── 4. Inner guide rails (subtle) ───
    float igw = 0.005;
    float ig1 = smoothstep(igw, 0.0, abs(v - 0.13)) * 0.10;
    float ig2 = smoothstep(igw, 0.0, abs(v - 0.87)) * 0.10;

    // ─── 5. Center dashed line (holographic) ───
    float cw = 0.005;
    float cMask = smoothstep(0.5 - cw - 0.004, 0.5 - cw, v) *
                  (1.0 - smoothstep(0.5 + cw, 0.5 + cw + 0.004, v));
    float dashPhase = u - uTime * 10.0;
    float dash = smoothstep(0.35, 0.45, fract(dashPhase / 7.0)) *
                 (1.0 - smoothstep(0.75, 0.85, fract(dashPhase / 7.0)));
    float centerLine = cMask * dash;

    // ─── 6. Directional flow arrows ───
    float arrowSpacing = 25.0;
    float au = mod(u - uTime * 6.0, arrowSpacing);
    // Arrow shape: chevron pointing in travel direction
    float arrowBody = step(0.0, au) * step(au, 4.0);
    float arrowV = abs(v - 0.5);
    // V-shape: narrows to point as au increases
    float arrowEdge = smoothstep(0.003, 0.0, abs(arrowV - (0.06 - au * 0.015)));
    float arrow = arrowBody * arrowEdge * 0.25;

    // ─── 7. Avenue lane dividers ───
    float lanes = 0.0;
    if (uIsAvenue > 0.5) {
        float lw = 0.004;
        float l1 = smoothstep(lw, 0.0, abs(v - 0.33)) * 0.20;
        float l2 = smoothstep(lw, 0.0, abs(v - 0.67)) * 0.20;
        float lDash = step(mod(u - uTime * 5.0, 6.0), 3.0);
        lanes = (l1 + l2) * lDash;
    }

    // ─── 8. Dual energy waves ───
    float wave1Pos = mod(u - uTime * 25.0, 100.0);
    float wave1 = exp(-wave1Pos * wave1Pos / 25.0) * 0.18;
    float wave2Pos = mod(u - uTime * 20.0 + 50.0, 100.0);
    float wave2 = exp(-wave2Pos * wave2Pos / 18.0) * 0.10;

    // ─── 9. Data stream markers ───
    float dotSpacing = 18.0;
    float dotPhase = mod(u - uTime * 15.0, dotSpacing);
    float dotMask = exp(-dotPhase * dotPhase / 0.6);
    float dot1 = dotMask * smoothstep(0.015, 0.0, abs(v - 0.25)) * 0.25;
    float dot2 = dotMask * smoothstep(0.015, 0.0, abs(v - 0.75)) * 0.25;

    // ─── COMPOSE ───
    vec3 color = base;
    color += vec3(0.0, 0.25, 0.45) * circuits;
    color += edgeColor * edges;
    color += vec3(0.0, 0.5, 0.8) * (glowL + glowR);
    color += vec3(0.0, 0.55, 0.8) * (ig1 + ig2);
    color += vec3(0.25, 0.8, 1.0) * centerLine * 0.55;
    color += vec3(0.0, 0.7, 0.9) * arrow;
    color += vec3(0.0, 0.45, 0.75) * lanes;
    color += vec3(0.15, 0.55, 1.0) * (wave1 + wave2);
    color += vec3(0.0, 1.0, 0.85) * (dot1 + dot2);

    // Edge fade
    float edgeFade = smoothstep(0.0, 0.06, v) * smoothstep(1.0, 0.94, v);
    color *= 0.75 + 0.25 * edgeFade;

    gl_FragColor = vec4(color, 0.90);
}
`

/* ═══════════════════════════════════════════════════════════════
   GLSL — Intersection Node (Scanning Crossroads)
   ═══════════════════════════════════════════════════════════════ */

const ISECT_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

void main() {
    vec2 p = vUv * 2.0 - 1.0;
    float r = length(p);
    float angle = atan(p.y, p.x);

    vec3 color = vec3(0.012, 0.015, 0.032);

    // Rotating scan beam
    float scanAngle = mod(uTime * 1.8, 6.2832);
    float angleDiff = abs(mod(angle - scanAngle + 3.14159, 6.28318) - 3.14159);
    float scanBeam = exp(-angleDiff * angleDiff * 12.0) * smoothstep(0.8, 0.2, r) * 0.35;

    // Concentric rings (pulsing outward)
    float ringPhase = r * 8.0 - uTime * 2.5;
    float rings = exp(-pow(fract(ringPhase) - 0.5, 2.0) * 30.0) * 0.20 * smoothstep(0.8, 0.3, r);

    // Inner bright ring
    float innerRing = exp(-pow(r - 0.15, 2.0) * 200.0) * 0.35;
    // Outer boundary ring
    float outerRing = exp(-pow(r - 0.65, 2.0) * 80.0) * 0.25;

    // Crosshair
    float ch = (smoothstep(0.006, 0.0, abs(p.x)) + smoothstep(0.006, 0.0, abs(p.y)));
    ch *= smoothstep(0.7, 0.4, r) * 0.12;

    // Diagonal accent
    float diag = (smoothstep(0.004, 0.0, abs(p.x - p.y)) + smoothstep(0.004, 0.0, abs(p.x + p.y)));
    diag *= smoothstep(0.5, 0.25, r) * 0.06;

    // Center glow
    float center = exp(-r * r * 12.0) * 0.4;

    // Rotating tick marks (12 positions like a clock)
    float tickAngle = mod(angle + uTime * 0.5, 0.5236); // pi/6
    float tick = smoothstep(0.008, 0.0, abs(tickAngle - 0.2618)) *
                 smoothstep(0.55, 0.60, r) * smoothstep(0.70, 0.65, r) * 0.3;

    color += vec3(0.0, 0.8, 1.0) * (scanBeam + rings + innerRing + outerRing + ch + center);
    color += vec3(0.1, 0.4, 0.9) * (diag + tick);

    float alpha = 0.75 * smoothstep(1.0, 0.65, r);
    gl_FragColor = vec4(color, alpha);
}
`

/* ═══════════════════════════════════════════════════════════════
   GLSL — Traffic Particle Shader (glowing data packets)
   ═══════════════════════════════════════════════════════════════ */

const TRAFFIC_VERT = /* glsl */ `
attribute float aPhase;
varying float vPhase;
void main() {
    vPhase = aPhase;
    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_PointSize = (4.0 + 3.0 * sin(aPhase * 6.28)) * (180.0 / max(-mvPos.z, 1.0));
    gl_Position = projectionMatrix * mvPos;
}
`

const TRAFFIC_FRAG = /* glsl */ `
uniform float uTime;
varying float vPhase;
void main() {
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    // Soft glow circle
    float glow = exp(-r * r * 12.0);
    // Pulsing brightness
    float pulse = 0.7 + 0.3 * sin(uTime * 3.5 + vPhase * 6.28);
    // Color — mostly cyan-white core with outer blue
    vec3 inner = vec3(0.6, 0.95, 1.0);
    vec3 outer = vec3(0.0, 0.5, 1.0);
    vec3 color = mix(outer, inner, glow) * pulse * 1.6;
    float alpha = glow * 0.85;
    if (alpha < 0.02) discard;
    gl_FragColor = vec4(color, alpha);
}
`

/* ═══════════════════════════════════════════════════════════════
   Building-Aware Road Grid Computation
   ═══════════════════════════════════════════════════════════════ */

function mergeIntervals(intervals) {
    if (intervals.length === 0) return []
    intervals.sort((a, b) => a[0] - b[0])
    const merged = [intervals[0].slice()]
    for (let i = 1; i < intervals.length; i++) {
        const last = merged[merged.length - 1]
        if (intervals[i][0] <= last[1] + 0.1) {
            last[1] = Math.max(last[1], intervals[i][1])
        } else {
            merged.push(intervals[i].slice())
        }
    }
    return merged
}

function computeRoadGrid(buildings) {
    if (!buildings || buildings.length === 0) return { segments: [], intersections: [] }

    const footprints = []
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity

    for (const b of buildings) {
        if (!b.position || !b.dimensions) continue
        const hw = (b.dimensions.width || 4) / 2 + BUILDING_MARGIN
        const hd = (b.dimensions.depth || b.dimensions.width || 4) / 2 + BUILDING_MARGIN
        const x = b.position.x
        const z = b.position.z || 0
        footprints.push({ xMin: x - hw, xMax: x + hw, zMin: z - hd, zMax: z + hd })
        if (x - hw < minX) minX = x - hw
        if (x + hw > maxX) maxX = x + hw
        if (z - hd < minZ) minZ = z - hd
        if (z + hd > maxZ) maxZ = z + hd
    }

    if (footprints.length === 0) return { segments: [], intersections: [] }

    const pad = 20
    minX -= pad; maxX += pad; minZ -= pad; maxZ += pad

    // Project footprints onto X-axis → find vertical road corridors
    const mergedX = mergeIntervals(footprints.map(f => [f.xMin, f.xMax]))

    const vRoads = []
    if (mergedX[0][0] - minX > MIN_CORRIDOR)
        vRoads.push({ cx: (minX + mergedX[0][0]) / 2, width: mergedX[0][0] - minX, isPerimeter: true })
    for (let i = 0; i < mergedX.length - 1; i++) {
        const gap = mergedX[i + 1][0] - mergedX[i][1]
        if (gap >= MIN_CORRIDOR)
            vRoads.push({ cx: (mergedX[i][1] + mergedX[i + 1][0]) / 2, width: gap, isPerimeter: false })
    }
    if (maxX - mergedX[mergedX.length - 1][1] > MIN_CORRIDOR)
        vRoads.push({ cx: (mergedX[mergedX.length - 1][1] + maxX) / 2, width: maxX - mergedX[mergedX.length - 1][1], isPerimeter: true })

    // Project footprints onto Z-axis → find horizontal road corridors
    const mergedZ = mergeIntervals(footprints.map(f => [f.zMin, f.zMax]))

    const hRoads = []
    if (mergedZ[0][0] - minZ > MIN_CORRIDOR)
        hRoads.push({ cz: (minZ + mergedZ[0][0]) / 2, width: mergedZ[0][0] - minZ, isPerimeter: true })
    for (let i = 0; i < mergedZ.length - 1; i++) {
        const gap = mergedZ[i + 1][0] - mergedZ[i][1]
        if (gap >= MIN_CORRIDOR)
            hRoads.push({ cz: (mergedZ[i][1] + mergedZ[i + 1][0]) / 2, width: gap, isPerimeter: false })
    }
    if (maxZ - mergedZ[mergedZ.length - 1][1] > MIN_CORRIDOR)
        hRoads.push({ cz: (mergedZ[mergedZ.length - 1][1] + maxZ) / 2, width: maxZ - mergedZ[mergedZ.length - 1][1], isPerimeter: true })

    // Build segments
    const segments = []
    for (const vr of vRoads) {
        segments.push({ start: [vr.cx, ROAD_Y, minZ], end: [vr.cx, ROAD_Y, maxZ], axis: 'z', isMainAvenue: vr.width > 20 })
    }
    for (const hr of hRoads) {
        segments.push({ start: [minX, ROAD_Y, hr.cz], end: [maxX, ROAD_Y, hr.cz], axis: 'x', isMainAvenue: hr.width > 20 })
    }

    // Intersections
    const intersections = []
    const vSegs = segments.filter(s => s.axis === 'z')
    const hSegs = segments.filter(s => s.axis === 'x')
    for (const vs of vSegs) {
        for (const hs of hSegs) {
            intersections.push([vs.start[0], ROAD_Y + 0.01, hs.start[2]])
        }
    }

    return { segments, intersections }
}

/* ═══════════════════════════════════════════════════════════════
   Components
   ═══════════════════════════════════════════════════════════════ */

export default function Roads() {
    const buildings = useStore(s => s.cityData?.buildings)

    const { segments, intersections } = useMemo(
        () => computeRoadGrid(buildings),
        [buildings]
    )

    if (segments.length === 0) return null

    return (
        <group>
            {segments.map((seg, i) => (
                <RoadSegment key={`${i}-${seg.start[0].toFixed(1)}`} segment={seg} />
            ))}
            {intersections.slice(0, 200).map((pos, i) => (
                <IntersectionNode key={`int-${i}-${pos[0].toFixed(1)}`} position={pos} />
            ))}
            <TrafficFlow key={segments.length} segments={segments} />
        </group>
    )
}

/**
 * RoadSegment — Single road with premium shader
 */
function RoadSegment({ segment }) {
    const { start, end, axis, isMainAvenue } = segment
    const width = isMainAvenue ? ROAD_WIDTH : ROAD_WIDTH * 0.75

    const length = axis === 'x'
        ? Math.abs(end[0] - start[0])
        : Math.abs(end[2] - start[2])

    const cx = (start[0] + end[0]) / 2
    const cz = (start[2] + end[2]) / 2
    const rotY = axis === 'x' ? 0 : Math.PI / 2

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uLength: { value: length },
            uTime: { value: 0 },
            uIsAvenue: { value: isMainAvenue ? 1.0 : 0.0 },
        },
        vertexShader: ROAD_VERT,
        fragmentShader: ROAD_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
    }), [length, isMainAvenue])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
    })

    useEffect(() => () => material.dispose(), [material])

    return (
        <mesh position={[cx, ROAD_Y, cz]} rotation={[-Math.PI / 2, 0, rotY]} raycast={() => null}>
            <planeGeometry args={[length, width]} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

/**
 * IntersectionNode — Animated scanning crossroads
 */
function IntersectionNode({ position }) {
    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: ROAD_VERT,
        fragmentShader: ISECT_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), [])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
    })

    useEffect(() => () => material.dispose(), [material])

    return (
        <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} raycast={() => null}>
            <planeGeometry args={[ROAD_WIDTH, ROAD_WIDTH]} />
            <primitive object={material} attach="material" />
        </mesh>
    )
}

/**
 * TrafficFlow — Glowing data-stream particles
 *
 * Uses imperative geometry construction to avoid Three.js buffer resize crashes.
 * The parent passes key={segments.length} to force remount when road count changes.
 */
function TrafficFlow({ segments }) {
    const pointsRef = useRef()
    const velocitiesRef = useRef([])

    const count = useMemo(() => Math.min(segments.length * 4, 400), [segments])

    // Build geometry imperatively — avoids buffer resize errors
    useEffect(() => {
        if (!pointsRef.current || count === 0) return

        const positions = new Float32Array(count * 3)
        const phases = new Float32Array(count)
        const vel = []

        for (let i = 0; i < count; i++) {
            const seg = segments[i % segments.length]
            const t = Math.random()

            positions[i * 3 + 0] = seg.start[0] + (seg.end[0] - seg.start[0]) * t
            positions[i * 3 + 1] = ROAD_Y + 0.4
            positions[i * 3 + 2] = seg.start[2] + (seg.end[2] - seg.start[2]) * t

            const speed = (0.6 + Math.random() * 1.4) * (Math.random() > 0.5 ? 1 : -1)
            vel.push({
                axis: seg.axis,
                speed,
                min: Math.min(seg.start[seg.axis === 'x' ? 0 : 2], seg.end[seg.axis === 'x' ? 0 : 2]),
                max: Math.max(seg.start[seg.axis === 'x' ? 0 : 2], seg.end[seg.axis === 'x' ? 0 : 2]),
            })

            phases[i] = Math.random()
        }

        velocitiesRef.current = vel

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1))

        const old = pointsRef.current.geometry
        pointsRef.current.geometry = geo
        if (old) old.dispose()
    }, [segments, count])

    // Build material once
    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: TRAFFIC_VERT,
        fragmentShader: TRAFFIC_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame((state, delta) => {
        if (!pointsRef.current?.geometry?.attributes?.position) return
        material.uniforms.uTime.value = state.clock.elapsedTime

        const pos = pointsRef.current.geometry.attributes.position.array
        const vel = velocitiesRef.current

        for (let i = 0; i < vel.length; i++) {
            const v = vel[i]
            const idx = v.axis === 'x' ? i * 3 : i * 3 + 2
            pos[idx] += v.speed * delta * 15

            if (pos[idx] > v.max) pos[idx] = v.min
            if (pos[idx] < v.min) pos[idx] = v.max
        }

        pointsRef.current.geometry.attributes.position.needsUpdate = true
    })

    useEffect(() => () => material.dispose(), [material])

    if (count === 0) return null

    return <points ref={pointsRef} material={material} raycast={() => null} />
}
