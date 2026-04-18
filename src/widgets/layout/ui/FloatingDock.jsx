/**
 * FloatingDock.jsx
 *
 * A refined "Control Deck" for professional navigation.
 * Uses CSS classes from App.css — no inline styles.
 */
import React, { useState } from 'react'
import {
    Building2,
    Table2,
    FolderTree,
    Search,
    Sparkles,
    History,
    Github,
    Download,
    Share2,
    Gamepad2,
    Trophy,
    LogOut
} from 'lucide-react'
import useStore from '../../../store/useStore'
import { toast } from '../../../shared/ui/Toast'
import { useAuth } from '../../../features/auth'

export default function FloatingDock({ view, onViewChange, onShowExport }) {
    const setCommandPaletteOpen = useStore(s => s.setCommandPaletteOpen)
    const cityData = useStore(s => s.cityData)
    const checkAchievements = useStore(s => s.checkAchievements)
    const achievementUnlocked = useStore(s => s.achievementUnlocked)

    const { user, logout } = useAuth()

    const unlockedCount = Object.keys(achievementUnlocked || {}).length

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

                <div className="dock-divider" />

                {/* Actions */}
                <DeckItem
                    onClick={() => {
                        const newMode = !useStore.getState().ufoMode
                        useStore.getState().setUfoMode(newMode)
                        if (newMode) {
                            checkAchievements({ usedUfoMode: true })
                        }
                    }}
                    active={useStore(state => state.ufoMode)}
                    icon={<Gamepad2 size={18} />}
                    label="Explore Mode"
                    description="Fly the UFO with WASD"
                />

                <DeckItem
                    onClick={() => setCommandPaletteOpen(true)}
                    icon={<Search size={18} />}
                    label="Search"
                    description="Find files, commands, symbols"
                    shortcut="⌘K"
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
                    onClick={() => {
                        const state = useStore.getState();
                        const isGithub = state.cityData?.source === 'github';
                        const repo = state.cityData?.name || '';
                        if (isGithub && repo) {
                            const url = `${window.location.origin}/?repo=${repo}`
                            navigator.clipboard.writeText(url)
                            toast.success('Shareable URL copied to clipboard!', `${repo}`)
                        } else {
                            toast.error('Cannot share local repository cities.', 'Share Failed')
                        }
                    }}
                    icon={<Share2 size={18} />}
                    label="Share URL"
                    description="Copy link to this specific codebase city instantly"
                />

                <DeckItem
                    onClick={() => {
                        const state = useStore.getState()
                        const next = !state.showTimeline
                        useStore.setState({
                            showTimeline: next,
                            isGenesisPlaying: next,
                            genesisTime: next ? 0.0 : 1.0,
                            selectedBuilding: null
                        })
                        if (next) {
                            checkAchievements({ usedTimeline: true })
                        }
                    }}
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

                <div className="dock-divider" />

                {/* Achievement Badge Counter */}
                {unlockedCount > 0 && (
                    <DeckItem
                        onClick={() => {}}
                        icon={
                            <div style={{ position: 'relative' }}>
                                <Trophy size={18} />
                                <span style={{
                                    position: 'absolute',
                                    top: '-6px',
                                    right: '-8px',
                                    background: 'linear-gradient(135deg, #ffd700, #f59e0b)',
                                    color: '#000',
                                    fontSize: '10px',
                                    fontWeight: 700,
                                    borderRadius: '50%',
                                    width: '16px',
                                    height: '16px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    boxShadow: '0 2px 4px rgba(0,0,0,0.3)',
                                }}>{unlockedCount}</span>
                            </div>
                        }
                        label="Achievements"
                        description={`${unlockedCount} unlocked`}
                    />
                )}

                <div className="dock-divider" />

                {/* User Info & Logout */}
                {user && (
                    <div className="deck-item deck-user-info">
                        <img src={user.avatar_url} alt={user.login} className="deck-user-avatar" />
                        <span className="deck-user-name">{user.login}</span>
                        <button onClick={logout} className="deck-logout-btn" title="Sign out">
                            <LogOut size={14} />
                        </button>
                    </div>
                )}

                <DeckItem
                    onClick={() => window.open('https://github.com/YashwanthKamireddi/CodebaseCity', '_blank')}
                    icon={<Github size={18} className="gh-icon-pulse" />}
                    label="Star us on GitHub! ⭐"
                    description="Support open source!"
                    className="gh-glow-btn"
                />
            </nav>
        </div>
    )
}

function DeckItem({ icon, label, description, onClick, active, loading: isLoading, accent, shortcut, disabled, className }) {
    const [hovered, setHovered] = useState(false)

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault()
            if (!disabled) onClick?.()
        }
    }

    const btnClass = [
        'deck-btn',
        className,
        active && 'active',
        accent && active && 'accent',
        disabled && 'disabled'
    ].filter(Boolean).join(' ')

    return (
        <div className="deck-item"
            onMouseEnter={() => setHovered(true)}
            onMouseLeave={() => setHovered(false)}>
            <button
                onClick={() => !disabled && onClick?.()}
                onKeyDown={handleKeyDown}
                className={btnClass}
                aria-label={label}
                disabled={disabled}
                title={!hovered ? label : undefined}
            >
                {isLoading ? (
                    <span style={{ display: 'inline-flex', animation: 'anim-spin 1s linear infinite' }}>
                        {icon}
                    </span>
                ) : icon}

                {active && !accent && (
                    <span className="deck-btn-indicator" />
                )}
            </button>

            {/* Tooltip */}
            {hovered && (
                    <div
                        className="dock-tooltip anim-fade-in"
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
                    </div>
                )}
        </div>
    )
}
