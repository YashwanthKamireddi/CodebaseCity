/**
 * BuildingPanel.jsx
 *
 * THE BIONIC CODE: Contextual Side Sheet.
 * Design: Glassmorphism, docked to the right edge.
 * Purpose: Professional detail view, not a game HUD.
 */
import React from 'react'
import useStore from '../store/useStore'
import { detectPattern } from './BuildingLabel'
import FileInsights from './FileInsights'
import { X, FileCode2, Code, Layers, GitCommit, Copy, ExternalLink, Sparkles, AlertTriangle, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
// Styles imported from index.css mostly, inline for layout

export default function BuildingPanel({ building }) {
    const { clearSelection, fetchFileContent, fileContent } = useStore()

    if (!building) return null

    const { metrics, name, path, is_hotspot, decay_level, language } = building
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
                animate={{ x: 0, opacity: 1 }}
                exit={{ x: '100%', opacity: 0.5 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed',
                    top: 0,
                    right: 0,
                    width: '450px', // Wider for code
                    height: '100vh',
                    zIndex: 1000,
                    background: 'var(--glass-panel)',
                    backdropFilter: `blur(var(--glass-blur))`,
                    WebkitBackdropFilter: `blur(var(--glass-blur))`,
                    borderLeft: '1px solid var(--glass-border)',
                    boxShadow: '-8px 0 32px rgba(0,0,0,0.2)',
                    display: 'flex',
                    flexDirection: 'column',
                    color: 'var(--text-primary)'
                }}
            >
                {/* HEADER: File Identity */}
                <div style={{
                    padding: '24px',
                    borderBottom: '1px solid var(--glass-border)',
                    display: 'flex',
                    alignItems: 'flex-start',
                    justifyContent: 'space-between'
                }}>
                    <div>
                        <div style={{
                            fontSize: '0.75rem',
                            textTransform: 'uppercase',
                            letterSpacing: '0.1em',
                            fontWeight: 600,
                            color: 'var(--text-secondary)',
                            marginBottom: '4px'
                        }}>
                            File Inspector
                        </div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.5rem',
                            fontFamily: 'var(--font-display)',
                            fontWeight: 600,
                            lineHeight: 1.2
                        }}>
                            {name}
                        </h2>
                        <div style={{
                            fontSize: '0.8rem',
                            color: 'var(--text-mono)',
                            fontFamily: 'var(--font-mono)',
                            marginTop: '4px',
                            opacity: 0.8
                        }}>
                            {path}
                        </div>
                    </div>
                    <button
                        onClick={clearSelection}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            cursor: 'pointer',
                            color: 'var(--text-secondary)'
                        }}
                    >
                        <X size={24} />
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
                        <SwissMetric label="Lines of Code" value={metrics.loc} />
                        <SwissMetric label="Complexity" value={metrics.complexity} highlight={metrics.complexity > 20} />
                        <SwissMetric label="Commits (Churn)" value={metrics.churn} />
                        <SwissMetric label="Incoming Deps" value={metrics.dependencies_in} />
                    </div>

                    {/* Code Viewer (Mini Editor) */}
                    <div style={{ marginBottom: '32px', flex: 1, display: 'flex', flexDirection: 'column' }}>
                        <SectionHeader title="Source Code" icon={<FileCode2 size={14} />} />
                        <div style={{
                            background: '#1e1e1e', // Monaco Editor BG
                            border: '1px solid #2d2d2d',
                            borderRadius: '6px',
                            overflow: 'hidden',
                            position: 'relative',
                            fontFamily: '"JetBrains Mono", Consolas, monospace',
                            fontSize: '0.8rem',
                            lineHeight: '1.5',
                            display: 'flex',
                            flexDirection: 'column',
                            minHeight: '300px'
                        }}>
                            {/* Editor Header */}
                            <div style={{
                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                padding: '8px 12px',
                                background: '#252526',
                                borderBottom: '1px solid #2d2d2d',
                                color: '#cccccc',
                                fontSize: '0.75rem'
                            }}>
                                <span>{path.split('/').pop()}</span>
                                <span style={{ opacity: 0.5 }}>{metrics.loc} lines</span>
                            </div>

                            {/* Scrollable Code Area */}
                            <div style={{
                                flex: 1,
                                overflow: 'auto',
                                padding: '16px',
                                color: '#d4d4d4', // VS Code Default FG
                                whiteSpace: 'pre',
                                tabSize: 4
                            }}>
                                {fileContent?.loading ? (
                                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b' }}>Loading source...</div>
                                ) : (
                                    fileContent?.error ? (
                                        <div style={{ color: '#ef4444' }}>Unable to read file content.</div>
                                    ) : (
                                        fileContent?.content || '// No content available.'
                                    )
                                )}
                            </div>
                        </div>
                    </div>

                    {/* Analysis Stream */}
                    <div style={{ marginBottom: '32px' }}>
                        <SectionHeader title="Deep Analysis" icon={<Activity size={14} />} />
                        <div style={{
                            fontSize: '0.9rem',
                            color: 'var(--text-secondary)',
                            lineHeight: 1.6,
                            background: 'rgba(0,0,0,0.03)',
                            padding: '16px',
                            borderRadius: '8px'
                        }}>
                            <FileInsights file={building} />
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
        style={{
            flex: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
            padding: '12px',
            borderRadius: '0px', // Strict Swiss corners? Or minor radius? Let's go 4px
            border: primary ? 'none' : '1px solid var(--glass-border)',
            background: primary ? 'var(--text-primary)' : 'transparent',
            color: primary ? 'var(--bg-studio)' : 'var(--text-primary)',
            fontSize: '0.8rem', fontWeight: 600,
            cursor: 'pointer'
        }}
    >
        {icon} {label}
    </button>
)
