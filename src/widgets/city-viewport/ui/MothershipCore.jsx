import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'
import { Cpu } from 'lucide-react'
import useStore from '../../../store/useStore'
import { mothershipAltitude } from './landmarkPositions'

/**
 * MothershipCore — "Atlas" Orbital Command Hub
 *
 * PURPOSE: Not just a floating saucer — this is the bird's-eye strategic
 * overview of the entire codebase. Hovering reveals a command panel with
 * repo identity, language distribution, structural overview, and key stats.
 *
 * The tractor beam connects the orbital command to the ground-level reactor,
 * visually representing the data pipeline from source → analysis.
 */

const HULL_VERT = /* glsl */ `
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

const HULL_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    // Dark metallic hull with strong rim lighting
    vec3 base = vec3(0.06, 0.08, 0.14);

    // Fresnel rim — blue glow on silhouette edges
    float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    fresnel = pow(smoothstep(0.2, 1.0, fresnel), 2.5);
    base += vec3(0.05, 0.2, 0.5) * fresnel;

    // Hull panel lines — horizontal
    float panel = step(0.93, fract(vUv.y * 24.0));
    base += vec3(0.0, 0.35, 0.7) * panel * 0.4;

    // Vertical seam accents
    float seam = step(0.96, fract(vUv.x * 16.0));
    base += vec3(0.0, 0.2, 0.45) * seam * 0.25;

    // Running lights — subtle dots along equator
    float equator = smoothstep(0.48, 0.5, vUv.y) * smoothstep(0.52, 0.5, vUv.y);
    float lights = step(0.9, fract(vUv.x * 32.0 + uTime * 0.3));
    base += vec3(0.1, 0.6, 1.0) * equator * lights * 0.6;

    // Top vs bottom face shading
    float topFace = max(vNormal.y, 0.0);
    base += vec3(0.02, 0.04, 0.08) * topFace;

    gl_FragColor = vec4(base, 1.0);
}
`


/* ── Overview panel ─────────────────────────────────────────────────── */

const overviewStyle = {
    background: 'linear-gradient(135deg, rgba(8,12,24,0.95) 0%, rgba(12,18,35,0.92) 100%)',
    border: '1px solid rgba(255,255,255,0.08)',
    borderRadius: '14px',
    padding: '16px 20px',
    width: '250px',
    fontFamily: 'var(--font-sans)',
    color: 'var(--text-primary)',
    boxShadow: '0 20px 60px rgba(0,0,0,0.7), 0 0 0 1px rgba(255,255,255,0.04), inset 0 1px 0 rgba(255,255,255,0.06)',
    pointerEvents: 'none',
    userSelect: 'none',
}

const LANG_COLORS = {
    javascript: '#f7df1e', typescript: '#3178c6', python: '#3572A5', java: '#b07219',
    go: '#00ADD8', rust: '#dea584', ruby: '#CC342D', php: '#4F5D95', c: '#555555',
    cpp: '#f34b7d', csharp: '#178600', swift: '#FA7343', kotlin: '#A97BFF', scala: '#DC322F',
    vue: '#41b883', svelte: '#ff3e00', dart: '#00B4AB', shell: '#89e051', css: '#563d7c',
    html: '#e34c26', scss: '#c6538c', sql: '#e38c00', lua: '#000080', r: '#198CE7',
}

function OverviewPanel({ cityData }) {
    const repoName = cityData.name || cityData.path || 'Unknown'
    const source = cityData.source === 'github' ? 'GitHub' : cityData.source === 'client' ? 'Local' : cityData.source || 'Unknown'
    const totalFiles = cityData.buildings?.length || 0
    const totalLoc = cityData.metrics?.total_lines || cityData.buildings?.reduce((s, b) => s + (b.metrics?.loc || 0), 0) || 0
    const districts = cityData.districts?.length || 0
    const connections = cityData.roads?.length || 0
    const formatNum = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

    // Language distribution
    const langCounts = cityData.metrics?.languages || {}
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const maxLang = sortedLangs[0]?.[1] || 1

    return (
        <div style={overviewStyle}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '10px' }}>
                <Cpu size={14} color="rgba(255,255,255,0.4)" strokeWidth={2} />
                <span style={{ fontSize: '11px', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.5)' }}>Atlas Command</span>
            </div>

            {/* Repo name */}
            <div style={{ fontSize: '15px', fontWeight: 700, marginBottom: '2px', color: '#f4f4f5', lineHeight: 1.3, wordBreak: 'break-word' }}>{repoName}</div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '14px' }}>source: {source}{cityData.branch ? ` · ${cityData.branch}` : ''}</div>

            {/* Stats row */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginBottom: '14px' }}>
                {[
                    ['Files', formatNum(totalFiles)],
                    ['Districts', districts],
                    ['Roads', connections],
                ].map(([label, val]) => (
                    <div key={label} style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '16px', fontWeight: 700, fontFamily: 'var(--font-mono)', color: '#a5b4fc' }}>{val}</div>
                        <div style={{ fontSize: '9px', color: 'rgba(255,255,255,0.3)', letterSpacing: '0.04em', marginTop: '2px' }}>{label}</div>
                    </div>
                ))}
            </div>
            <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.25)', marginBottom: '4px' }}>{formatNum(totalLoc)} lines of code</div>

            {/* Language bars */}
            {sortedLangs.length > 0 && (
                <div style={{ marginTop: '10px' }}>
                    <div style={{ fontSize: '10px', color: 'rgba(255,255,255,0.3)', marginBottom: '6px', letterSpacing: '0.04em' }}>Languages</div>
                    {sortedLangs.map(([lang, count]) => {
                        const pct = Math.round((count / totalFiles) * 100)
                        const barWidth = Math.round((count / maxLang) * 100)
                        const color = LANG_COLORS[lang] || '#6366f1'
                        return (
                            <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '5px' }}>
                                <div style={{ width: '6px', height: '6px', borderRadius: '2px', background: color, flexShrink: 0 }} />
                                <div style={{ flex: 1, height: '4px', background: 'rgba(255,255,255,0.06)', borderRadius: '2px', overflow: 'hidden' }}>
                                    <div style={{ width: `${barWidth}%`, height: '100%', background: color, opacity: 0.65, borderRadius: '2px' }} />
                                </div>
                                <span style={{ fontSize: '10px', color: 'rgba(255,255,255,0.5)', minWidth: '60px', textAlign: 'right' }}>{lang} {pct}%</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/* ── Component ─────────────────────────────────────────────────────── */

const MothershipCore = React.memo(function MothershipCore() {
    const cityData = useStore(s => s.cityData)
    const selectLandmark = useStore(s => s.selectLandmark)
    const selectedLandmark = useStore(s => s.selectedLandmark)
    const ringOuter = useRef()
    const ringInner = useRef()
    const ringMid = useRef()
    const lastT = useRef(0)

    const altitude = useMemo(() => mothershipAltitude(cityData?.buildings), [cityData])

    const hullMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: HULL_VERT,
        fragmentShader: HULL_FRAG,
    }), [])

    const accentMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#00bbee',
    }), [])

    const bridgeMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#0066aa',
    }), [])

    // Merged bridge domes (2 → 1 draw call)
    const mergedBridgeGeo = useMemo(() => {
        const topDome = new THREE.SphereGeometry(16, 12, 8, 0, Math.PI * 2, 0, Math.PI / 2)
        topDome.translate(0, 10, 0)
        const botDome = new THREE.SphereGeometry(12, 10, 8, 0, Math.PI * 2, 0, Math.PI / 2)
        botDome.rotateX(Math.PI)
        botDome.translate(0, -10, 0)
        const merged = mergeGeometries([topDome, botDome])
        topDome.dispose(); botDome.dispose()
        return merged
    }, [])

    // Dispose GPU resources on unmount or deps change
    React.useEffect(() => {
        return () => {
            hullMat.dispose()
            accentMat.dispose()
            bridgeMat.dispose()
            mergedBridgeGeo.dispose()
        }
    }, [hullMat, accentMat, bridgeMat, mergedBridgeGeo])

    const isSelected = selectedLandmark === 'mothership'

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        hullMat.uniforms.uTime.value = t
        if (ringOuter.current) ringOuter.current.rotation.y = t * 0.05
        if (ringMid.current) ringMid.current.rotation.y = t * -0.08
        if (ringInner.current) ringInner.current.rotation.y = t * 0.12
    })

    const handleClick = (e) => {
        e.stopPropagation()
        selectLandmark(isSelected ? null : 'mothership')
    }

    return (
        <group>
            {/* ── Ship body at altitude ── */}
            <group
                position={[0, altitude, 0]}
                onClick={handleClick}
                onPointerEnter={(e) => { e.stopPropagation(); document.body.style.cursor = 'pointer' }}
                onPointerLeave={() => { document.body.style.cursor = 'auto' }}
            >
                {/* Main disc hull — thicker, grander saucer (+50%) */}
                <mesh scale={[1, 0.22, 1]}>
                    <sphereGeometry args={[108, 24, 14]} />
                    <primitive object={hullMat} attach="material" />
                </mesh>

                {/* Bridge + ventral domes — merged (2 → 1 draw call) */}
                <mesh geometry={mergedBridgeGeo} scale={[2.0, 2.0, 2.0]}>
                    <primitive object={bridgeMat} attach="material" />
                </mesh>

                {/* Communications antenna on top of bridge */}
                <mesh position={[0, 36, 0]}>
                    <cylinderGeometry args={[0.75, 1.4, 15, 8]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>
                <mesh position={[0, 44, 0]}>
                    <sphereGeometry args={[1.8, 10, 8]} />
                    <meshBasicMaterial color="#00ffff" toneMapped={false} />
                </mesh>

                {/* Outer ring */}
                <mesh ref={ringOuter}>
                    <torusGeometry args={[122, 4.5, 6, 36]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>

                {/* Mid ring */}
                <mesh ref={ringMid} rotation={[0.15, 0, 0]}>
                    <torusGeometry args={[102, 2.7, 4, 28]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>

                {/* Inner ring */}
                <mesh ref={ringInner} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[69, 2.1, 4, 24]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>

                {/* Selection highlight ring */}
                {isSelected && (
                    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -21, 0]}>
                        <ringGeometry args={[110, 120, 56]} />
                        <meshBasicMaterial color="#00bbee" transparent opacity={0.5} depthWrite={false} />
                    </mesh>
                )}

                {/* ── Underside glow — wider halo so the ship has weight
                       even from below, now that the tractor beam is gone */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -22, 0]}>
                    <ringGeometry args={[9, 96, 48]} />
                    <meshBasicMaterial color="#004488" transparent opacity={0.22} depthWrite={false} />
                </mesh>
                {/* Bright cyan engine ring directly under ventral dome */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -25, 0]}>
                    <ringGeometry args={[6, 36, 36]} />
                    <meshBasicMaterial color="#00d8ff" transparent opacity={0.42} depthWrite={false} toneMapped={false} />
                </mesh>
            </group>

            {/* Tractor beam removed — was connecting the ship to the
                town hall orb, but the reactor was deleted in a recent
                pass. No anchor, no beam. */}
        </group>
    )
})

export default MothershipCore
