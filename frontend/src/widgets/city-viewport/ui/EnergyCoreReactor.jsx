import React, { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyCoreReactor — "Code Pulse" Ground Health Chamber
 *
 * PURPOSE: Not just decoration — this is the codebase's vital-signs monitor.
 * The core color, pulse rate, and ring speed all reflect real code health metrics.
 * Hovering reveals a stats dashboard panel.
 *
 * Health score (0-100) computed from:
 *   - Average complexity (lower = healthier)
 *   - Hotspot ratio (files with complexity > 15)
 *   - Very large file ratio (LOC > 500)
 *
 * Visual mapping:
 *   80-100 → Cyan/green glow, slow pulse    → "Excellent"
 *   60-79  → Blue glow, moderate pulse       → "Good"
 *   40-59  → Amber glow, quick pulse         → "Needs Attention"
 *   0-39   → Red glow, rapid pulse           → "Critical"
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
    fresnel = pow(fresnel, 2.0);

    float pulse = 0.82 + 0.18 * sin(uTime * uPulseSpeed);
    vec3 innerColor = (uHealthColor * 0.7 + vec3(0.3)) * pulse;
    vec3 edgeColor = uHealthColor * 0.6;
    vec3 col = mix(innerColor, edgeColor, fresnel);

    float crack = fract(sin(dot(floor(vUv * 14.0), vec2(12.9898, 78.233))) * 43758.5453);
    float crackLine = step(0.93, fract(vUv.y * 10.0 - uTime * 0.6));
    col += uHealthColor * 0.3 * crackLine * crack;

    gl_FragColor = vec4(col, 1.0);
}
`

const COLUMN_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

const COLUMN_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
uniform vec3 uHealthColor;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    float dist = abs(vUv.x - 0.5) * 2.0;
    float radial = 1.0 - smoothstep(0.0, 1.0, dist);
    radial = pow(radial, 1.8);
    float fadeY = mix(0.7, 0.25, vUv.y);
    float s1 = fract(vUv.y * 18.0 + uTime * 1.0);
    float line1 = smoothstep(0.42, 0.5, s1) * smoothstep(0.58, 0.5, s1);
    float s2 = fract(vUv.y * 10.0 + uTime * 0.5 + 0.3);
    float line2 = smoothstep(0.44, 0.5, s2) * smoothstep(0.56, 0.5, s2);
    float energy = line1 * 0.45 + line2 * 0.3;
    float alpha = radial * fadeY * (0.1 + energy * 0.18);
    vec3 col = mix(uHealthColor * 0.5, uHealthColor, radial * 0.6);
    gl_FragColor = vec4(col, alpha);
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

    // Score: start at 100, deduct penalties
    let score = 100
    score -= Math.min(30, avgComplexity * 2.5)         // up to -30 for high complexity
    score -= Math.min(25, (hotspots / totalFiles) * 200) // up to -25 for hotspot ratio
    score -= Math.min(20, (largeFiles / totalFiles) * 150) // up to -20 for large files
    score = Math.max(0, Math.min(100, Math.round(score)))

    let grade, color, pulseSpeed
    if (score >= 80) {
        grade = 'Excellent'
        color = [0.0, 0.9, 0.55]  // green-cyan
        pulseSpeed = 1.8
    } else if (score >= 60) {
        grade = 'Good'
        color = [0.0, 0.6, 1.0]   // blue
        pulseSpeed = 2.5
    } else if (score >= 40) {
        grade = 'Needs Attention'
        color = [1.0, 0.65, 0.0]  // amber
        pulseSpeed = 3.5
    } else {
        grade = 'Critical'
        color = [1.0, 0.2, 0.15]  // red
        pulseSpeed = 5.0
    }

    return { score, grade, color, pulseSpeed, totalFiles, totalLoc, avgComplexity: +avgComplexity.toFixed(1), hotspots, languages }
}

/* ── Tooltip styles ────────────────────────────────────────────────── */

const panelStyle = {
    background: 'linear-gradient(135deg, rgba(8,12,24,0.95) 0%, rgba(12,18,35,0.92) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '16px 20px',
    width: '240px',
    fontFamily: "'Inter', -apple-system, sans-serif",
    color: '#e4e4e7',
    backdropFilter: 'blur(20px)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
    pointerEvents: 'none',
    userSelect: 'none',
}

function HealthPanel({ health }) {
    const gradeColor = health.score >= 80 ? '#00e88a' : health.score >= 60 ? '#3b9eff' : health.score >= 40 ? '#ffaa00' : '#ff4444'
    const topLangs = Object.entries(health.languages).sort((a, b) => b[1] - a[1]).slice(0, 3)
    const formatNum = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

    return (
        <div style={panelStyle}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: gradeColor, boxShadow: `0 0 8px ${gradeColor}` }} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Code Pulse</span>
            </div>

            {/* Score */}
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '8px', marginBottom: '4px' }}>
                <span style={{ fontSize: '28px', fontWeight: 800, color: gradeColor, lineHeight: 1 }}>{health.score}</span>
                <span style={{ fontSize: '12px', color: 'rgba(255,255,255,0.35)' }}>/100</span>
            </div>
            <div style={{ fontSize: '11px', color: gradeColor, fontWeight: 600, marginBottom: '14px', letterSpacing: '0.02em' }}>{health.grade}</div>

            {/* Metrics grid */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px 12px', marginBottom: '14px' }}>
                {[
                    ['Files', formatNum(health.totalFiles)],
                    ['Lines', formatNum(health.totalLoc)],
                    ['Avg Cplx', health.avgComplexity],
                    ['Hotspots', health.hotspots],
                ].map(([label, val]) => (
                    <div key={label}>
                        <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '2px', letterSpacing: '0.04em' }}>{label}</div>
                        <div style={{ fontSize: '14px', fontWeight: 600, fontFamily: "'JetBrains Mono', monospace" }}>{val}</div>
                    </div>
                ))}
            </div>

            {/* Languages */}
            {topLangs.length > 0 && (
                <div>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', letterSpacing: '0.04em' }}>Top Languages</div>
                    {topLangs.map(([lang, count]) => {
                        const pct = Math.round((count / health.totalFiles) * 100)
                        return (
                            <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: gradeColor, opacity: 0.7, borderRadius: '2px' }} />
                                </div>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', minWidth: '55px', textAlign: 'right' }}>{lang} {pct}%</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/* ── Component ─────────────────────────────────────────────────────── */

export default function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()
    const lastT = useRef(0)
    const [hovered, setHovered] = useState(false)

    const health = useMemo(() => computeHealth(cityData?.buildings), [cityData])

    // Column height: rises above the tallest building so mothership can connect
    const columnHeight = useMemo(() => {
        if (!cityData?.buildings?.length) return 80
        let maxH = 0
        for (const b of cityData.buildings) {
            const h = (b.dimensions?.height || 8) * 3.0
            if (h > maxH) maxH = h
        }
        return Math.max(80, maxH + 50)
    }, [cityData])

    const healthColor = useMemo(() => new THREE.Vector3(...health.color), [health.color])

    const coreMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uHealthColor: { value: healthColor },
            uPulseSpeed: { value: health.pulseSpeed },
        },
        vertexShader: CORE_VERT,
        fragmentShader: CORE_FRAG,
    }), [healthColor, health.pulseSpeed])

    const ringColor = useMemo(() => {
        const [r, g, b] = health.color
        return new THREE.Color(r, g, b)
    }, [health.color])

    const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: ringColor,
        emissive: ringColor,
        emissiveIntensity: 0.9,
        metalness: 0.9,
        roughness: 0.08,
    }), [ringColor])

    const chamberMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#0a1020',
        emissive: '#001830',
        emissiveIntensity: 0.3,
        metalness: 0.95,
        roughness: 0.15,
    }), [])

    const columnMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uHealthColor: { value: healthColor },
        },
        vertexShader: COLUMN_VERT,
        fragmentShader: COLUMN_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), [healthColor])

    const columnGeo = useMemo(() => {
        return new THREE.CylinderGeometry(1.5, 4, columnHeight, 14, 10, true)
    }, [columnHeight])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        coreMat.uniforms.uTime.value = t
        columnMat.uniforms.uTime.value = t
        if (ring1.current) ring1.current.rotation.y = t * 0.35
        if (ring2.current) ring2.current.rotation.y = t * -0.25
        if (ring3.current) ring3.current.rotation.y = t * 0.15
    })

    if (!cityData?.buildings?.length) return null

    return (
        <group>
            {/* ── Ground-level chamber ── */}
            <group
                position={[0, 0.5, 0]}
                onPointerEnter={(e) => { e.stopPropagation(); setHovered(true) }}
                onPointerLeave={() => setHovered(false)}
            >
                {/* Core sphere — color reflects health */}
                <mesh position={[0, 3, 0]}>
                    <sphereGeometry args={[5, 22, 16]} />
                    <primitive object={coreMat} attach="material" />
                </mesh>

                {/* Containment rings */}
                <mesh ref={ring1} position={[0, 3, 0]}>
                    <torusGeometry args={[9, 0.6, 8, 32]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>
                <mesh ref={ring2} position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[13, 0.5, 8, 32]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>
                <mesh ref={ring3} position={[0, 3, 0]} rotation={[Math.PI / 3, 0, 0]}>
                    <torusGeometry args={[18, 0.4, 8, 36]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* Chamber platform + rim */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                    <ringGeometry args={[3, 25, 36]} />
                    <primitive object={chamberMat} attach="material" />
                </mesh>
                <mesh position={[0, 1.5, 0]}>
                    <torusGeometry args={[25, 1.2, 6, 36]} />
                    <primitive object={chamberMat} attach="material" />
                </mesh>

                {/* Ground glow — color matches health */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
                    <circleGeometry args={[30, 32]} />
                    <meshBasicMaterial color={ringColor} transparent opacity={0.06} depthWrite={false} />
                </mesh>

                {/* Health dashboard — appears on hover */}
                {hovered && (
                    <Html position={[0, 28, 0]} center distanceFactor={80} occlude={false}>
                        <HealthPanel health={health} />
                    </Html>
                )}
            </group>

            {/* ── Energy column ── */}
            <mesh position={[0, columnHeight / 2 + 3, 0]} geometry={columnGeo}>
                <primitive object={columnMat} attach="material" />
            </mesh>
        </group>
    )
}
