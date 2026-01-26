/**
 * BuildingPanel.jsx
 *
 * THE BIONIC CODE: Contextual Side Sheet.
 * Design: Glassmorphism, docked to the right edge.
 * Verified Structure: Clean JSX.
 * Purpose: Professional detail view, not a game HUD.
 */
import React from 'react'
import useStore from '../../../store/useStore'
import { detectPattern } from '../utils'
import { BuildingModel } from '../model'
import CodeViewer from './CodeViewer'
import FileInsights from './FileInsights'
import ImpactPanel from '../../../features/explorer/ui/ImpactPanel'
import { X, FileCode2, Code, Layers, GitCommit, Copy, ExternalLink, Sparkles, AlertTriangle, Activity, Maximize2, Minimize2, Eye, User, Mail } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
// Styles imported from index.css mostly, inline for layout

export default function BuildingPanel({ building }) {
    const { clearSelection, fetchFileContent, fileContent } = useStore()
    const [isMaximized, setIsMaximized] = React.useState(false)
    const [showCode, setShowCode] = React.useState(false)

    if (!building) return null

    const { metrics, name, path, is_hotspot, decay_level, language, author, email } = building
    const pattern = detectPattern(building)

    // Fetch content when building changes
    React.useEffect(() => {
        if (path) fetchFileContent(path)
    }, [path, fetchFileContent])

    const isContentReady = fileContent?.path === path && !fileContent?.loading

    return (
        <AnimatePresence>
            <motion.div
                initial={{ x: '100%', opacity: 0.5 }}
                animate={{
                    x: 0,
                    opacity: 1,
                    width: '380px',
                    height: '100vh',
                    top: 0,
                    right: 0
                }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ duration: 0.4, ease: [0.16, 1, 0.3, 1] }} // "Swift Out" Curve
                style={{
                    position: 'fixed',
                    zIndex: 1000,
                    // THE VOID THEME: Premium Solid Dark
                    background: '#09090b',
                    borderLeft: '1px solid #27272a',
                    boxShadow: '-30px 0 100px rgba(0,0,0,0.8)',
                    display: 'flex',
                    flexDirection: 'column',
                    color: '#e4e4e7',
                    overflow: 'hidden' // FIX: CONTAIN EVERYTHING
                }}
            >
                {/* HEADER: File Identity */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between',
                    gap: '16px' // Force gap
                }}>
                    <div style={{ flex: 1, minWidth: 0 }}> {/* Critical for flex truncation */}
                        <div style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            marginBottom: '6px',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            <FileCode2 size={12} /> File Inspector
                        </div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.4rem',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            lineHeight: 1.2,
                            overflowWrap: 'break-word', // Wrap long names
                            color: '#e4e4e7'
                        }}>
                            {name}
                        </h2>

                        {/* Author Badge */}
                        {author && author !== 'Unknown' && (
                            <div style={{
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '8px',
                                marginTop: '12px',
                                padding: '4px 10px 4px 4px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                borderRadius: '20px',
                                border: '1px solid rgba(255, 255, 255, 0.08)'
                            }}>
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    background: 'linear-gradient(135deg, #3b82f6, #6366f1)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    fontSize: '0.65rem',
                                    fontWeight: 700,
                                    color: 'white'
                                }}>
                                    {author.charAt(0).toUpperCase()}
                                </div>
                                <div style={{ fontSize: '0.8rem', fontWeight: 500, color: '#d4d4d8' }}>
                                    {author}
                                </div>
                            </div>
                        )}

                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--text-mono)',
                            fontFamily: 'var(--font-mono)',
                            marginTop: '12px',
                            padding: '8px 10px',
                            background: '#121215',
                            border: '1px solid #27272a',
                            borderRadius: '6px',
                            wordBreak: 'break-all', // Force break for paths
                            lineHeight: 1.4,
                            userSelect: 'text'
                        }}>
                            {path}
                        </div>
                    </div>

                    <button
                        onClick={clearSelection}
                        className="touch-target"
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: '#a1a1aa',
                            padding: '4px',
                            borderRadius: '4px',
                            flexShrink: 0
                        }}
                    >
                        <X size={20} />
                    </button>
                </div>

                {/* SCROLL CONTENT */}
                <div style={{ flex: 1, overflowY: 'auto', padding: '24px' }}>

                    {/* Status Tags */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '32px' }}>
                        <StatusBadge label={language} />
                        {is_hotspot && <StatusBadge label="Hotspot" variant="danger" icon={<AlertTriangle size={12} />} />}
                        {decay_level > 0.6 && <StatusBadge label="Legacy" variant="warning" />}
                        {pattern && <StatusBadge label={pattern.label} variant="active" icon={<Sparkles size={12} />} />}
                    </div>

                    {/* Key Metrics - Swiss Grid Layout */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: '1fr 1fr',
                        gap: '16px',
                        marginBottom: '32px'
                    }}>
                        <SwissMetric
                            label="Health Grade"
                            value={BuildingModel.getGrade(BuildingModel.calculateHealth(metrics, decay_level))}
                            highlight={false}
                        />
                        <SwissMetric
                            label="Lines of Code"
                            value={BuildingModel.formatMetric(metrics.loc, 'loc')}
                        />
                        <SwissMetric
                            label="Complexity"
                            value={metrics.complexity}
                            highlight={metrics.complexity > 20}
                        />
                        <SwissMetric
                            label="Commits (Churn)"
                            value={metrics.churn}
                        />
                        <SwissMetric
                            label="Incoming Deps"
                            value={metrics.dependencies_in}
                        />
                    </div>

                    {/* Code Viewer Action */}
                    <div style={{ marginBottom: '32px' }}>
                        <SectionHeader title="Source Code" icon={<FileCode2 size={14} />} />
                        <div style={{
                            background: '#18181b', // Surface
                            borderRadius: '12px',
                            padding: '32px 24px',
                            border: '1px solid #27272a',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '16px',
                            textAlign: 'center'
                        }}>
                            <div style={{
                                width: '64px', height: '64px',
                                background: '#27272a', borderRadius: '16px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '8px'
                            }}>
                                <FileCode2 size={32} color="#71717a" />
                            </div>
                            <button
                                onClick={() => useStore.getState().setCodeViewerOpen(true)}
                                style={{
                                    background: '#3b82f6',
                                    color: 'white',
                                    border: 'none',
                                    padding: '10px 24px',
                                    borderRadius: '6px',
                                    fontWeight: 600,
                                    fontSize: '0.9rem',
                                    cursor: 'pointer',
                                    display: 'inline-flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    boxShadow: '0 4px 12px rgba(59, 130, 246, 0.3)',
                                    marginBottom: '0' // Fix spacing
                                }}
                            >
                                <Eye size={16} /> View Source
                            </button>
                        </div>
                    </div>

                    {/* Action Bar */}
                    <div style={{ display: 'flex', gap: '12px' }}>
                        <SwissButton
                            label="Open in Editor"
                            icon={<ExternalLink size={14} />}
                            onClick={() => window.open(`vscode://file/${path}`, '_blank')}
                            primary
                        />
                        <SwissButton
                            label="Copy Path"
                            icon={<Copy size={14} />}
                            onClick={() => navigator.clipboard.writeText(path)}
                        />
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

// --- SUBCOMPONENTS (Bionic) ---

const StatusBadge = ({ label, variant = 'default', icon }) => {
    const colors = {
        default: { bg: 'rgba(120,120,120,0.1)', txt: 'var(--text-secondary)' },
        danger: { bg: 'rgba(239, 68, 68, 0.15)', txt: 'var(--signal-danger)' },
        warning: { bg: 'rgba(245, 158, 11, 0.15)', txt: 'var(--signal-warning)' },
        active: { bg: 'rgba(37, 99, 235, 0.15)', txt: 'var(--signal-active)' }
    }
    const c = colors[variant] || colors.default
    return (
        <span style={{
            display: 'inline-flex', alignItems: 'center', gap: '4px',
            padding: '4px 8px', borderRadius: '4px',
            fontSize: '0.7rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em',
            background: c.bg, color: c.txt
        }}>
            {icon} {label}
        </span>
    )
}

const SwissMetric = ({ label, value, highlight }) => (
    <div style={{ borderTop: '2px solid var(--glass-border)', paddingTop: '8px' }}>
        <div style={{ fontSize: '0.7rem', color: 'var(--text-secondary)', marginBottom: '4px' }}>{label}</div>
        <div style={{
            fontSize: '1.8rem',
            fontWeight: 300,
            fontFamily: 'var(--font-display)',
            color: highlight ? 'var(--signal-danger)' : 'var(--text-primary)'
        }}>
            {value}
        </div>
    </div>
)

const SectionHeader = ({ title, icon }) => (
    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
        <span style={{ color: 'var(--text-secondary)' }}>{icon}</span>
        <h3 style={{
            fontSize: '0.9rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            letterSpacing: '0.1em',
            margin: 0,
            color: 'var(--text-primary)'
        }}>
            {title}
        </h3>
    </div>
)

const SwissButton = ({ label, icon, onClick, primary }) => (
    <button
        onClick={onClick}
        title={label}
        style={{
            flex: 1,
            minWidth: 0, // Allow flexbox shrinking
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px',
            borderRadius: '4px',
            border: primary ? 'none' : '1px solid var(--glass-border)',
            background: primary ? 'var(--text-primary)' : 'transparent',
            color: primary ? 'var(--bg-studio)' : 'var(--text-primary)',
            fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer',
            overflow: 'hidden'
        }}
    >
        <span style={{ flexShrink: 0 }}>{icon}</span>
        <span style={{
            whiteSpace: 'nowrap',
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            height: '1.2em' // Consistency
        }}>
            {label}
        </span>
    </button>
)
