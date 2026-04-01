import React, { useMemo, useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import { FileCode2, Code, Layers, Activity, User, Eye, Copy, ExternalLink, X } from 'lucide-react'

function formatFileSize(bytes) {
    if (!bytes || bytes === 0) return '0 B'
    const units = ['B', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(1024))
    return `${(bytes / Math.pow(1024, i)).toFixed(i > 0 ? 1 : 0)} ${units[i]}`
}

const langColors = {
    javascript: '#f7df1e',
    typescript: '#3178c6',
    python: '#3572A5',
    go: '#00ADD8',
    rust: '#dea584',
}

const HologramPanel = React.memo(function HologramPanel() {
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const clearSelection = useStore(s => s.clearSelection)
    const codeViewerOpen = useStore(s => s.codeViewerOpen)
    const selectedLandmark = useStore(s => s.selectedLandmark)

    const prevBeamGeoRef = useRef(null)

    const layoutData = useMemo(() => {
        if (!selectedBuilding) return null
        const { position, dimensions } = selectedBuilding
        const height = (dimensions?.height || 8) * 3.0
        const bx = position.x
        const bz = position.z
        const buildingTop = height
        let panelY = buildingTop + 30

        const cityData = useStore.getState().cityData
        if (cityData?.buildings) {
            const sorted = [...cityData.buildings].map(b => {
                const w = b.dimensions?.width || 8
                const h = b.dimensions?.height || 8
                return { path: b.path, v: w * w * h, rawW: w, rawH: h }
            }).sort((a,b) => b.v - a.v).slice(0, 5)

            const hero = sorted.find(s => s.path === (selectedBuilding.path || selectedBuilding.id))
            if (hero) {
                const spireH = Math.max(12, hero.rawH * 3.0 * 0.35)
                const spireW = Math.min(hero.rawW * 0.15, 2.5)
                panelY = buildingTop + 1 + spireH + spireW * 0.2 + 30
            }
        }

        // Dispose previous geometry to prevent memory leak
        if (prevBeamGeoRef.current) {
            prevBeamGeoRef.current.dispose()
        }

        // Beam line from building roof to panel
        const beamGeo = new THREE.BufferGeometry()
        beamGeo.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([bx, buildingTop, bz, bx, panelY - 2, bz]), 3
        ))
        prevBeamGeoRef.current = beamGeo

        return {
            panelPos: [bx, panelY, bz],
            dotPos: [bx, buildingTop, bz],
            beamGeo,
            height,
        }
    }, [selectedBuilding])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (prevBeamGeoRef.current) {
                prevBeamGeoRef.current.dispose()
                prevBeamGeoRef.current = null
            }
        }
    }, [])

    if (!selectedBuilding || !layoutData || codeViewerOpen || selectedLandmark) return null

    const { name, path, metrics, language, author, is_hotspot, classes, functions } = selectedBuilding
    const langColor = langColors[language] || '#71717a'
    const complexity = metrics?.complexity || 1
    const loc = metrics?.loc ?? metrics?.lines ?? '—'
    const commits = metrics?.commits ?? '—'

    return (
        <group>
            {/* Beam line from building top to panel */}
            <lineSegments geometry={layoutData.beamGeo} renderOrder={998}>
                <lineBasicMaterial
                    color="#00d9ff"
                    transparent
                    opacity={0.55}
                    depthTest={false}
                    depthWrite={false}
                />
            </lineSegments>

            {/* Anchor dot at building roof */}
            <mesh position={layoutData.dotPos} renderOrder={999}>
                <sphereGeometry args={[0.8, 10, 10]} />
                <meshBasicMaterial
                    color="#00d9ff"
                    depthTest={false}
                    depthWrite={false}
                />
            </mesh>

            <group position={layoutData.panelPos}>
                <Html
                    center
                    distanceFactor={60}
                    style={{ pointerEvents: 'auto', userSelect: 'none' }}
                    zIndexRange={[50, 0]}
                    occlude={false}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '340px',
                            background: 'linear-gradient(165deg, rgba(12, 14, 22, 0.98), rgba(6, 8, 16, 0.99))',
                            border: '1px solid rgba(0, 180, 255, 0.15)',
                            borderRadius: '14px',
                            boxShadow: `
                                0 0 0 1px rgba(0, 180, 255, 0.05),
                                0 8px 32px rgba(0, 0, 0, 0.7),
                                0 0 60px rgba(0, 120, 200, 0.06)
                            `,
                            color: '#e4e4e7',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            overflow: 'hidden',
                        }}
                    >
                        {/* Top accent gradient line */}
                        <div style={{
                            height: '2px',
                            background: `linear-gradient(90deg, transparent 5%, ${langColor}88, transparent 95%)`,
                        }} />

                        {/* Header */}
                        <div style={{
                            padding: '14px 16px 10px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '10px',
                        }}>
                            <div style={{
                                width: 32, height: 32, borderRadius: '8px',
                                background: `${langColor}18`,
                                border: `1px solid ${langColor}30`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <FileCode2 size={15} color={langColor} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '14px',
                                    fontWeight: 600,
                                    lineHeight: 1.2,
                                    color: '#fafafa',
                                    wordBreak: 'break-word',
                                }}>
                                    {name}
                                </div>
                                <div style={{
                                    fontSize: '10px',
                                    color: '#52525b',
                                    fontFamily: "'JetBrains Mono', monospace",
                                    marginTop: '3px',
                                    wordBreak: 'break-all',
                                    lineHeight: 1.3,
                                }}>
                                    {path}
                                </div>
                            </div>
                            <button
                                onClick={clearSelection}
                                style={{
                                    background: 'rgba(255,255,255,0.06)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    color: '#71717a',
                                    cursor: 'pointer',
                                    padding: '4px',
                                    borderRadius: '6px',
                                    flexShrink: 0,
                                    lineHeight: 0,
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <X size={12} />
                            </button>
                        </div>

                        {/* Tags row: Language + Author + Hotspot */}
                        <div style={{
                            padding: '8px 16px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            flexWrap: 'wrap',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: langColor,
                                padding: '2px 8px',
                                background: `${langColor}12`,
                                border: `1px solid ${langColor}20`,
                                borderRadius: '20px',
                                textTransform: 'capitalize',
                            }}>
                                <Code size={9} />
                                {language || 'unknown'}
                            </span>

                            {author && author !== 'Unknown' && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                    fontSize: '10px',
                                    color: '#a1a1aa',
                                }}>
                                    <User size={9} />
                                    {author}
                                </span>
                            )}

                            {is_hotspot && (
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    padding: '2px 7px',
                                    background: 'rgba(239,68,68,0.10)',
                                    border: '1px solid rgba(239,68,68,0.18)',
                                    borderRadius: '20px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.06em',
                                    marginLeft: 'auto',
                                }}>
                                    Hotspot
                                </span>
                            )}
                        </div>

                        {/* Metrics grid — 2×3 */}
                        <div style={{
                            padding: '12px 16px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '8px',
                        }}>
                            <MetricCell label="Lines" value={loc} icon={<Layers size={10} />} />
                            <MetricCell
                                label="Complexity"
                                value={complexity}
                                warn={complexity > 15}
                                icon={<Activity size={10} />}
                            />
                            <MetricCell label="Commits" value={commits} />
                            <MetricCell
                                label="Size"
                                value={formatFileSize(metrics?.size_bytes || 0)}
                            />
                            <MetricCell
                                label="Classes"
                                value={classes?.length || 0}
                            />
                            <MetricCell
                                label="Functions"
                                value={functions?.length || 0}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{
                            padding: '0 16px 12px',
                            display: 'flex',
                            gap: '8px',
                        }}>
                            <ActionBtn
                                label="View Source"
                                icon={<Eye size={12} />}
                                primary
                                onClick={() => {
                                    React.startTransition(() => {
                                        useStore.getState().setCodeViewerOpen(true)
                                    })
                                }}
                            />
                            <ActionBtn
                                label="Copy Path"
                                icon={<Copy size={12} />}
                                onClick={() => navigator.clipboard.writeText(path)}
                            />
                        </div>
                    </div>
                </Html>
            </group>
        </group>
    )
})

export default HologramPanel

function MetricCell({ label, value, warn, icon }) {
    return (
        <div style={{
            padding: '6px 8px',
            background: 'rgba(255,255,255,0.025)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.04)',
        }}>
            <div style={{
                fontSize: '9px',
                color: '#52525b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '3px',
                display: 'flex',
                alignItems: 'center',
                gap: '3px',
            }}>
                {icon}
                {label}
            </div>
            <div style={{
                fontSize: '15px',
                fontWeight: 500,
                fontFamily: "'Outfit', 'Inter', sans-serif",
                color: warn ? '#ef4444' : '#e4e4e7',
                letterSpacing: '-0.01em',
            }}>
                {value}
            </div>
        </div>
    )
}

function ActionBtn({ label, icon, onClick, primary }) {
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '6px',
                padding: '9px',
                borderRadius: '8px',
                border: primary ? 'none' : '1px solid rgba(255,255,255,0.08)',
                background: primary
                    ? 'linear-gradient(135deg, #3b82f6, #2563eb)'
                    : 'rgba(255,255,255,0.04)',
                color: primary ? '#fff' : '#a1a1aa',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
                transition: 'all 0.15s ease',
                boxShadow: primary ? '0 2px 8px rgba(59,130,246,0.3)' : 'none',
            }}
        >
            {icon} {label}
        </button>
    )
}
