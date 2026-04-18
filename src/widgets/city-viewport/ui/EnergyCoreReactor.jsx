import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import useStore from '../../../store/useStore'

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

    // Spire height — taller than 90th percentile
    const spireHeight = useMemo(() => {
        if (!cityData?.buildings?.length) return 60
        const heights = cityData.buildings.map(b => (b.dimensions?.height || 8) * 3.0).sort((a, b) => a - b)
        const p90 = heights[Math.floor(heights.length * 0.9)] || 50
        return Math.max(60, p90 * 1.4)
    }, [cityData])

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

    // Merged base tiers geometry (3 cylinders → 1 draw call)
    const mergedBaseGeo = useMemo(() => {
        const tier1H = 3, tier2H = 3, tier3H = 2
        const g1 = new THREE.CylinderGeometry(22, 25, tier1H, 6)
        g1.translate(0, tier1H / 2, 0)
        const g2 = new THREE.CylinderGeometry(17, 22, tier2H, 6)
        g2.translate(0, tier1H + tier2H / 2, 0)
        const g3 = new THREE.CylinderGeometry(13, 17, tier3H, 6)
        g3.translate(0, tier1H + tier2H + tier3H / 2, 0)
        const merged = mergeGeometries([g1, g2, g3])
        g1.dispose(); g2.dispose(); g3.dispose()
        return merged
    }, [])

    // Merged accent tori geometry (5 tori → 1 draw call)
    const mergedAccentGeo = useMemo(() => {
        const tier1H = 3, tier2H = 3, tier3H = 2
        const baseTop = tier1H + tier2H + tier3H
        const tH = spireHeight

        const t1 = new THREE.TorusGeometry(23, 0.4, 4, 6)
        t1.rotateX(Math.PI / 2); t1.translate(0, tier1H, 0)
        const t2 = new THREE.TorusGeometry(18, 0.3, 4, 6)
        t2.rotateX(Math.PI / 2); t2.translate(0, tier1H + tier2H, 0)
        const t3 = new THREE.TorusGeometry(14, 0.25, 4, 6)
        t3.rotateX(Math.PI / 2); t3.translate(0, baseTop, 0)
        const t4 = new THREE.TorusGeometry(10, 0.5, 4, 6)
        t4.rotateX(Math.PI / 2); t4.translate(0, baseTop + tH * 0.33, 0)
        const t5 = new THREE.TorusGeometry(6, 0.4, 4, 6)
        t5.rotateX(Math.PI / 2); t5.translate(0, baseTop + tH * 0.66, 0)
        const merged = mergeGeometries([t1, t2, t3, t4, t5])
        t1.dispose(); t2.dispose(); t3.dispose(); t4.dispose(); t5.dispose()
        return merged
    }, [spireHeight])

    // Merged tower geometry (2 cylinders → 1 draw call)
    const mergedTowerGeo = useMemo(() => {
        const baseTop = 8
        const tH = spireHeight
        const g1 = new THREE.CylinderGeometry(7, 12, tH * 0.6, 6, 1)
        g1.translate(0, baseTop + tH * 0.3, 0)
        const g2 = new THREE.CylinderGeometry(3.5, 7, tH * 0.5, 6, 1)
        g2.translate(0, baseTop + tH * 0.75, 0)
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

    const tier1H = 3, tier2H = 3, tier3H = 2
    const baseTop = tier1H + tier2H + tier3H
    const towerH = spireHeight
    const towerTop = baseTop + towerH
    const crownY = towerTop + 6

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
                    <torusGeometry args={[16, 0.5, 4, 24]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>
                <mesh ref={scanRing2} position={[0, baseTop + towerH * 0.55, 0]} rotation={[0.2, 0, 0.15]}>
                    <torusGeometry args={[12, 0.4, 4, 20]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>
                <mesh ref={scanRing3} position={[0, baseTop + towerH * 0.85, 0]} rotation={[Math.PI / 2.5, 0, 0]}>
                    <torusGeometry args={[8, 0.35, 4, 16]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* ═══ CROWN: Pulsing energy sphere ═══ */}
                <mesh position={[0, crownY, 0]}>
                    <sphereGeometry args={[5, 16, 12]} />
                    <primitive object={coreMat} attach="material" />
                </mesh>

                {/* Containment cage around crown */}
                <mesh ref={cageRef} position={[0, crownY, 0]}>
                    <icosahedronGeometry args={[7.5, 1]} />
                    <primitive object={cageMat} attach="material" />
                </mesh>

                {/* ═══ GROUND EFFECTS ═══ */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                    <ringGeometry args={[20, 28, 6]} />
                    <meshBasicMaterial color={threeColor} transparent opacity={isSelected ? 0.25 : 0.08} depthWrite={false} />
                </mesh>
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                    <ringGeometry args={[28, 32, 36]} />
                    <meshBasicMaterial color={threeColor} transparent opacity={0.04} depthWrite={false} />
                </mesh>

                {/* ═══ SELECTION HIGHLIGHT ═══ */}
                {isSelected && (
                    <>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
                            <ringGeometry args={[26, 32, 48]} />
                            <meshBasicMaterial color={threeColor} transparent opacity={0.7} depthWrite={false} />
                        </mesh>
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.4, 0]}>
                            <ringGeometry args={[22, 25, 48]} />
                            <meshBasicMaterial color="#ffffff" transparent opacity={0.3} depthWrite={false} />
                        </mesh>
                    </>
                )}
            </group>
        </group>
    )
})

export default EnergyCoreReactor
