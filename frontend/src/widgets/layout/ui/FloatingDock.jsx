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
    KeyRound,
    Share2,
    Gamepad2
} from 'lucide-react'
import useStore from '../../../store/useStore'
import { toast } from '../../../shared/ui/Toast'

export default function FloatingDock({ view, onViewChange, onShowExport }) {
    const setCommandPaletteOpen = useStore(s => s.setCommandPaletteOpen)
    const loading = useStore(s => s.loading)
    const cityData = useStore(s => s.cityData)
    const githubToken = useStore(s => s.githubToken)
    const setGithubToken = useStore(s => s.setGithubToken)
    const [showTokenPanel, setShowTokenPanel] = useState(false)
    const [tokenDraft, setTokenDraft] = useState(githubToken || '')

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
                    onClick={() => useStore.getState().setUfoMode(!useStore.getState().ufoMode)}
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
                    onClick={() => useStore.setState(state => {
                        const next = !state.showTimeline;
                        return { showTimeline: next, isGenesisPlaying: next, genesisTime: next ? 0.0 : 1.0, selectedBuilding: null };
                    })}
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

                <DeckItem
                    onClick={() => setShowTokenPanel(v => !v)}
                    active={showTokenPanel}
                    icon={<KeyRound size={18} />}
                    label="GitHub Token"
                    description={githubToken ? 'Token set — 5,000 req/hr' : 'Add token for 5,000 req/hr'}
                />

                <DeckItem
                    onClick={() => window.open('https://github.com/YashwanthKamireddi/CodebaseCity', '_blank')}
                    icon={<Github size={18} />}
                    label="GitHub"
                    description="Star us on GitHub!"
                />
            </nav>

            {/* GitHub Token Panel */}
            {showTokenPanel && (
                <div className="dock-token-panel anim-scale-in">
                        <div className="dock-token-header">
                            <KeyRound size={14} />
                            <span>GitHub Personal Access Token</span>
                        </div>
                        <div className="dock-token-row">
                            <input
                                type="password"
                                value={tokenDraft}
                                onChange={e => setTokenDraft(e.target.value)}
                                onKeyDown={e => {
                                    if (e.key === 'Enter') {
                                        setGithubToken(tokenDraft.trim())
                                        setShowTokenPanel(false)
                                    }
                                }}
                                placeholder="ghp_... (personal access token)"
                                className="dock-token-input"
                                autoFocus
                            />
                            <button
                                onClick={() => {
                                    setGithubToken(tokenDraft.trim())
                                    setShowTokenPanel(false)
                                }}
                                className="dock-token-save"
                            >
                                {tokenDraft.trim() ? 'Save' : 'Clear'}
                            </button>
                        </div>
                        <p className="dock-token-hint">
                            {githubToken
                                ? 'Token active — 5,000 requests/hour. Clear by saving empty.'
                                : <>No scopes needed for public repos. Create at{' '}
                                    <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer">
                                        github.com/settings/tokens
                                    </a>. Stored locally only.</>
                            }
                        </p>
                </div>
            )}
        </div>
    )
}

function DeckItem({ icon, label, description, onClick, active, loading: isLoading, accent, shortcut, disabled }) {
    const [hovered, setHovered] = useState(false)

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
