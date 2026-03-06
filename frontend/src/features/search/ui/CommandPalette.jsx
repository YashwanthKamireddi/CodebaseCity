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
    RotateCcw,
    CornerDownLeft,
    Keyboard
} from 'lucide-react'
import useStore from '../../../store/useStore'
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
        searchCode
    } = useStore()

    // Search State
    const [searchResults, setSearchResults] = useState([])
    const [isSearching, setIsSearching] = useState(false)




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

    // Semantic Search Effect (Debounced)
    useEffect(() => {
        if (!search || search.length < 3) {
            setSearchResults([])
            return
        }

        const timer = setTimeout(async () => {
            setIsSearching(true)
            const results = await searchCode(search)
            setSearchResults(results)
            setIsSearching(false)
        }, 300)

        return () => clearTimeout(timer)
    }, [search, searchCode])

    // File results from city data (Filter + Semantic Merge)
    const fileResults = useMemo(() => {
        if (!cityData?.buildings || !search) return []
        const query = search.toLowerCase()

        // Exact filename matches (High priority)
        const exactMatches = cityData.buildings
            .filter(b => b.name.toLowerCase().includes(query))
            .slice(0, 5)

        // Semantic matches (Backend)
        // Map backend paths to buildings
        const semanticMatches = searchResults
            .map(res => {
                // Find building by path suffix match (robustness)
                return cityData.buildings.find(b => b.path.endsWith(res.path) || b.path.includes(res.path))
            })
            .filter(Boolean)
            .filter(b => !exactMatches.find(ex => ex.id === b.id)) // Dedupe

        return [...exactMatches, ...semanticMatches].slice(0, 8)
    }, [cityData?.buildings, search, searchResults])

    // Handle file selection
    const handleSelectFile = useCallback((building) => {
        selectBuilding(building)
        setCommandPaletteOpen(false)
    }, [selectBuilding, setCommandPaletteOpen])

    // Actions list
    const actions = [
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
                        initial={{ opacity: 0, scale: 0.98, y: -10, x: '-50%' }}
                        animate={{ opacity: 1, scale: 1, y: 0, x: '-50%' }}
                        exit={{ opacity: 0, scale: 0.98, y: -10, x: '-50%' }}
                        transition={{ duration: 0.15, ease: [0.32, 0.72, 0, 1] }}
                        style={{
                            background: 'rgba(12, 12, 15, 0.85)',
                            backdropFilter: 'blur(24px) saturate(150%)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
                            borderRadius: '14px',
                            overflow: 'hidden'
                        }}
                    >
                        <Command
                            className="command-root"
                            shouldFilter={false}
                        >
                            {/* Search input */}
                            <div className="command-input-wrapper" style={{
                                borderBottom: '1px solid rgba(255,255,255,0.05)',
                                padding: '16px'
                            }}>
                                <Search color="rgba(255,255,255,0.4)" size={20} />
                                <Command.Input
                                    className="command-input"
                                    placeholder="Search files or execute commands..."
                                    value={search}
                                    onValueChange={setSearch}
                                    autoFocus
                                    style={{
                                        fontFamily: 'var(--font-mono)',
                                        fontSize: '1rem',
                                        color: 'white'
                                    }}
                                />
                                <div style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    padding: '2px 6px',
                                    borderRadius: '4px',
                                    fontSize: '0.7rem',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontFamily: 'var(--font-mono)'
                                }}>ESC</div>
                            </div>

                            <Command.List className="command-list">
                                <Command.Empty className="command-empty">
                                    No results found.
                                </Command.Empty>

                                {/* Search Skeleton */}
                                {isSearching && (
                                    <div style={{ padding: '8px' }}>
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} style={{ display: 'flex', alignItems: 'center', padding: '12px 16px', gap: '12px' }}>
                                                <motion.div
                                                    style={{ width: '16px', height: '16px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}
                                                    animate={{ opacity: [0.3, 0.7, 0.3] }}
                                                    transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 }}
                                                />
                                                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                    <motion.div
                                                        style={{ width: '40%', height: '12px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}
                                                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                                                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.1 }}
                                                    />
                                                    <motion.div
                                                        style={{ width: '60%', height: '10px', borderRadius: '4px', background: 'rgba(255,255,255,0.05)' }}
                                                        animate={{ opacity: [0.3, 0.7, 0.3] }}
                                                        transition={{ duration: 1.5, repeat: Infinity, delay: i * 0.1 + 0.2 }}
                                                    />
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                {/* Files */}
                                {!isSearching && fileResults.length > 0 && (
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
