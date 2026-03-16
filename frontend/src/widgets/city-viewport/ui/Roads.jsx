/**
 * Roads.jsx — District-Aligned Road Network with Roundabouts
 *
 * Roads are placed along district boundaries (gaps between districts).
 * Roundabouts at intersections and cul-de-sacs at dead ends.
 * ALL geometry merged into minimal draw calls.
 */
import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const ROAD_Y = 0.02
const ROAD_WIDTH = 14
const MAX_ROAD_SEGMENTS = 300
const ROUNDABOUT_RADIUS = 9
const MAX_ROUNDABOUTS = 40

/* ═══════════════════════════════════════════════════════════════
   GLSL — Road Vertex
   ═══════════════════════════════════════════════════════════════ */

const ROAD_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
attribute float aLength;
attribute float aIsAvenue;
varying vec2 vUv;
varying float vLength;
varying float vIsAvenue;
void main() {
    vUv = uv;
    vLength = aLength;
    vIsAvenue = aIsAvenue;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

/* ═══════════════════════════════════════════════════════════════
   GLSL — Road Surface
   ═══════════════════════════════════════════════════════════════ */

const ROAD_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec2 vUv;
varying float vLength;
varying float vIsAvenue;

void main() {
    float u = vUv.x * vLength;
    float v = vUv.y;

    // ─── 1. Carbon-fiber base ───
    vec3 base = vec3(0.012, 0.015, 0.032);
    float gridX = abs(sin(u * 2.0)) * abs(sin(v * 12.0));
    base += vec3(0.003, 0.005, 0.01) * gridX;

    // ─── 2. Circuit trace pattern (PCB-like) ───
    float t1 = smoothstep(0.001, 0.0, abs(v - 0.18) - 0.0008) * 0.12;
    float t2 = smoothstep(0.001, 0.0, abs(v - 0.82) - 0.0008) * 0.12;
    float vConn = smoothstep(0.002, 0.0, abs(fract(u * 0.08) - 0.5) - 0.001) * 0.06;
    float circuits = t1 + t2 + vConn * step(0.18, v) * step(v, 0.82);

    // ─── 3. Neon edge barriers ───
    float ew = 0.018;
    float eAA = 0.012;
    float edgeL = smoothstep(ew + eAA, ew * 0.3, v);
    float edgeR = smoothstep(1.0 - ew - eAA, 1.0 - ew * 0.3, v);
    float edges = max(edgeL, edgeR);
    float edgePulse = 0.65 + 0.35 * sin(u * 0.18 - uTime * 2.8);
    vec3 edgeColor = vec3(0.0, 0.9, 1.0) * edgePulse * 5.0;

    float glowL = smoothstep(0.10, 0.0, v) * 0.12;
    float glowR = smoothstep(0.90, 1.0, v) * 0.12;

    // ─── 4. Inner guide rails ───
    float igw = 0.005;
    float ig1 = smoothstep(igw, 0.0, abs(v - 0.13)) * 0.10;
    float ig2 = smoothstep(igw, 0.0, abs(v - 0.87)) * 0.10;

    // ─── 5. Center dashed line ───
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
    float arrowBody = step(0.0, au) * step(au, 4.0);
    float arrowV = abs(v - 0.5);
    float arrowEdge = smoothstep(0.003, 0.0, abs(arrowV - (0.06 - au * 0.015)));
    float arrow = arrowBody * arrowEdge * 0.25;

    // ─── 7. Avenue lane dividers ───
    float lanes = 0.0;
    if (vIsAvenue > 0.5) {
        float lw = 0.004;
        float l1 = smoothstep(lw, 0.0, abs(v - 0.33)) * 0.20;
        float l2 = smoothstep(lw, 0.0, abs(v - 0.67)) * 0.20;
        lanes = (l1 + l2) * step(mod(u - uTime * 5.0, 6.0), 3.0);
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
    color += vec3(0.0, 0.5, 0.8) * (glowL + glowR) * 2.0;
    color += vec3(0.0, 0.55, 0.8) * (ig1 + ig2) * 1.5;
    color += vec3(0.25, 0.8, 1.0) * centerLine * 2.0;
    color += vec3(0.0, 0.7, 0.9) * arrow * 2.0;
    color += vec3(0.0, 0.45, 0.75) * lanes * 1.5;
    color += vec3(0.15, 0.55, 1.0) * (wave1 + wave2) * 2.5;
    color += vec3(0.0, 1.0, 0.85) * (dot1 + dot2) * 4.0;

    float edgeFade = smoothstep(0.0, 0.06, v) * smoothstep(1.0, 0.94, v);
    color *= 0.75 + 0.25 * edgeFade;

    gl_FragColor = vec4(color, 0.90);
    #include <logdepthbuf_fragment>
}
`

/* ═══════════════════════════════════════════════════════════════
   GLSL — Roundabout Surface (radial shader)
   ═══════════════════════════════════════════════════════════════ */

const ROUNDABOUT_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

const ROUNDABOUT_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
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

    // Concentric rings pulsing outward
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

    // Rotating tick marks (12 positions)
    float tickAngle = mod(angle + uTime * 0.5, 0.5236);
    float tick = smoothstep(0.008, 0.0, abs(tickAngle - 0.2618)) *
                 smoothstep(0.55, 0.60, r) * smoothstep(0.70, 0.65, r) * 0.3;

    color += vec3(0.0, 0.8, 1.0) * (scanBeam + rings + innerRing + outerRing + ch + center) * 3.0;
    color += vec3(0.1, 0.4, 0.9) * (diag + tick) * 2.0;

    float alpha = 0.75 * smoothstep(1.0, 0.65, r);
    gl_FragColor = vec4(color, alpha);
    #include <logdepthbuf_fragment>
}
`

/* ═══════════════════════════════════════════════════════════════
   City-Style Road Network

   Roads are placed:
   1. Two main avenues through the city center (widest, animated)
   2. In the natural gaps between adjacent districts
   3. A perimeter boulevard around the outer edge
   Roundabouts at intersections where roads cross.
   ═══════════════════════════════════════════════════════════════ */

let _lastBuildingHash = ''
let _cachedRoadGrid = null

function rangesTouchOrOverlap(a0, a1, b0, b1, tol = 0) {
    const minA = Math.min(a0, a1)
    const maxA = Math.max(a0, a1)
    const minB = Math.min(b0, b1)
    const maxB = Math.max(b0, b1)
    return maxA + tol >= minB && maxB + tol >= minA
}

/** Merge segments on the same axis that are within `tol` distance */
function deduplicateSegments(segments, tol) {
    const result = []
    const used = new Uint8Array(segments.length)

    for (let i = 0; i < segments.length; i++) {
        if (used[i]) continue
        const s = segments[i]
        const merged = { ...s, start: [...s.start], end: [...s.end] }

        for (let j = i + 1; j < segments.length; j++) {
            if (used[j]) continue
            const o = segments[j]
            if (s.axis !== o.axis) continue

            if (s.axis === 'x') {
                // Both horizontal — merge if same z (within tol)
                if (
                    Math.abs(s.start[2] - o.start[2]) < tol &&
                    rangesTouchOrOverlap(s.start[0], s.end[0], o.start[0], o.end[0], tol * 2)
                ) {
                    merged.start[0] = Math.min(merged.start[0], o.start[0], o.end[0])
                    merged.end[0] = Math.max(merged.end[0], o.start[0], o.end[0])
                    merged.isMainAvenue = merged.isMainAvenue || o.isMainAvenue
                    used[j] = 1
                }
            } else {
                // Both vertical — merge if same x (within tol)
                if (
                    Math.abs(s.start[0] - o.start[0]) < tol &&
                    rangesTouchOrOverlap(s.start[2], s.end[2], o.start[2], o.end[2], tol * 2)
                ) {
                    merged.start[2] = Math.min(merged.start[2], o.start[2], o.end[2])
                    merged.end[2] = Math.max(merged.end[2], o.start[2], o.end[2])
                    merged.isMainAvenue = merged.isMainAvenue || o.isMainAvenue
                    used[j] = 1
                }
            }
        }

        result.push(merged)
    }
    return result
}

function computeCityBounds(buildings) {
    let gx0 = Infinity, gx1 = -Infinity, gz0 = Infinity, gz1 = -Infinity
    for (const b of buildings) {
        if (!b?.position) continue
        const x = b.position.x
        const z = b.position.z || 0
        if (x < gx0) gx0 = x
        if (x > gx1) gx1 = x
        if (z < gz0) gz0 = z
        if (z > gz1) gz1 = z
    }
    if (!Number.isFinite(gx0)) return null
    return { gx0, gx1, gz0, gz1 }
}

function computeRoadHash(buildings, districts, bounds) {
    const n = buildings.length
    const dCount = districts?.length || 0
    const step = Math.max(1, Math.floor(n / 64))
    let accum = 0
    for (let i = 0; i < n; i += step) {
        const b = buildings[i]
        const x = b?.position?.x || 0
        const z = b?.position?.z || 0
        accum += Math.round(x * 31 + z * 17)
    }
    return [
        n,
        dCount,
        Math.round(bounds.gx0), Math.round(bounds.gx1),
        Math.round(bounds.gz0), Math.round(bounds.gz1),
        accum,
    ].join(':')
}

function computeDistrictBoxes(districts) {
    if (!districts?.length) return []
    return districts.map(d => {
        if (!d?.boundary || d.boundary.length < 3) return null
        let x0 = Infinity, x1 = -Infinity, z0 = Infinity, z1 = -Infinity
        for (const p of d.boundary) {
            if (p.x < x0) x0 = p.x
            if (p.x > x1) x1 = p.x
            if (p.y < z0) z0 = p.y
            if (p.y > z1) z1 = p.y
        }
        if (!Number.isFinite(x0) || !Number.isFinite(z0)) return null
        return {
            x0, x1, z0, z1,
            cx: (x0 + x1) / 2,
            cz: (z0 + z1) / 2,
        }
    }).filter(Boolean)
}

function pickLocalMinima(values, minGap) {
    const sorted = [...values].sort((a, b) => a - b)
    const out = []
    for (const v of sorted) {
        if (out.every(prev => Math.abs(prev - v) >= minGap)) out.push(v)
    }
    return out
}

function pickCenteredLines(lines, center, maxLines) {
    return [...lines]
        .sort((a, b) => Math.abs(a - center) - Math.abs(b - center))
        .slice(0, maxLines)
        .sort((a, b) => a - b)
}

function segmentLength(seg) {
    return seg.axis === 'x'
        ? Math.abs(seg.end[0] - seg.start[0])
        : Math.abs(seg.end[2] - seg.start[2])
}

function buildFallbackGrid(buildings, bounds, pad) {
    const n = buildings.length
    const cityW = Math.max(1, bounds.gx1 - bounds.gx0)
    const cityH = Math.max(1, bounds.gz1 - bounds.gz0)
    const area = cityW * cityH
    const spacing = Math.max(32, Math.min(180, Math.sqrt(area / Math.max(1, n)) * 2.2))

    const xLinesRaw = []
    const zLinesRaw = []
    for (const b of buildings) {
        if (!b?.position) continue
        const x = b.position.x
        const z = b.position.z || 0
        xLinesRaw.push(Math.round(x / spacing) * spacing)
        zLinesRaw.push(Math.round(z / spacing) * spacing)
    }

    const xLines = pickLocalMinima(xLinesRaw, spacing * 0.7)
    const zLines = pickLocalMinima(zLinesRaw, spacing * 0.7)

    const maxLines = n > 8000 ? 12 : n > 3000 ? 10 : 8
    const centerX = (bounds.gx0 + bounds.gx1) / 2
    const centerZ = (bounds.gz0 + bounds.gz1) / 2
    const limitedX = pickCenteredLines(xLines, centerX, maxLines)
    const limitedZ = pickCenteredLines(zLines, centerZ, maxLines)

    const segments = []
    for (const x of limitedX) {
        segments.push({
            start: [x, ROAD_Y, bounds.gz0 - pad],
            end: [x, ROAD_Y, bounds.gz1 + pad],
            axis: 'z',
            isMainAvenue: false,
            kind: 'grid',
        })
    }
    for (const z of limitedZ) {
        segments.push({
            start: [bounds.gx0 - pad, ROAD_Y, z],
            end: [bounds.gx1 + pad, ROAD_Y, z],
            axis: 'x',
            isMainAvenue: false,
            kind: 'grid',
        })
    }
    return segments
}

function buildDistrictConnectors(boxes, bounds, pad) {
    const segments = []
    const cityW = Math.max(1, bounds.gx1 - bounds.gx0)
    const cityH = Math.max(1, bounds.gz1 - bounds.gz0)
    const maxGapX = cityW * 0.28
    const maxGapZ = cityH * 0.28

    for (let i = 0; i < boxes.length; i++) {
        const a = boxes[i]

        // nearest right neighbor with overlap in Z
        let bestRight = null
        for (let j = 0; j < boxes.length; j++) {
            if (i === j) continue
            const b = boxes[j]
            if (b.cx <= a.cx) continue
            const zOverlap = Math.min(a.z1, b.z1) - Math.max(a.z0, b.z0)
            if (zOverlap < 12) continue
            const gap = b.x0 - a.x1
            if (gap <= 2 || gap > maxGapX) continue
            if (!bestRight || gap < bestRight.gap) bestRight = { b, gap, zOverlap }
        }

        if (bestRight) {
            const roadX = (a.x1 + bestRight.b.x0) / 2
            const roadZ0 = Math.max(a.z0, bestRight.b.z0) - 6
            const roadZ1 = Math.min(a.z1, bestRight.b.z1) + 6
            segments.push({
                start: [roadX, ROAD_Y, roadZ0],
                end: [roadX, ROAD_Y, roadZ1],
                axis: 'z',
                isMainAvenue: false,
                kind: 'connector',
            })
        }

        // nearest upper neighbor with overlap in X
        let bestUp = null
        for (let j = 0; j < boxes.length; j++) {
            if (i === j) continue
            const b = boxes[j]
            if (b.cz <= a.cz) continue
            const xOverlap = Math.min(a.x1, b.x1) - Math.max(a.x0, b.x0)
            if (xOverlap < 12) continue
            const gap = b.z0 - a.z1
            if (gap <= 2 || gap > maxGapZ) continue
            if (!bestUp || gap < bestUp.gap) bestUp = { b, gap, xOverlap }
        }

        if (bestUp) {
            const roadZ = (a.z1 + bestUp.b.z0) / 2
            const roadX0 = Math.max(a.x0, bestUp.b.x0) - 6
            const roadX1 = Math.min(a.x1, bestUp.b.x1) + 6
            segments.push({
                start: [roadX0, ROAD_Y, roadZ],
                end: [roadX1, ROAD_Y, roadZ],
                axis: 'x',
                isMainAvenue: false,
                kind: 'connector',
            })
        }
    }

    // Perimeter boulevard
    segments.push(
        { start: [bounds.gx0 - pad, ROAD_Y, bounds.gz0 - pad], end: [bounds.gx1 + pad, ROAD_Y, bounds.gz0 - pad], axis: 'x', isMainAvenue: false, kind: 'perimeter' },
        { start: [bounds.gx0 - pad, ROAD_Y, bounds.gz1 + pad], end: [bounds.gx1 + pad, ROAD_Y, bounds.gz1 + pad], axis: 'x', isMainAvenue: false, kind: 'perimeter' },
        { start: [bounds.gx0 - pad, ROAD_Y, bounds.gz0 - pad], end: [bounds.gx0 - pad, ROAD_Y, bounds.gz1 + pad], axis: 'z', isMainAvenue: false, kind: 'perimeter' },
        { start: [bounds.gx1 + pad, ROAD_Y, bounds.gz0 - pad], end: [bounds.gx1 + pad, ROAD_Y, bounds.gz1 + pad], axis: 'z', isMainAvenue: false, kind: 'perimeter' },
    )

    return segments
}

function computeIntersections(segments) {
    const hSegs = segments.filter(s => s.axis === 'x')
    const vSegs = segments.filter(s => s.axis === 'z')
    const minLen = 28
    const map = new Map()

    for (const h of hSegs) {
        if (h.kind === 'perimeter' || segmentLength(h) < minLen) continue
        const hz = h.start[2]
        const hx0 = Math.min(h.start[0], h.end[0])
        const hx1 = Math.max(h.start[0], h.end[0])
        for (const v of vSegs) {
            if (v.kind === 'perimeter' || segmentLength(v) < minLen) continue
            const vx = v.start[0]
            const vz0 = Math.min(v.start[2], v.end[2])
            const vz1 = Math.max(v.start[2], v.end[2])
            if (vx >= hx0 - 1 && vx <= hx1 + 1 && hz >= vz0 - 1 && hz <= vz1 + 1) {
                const qx = Math.round(vx / 3) * 3
                const qz = Math.round(hz / 3) * 3
                const key = `${qx}:${qz}`
                const score = (h.isMainAvenue ? 3 : 1) + (v.isMainAvenue ? 3 : 1)
                const prev = map.get(key)
                if (!prev || score > prev.count) {
                    map.set(key, { x: qx, z: qz, count: score })
                }
            }
        }
    }

    // Prefer intersections on major avenues first
    const out = [...map.values()]
    out.sort((a, b) => b.count - a.count)
    return out.slice(0, MAX_ROUNDABOUTS)
}

function clipSegmentsByIntersections(segments, intersections) {
    const gap = ROUNDABOUT_RADIUS + 1
    const clippedSegments = []

    for (const seg of segments) {
        if (seg.kind === 'perimeter') {
            clippedSegments.push(seg)
            continue
        }

        const clips = []
        for (const pt of intersections) {
            if (seg.axis === 'x') {
                if (Math.abs(seg.start[2] - pt.z) < 2) clips.push(pt.x)
            } else if (Math.abs(seg.start[0] - pt.x) < 2) {
                clips.push(pt.z)
            }
        }

        if (!clips.length) {
            clippedSegments.push(seg)
            continue
        }

        clips.sort((a, b) => a - b)
        const isX = seg.axis === 'x'
        let prev = isX ? Math.min(seg.start[0], seg.end[0]) : Math.min(seg.start[2], seg.end[2])
        const segEnd = isX ? Math.max(seg.start[0], seg.end[0]) : Math.max(seg.start[2], seg.end[2])

        const uniqueClips = []
        for (const c of clips) {
            if (!uniqueClips.length || Math.abs(uniqueClips[uniqueClips.length - 1] - c) > 6) {
                uniqueClips.push(c)
            }
        }

        for (const c of uniqueClips) {
            if (c - gap > prev + 5) {
                if (isX) {
                    clippedSegments.push({
                        start: [prev, ROAD_Y, seg.start[2]],
                        end: [c - gap, ROAD_Y, seg.start[2]],
                        axis: 'x',
                        isMainAvenue: seg.isMainAvenue,
                        kind: seg.kind,
                    })
                } else {
                    clippedSegments.push({
                        start: [seg.start[0], ROAD_Y, prev],
                        end: [seg.start[0], ROAD_Y, c - gap],
                        axis: 'z',
                        isMainAvenue: seg.isMainAvenue,
                        kind: seg.kind,
                    })
                }
            }
            prev = c + gap
        }

        if (segEnd > prev + 5) {
            if (isX) {
                clippedSegments.push({
                    start: [prev, ROAD_Y, seg.start[2]],
                    end: [segEnd, ROAD_Y, seg.start[2]],
                    axis: 'x',
                    isMainAvenue: seg.isMainAvenue,
                    kind: seg.kind,
                })
            } else {
                clippedSegments.push({
                    start: [seg.start[0], ROAD_Y, prev],
                    end: [seg.start[0], ROAD_Y, segEnd],
                    axis: 'z',
                    isMainAvenue: seg.isMainAvenue,
                    kind: seg.kind,
                })
            }
        }
    }

    return clippedSegments
}

function computeRoadGrid(buildings, districts) {
    if (!buildings?.length) return { segments: [], intersections: [] }

    const bounds = computeCityBounds(buildings)
    if (!bounds) return { segments: [], intersections: [] }

    const hash = computeRoadHash(buildings, districts, bounds)
    if (hash === _lastBuildingHash && _cachedRoadGrid) return _cachedRoadGrid

    const cityW = Math.max(1, bounds.gx1 - bounds.gx0)
    const cityH = Math.max(1, bounds.gz1 - bounds.gz0)
    const pad = Math.max(cityW, cityH) * 0.08
    const cx = (bounds.gx0 + bounds.gx1) / 2
    const cz = (bounds.gz0 + bounds.gz1) / 2

    const segments = [
        { start: [bounds.gx0 - pad, ROAD_Y, cz], end: [bounds.gx1 + pad, ROAD_Y, cz], axis: 'x', isMainAvenue: true, kind: 'main' },
        { start: [cx, ROAD_Y, bounds.gz0 - pad], end: [cx, ROAD_Y, bounds.gz1 + pad], axis: 'z', isMainAvenue: true, kind: 'main' },
    ]

    const boxes = computeDistrictBoxes(districts)
    if (boxes.length >= 2) {
        segments.push(...buildDistrictConnectors(boxes, bounds, pad))
    } else {
        segments.push(...buildFallbackGrid(buildings, bounds, pad))
    }

    // Merge only true contiguous lanes, not distant parallel roads.
    const mergedSegments = deduplicateSegments(segments, 10)
    const intersections = computeIntersections(mergedSegments)
    const clippedSegments = clipSegmentsByIntersections(mergedSegments, intersections)

    _lastBuildingHash = hash
    _cachedRoadGrid = {
        segments: clippedSegments.slice(0, MAX_ROAD_SEGMENTS),
        intersections,
    }
    return _cachedRoadGrid
}

/* ═══════════════════════════════════════════════════════════════
   Component — Roads with Roundabouts
   ═══════════════════════════════════════════════════════════════ */

export default React.memo(function Roads() {
    const buildings = useStore(s => s.cityData?.buildings)
    const districts = useStore(s => s.cityData?.districts)

    const { segments, intersections } = useMemo(
        () => computeRoadGrid(buildings, districts),
        [buildings, districts]
    )

    // Merge all road quads into ONE BufferGeometry
    const mergedGeometry = useMemo(() => {
        if (segments.length === 0) return null
        const count = Math.min(segments.length, MAX_ROAD_SEGMENTS)

        const positions = new Float32Array(count * 4 * 3)
        const uvs = new Float32Array(count * 4 * 2)
        const lengths = new Float32Array(count * 4)
        const avenues = new Float32Array(count * 4)
        const indices = new Uint16Array(count * 6)

        for (let s = 0; s < count; s++) {
            const seg = segments[s]
            const { start, end, axis, isMainAvenue } = seg
            const w = isMainAvenue ? ROAD_WIDTH : ROAD_WIDTH * 0.75
            const len = axis === 'x'
                ? Math.abs(end[0] - start[0])
                : Math.abs(end[2] - start[2])
            const cx = (start[0] + end[0]) / 2
            const cz = (start[2] + end[2]) / 2
            const hw = w / 2
            const hl = len / 2

            const pi = s * 12
            const ui = s * 8
            const ai = s * 4
            const ii = s * 6
            const bi = s * 4

            if (axis === 'x') {
                positions[pi]     = cx - hl; positions[pi + 1] = ROAD_Y; positions[pi + 2]  = cz - hw;
                positions[pi + 3] = cx + hl; positions[pi + 4] = ROAD_Y; positions[pi + 5]  = cz - hw;
                positions[pi + 6] = cx + hl; positions[pi + 7] = ROAD_Y; positions[pi + 8]  = cz + hw;
                positions[pi + 9] = cx - hl; positions[pi + 10] = ROAD_Y; positions[pi + 11] = cz + hw;
            } else {
                positions[pi]     = cx - hw; positions[pi + 1] = ROAD_Y; positions[pi + 2]  = cz - hl;
                positions[pi + 3] = cx - hw; positions[pi + 4] = ROAD_Y; positions[pi + 5]  = cz + hl;
                positions[pi + 6] = cx + hw; positions[pi + 7] = ROAD_Y; positions[pi + 8]  = cz + hl;
                positions[pi + 9] = cx + hw; positions[pi + 10] = ROAD_Y; positions[pi + 11] = cz - hl;
            }

            uvs[ui] = 0; uvs[ui + 1] = 0;
            uvs[ui + 2] = 1; uvs[ui + 3] = 0;
            uvs[ui + 4] = 1; uvs[ui + 5] = 1;
            uvs[ui + 6] = 0; uvs[ui + 7] = 1;

            lengths[ai] = lengths[ai + 1] = lengths[ai + 2] = lengths[ai + 3] = len;
            avenues[ai] = avenues[ai + 1] = avenues[ai + 2] = avenues[ai + 3] = isMainAvenue ? 1 : 0;

            indices[ii]     = bi;     indices[ii + 1] = bi + 1; indices[ii + 2] = bi + 2;
            indices[ii + 3] = bi;     indices[ii + 4] = bi + 2; indices[ii + 5] = bi + 3;
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
        geo.setAttribute('uv', new THREE.BufferAttribute(uvs, 2))
        geo.setAttribute('aLength', new THREE.BufferAttribute(lengths, 1))
        geo.setAttribute('aIsAvenue', new THREE.BufferAttribute(avenues, 1))
        geo.setIndex(new THREE.BufferAttribute(indices, 1))
        return geo
    }, [segments])

    // Build merged roundabout geometry — only at real intersections
    const roundaboutGeo = useMemo(() => {
        if (!intersections.length) return null

        const segs = 16
        const geos = []
        for (const pt of intersections) {
            const ring = new THREE.CircleGeometry(ROUNDABOUT_RADIUS, segs)
            ring.translate(pt.x, pt.z, 0) // Will be rotated -90° on X
            geos.push(ring)
        }
        const merged = mergeSimpleGeometries(geos)
        geos.forEach(g => g.dispose())
        return merged
    }, [intersections])

    const roadMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: ROAD_VERT,
        fragmentShader: ROAD_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -1,
        polygonOffsetUnits: -1,
    }), [])

    const roundaboutMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: ROUNDABOUT_VERT,
        fragmentShader: ROUNDABOUT_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        polygonOffset: true,
        polygonOffsetFactor: -2,
        polygonOffsetUnits: -2,
    }), [])

    const lastT = useRef(0)
    useFrame((state) => {
        const t = state.clock.elapsedTime
        if (t - lastT.current < 0.033) return
        lastT.current = t
        roadMaterial.uniforms.uTime.value = t
        roundaboutMaterial.uniforms.uTime.value = t
    })

    useEffect(() => () => {
        if (mergedGeometry) mergedGeometry.dispose()
        if (roundaboutGeo) roundaboutGeo.dispose()
        roadMaterial.dispose()
        roundaboutMaterial.dispose()
    }, [mergedGeometry, roundaboutGeo, roadMaterial, roundaboutMaterial])

    if (!mergedGeometry) return null

    return (
        <group>
            <mesh geometry={mergedGeometry} material={roadMaterial} raycast={() => null} />
            {roundaboutGeo && (
                <mesh
                    geometry={roundaboutGeo}
                    material={roundaboutMaterial}
                    rotation={[-Math.PI / 2, 0, 0]}
                    position={[0, ROAD_Y + 0.01, 0]}
                    raycast={() => null}
                />
            )}
        </group>
    )
})

/** Merge simple BufferGeometries (position + uv only) */
function mergeSimpleGeometries(geos) {
    let totalVerts = 0, totalIdx = 0
    for (const g of geos) {
        totalVerts += g.attributes.position.count
        totalIdx += g.index ? g.index.count : g.attributes.position.count
    }
    const pos = new Float32Array(totalVerts * 3)
    const uv = new Float32Array(totalVerts * 2)
    const idx = new Uint32Array(totalIdx)
    let vOff = 0, iOff = 0, base = 0
    for (const g of geos) {
        pos.set(g.attributes.position.array, vOff * 3)
        if (g.attributes.uv) uv.set(g.attributes.uv.array, vOff * 2)
        if (g.index) {
            for (let i = 0; i < g.index.count; i++) idx[iOff++] = g.index.array[i] + base
        } else {
            for (let i = 0; i < g.attributes.position.count; i++) idx[iOff++] = base + i
        }
        base += g.attributes.position.count
        vOff += g.attributes.position.count
    }
    const merged = new THREE.BufferGeometry()
    merged.setAttribute('position', new THREE.BufferAttribute(pos, 3))
    merged.setAttribute('uv', new THREE.BufferAttribute(uv, 2))
    merged.setIndex(new THREE.BufferAttribute(idx, 1))
    return merged
}
