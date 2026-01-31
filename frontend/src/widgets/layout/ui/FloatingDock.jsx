/**
 * FloatingDock.jsx
 *
 * A refined "Control Deck" for professional navigation.
 * Static, precise, and high-contrast.
 */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    // Semantic icons that represent actual functionality
    Building2,       // 3D City View - buildings/architecture
    Table2,          // Table/Metrics view - data tables
    FolderTree,      // File Inspector - folder hierarchy
    Search,          // Search command palette
    ScanLine,        // Analyze - scanning codebase
    Sparkles,        // AI - sparkles/magic
    History,         // Time Travel - history/timeline
    Github,          // GitHub link
    Network,         // 2D Dependency Graph
    Download,        // Export Report
    Brain            // Intelligence Dashboard
} from 'lucide-react'
import useStore from '../../../store/useStore'

export default function FloatingDock({ view, onViewChange, onAnalyze, onShowGraph, onShowExport }) {
    const { setCommandPaletteOpen, toggleRoads, showRoads, loading, cityData, setActiveIntelligencePanel, activeIntelligencePanel } = useStore()

    return (
        <div style={{
            position: 'fixed',
            bottom: 'var(--space-8)',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 'var(--z-floating-dock)',
            display: 'flex',
            marginBottom: 'safe-area-inset-bottom'
        }}>
            <nav className="control-deck surface-glass" style={{
                display: 'flex',
                gap: 'var(--space-2)',
                padding: 'var(--space-2)',
                borderRadius: 'var(--radius-lg)',
                // background handled by surface-glass class
                // border handled by surface-glass class
                boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                alignItems: 'center'
            }}>
                {/* View Toggles */}
                <DeckItem
                    onClick={() => onViewChange('3d')}
                    active={view === '3d'}
                    icon={<Building2 size={18} />}
                    label="City View"
                    description="3D code visualization"
                />

                <DeckItem
                    onClick={() => onViewChange('table')}
                    active={view === 'table'}
                    icon={<Table2 size={18} />}
                    label="Metrics Table"
                    description="File statistics & metrics"
                />

                <DeckItem
                    onClick={() => useStore.setState(state => ({ sidebarOpen: !state.sidebarOpen }))}
                    active={useStore(state => state.sidebarOpen)}
                    icon={<FolderTree size={18} />}
                    label="File Inspector"
                    description="Browse project structure"
                />

                {/* 2D Dependency Graph - NEW */}
                <DeckItem
                    onClick={onShowGraph}
                    icon={<Network size={18} />}
                    label="Dependency Graph"
                    description="Interactive 2D graph view"
                    disabled={!cityData}
                />

                {/* Intelligence Dashboard - Developer Tools */}
                <DeckItem
                    onClick={() => setActiveIntelligencePanel(activeIntelligencePanel ? null : 'health')}
                    active={!!activeIntelligencePanel}
                    icon={<Brain size={18} />}
                    label="Intelligence"
                    description="Code health, quality & impact analysis"
                    disabled={!cityData}
                    accent
                />

                <Divider />

                {/* Actions */}
                <DeckItem
                    onClick={() => setCommandPaletteOpen(true)}
                    icon={<Search size={18} />}
                    label="Search"
                    description="Find files, commands, symbols"
                    shortcut="⌘K"
                />

                <DeckItem
                    onClick={onAnalyze}
                    icon={<ScanLine size={18} />}
                    label="Analyze"
                    description="Scan repository for metrics"
                    loading={loading}
                    accent
                />

                <DeckItem
                    onClick={() => useStore.setState({ chatOpen: !useStore.getState().chatOpen })}
                    icon={<Sparkles size={18} />}
                    label="AI Architect"
                    description="Get AI-powered insights"
                />

                <Divider />

                {/* Toggles */}
                <DeckItem
                    onClick={() => useStore.setState(state => ({ showTimeline: !state.showTimeline }))}
                    active={useStore(state => state.showTimeline)}
                    icon={<History size={18} />}
                    label="Time Travel"
                    description="View codebase evolution over time"
                />

                {/* Export Report - NEW */}
                <DeckItem
                    onClick={onShowExport}
                    icon={<Download size={18} />}
                    label="Export Report"
                    description="Download analysis as PDF/HTML"
                    disabled={!cityData}
                />

                <Divider />

                <DeckItem
                    onClick={() => window.open('https://github.com/YashwanthKamireddi/CodebaseCity', '_blank')}
                    icon={<Github size={18} />}
                    label="GitHub"
                    description="Star us on GitHub!"
                />
            </nav >
        </div >
    )
}

function DeckItem({ icon, label, description, onClick, active, loading, accent, shortcut, disabled }) {
    const [hovered, setHovered] = useState(false)

    // Handle Keyboard Enter/Space
    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) onClick?.()
        }
    }

    return (
        <div style={{ position: 'relative' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}>
            <button
                onClick={() => !disabled && onClick?.()}
                onKeyDown={handleKeyDown}
                className="deck-btn"
                aria-label={label}
                disabled={disabled}
                title={!hovered ? label : undefined} // Fallback title
                style={{
                    width: '42px',
                    height: '42px',
                    borderRadius: '12px',
                    background: active
                        ? (accent ? 'linear-gradient(135deg, #3b82f6, #2563eb)' : 'rgba(255, 255, 255, 0.12)')
                        : 'transparent',
                    color: disabled ? '#52525b' : active ? 'white' : '#a1a1aa',
                    border: active ? '1px solid rgba(255,255,255,0.15)' : '1px solid transparent',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: disabled ? 'not-allowed' : 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden',
                    outline: 'none',
                    opacity: disabled ? 0.5 : 1,
                    boxShadow: active && accent ? '0 4px 12px rgba(59, 130, 246, 0.4)' : 'none'
                }}
            >
                {loading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                        {icon}
                    </motion.div>
                ) : icon}

                {active && !accent && (
                    <div style={{
                        position: 'absolute',
                        bottom: '-6px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'white',
                        opacity: 0.5
                    }} />
                )}
            </button>

            {/* Precision Tooltip */}
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 10, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 5, scale: 0.95 }}
                        transition={{ duration: 0.15 }}
                        style={{
                            position: 'absolute',
                            bottom: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            marginBottom: '12px',
                            background: 'rgba(15, 15, 20, 0.95)',
                            backdropFilter: 'blur(12px)',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            borderRadius: '10px',
                            padding: '8px 12px',
                            whiteSpace: 'nowrap',
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            zIndex: 100,
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            marginBottom: description ? '4px' : 0
                        }}>
                            <span style={{ fontSize: '12px', fontWeight: 600, color: '#f4f4f5' }}>{label}</span>
                            {shortcut && (
                                <span style={{
                                    fontSize: '10px',
                                    color: '#71717a',
                                    background: '#27272a',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontFamily: 'var(--font-mono)'
                                }}>{shortcut}</span>
                            )}
                        </div>
                        {description && (
                            <div style={{
                                fontSize: '10px',
                                color: '#a1a1aa',
                                fontWeight: 400
                            }}>
                                {description}
                            </div>
                        )}
                        {/* Triangle Arrow */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-5px',
                            left: '50%',
                            marginLeft: '-5px',
                            width: '10px',
                            height: '10px',
                            background: 'rgba(15, 15, 20, 0.95)',
                            borderRight: '1px solid rgba(255, 255, 255, 0.1)',
                            borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                            transform: 'rotate(45deg)'
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hover & Focus Styles */}
            <style>{`
                .deck-btn:hover {
                    background: ${active ? '' : 'rgba(255,255,255,0.05)'} !important;
                    color: white !important;
                }
                .deck-btn:focus-visible {
                    box-shadow: 0 0 0 2px var(--color-accent);
                    background: rgba(255,255,255,0.1) !important;
                }
            `}</style>
        </div>
    )
}

function Divider() {
    return (
        <div style={{
            width: '1px',
            height: '24px',
            background: '#27272a',
            margin: '0 4px'
        }} />
    )
}
