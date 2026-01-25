/**
 * CommandPalette.jsx
 *
 * Premium command palette (⌘K) inspired by Linear, Vercel, and Raycast
 * Quick access to files, actions, and navigation
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Search,
    FileCode,
    Folder,
    Zap,
    Eye,
    EyeOff,
    Moon,
    Sun,
    GitBranch,
    Settings,
    Keyboard,
    RotateCcw
} from 'lucide-react'
import useStore from '../../store/useStore'
import './CommandPalette.css'

export default function CommandPalette() {
    const [search, setSearch] = useState('')

    const {
        cityData,
        selectBuilding,
        toggleRoads,
        toggleLabels,
        toggleTheme,
        theme,
        showRoads,
        showLabels,
        commandPaletteOpen,
        setCommandPaletteOpen,
        traceDependency
    } = useStore()

    // Trace Params State
    const [traceParams, setTraceParams] = useState(null)

    // Detect Trace Command
    useEffect(() => {
        if (!search) {
            setTraceParams(null)
            return
        }

        // Patterns: "trace X to Y", "path X -> Y", "trace auth"
        const traceRegex = /^(?:trace|path)\s+(.+?)(?:\s+(?:to|->)\s+(.+))?$/i
        const match = search.match(traceRegex)

        if (match) {
            const source = match[1].trim()
            const target = match[2]?.trim()
            if (source) {
                setTraceParams({ source, target })
            }
        } else {
            setTraceParams(null)
        }
    }, [search])

    // Open with ⌘K or Ctrl+K
    useEffect(() => {
        const handleKeyDown = (e) => {
            if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
                e.preventDefault()
                setCommandPaletteOpen(!commandPaletteOpen)
            }
            if (e.key === 'Escape') {
                setCommandPaletteOpen(false)
            }
        }

        document.addEventListener('keydown', handleKeyDown)
        return () => document.removeEventListener('keydown', handleKeyDown)
    }, [commandPaletteOpen, setCommandPaletteOpen])

    // Reset search when closed
    useEffect(() => {
        if (!commandPaletteOpen) {
            setSearch('')
        }
    }, [commandPaletteOpen])

    // File results from city data
    const fileResults = useMemo(() => {
        if (!cityData?.buildings || !search) return []
        const query = search.toLowerCase()
        return cityData.buildings
            .filter(b =>
                b.name.toLowerCase().includes(query) ||
                b.path.toLowerCase().includes(query)
            )
            .slice(0, 8)
    }, [cityData?.buildings, search])

    // Handle file selection
    const handleSelectFile = useCallback((building) => {
        selectBuilding(building)
        setCommandPaletteOpen(false)
    }, [selectBuilding, setCommandPaletteOpen])

    // Actions list
    const actions = [
        {
            id: 'toggle-roads',
            label: showRoads ? 'Hide Dependencies' : 'Show Dependencies',
            icon: showRoads ? EyeOff : Eye,
            shortcut: 'D',
            action: () => { toggleRoads(); setCommandPaletteOpen(false) }
        },
        {
            id: 'toggle-labels',
            label: showLabels ? 'Hide Labels' : 'Show Labels',
            icon: showLabels ? EyeOff : Eye,
            shortcut: 'L',
            action: () => { toggleLabels(); setCommandPaletteOpen(false) }
        },
        {
            id: 'toggle-theme',
            label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            icon: theme === 'dark' ? Sun : Moon,
            shortcut: 'N',
            action: () => { toggleTheme(); setCommandPaletteOpen(false) }
        },
        {
            id: 'reset-view',
            label: 'Reset Camera View',
            icon: RotateCcw,
            shortcut: 'R',
            action: () => { window.location.reload() }
        }
    ]

    // Get file icon based on extension
    const getFileIcon = (filename) => {
        const ext = filename?.split('.').pop()?.toLowerCase()
        const colors = {
            js: '#f7df1e',
            jsx: '#61dafb',
            ts: '#3178c6',
            tsx: '#3178c6',
            py: '#3776ab',
            java: '#ed8b00',
            go: '#00add8',
            rs: '#dea584',
            css: '#264de4',
            html: '#e34f26',
        }
        return colors[ext] || '#6b7280'
    }

    return (
        <AnimatePresence>
            {commandPaletteOpen && (
                <>
                    {/* Backdrop */}
                    <motion.div
                        className="command-backdrop"
                        initial={{ opacity: 0 }}
                        animate={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        onClick={() => setCommandPaletteOpen(false)}
                    />

                    {/* Command dialog */}
                    <motion.div
                        className="command-dialog"
                        initial={{ opacity: 0, scale: 0.96, y: -10, x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.96, y: -10, x: '-50%' }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    >
                        <Command
                            className="command-root"
                            shouldFilter={false}
                        >
                            {/* Search input */}
                            <div className="command-input-wrapper">
                                <Search className="command-input-icon" size={18} />
                                <Command.Input
                                    className="command-input"
                                    placeholder="Search files, run commands..."
                                    value={search}
                                    onValueChange={setSearch}
                                    autoFocus
                                />
                                <kbd className="command-shortcut">ESC</kbd>
                            </div>

                            <Command.List className="command-list">
                                <Command.Empty className="command-empty">
                                    {traceParams ? 'Press Enter to Trace...' : 'No results found.'}
                                </Command.Empty>

                                {/* Visual Query Match */}
                                {traceParams && (
                                    <Command.Group heading="Visual Queries" className="command-group">
                                        <Command.Item
                                            value="trace-action"
                                            className="command-item"
                                            onSelect={() => {
                                                traceDependency(traceParams.source, traceParams.target || 'database')
                                                setCommandPaletteOpen(false)
                                            }}
                                        >
                                            <div className="command-item-icon">
                                                <Zap size={16} color="#f59e0b" />
                                            </div>
                                            <div className="command-item-content">
                                                <span className="command-item-title">
                                                    Trace Dependency: <span style={{ color: '#fbbf24' }}>{traceParams.source}</span> → <span style={{ color: '#fbbf24' }}>{traceParams.target || '(Auto-Detect)'}</span>
                                                </span>
                                                <span className="command-item-subtitle">Visualize data flow path in 3D</span>
                                            </div>
                                            <kbd className="command-item-shortcut">↵</kbd>
                                        </Command.Item>
                                    </Command.Group>
                                )}

                                {/* Files */}
                                {fileResults.length > 0 && (
                                    <Command.Group heading="Files" className="command-group">
                                        {fileResults.map((building) => (
                                            <Command.Item
                                                key={building.id}
                                                value={building.id}
                                                className="command-item"
                                                onSelect={() => handleSelectFile(building)}
                                            >
                                                <div className="command-item-icon">
                                                    <FileCode
                                                        size={16}
                                                        style={{ color: getFileIcon(building.name) }}
                                                    />
                                                </div>
                                                <div className="command-item-content">
                                                    <span className="command-item-title">{building.name}</span>
                                                    <span className="command-item-subtitle">{building.path}</span>
                                                </div>
                                                <div className={`command-item-badge ${building.health >= 70 ? 'success' :
                                                    building.health >= 40 ? 'warning' : 'danger'
                                                    }`}>
                                                    {building.health || 0}%
                                                </div>
                                            </Command.Item>
                                        ))}
                                    </Command.Group>
                                )}

                                {/* Actions */}
                                <Command.Group heading="Actions" className="command-group">
                                    {actions.map((action) => (
                                        <Command.Item
                                            key={action.id}
                                            value={action.id}
                                            className="command-item"
                                            onSelect={action.action}
                                        >
                                            <div className="command-item-icon">
                                                <action.icon size={16} />
                                            </div>
                                            <span className="command-item-title">{action.label}</span>
                                            <kbd className="command-item-shortcut">{action.shortcut}</kbd>
                                        </Command.Item>
                                    ))}
                                </Command.Group>

                                {/* Help */}
                                <Command.Group heading="Help" className="command-group">
                                    <Command.Item className="command-item" value="keyboard-shortcuts">
                                        <div className="command-item-icon">
                                            <Keyboard size={16} />
                                        </div>
                                        <span className="command-item-title">Keyboard Shortcuts</span>
                                        <kbd className="command-item-shortcut">?</kbd>
                                    </Command.Item>
                                </Command.Group>
                            </Command.List>

                            {/* Footer */}
                            <div className="command-footer">
                                <span>
                                    <kbd>↑↓</kbd> Navigate
                                </span>
                                <span>
                                    <kbd>↵</kbd> Select
                                </span>
                                <span>
                                    <kbd>ESC</kbd> Close
                                </span>
                            </div>
                        </Command>
                    </motion.div>
                </>
            )}
        </AnimatePresence>
    )
}

// Trigger button for header
export function CommandPaletteTrigger({ onClick }) {
    const { setCommandPaletteOpen } = useStore()
    return (
        <button className="command-trigger" onClick={() => setCommandPaletteOpen(true)}>
            <Search size={16} />
            <span>Search...</span>
            <kbd>⌘K</kbd>
        </button>
    )
}
