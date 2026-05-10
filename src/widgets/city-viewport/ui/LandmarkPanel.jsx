import React, { useMemo, useRef, useEffect } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import { X, Activity, Layers, Shield, Flame, Globe, GitBranch, FileCode2, Map } from 'lucide-react'
import { townHallTopY, mothershipAltitude } from './landmarkPositions'

const LANG_COLORS = {
    javascript: '#f7df1e', typescript: '#3178c6', python: '#3572A5', java: '#b07219',
    go: '#00ADD8', rust: '#dea584', ruby: '#CC342D', php: '#4F5D95', c: '#555555',
    cpp: '#f34b7d', csharp: '#178600', swift: '#FA7343', kotlin: '#A97BFF', scala: '#DC322F',
    vue: '#41b883', svelte: '#ff3e00', dart: '#00B4AB', shell: '#89e051', css: '#563d7c',
    html: '#e34c26', scss: '#c6538c', sql: '#e38c00', lua: '#000080', r: '#198CE7',
}

function computeHealth(buildings) {
    if (!buildings?.length) return { score: 50, grade: 'N/A', color: '#3b9eff', pulseSpeed: 2.5, totalFiles: 0, totalLoc: 0, avgComplexity: 0, hotspots: 0, languages: {} }
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
    let grade, color
    if (score >= 80) { grade = 'Excellent'; color = '#00e88a' }
    else if (score >= 60) { grade = 'Good'; color = '#3b9eff' }
    else if (score >= 40) { grade = 'Needs Attention'; color = '#ffaa00' }
    else { grade = 'Critical'; color = '#ff4444' }
    return { score, grade, color, totalFiles, totalLoc, avgComplexity: +avgComplexity.toFixed(1), hotspots, languages }
}

const formatNum = n => n >= 1000 ? (n / 1000).toFixed(1) + 'k' : String(n)

/* ── Reactor Panel (Town Hall Health) ── */
function ReactorCard({ health, onClose }) {
    return (
        <div onClick={e => e.stopPropagation()} style={cardStyle} className="anim-scale-in">
            <div style={{ height: '2px', background: `linear-gradient(90deg, transparent 5%, ${health.color}88, transparent 95%)` }} />

            {/* Header */}
            <div style={headerStyle}>
                <div style={{ ...iconBoxStyle, background: `${health.color}1c`, border: `1px solid ${health.color}3a` }}>
                    <Shield size={20} color={health.color} />
                </div>
                <div style={{ flex: 1 }}>
                    <div style={titleStyle}>Town Hall</div>
                    <div style={subtitleStyle}>Codebase Health Monitor</div>
                </div>
                <button onClick={onClose} style={closeBtnStyle}><X size={14} /></button>
            </div>

            {/* Score */}
            <div style={{ padding: '14px 22px 16px', display: 'flex', alignItems: 'baseline', gap: '10px' }}>
                <span style={{ fontSize: '44px', fontWeight: 800, color: health.color, lineHeight: 1, letterSpacing: '-0.03em' }}>{health.score}</span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.35)' }}>/100</span>
                <span style={{ fontSize: '13px', fontWeight: 700, color: health.color, marginLeft: '6px', textTransform: 'uppercase', letterSpacing: '0.04em' }}>{health.grade}</span>
            </div>

            {/* Metrics grid */}
            <div style={{ padding: '0 22px 14px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
                <MetricCell label="Files" value={formatNum(health.totalFiles)} icon={<FileCode2 size={11} />} />
                <MetricCell label="Lines" value={formatNum(health.totalLoc)} icon={<Layers size={11} />} />
                <MetricCell label="Avg Complexity" value={health.avgComplexity} icon={<Activity size={11} />} warn={health.avgComplexity > 10} />
                <MetricCell label="Hotspots" value={health.hotspots} icon={<Flame size={11} />} warn={health.hotspots > 5} />
            </div>

            {/* Languages */}
            {Object.keys(health.languages).length > 0 && (
                <div style={{ padding: '4px 22px 20px' }}>
                    <div style={sectionLabelStyle}>Top Languages</div>
                    {Object.entries(health.languages).sort((a, b) => b[1] - a[1]).slice(0, 5).map(([lang, count]) => {
                        const pct = Math.round((count / health.totalFiles) * 100)
                        return (
                            <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '7px' }}>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.85)', minWidth: '90px', textTransform: 'capitalize' }}>{lang}</span>
                                <div style={{ flex: 1, height: '6px', background: 'rgba(255,255,255,0.06)', borderRadius: '3px', overflow: 'hidden' }}>
                                    <div style={{ width: `${pct}%`, height: '100%', background: health.color, opacity: 0.75, borderRadius: '3px' }} />
                                </div>
                                <span style={{ fontSize: '11px', color: 'rgba(255,255,255,0.55)', minWidth: '36px', textAlign: 'right', fontFamily: 'var(--font-mono)' }}>{pct}%</span>
                            </div>
                        )
                    })}
                </div>
            )}
        </div>
    )
}

/* ── Mothership Panel (Atlas Overview) ── */
function MothershipCard({ cityData, onClose }) {
    const repoName = cityData.name || cityData.path || 'Unknown'
    const source = cityData.source === 'github' ? 'GitHub' : cityData.source === 'client' ? 'Local' : cityData.source || 'Unknown'
    const totalFiles = cityData.buildings?.length || 0
    const totalLoc = cityData.metrics?.total_lines || cityData.buildings?.reduce((s, b) => s + (b.metrics?.loc || 0), 0) || 0
    const districts = cityData.districts?.length || 0
    const connections = cityData.roads?.length || 0

    const langCounts = cityData.metrics?.languages || {}
    const sortedLangs = Object.entries(langCounts).sort((a, b) => b[1] - a[1]).slice(0, 5)
    const maxLang = sortedLangs[0]?.[1] || 1

    return (
        <div onClick={e => e.stopPropagation()} style={cardStyle} className="anim-scale-in">
            <div style={{ height: '2px', background: 'linear-gradient(90deg, transparent 5%, #60a5fa88, transparent 95%)' }} />

            {/* Header */}
            <div style={headerStyle}>
                <div style={{ ...iconBoxStyle, background: 'rgba(96,165,250,0.12)', border: '1px solid rgba(96,165,250,0.2)' }}>
                    <Globe size={15} color="#60a5fa" />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ ...titleStyle, wordBreak: 'break-word' }}>{repoName}</div>
                    <div style={subtitleStyle}>
                        {source}{cityData.branch ? ` · ${cityData.branch}` : ''}
                    </div>
                </div>
                <button onClick={onClose} style={closeBtnStyle}><X size={12} /></button>
            </div>

            {/* Stats */}
            <div style={{ padding: '0 16px 12px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px' }}>
                <MetricCell label="Files" value={formatNum(totalFiles)} icon={<FileCode2 size={10} />} />
                <MetricCell label="Districts" value={districts} icon={<Map size={10} />} />
                <MetricCell label="Roads" value={connections} icon={<GitBranch size={10} />} />
            </div>

            <div style={{ padding: '0 16px 4px', fontSize: '11px', color: 'rgba(255,255,255,0.35)' }}>
                {formatNum(totalLoc)} lines of code
            </div>

            {/* Language bars */}
            {sortedLangs.length > 0 && (
                <div style={{ padding: '8px 16px 14px' }}>
                    <div style={sectionLabelStyle}>Languages</div>
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

/* ── Main component ── */
const LandmarkPanel = React.memo(function LandmarkPanel() {
    const selectedLandmark = useStore(s => s.selectedLandmark)
    const clearSelection = useStore(s => s.clearSelection)
    const cityData = useStore(s => s.cityData)

    useEffect(() => {
        if (!selectedLandmark) return
        const handleEscape = (e) => {
            if (e.key === 'Escape') {
                useStore.getState().clearSelection()
            }
        }
        window.addEventListener('keydown', handleEscape)
        return () => window.removeEventListener('keydown', handleEscape)
    }, [selectedLandmark])

    const health = useMemo(
        () => computeHealth(cityData?.buildings),
        [cityData]
    )

    // Position math sourced from landmarkPositions.js — guaranteed to match
    // the actual geometry rendered by EnergyCoreReactor and MothershipCore.
    const layout = useMemo(() => {
        if (!selectedLandmark || !cityData) return null

        if (selectedLandmark === 'reactor') {
            const topY = townHallTopY(cityData.buildings)
            const panelY = topY + 28
            const beamGeo = new THREE.BufferGeometry()
            beamGeo.setAttribute('position', new THREE.BufferAttribute(
                new Float32Array([0, topY, 0, 0, panelY - 2, 0]), 3
            ))
            return { panelPos: [0, panelY, 0], anchorPos: [0, topY, 0], beamGeo }
        }

        if (selectedLandmark === 'mothership') {
            const altitude = mothershipAltitude(cityData.buildings)
            const panelY = altitude + 50
            const anchorY = altitude + 16
            const beamGeo = new THREE.BufferGeometry()
            beamGeo.setAttribute('position', new THREE.BufferAttribute(
                new Float32Array([0, anchorY, 0, 0, panelY - 2, 0]), 3
            ))
            return { panelPos: [0, panelY, 0], anchorPos: [0, anchorY, 0], beamGeo }
        }

        return null
    }, [selectedLandmark, cityData])

    // Dispose previous beam geometry on layout change
    const prevBeamGeoRef = useRef(null)
    useEffect(() => {
        if (prevBeamGeoRef.current && prevBeamGeoRef.current !== layout?.beamGeo) {
            prevBeamGeoRef.current.dispose()
        }
        prevBeamGeoRef.current = layout?.beamGeo || null
        return () => {
            if (prevBeamGeoRef.current) {
                prevBeamGeoRef.current.dispose()
                prevBeamGeoRef.current = null
            }
        }
    }, [layout])

    if (!layout) return null

    return (
        <group>
            {/* Beam + anchor dot removed — same "no poles in the sky"
                rule as HologramPanel. The card anchors via its 3D
                position; no leader line needed. */}
            <group position={layout.panelPos}>
                {/* distanceFactor=140 for landmarks (mothership is high
                    altitude, town hall has a tall spire — camera sits
                    further than typical building selection). Keeps card
                    anchored to the landmark without blurry CSS upscaling. */}
                <Html center distanceFactor={140} style={{ pointerEvents: 'auto', userSelect: 'none' }} zIndexRange={[50, 0]} occlude={false}>
                    {selectedLandmark === 'reactor' && (
                        <ReactorCard health={health} onClose={clearSelection} />
                    )}
                    {selectedLandmark === 'mothership' && cityData && (
                        <MothershipCard cityData={cityData} onClose={clearSelection} />
                    )}
                </Html>
            </group>
        </group>
    )
})

export default LandmarkPanel

/* ── Shared styling ── */

const cardStyle = {
    width: '460px',
    // Solid near-opaque card — was bleeding the scene through
    background: 'linear-gradient(165deg, #0f1320 0%, #070a13 100%)',
    border: '1px solid rgba(120, 200, 255, 0.32)',
    borderRadius: '20px',
    boxShadow: '0 0 0 1px rgba(80, 170, 255, 0.10), 0 20px 60px rgba(0, 0, 0, 0.85), 0 0 90px rgba(60, 140, 220, 0.12)',
    color: '#fafafa',
    fontFamily: 'var(--font-sans)',
    overflow: 'hidden',
    backdropFilter: 'blur(12px) saturate(140%)',
}

const headerStyle = {
    padding: '20px 22px 14px',
    borderBottom: '1px solid rgba(255,255,255,0.05)',
    display: 'flex',
    alignItems: 'flex-start',
    gap: '14px',
}

const iconBoxStyle = {
    width: 44, height: 44, borderRadius: '10px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    flexShrink: 0,
}

const titleStyle = {
    fontSize: '17px',
    fontWeight: 700,
    lineHeight: 1.25,
    color: '#fafafa',
    letterSpacing: '-0.01em',
}

const subtitleStyle = {
    fontSize: '11px',
    color: '#71717a',
    fontFamily: 'var(--font-mono)',
    marginTop: '5px',
    lineHeight: 1.4,
    opacity: 0.85,
}

const closeBtnStyle = {
    background: 'rgba(255,255,255,0.06)',
    border: '1px solid rgba(255,255,255,0.10)',
    color: '#a1a1aa',
    cursor: 'pointer',
    width: '30px',
    height: '30px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: '8px',
    flexShrink: 0,
}

const sectionLabelStyle = {
    fontSize: '11px',
    color: 'rgba(255,255,255,0.4)',
    marginBottom: '8px',
    letterSpacing: '0.06em',
    textTransform: 'uppercase',
    fontWeight: 600,
}

function MetricCell({ label, value, icon, warn }) {
    return (
        <div style={{
            padding: '10px 12px',
            background: 'rgba(255,255,255,0.035)',
            borderRadius: '10px',
            border: '1px solid rgba(255,255,255,0.06)',
        }}>
            <div style={{
                fontSize: '10px',
                color: '#71717a',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '5px',
                display: 'flex',
                alignItems: 'center',
                gap: '4px',
            }}>
                {icon}
                {label}
            </div>
            <div style={{
                fontSize: '18px',
                fontWeight: 600,
                fontFamily: 'var(--font-sans)',
                color: warn ? '#ef4444' : '#fafafa',
                letterSpacing: '-0.015em',
            }}>
                {value}
            </div>
        </div>
    )
}
