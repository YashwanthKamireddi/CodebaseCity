import React, { useMemo, useRef } from 'react'
import { Html } from '@react-three/drei'
import { useFrame } from '@react-three/fiber'
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

export default function HologramPanel() {
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const clearSelection = useStore(s => s.clearSelection)
    const codeViewerOpen = useStore(s => s.codeViewerOpen)

    const beamRef = useRef()
    const dotRef = useRef()

    const layoutData = useMemo(() => {
        if (!selectedBuilding) return null
        const { position, dimensions } = selectedBuilding
        const height = (dimensions?.height || 8) * 3.0
        const bx = position.x
        const bz = position.z
        // Building is at y = height/2 with scale height, so its roof is at y = height
        const buildingTop = height
        const panelY = buildingTop + 12

        // Beam line from building roof to panel
        const beamGeo = new THREE.BufferGeometry()
        beamGeo.setAttribute('position', new THREE.BufferAttribute(
            new Float32Array([bx, buildingTop, bz, bx, panelY, bz]), 3
        ))

        return {
            panelPos: [bx, panelY, bz],
            dotPos: [bx, buildingTop, bz],
            beamGeo,
            height,
        }
    }, [selectedBuilding])

    // Animate the dot at the building top
    useFrame(({ clock }) => {
        if (dotRef.current) {
            const t = clock.elapsedTime
            dotRef.current.material.opacity = 0.5 + Math.sin(t * 4) * 0.3
        }
    })

    if (!selectedBuilding || !layoutData || codeViewerOpen) return null

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
                    opacity={0.4}
                    depthTest={false}
                    depthWrite={false}
                />
            </lineSegments>

            {/* Glowing dot at building roof */}
            <mesh ref={dotRef} position={layoutData.dotPos} renderOrder={999}>
                <sphereGeometry args={[0.6, 12, 12]} />
                <meshBasicMaterial
                    color="#00d9ff"
                    transparent
                    opacity={0.8}
                    depthTest={false}
                    depthWrite={false}
                />
            </mesh>

            {/* Point light glow at anchor */}
            <pointLight
                position={layoutData.dotPos}
                color="#00d9ff"
                intensity={3}
                distance={15}
                decay={2}
            />

            <group position={layoutData.panelPos}>
                <Html
                    center
                    distanceFactor={40}
                    style={{ pointerEvents: 'auto', userSelect: 'none' }}
                    zIndexRange={[50, 0]}
                >
                    <div
                        onClick={e => e.stopPropagation()}
                        style={{
                            width: '320px',
                            background: 'rgba(9, 9, 11, 0.92)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(0, 217, 255, 0.2)',
                            borderRadius: '16px',
                            boxShadow: '0 0 40px rgba(0, 217, 255, 0.08), 0 20px 60px rgba(0,0,0,0.7)',
                            color: '#e4e4e7',
                            fontFamily: "'Inter', system-ui, sans-serif",
                            overflow: 'hidden',
                        }}
                    >
                        {/* Top accent line */}
                        <div style={{
                            height: '2px',
                            background: 'linear-gradient(90deg, transparent, #00d9ff, transparent)',
                        }} />

                        {/* Header */}
                        <div style={{
                            padding: '16px 18px 12px',
                            borderBottom: '1px solid rgba(255,255,255,0.06)',
                            display: 'flex',
                            alignItems: 'flex-start',
                            gap: '12px',
                        }}>
                            <div style={{ flex: 1, minWidth: 0 }}>
                                <div style={{
                                    fontSize: '9px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.12em',
                                    fontWeight: 600,
                                    color: '#71717a',
                                    marginBottom: '4px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '4px',
                                }}>
                                    <FileCode2 size={10} /> File Inspector
                                </div>
                                <div style={{
                                    fontSize: '15px',
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
                                    marginTop: '4px',
                                    wordBreak: 'break-all',
                                }}>
                                    {path}
                                </div>
                            </div>
                            <button
                                onClick={clearSelection}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: '#52525b',
                                    cursor: 'pointer',
                                    padding: '2px',
                                    borderRadius: '4px',
                                    flexShrink: 0,
                                    lineHeight: 0,
                                }}
                            >
                                <X size={14} />
                            </button>
                        </div>

                        {/* Meta row: Language + Author */}
                        <div style={{
                            padding: '10px 18px',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '10px',
                            borderBottom: '1px solid rgba(255,255,255,0.04)',
                        }}>
                            {/* Language badge */}
                            <span style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '5px',
                                fontSize: '10px',
                                fontWeight: 600,
                                color: langColor,
                                padding: '3px 8px',
                                background: `${langColor}15`,
                                borderRadius: '4px',
                                textTransform: 'capitalize',
                            }}>
                                <Code size={10} />
                                {language || 'unknown'}
                            </span>

                            {/* Author */}
                            {author && author !== 'Unknown' && (
                                <span style={{
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '5px',
                                    fontSize: '10px',
                                    color: '#a1a1aa',
                                }}>
                                    <User size={10} />
                                    {author}
                                </span>
                            )}

                            {/* Hotspot badge */}
                            {is_hotspot && (
                                <span style={{
                                    fontSize: '9px',
                                    fontWeight: 700,
                                    color: '#ef4444',
                                    padding: '2px 6px',
                                    background: 'rgba(239,68,68,0.12)',
                                    borderRadius: '4px',
                                    textTransform: 'uppercase',
                                    letterSpacing: '0.05em',
                                    marginLeft: 'auto',
                                }}>
                                    Hotspot
                                </span>
                            )}
                        </div>

                        {/* Metrics grid */}
                        <div style={{
                            padding: '14px 18px',
                            display: 'grid',
                            gridTemplateColumns: '1fr 1fr 1fr',
                            gap: '2px 16px',
                        }}>
                            <MetricCell label="LOC" value={loc} />
                            <MetricCell
                                label="Complexity"
                                value={complexity}
                                warn={complexity > 15}
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
                            padding: '0 18px 14px',
                            display: 'flex',
                            gap: '8px',
                        }}>
                            <ActionBtn
                                label="View Source"
                                icon={<Eye size={12} />}
                                primary
                                onClick={() => useStore.getState().setCodeViewerOpen(true)}
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
}

function MetricCell({ label, value, warn }) {
    return (
        <div style={{ padding: '4px 0' }}>
            <div style={{
                fontSize: '9px',
                color: '#52525b',
                textTransform: 'uppercase',
                letterSpacing: '0.08em',
                marginBottom: '2px',
            }}>
                {label}
            </div>
            <div style={{
                fontSize: '16px',
                fontWeight: 300,
                fontFamily: "'Outfit', sans-serif",
                color: warn ? '#ef4444' : '#e4e4e7',
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
                padding: '8px',
                borderRadius: '6px',
                border: primary ? 'none' : '1px solid rgba(255,255,255,0.08)',
                background: primary ? '#3b82f6' : 'rgba(255,255,255,0.04)',
                color: primary ? '#fff' : '#a1a1aa',
                fontSize: '11px',
                fontWeight: 600,
                cursor: 'pointer',
            }}
        >
            {icon} {label}
        </button>
    )
}
