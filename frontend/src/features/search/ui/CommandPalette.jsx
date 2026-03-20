/**
 * CommandPalette.jsx
 *
 * Premium command palette (⌘K) inspired by Linear, Vercel, and Raycast
 * Quick access to files, actions, and navigation
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { Command } from 'cmdk'

import { createPortal } from 'react-dom'
import {
    Search,
    FileCode,
    RotateCcw,
    Keyboard,
    Map,
    Moon,
    Sun,
    Camera,
    Download,
    Terminal,
    History,
    Play
} from 'lucide-react'
import useStore from '../../../store/useStore'
import './CommandPalette.css'

export default function CommandPalette() {
    const [search, setSearch] = useState('')

    const cityData = useStore(s => s.cityData)
    const selectBuilding = useStore(s => s.selectBuilding)
    const toggleRoads = useStore(s => s.toggleRoads)
    const toggleTheme = useStore(s => s.toggleTheme)
    const theme = useStore(s => s.theme)
    const showRoads = useStore(s => s.showRoads)
    const commandPaletteOpen = useStore(s => s.commandPaletteOpen)
    const setCommandPaletteOpen = useStore(s => s.setCommandPaletteOpen)
    const searchCode = useStore(s => s.searchCode)
    const cinematicMode = useStore(s => s.cinematicMode)
    const setCinematicMode = useStore(s => s.setCinematicMode)

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

    const actions = useMemo(() => [
        {
            id: 'toggle-cinematic',
            label: cinematicMode ? 'Stop Cinematic Drone' : 'Start Cinematic Drone',
            icon: Play,
            shortcut: 'C',
            action: () => { setCinematicMode(!cinematicMode); setCommandPaletteOpen(false) }
        },
        {
            id: 'toggle-roads',
            label: showRoads ? 'Hide Roads & Traffic' : 'Show Roads & Traffic',
            icon: Map,
            shortcut: 'D',
            action: () => { toggleRoads(); setCommandPaletteOpen(false) }
        },
        {
            id: 'toggle-theme',
            label: theme === 'dark' ? 'Switch to Light Mode' : 'Switch to Dark Mode',
            icon: theme === 'dark' ? Sun : Moon,
            shortcut: 'T',
            action: () => { toggleTheme(); setCommandPaletteOpen(false) }
        },
        {
            id: 'open-ai',
            label: 'Open AI Architect',
            icon: Terminal,
            shortcut: 'A',
            action: () => { 
                useStore.setState({ chatOpen: true })
                setCommandPaletteOpen(false) 
            }
        },
        {
            id: 'open-timeline',
            label: 'Time Travel (Commit History)',
            icon: History,
            shortcut: 'H',
            action: () => { 
                useStore.setState({ showTimeline: true })
                setCommandPaletteOpen(false) 
            }
        },
        {
            id: 'export-report',
            label: 'Export Analysis Report',
            icon: Download,
            shortcut: 'E',
            action: () => { 
                useStore.setState({ exportReportOpen: true })
                setCommandPaletteOpen(false) 
            }
        },
        {
            id: 'take-screenshot',
            label: 'Take City Screenshot',
            icon: Camera,
            shortcut: 'P',
            action: () => { 
                const canvas = document.querySelector('canvas')
                if (canvas) {
                    const link = document.createElement('a')
                    link.download = `code-city-${Date.now()}.png`
                    link.href = canvas.toDataURL('image/png')
                    link.click()
                }
                setCommandPaletteOpen(false) 
            }
        },
        {
            id: 'reset-view',
            label: 'Reload Application',
            icon: RotateCcw,
            shortcut: 'R',
            action: () => { window.location.reload() }
        }
    ], [showRoads, theme, toggleRoads, toggleTheme, setCommandPaletteOpen])

    // Global Keybindings Listener
    useEffect(() => {
        const handleGlobalKeyDown = (e) => {
            // Ignore if typing in an input or textarea
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA' || e.target.isContentEditable) {
                return
            }
            
            // Prevent shortcuts from triggering when the command palette is actively open
            if (!e.key || commandPaletteOpen) return

            // Find matching action
            const action = actions.find(a => a.shortcut && a.shortcut.toLowerCase() === e.key.toLowerCase())
            if (action) {
                e.preventDefault()
                action.action()
            }
        }
        document.addEventListener('keydown', handleGlobalKeyDown)
        return () => document.removeEventListener('keydown', handleGlobalKeyDown)
    }, [actions])

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
        <>
            {commandPaletteOpen && createPortal(
                <>
                    {/* Backdrop */}
                    <div
                        className="command-backdrop anim-fade-in"
                        onClick={() => setCommandPaletteOpen(false)}
                    />

                    {/* Command dialog */}
                    <div
                        className="command-dialog anim-scale-in"
                    >
                        <Command
                            className="command-root"
                            shouldFilter={false}
                        >
                            {/* Search input */}
                            <div className="command-input-wrapper">
                                <Search color="rgba(255,255,255,0.4)" size={20} />
                                <Command.Input
                                    className="command-input"
                                    placeholder="Search files or execute commands..."
                                    value={search}
                                    onValueChange={setSearch}
                                    autoFocus
                                />
                                <kbd className="command-esc-badge">ESC</kbd>
                            </div>

                            <Command.List className="command-list">
                                <Command.Empty className="command-empty">
                                    No results found.
                                </Command.Empty>

                                {/* Search Skeleton */}
                                {isSearching && (
                                    <div className="command-skeleton-list">
                                        {[...Array(3)].map((_, i) => (
                                            <div key={i} className="command-skeleton-row">
                                                <div className="command-skeleton-icon"
                                                    style={{ animation: `anim-shimmer 1.5s ease-in-out infinite ${i * 0.1}s` }}
                                                />
                                                <div className="command-skeleton-text">
                                                    <div className="command-skeleton-line" style={{ width: '40%', animation: `anim-shimmer 1.5s ease-in-out infinite ${i * 0.1 + 0.1}s` }}
                                                    />
                                                    <div className="command-skeleton-line command-skeleton-line--sm" style={{ width: '60%', animation: `anim-shimmer 1.5s ease-in-out infinite ${i * 0.1 + 0.2}s` }}
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
                    </div>
                </>,
                document.body
            )}
        </>
    )
}

// Trigger button for header
export function CommandPaletteTrigger({ onClick }) {
    const setCommandPaletteOpen = useStore(s => s.setCommandPaletteOpen)
    return (
        <button className="command-trigger" onClick={() => setCommandPaletteOpen(true)}>
            <Search size={16} />
            <span>Search...</span>
            <kbd>⌘K</kbd>
        </button>
    )
}
