import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import useStore from '../../../store/useStore'
import {
    TIER_HEIGHTS, TOWNHALL_BASE_TOP, TOWNHALL_CROWN_OFFSET,
    TOWNHALL_CROWN_RADIUS, computeSpireHeight,
} from './landmarkPositions'

/**
 * EnergyCoreReactor — "The Nexus Spire" — Grand Civic Monument
 *
 * A multi-tiered futuristic monument at the city center that serves as
 * the codebase health monitor. Inspired by sci-fi citadels and holographic towers.
 *
 * Architecture:
 *   - Tiered stepped pyramid base (3 tiers, hexagonal)
 *   - Central crystalline tower with tapered segments
 *   - Orbital scanner rings at different heights
 *   - Crown: pulsing energy sphere with containment cage
 *   - Ground: holographic data ring with health glow
 *
 * Health score (0-100) drives color, pulse, and ring speed.
 */

const CORE_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    #include <logdepthbuf_vertex>
}
`

const CORE_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
uniform vec3 uHealthColor;
uniform float uPulseSpeed;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    fresnel = pow(fresnel, 2.5);

    float pulse = 0.85 + 0.15 * sin(uTime * uPulseSpeed);
    vec3 innerColor = (uHealthColor * 0.8 + vec3(0.2)) * pulse;
    vec3 edgeColor = uHealthColor * 0.7;
    vec3 col = mix(innerColor, edgeColor, fresnel);

    // Energy vein lines scrolling upward
    float vein = smoothstep(0.45, 0.5, fract(vUv.y * 18.0 - uTime * 0.8))
               * smoothstep(0.55, 0.5, fract(vUv.y * 18.0 - uTime * 0.8));
    col += uHealthColor * 0.4 * vein;

    // Horizontal scan bands
    float scan = smoothstep(0.48, 0.5, fract(vUv.y * 6.0 + uTime * 0.3))
               * smoothstep(0.52, 0.5, fract(vUv.y * 6.0 + uTime * 0.3));
    col += vec3(0.3, 0.7, 1.0) * scan * 0.3;

    gl_FragColor = vec4(col, 1.0);
}
`

/* Tower body shader — dark metallic with light panel lines */
const TOWER_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    #include <logdepthbuf_vertex>
}
`

const TOWER_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
uniform vec3 uAccentColor;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    // Dark metallic base
    vec3 base = vec3(0.04, 0.05, 0.08);

    // Fresnel rim lighting
    float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    fresnel = pow(smoothstep(0.3, 1.0, fresnel), 2.0);
    base += uAccentColor * fresnel * 0.4;

    // Panel lines (horizontal)
    float panel = smoothstep(0.92, 0.94, fract(vUv.y * 20.0));
    base += uAccentColor * panel * 0.3;

    // Vertical seams
    float seam = smoothstep(0.95, 0.97, fract(vUv.x * 12.0));
    base += uAccentColor * seam * 0.15;

    // Running light strips
    float stripY = fract(vUv.y * 8.0 - uTime * 0.5);
    float strip = smoothstep(0.48, 0.5, stripY) * smoothstep(0.52, 0.5, stripY);
    base += uAccentColor * strip * 0.5;

    gl_FragColor = vec4(base, 1.0);
}
`

/* ── Health computation ────────────────────────────────────────────── */

function computeHealth(buildings) {
    if (!buildings?.length) return { score: 50, grade: 'N/A', color: [0, 0.6, 1], pulseSpeed: 2.5, totalFiles: 0, totalLoc: 0, avgComplexity: 0, hotspots: 0, languages: {} }

    const totalFiles = buildings.length
    const totalLoc = buildings.reduce((s, b) => s + (b.metrics?.loc || b.lines_of_code || 0), 0)
    const avgComplexity = buildings.reduce((s, b) => s + (b.complexity || 1), 0) / totalFiles
    const hotspots = buildings.filter(b => (b.complexity || 1) > 15).length
    const largeFiles = buildings.filter(b => (b.metrics?.loc || b.lines_of_code || 0) > 500).length
    const languages = {}
    for (const b of buildings) {
        const lang = b.language || 'unknown'
        languages[lang] = (languages[lang] || 0) + 1
    }

    let score = 100
    score -= Math.min(30, avgComplexity * 2.5)
    score -= Math.min(25, (hotspots / totalFiles) * 200)
    score -= Math.min(20, (largeFiles / totalFiles) * 150)
    score = Math.max(0, Math.min(100, Math.round(score)))

    let grade, color, pulseSpeed
    if (score >= 80) {
        grade = 'Excellent'
        color = [0.0, 0.9, 0.55]
        pulseSpeed = 1.8
    } else if (score >= 60) {
        grade = 'Good'
        color = [0.0, 0.6, 1.0]
        pulseSpeed = 2.5
    } else if (score >= 40) {
        grade = 'Needs Attention'
        color = [1.0, 0.65, 0.0]
        pulseSpeed = 3.5
    } else {
        grade = 'Critical'
        color = [1.0, 0.2, 0.15]
        pulseSpeed = 5.0
    }

    return { score, grade, color, pulseSpeed, totalFiles, totalLoc, avgComplexity: +avgComplexity.toFixed(1), hotspots, languages }
}

/* ── Component ─────────────────────────────────────────────────────── */

const EnergyCoreReactor = React.memo(function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const selectLandmark = useStore(s => s.selectLandmark)
    const selectedLandmark = useStore(s => s.selectedLandmark)
    const scanRing1 = useRef()
    const scanRing2 = useRef()
    const scanRing3 = useRef()
    const cageRef = useRef()
    const lastT = useRef(0)

    const health = useMemo(() => computeHealth(cityData?.buildings), [cityData])

    // Spire height — sourced from shared module so panels stay aligned
    const spireHeight = useMemo(() => computeSpireHeight(cityData?.buildings), [cityData])

    const healthColor = useMemo(() => new THREE.Vector3(...health.color), [health.color])
    const threeColor = useMemo(() => new THREE.Color(...health.color), [health.color])

    // Crown sphere shader
    const coreMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uHealthColor: { value: healthColor },
            uPulseSpeed: { value: health.pulseSpeed },
        },
        vertexShader: CORE_VERT,
        fragmentShader: CORE_FRAG,
    }), [healthColor, health.pulseSpeed])

    // Tower body shader
    const towerMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uAccentColor: { value: healthColor },
        },
        vertexShader: TOWER_VERT,
        fragmentShader: TOWER_FRAG,
    }), [healthColor])

    // Dark stone for base tiers
    const baseMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#141c2b',
    }), [])

    // Glowing accent
    const accentMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: threeColor,
    }), [threeColor])

    // Ring scanner material
    const ringMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: threeColor,
        transparent: true,
        opacity: 0.8,
    }), [threeColor])

    // Cage wireframe material
    const cageMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: threeColor,
        wireframe: true,
        transparent: true,
        opacity: 0.3,
    }), [threeColor])

    // Merged base — wider fortress stance with 4 corner buttress pillars.
    // Tier heights come from the shared module so other components stay in sync.
    const mergedBaseGeo = useMemo(() => {
        const { tier1: tier1H, tier2: tier2H, tier3: tier3H } = TIER_HEIGHTS
        const parts = []

        // 3 stepped tiers (octagonal stack — bigger, more imposing)
        const g1 = new THREE.CylinderGeometry(40, 46, tier1H, 8)
        g1.translate(0, tier1H / 2, 0)
        parts.push(g1)

        const g2 = new THREE.CylinderGeometry(32, 38, tier2H, 8)
        g2.translate(0, tier1H + tier2H / 2, 0)
        parts.push(g2)

        const g3 = new THREE.CylinderGeometry(24, 30, tier3H, 8)
        g3.translate(0, tier1H + tier2H + tier3H / 2, 0)
        parts.push(g3)

        // 8 corner buttress pillars with conical apex caps (octagonal symmetry)
        for (let i = 0; i < 8; i++) {
            const ang = (i / 8) * Math.PI * 2 + Math.PI / 8
            const r = 43
            const pillarH = tier1H + tier2H
            const p = new THREE.CylinderGeometry(2.4, 3.2, pillarH, 6)
            p.translate(Math.cos(ang) * r, pillarH / 2, Math.sin(ang) * r)
            parts.push(p)
            const apex = new THREE.ConeGeometry(3.2, 5, 6)
            apex.translate(Math.cos(ang) * r, pillarH + 2.5, Math.sin(ang) * r)
            parts.push(apex)
        }

        const merged = mergeGeometries(parts)
        parts.forEach(p => p.dispose())
        return merged
    }, [])

    // Merged accent rings — tier edges + spire highlights (1 draw call)
    const mergedAccentGeo = useMemo(() => {
        const { tier1: tier1H, tier2: tier2H } = TIER_HEIGHTS
        const baseTop = TOWNHALL_BASE_TOP
        const tH = spireHeight

        const parts = []
        const addRing = (r, w, y) => {
            const t = new THREE.TorusGeometry(r, w, 4, 32)
            t.rotateX(Math.PI / 2); t.translate(0, y, 0)
            parts.push(t)
        }
        addRing(42, 0.6, tier1H)
        addRing(34, 0.5, tier1H + tier2H)
        addRing(27, 0.4, baseTop)
        addRing(12, 0.65, baseTop + tH * 0.33)
        addRing(7, 0.5, baseTop + tH * 0.66)
        const merged = mergeGeometries(parts)
        parts.forEach(p => p.dispose())
        return merged
    }, [spireHeight])

    // Merged tower — taller, more presence (1 draw call)
    const mergedTowerGeo = useMemo(() => {
        const baseTop = TOWNHALL_BASE_TOP
        const tH = spireHeight
        const g1 = new THREE.CylinderGeometry(11, 17, tH * 0.55, 8, 1)
        g1.translate(0, baseTop + tH * 0.275, 0)
        const g2 = new THREE.CylinderGeometry(5, 11, tH * 0.45, 8, 1)
        g2.translate(0, baseTop + tH * 0.775, 0)
        const merged = mergeGeometries([g1, g2])
        g1.dispose(); g2.dispose()
        return merged
    }, [spireHeight])

    useEffect(() => {
        return () => {
            coreMat.dispose()
            towerMat.dispose()
            baseMat.dispose()
            accentMat.dispose()
            ringMat.dispose()
            cageMat.dispose()
            mergedBaseGeo.dispose()
            mergedAccentGeo.dispose()
            mergedTowerGeo.dispose()
        }
    }, [coreMat, towerMat, baseMat, accentMat, ringMat, cageMat, mergedBaseGeo, mergedAccentGeo, mergedTowerGeo])

    const isSelected = selectedLandmark === 'reactor'

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        coreMat.uniforms.uTime.value = t
        towerMat.uniforms.uTime.value = t
        if (scanRing1.current) scanRing1.current.rotation.y = t * 0.5
        if (scanRing2.current) scanRing2.current.rotation.y = t * -0.35
        if (scanRing3.current) scanRing3.current.rotation.y = t * 0.2
        if (cageRef.current) cageRef.current.rotation.y = t * 0.15
    })

    if (!cityData?.buildings?.length) return null

    const handleClick = (e) => {
        e.stopPropagation()
        selectLandmark(isSelected ? null : 'reactor')
    }

    const baseTop = TOWNHALL_BASE_TOP
    const towerH = spireHeight
    const towerTop = baseTop + towerH
    const crownY = towerTop + TOWNHALL_CROWN_OFFSET

    return (
        <group>
            <group
                position={[0, 0, 0]}
                onClick={handleClick}
                onPointerEnter={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
                onPointerLeave={() => { document.body.style.cursor = 'auto' }}
            >
                {/* ═══ MERGED BASE TIERS (3 → 1 draw call) ═══ */}
                <mesh geometry={mergedBaseGeo}>
                    <primitive object={baseMat} attach="material" />
                </mesh>

                {/* ═══ MERGED ACCENT RINGS (5 → 1 draw call) ═══ */}
                <mesh geometry={mergedAccentGeo}>
                    <primitive object={accentMat} attach="material" />
                </mesh>

                {/* ═══ MERGED TOWER (2 → 1 draw call) ═══ */}
                <mesh geometry={mergedTowerGeo}>
                    <primitive object={towerMat} attach="material" />
                </mesh>

                {/* ═══ SCANNER RINGS: Orbital data scanners (animated, need individual refs) ═══ */}
                <mesh ref={scanRing1} position={[0, baseTop + towerH * 0.25, 0]}>
                    <torusGeometry args={[19, 0.6, 4, 28]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>
                <mesh ref={scanRing2} position={[0, baseTop + towerH * 0.55, 0]} rotation={[0.2, 0, 0.15]}>
                    <torusGeometry args={[14, 0.5, 4, 24]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>
                <mesh ref={scanRing3} position={[0, baseTop + towerH * 0.85, 0]} rotation={[Math.PI / 2.5, 0, 0]}>
                    <torusGeometry args={[10, 0.4, 4, 20]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* ═══ CROWN: Pulsing energy sphere ═══ */}
                <mesh position={[0, crownY, 0]}>
                    <sphereGeometry args={[TOWNHALL_CROWN_RADIUS, 18, 14]} />
                    <primitive object={coreMat} attach="material" />
                </mesh>

                {/* Containment cage around crown */}
                <mesh ref={cageRef} position={[0, crownY, 0]}>
                    <icosahedronGeometry args={[TOWNHALL_CROWN_RADIUS + 2.5, 1]} />
                    <primitive object={cageMat} attach="material" />
                </mesh>

                {/* ═══ GROUND EFFECTS ═══ */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                    <ringGeometry args={[40, 52, 8]} />
                    <meshBasicMaterial color={threeColor} transparent opacity={isSelected ? 0.25 : 0.08} depthWrite={false} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                    <ringGeometry args={[52, 58, 48]} />
                    <meshBasicMaterial color={threeColor} transparent opacity={0.05} depthWrite={false} />
                </mesh>

                {/* ═══ SELECTION HIGHLIGHT ═══ */}
                {isSelected && (
                    <>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
                            <ringGeometry args={[48, 54, 56]} />
                            <meshBasicMaterial color={threeColor} transparent opacity={0.7} depthWrite={false} />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
                            <ringGeometry args={[42, 46, 56]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
                        </mesh>
                    </>
                )}
            </group>
        </group>
    )
})

export default EnergyCoreReactor
