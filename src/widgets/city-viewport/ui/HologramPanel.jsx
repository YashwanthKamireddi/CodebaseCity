import React, { useMemo, useEffect, useRef } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import { FileCode2, Code, Layers, Activity, User, Eye, Copy, ExternalLink, X } from 'lucide-react'
import { HEIGHT_SCALE } from './cityScale'

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
        const height = (dimensions?.height || 8) * HEIGHT_SCALE
        const bx = position.x
        const bz = position.z
        const buildingTop = height
        // Card always sits directly above the building roof — never floats
        // up the hero spire (that's what made it look like it was attached
        // to an antenna instead of the building).
        const panelY = buildingTop + 28

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
            {/* Beam line + anchor dot REMOVED per user feedback —
                "the poles of the buildings are still in the sky, remove them".
                The Html panel anchors itself via 3D position; no pole needed. */}
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
                        className="anim-scale-in"
                        key={selectedBuilding.id || selectedBuilding.path}
                        style={{
                            width: '460px',
                            // Solid near-opaque background — was too dim
                            // and the underlying scene was bleeding through
                            background: 'linear-gradient(165deg, #0f1320 0%, #070a13 100%)',
                            // Bolder border + double outer ring with the
                            // language colour for prominent visibility
                            border: `1px solid ${langColor}55`,
                            borderRadius: '20px',
                            boxShadow: `
                                0 0 0 1px ${langColor}22,
                                0 20px 60px rgba(0, 0, 0, 0.85),
                                0 0 90px ${langColor}1a
                            `,
                            color: '#fafafa',
                            fontFamily: 'var(--font-sans)',
                            overflow: 'hidden',
                            backdropFilter: 'blur(12px) saturate(140%)',
                        }}
                    >
                        {/* Top accent gradient line — now solid colour */}
                        <div style={{
                            height: '4px',
                            background: `linear-gradient(90deg, ${langColor}, ${langColor}aa, ${langColor})`,
                        }} />

                        {/* Header */}
                        <div style={{
                            padding: '20px 22px 14px',
                            borderBottom: '1px solid rgba(255,255,255,0.05)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '14px',
                        }}>
                            <div style={{
                                width: 44, height: 44, borderRadius: '10px',
                                background: `${langColor}1c`,
                                border: `1px solid ${langColor}3a`,
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                            }}>
                                <FileCode2 size={20} color={langColor} />
                            </div>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '17px',
                                    fontWeight: 700,
                                    lineHeight: 1.25,
                                    color: '#fafafa',
                                    wordBreak: 'break-word',
                                    letterSpacing: '-0.01em',
                                }}>
                                    {name}
                                </div>
                                <div style={{
                                    fontSize: '11px',
                                    color: '#71717a',
                                    fontFamily: 'var(--font-mono)',
                                    marginTop: '5px',
                                    wordBreak: 'break-all',
                                    lineHeight: 1.4,
                                    opacity: 0.85,
                                }}>
                                    {path}
                                </div>
                            </div>
                            <button
                                onClick={clearSelection}
                                style={{
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
                                    transition: 'all 0.15s ease',
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Tags row: Language + Author + Hotspot */}
                        <div style={{
                            padding: '12px 22px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            flexWrap: 'wrap',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '11px',
                                fontWeight: 600,
                                color: langColor,
                                padding: '4px 10px',
                                background: `${langColor}14`,
                                border: `1px solid ${langColor}28`,
                                borderRadius: '999px',
                                textTransform: 'capitalize',
                            }}>
                                <Code size={11} />
                                {language || 'unknown'}
                            </span>

                            {author && author !== 'Unknown' && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '11px',
                                    color: '#a1a1aa',
                                }}>
                                    <User size={11} />
                                    {author}
                                </span>
                            )}

                            {is_hotspot && (
                                <span style={{
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    padding: '3px 9px',
                                    background: 'rgba(239,68,68,0.12)',
                                    border: '1px solid rgba(239,68,68,0.22)',
                                    borderRadius: '999px',
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
                            padding: '16px 22px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '10px',
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
