/**
 * FloatingDock.jsx
 *
 * A refined "Control Deck" for professional navigation.
 * Static, precise, and high-contrast.
 */
import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    LayoutGrid,
    Search,
    BarChart2,
    Github,
    Box,
    Sparkles,
    Signpost,
    FolderSearch
} from 'lucide-react'
import useStore from '../store/useStore'

export default function FloatingDock({ view, onViewChange, onAnalyze }) {
    const { setCommandPaletteOpen, toggleRoads, showRoads, loading } = useStore()

    return (
        <div style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            marginBottom: 'safe-area-inset-bottom'
        }}>
            <nav className="control-deck" style={{
                display: 'flex',
                gap: '8px',
                padding: '8px',
                borderRadius: '16px',
                background: '#09090b', // Solid dark base
                border: '1px solid #27272a', // Zinc-800
                boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                alignItems: 'center'
            }}>
                {/* View Toggles */}
                <DeckItem
                    onClick={() => onViewChange('3d')}
                    active={view === '3d'}
                    icon={<Box size={18} />}
                    label="City View"
                />

                <DeckItem
                    onClick={() => onViewChange('table')}
                    active={view === 'table'}
                    icon={<BarChart2 size={18} />}
                    label="Metrics"
                />

                <Divider />

                {/* Actions */}
                <DeckItem
                    onClick={() => setCommandPaletteOpen(true)}
                    icon={<Search size={18} />}
                    label="Search"
                    shortcut="⌘K"
                />

                <DeckItem
                    onClick={onAnalyze}
                    icon={<FolderSearch size={18} />}
                    label="Analyze"
                    loading={loading}
                    accent
                />

                <DeckItem
                    onClick={() => useStore.setState({ chatOpen: !useStore.getState().chatOpen })}
                    icon={<Sparkles size={18} />}
                    label="AI Architect"
                />

                <Divider />

                {/* Toggles */}
                <DeckItem
                    onClick={toggleRoads}
                    active={showRoads}
                    icon={<Signpost size={18} />}
                    label="Connections"
                />

                <Divider />

                <DeckItem
                    onClick={() => window.open('https://github.com/YashwanthKamireddi/CodebaseCity', '_blank')}
                    icon={<Github size={18} />}
                    label="GitHub"
                />
            </nav>
        </div>
    )
}

function DeckItem({ icon, label, onClick, active, loading, accent, shortcut }) {
    const [hovered, setHovered] = useState(false)

    return (
        <div style={{ position: 'relative' }}
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}>
            <button
                onClick={onClick}
                className="deck-btn"
                style={{
                    width: '40px',
                    height: '40px',
                    borderRadius: '10px',
                    background: active ? (accent ? '#818cf8' : '#27272a') : 'transparent',
                    color: active ? (accent ? 'white' : 'white') : '#a1a1aa',
                    border: 'none',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative',
                    overflow: 'hidden'
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
                            background: '#18181b', // Zinc-900
                            border: '1px solid #27272a',
                            borderRadius: '8px',
                            padding: '6px 10px',
                            whiteSpace: 'nowrap',
                            display: 'flex',
                            gap: '8px',
                            alignItems: 'center',
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            zIndex: 100
                        }}
                    >
                        <span style={{ fontSize: '12px', fontWeight: 500, color: '#f4f4f5' }}>{label}</span>
                        {shortcut && (
                            <span style={{
                                fontSize: '10px',
                                color: '#71717a',
                                background: '#27272a',
                                padding: '1px 4px',
                                borderRadius: '4px'
                            }}>{shortcut}</span>
                        )}
                        {/* Triangle */}
                        <div style={{
                            position: 'absolute',
                            bottom: '-4px',
                            left: '50%',
                            marginLeft: '-4px',
                            width: '8px',
                            height: '8px',
                            background: '#18181b',
                            borderRight: '1px solid #27272a',
                            borderBottom: '1px solid #27272a',
                            transform: 'rotate(45deg)'
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Hover State Styles (Inline for simplicity) */}
            <style>{`
                .deck-btn:hover {
                    background: ${active ? '' : 'rgba(255,255,255,0.05)'} !important;
                    color: white !important;
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
