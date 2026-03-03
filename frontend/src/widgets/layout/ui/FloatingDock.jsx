/**
 * FloatingDock.jsx
 *
 * A refined "Control Deck" for professional navigation.
 * Uses CSS classes from App.css — no inline styles.
 */
import React, { useState } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import {
    Building2,
    Table2,
    FolderTree,
    Search,
    ScanLine,
    Sparkles,
    History,
    Github,
    Network,
    Download,
    Move,
    Gamepad2
} from 'lucide-react'
import useStore from '../../../store/useStore'

export default function FloatingDock({ view, onViewChange, onAnalyze, onShowGraph, onShowExport }) {
    const { setCommandPaletteOpen, loading, cityData, refactoringModeActive, toggleRefactoringMode, explorationMode, toggleExplorationMode } = useStore()

    return (
        <div className="floating-dock-wrapper">
            <nav className="floating-dock">
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

                <DeckItem
                    onClick={onShowGraph}
                    icon={<Network size={18} />}
                    label="Dependency Graph"
                    description="Interactive 2D graph view"
                    disabled={!cityData}
                />

                <div className="dock-divider" />

                {/* Refactoring Simulator Engine */}
                <DeckItem
                    onClick={toggleRefactoringMode}
                    active={refactoringModeActive}
                    icon={<Move size={18} />}
                    label="Refactoring Simulator"
                    description="Drag & Drop Architecture Dry Run"
                    disabled={!cityData}
                    accent={refactoringModeActive}
                />

                <div className="dock-divider" />

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

                <div className="dock-divider" />

                {/* Toggles */}
                <DeckItem
                    onClick={() => useStore.setState(state => ({ showTimeline: !state.showTimeline }))}
                    active={useStore(state => state.showTimeline)}
                    icon={<History size={18} />}
                    label="Time Travel"
                    description="View codebase evolution over time"
                />

                <DeckItem
                    onClick={onShowExport}
                    icon={<Download size={18} />}
                    label="Export Report"
                    description="Download analysis as PDF/HTML"
                    disabled={!cityData}
                />

                <DeckItem
                    onClick={toggleExplorationMode}
                    active={explorationMode}
                    icon={<Gamepad2 size={18} />}
                    label="Explore Mode"
                    description="Fly through your city with WASD"
                    shortcut="F"
                    disabled={!cityData}
                />

                <div className="dock-divider" />

                <DeckItem
                    onClick={() => window.open('https://github.com/YashwanthKamireddi/CodebaseCity', '_blank')}
                    icon={<Github size={18} />}
                    label="GitHub"
                    description="Star us on GitHub!"
                />
            </nav>
        </div>
    )
}

function DeckItem({ icon, label, description, onClick, active, loading: isLoading, accent, shortcut, disabled }) {
    const [hovered, setHovered] = useState(false)
    const shouldReduceMotion = useReducedMotion()

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) onClick?.()
        }
    }

    const btnClass = [
        'deck-btn',
        active && 'active',
        accent && active && 'accent',
        disabled && 'disabled'
    ].filter(Boolean).join(' ')

    return (
        <div className="deck-item"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}>
            <motion.button
                onClick={() => !disabled && onClick?.()}
                onKeyDown={handleKeyDown}
                className={btnClass}
                aria-label={label}
                disabled={disabled}
                title={!hovered ? label : undefined}
                whileTap={shouldReduceMotion ? {} : { scale: 0.92 }}
                whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            >
                {isLoading ? (
                    <motion.div
                        animate={{ rotate: 360 }}
                        transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                    >
                        {icon}
                    </motion.div>
                ) : icon}

                {active && !accent && (
                    <span className="deck-btn-indicator" />
                )}
            </motion.button>

            {/* Tooltip */}
            <AnimatePresence>
                {hovered && (
                    <motion.div
                        className="dock-tooltip"
                        initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10, scale: shouldReduceMotion ? 1 : 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: shouldReduceMotion ? 0 : 5, scale: shouldReduceMotion ? 1 : 0.95 }}
                        transition={{ duration: shouldReduceMotion ? 0.01 : 0.15 }}
                    >
                        <div className="dock-tooltip-header">
                            <span className="dock-tooltip-label">{label}</span>
                            {shortcut && (
                                <span className="dock-tooltip-shortcut">{shortcut}</span>
                            )}
                        </div>
                        {description && (
                            <div className="dock-tooltip-desc">{description}</div>
                        )}
                        <div className="dock-tooltip-arrow" />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
