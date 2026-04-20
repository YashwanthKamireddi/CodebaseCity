/**
 * UniverseView — Galactic Atlas of repositories.
 *
 * Reframes the user's repos as worlds in a star system: each repo gets a
 * tier (Featured / Active / Dormant / Archived), a faction (language),
 * and a power score (stars). The UI is built like a mission-control HUD
 * so users can scan, filter, and "land on" any world.
 */

import React, { useState, useMemo } from 'react'
import {
    ArrowLeft,
    Star,
    GitFork,
    Clock,
    Search,
    Grid3X3,
    List,
    Globe,
    Sparkles,
    Building2,
    Loader2,
    AlertCircle,
    ChevronRight,
    Lock,
    Layers,
    Zap,
    Flame,
    Moon,
    Archive,
} from 'lucide-react'
import useStore from '../../store/useStore'
import './UniverseView.css'

// Faction (language) colors
const LANG_COLORS = {
    JavaScript: '#f7df1e', TypeScript: '#3178c6', Python: '#3776ab',
    Java: '#b07219', Go: '#00add8', Rust: '#dea584', Ruby: '#cc342d',
    PHP: '#777bb4', 'C++': '#f34b7d', C: '#7d8590', 'C#': '#178600',
    Swift: '#fa7343', Kotlin: '#a97bff', Dart: '#00b4ab', Vue: '#42b883',
    Svelte: '#ff3e00', HTML: '#e34c26', CSS: '#563d7c', Shell: '#89e051',
    Lua: '#000080', R: '#198ce7', SQL: '#e38c00', Scala: '#dc322f',
    Haskell: '#5e5086', Elixir: '#6e4a7e', Clojure: '#db5855',
    Unknown: '#8b949e',
}
const colorFor = (lang) => LANG_COLORS[lang] || LANG_COLORS.Unknown

// World tier classification (drives badge + glow)
function classifyTier(repo) {
    const now = Date.now()
    const updated = new Date(repo.updated_at).getTime()
    const daysSinceUpdate = (now - updated) / (1000 * 60 * 60 * 24)
    const stars = repo.stargazers_count || 0

    if (repo.archived) return { id: 'archived', label: 'Archived', icon: Archive }
    if (stars >= 50) return { id: 'featured', label: 'Featured', icon: Flame }
    if (daysSinceUpdate <= 90) return { id: 'active', label: 'Active', icon: Zap }
    if (daysSinceUpdate <= 365) return { id: 'recent', label: 'Recent', icon: Clock }
    return { id: 'dormant', label: 'Dormant', icon: Moon }
}

const TIER_ORDER = ['all', 'featured', 'active', 'recent', 'dormant', 'archived']

function shortNum(n) {
    if (!n) return '0'
    if (n >= 1000) return (n / 1000).toFixed(n >= 10000 ? 0 : 1) + 'k'
    return String(n)
}

function relativeDate(date) {
    if (!date) return '—'
    const d = new Date(date)
    const now = new Date()
    const diff = Math.floor((now - d) / 86400000)
    if (diff <= 0) return 'today'
    if (diff === 1) return 'yesterday'
    if (diff < 7) return `${diff}d ago`
    if (diff < 30) return `${Math.floor(diff / 7)}w ago`
    if (diff < 365) return `${Math.floor(diff / 30)}mo ago`
    return `${Math.floor(diff / 365)}y ago`
}

export default function UniverseView() {
    const universeMode = useStore(s => s.universeMode)
    const universeOwner = useStore(s => s.universeOwner)
    const universeProfile = useStore(s => s.universeProfile)
    const universeLoading = useStore(s => s.universeLoading)
    const universeError = useStore(s => s.universeError)
    const universeFilter = useStore(s => s.universeFilter)
    const universeSortBy = useStore(s => s.universeSortBy)
    const universeLanguageFilter = useStore(s => s.universeLanguageFilter)
    const universeSelectedRepo = useStore(s => s.universeSelectedRepo)

    const exitUniverse = useStore(s => s.exitUniverse)
    const enterCity = useStore(s => s.enterCity)
    const setUniverseFilter = useStore(s => s.setUniverseFilter)
    const setUniverseSort = useStore(s => s.setUniverseSort)
    const setUniverseLanguageFilter = useStore(s => s.setUniverseLanguageFilter)
    const selectUniverseRepo = useStore(s => s.selectUniverseRepo)
    const getFilteredRepos = useStore(s => s.getFilteredRepos)
    const getUniverseLanguages = useStore(s => s.getUniverseLanguages)
    const getUniverseStats = useStore(s => s.getUniverseStats)

    const [viewMode, setViewMode] = useState('grid')
    const [tier, setTier] = useState('all')

    const universeRepos = useStore(s => s.universeRepos)
    const filteredRepos = useMemo(() => getFilteredRepos(), [
        getFilteredRepos, universeRepos, universeFilter, universeSortBy, universeLanguageFilter
    ])

    // Apply tier filter on top of store filter
    const tieredRepos = useMemo(() => {
        if (tier === 'all') return filteredRepos
        return filteredRepos.filter(r => classifyTier(r).id === tier)
    }, [filteredRepos, tier])

    const languages = useMemo(() => getUniverseLanguages(), [getUniverseLanguages, universeRepos])
    const stats = useMemo(() => getUniverseStats(), [getUniverseStats, universeRepos])

    // Tier counts (against the search/lang-filtered set, not the all-set)
    const tierCounts = useMemo(() => {
        const counts = { all: filteredRepos.length, featured: 0, active: 0, recent: 0, dormant: 0, archived: 0 }
        for (const r of filteredRepos) counts[classifyTier(r).id]++
        return counts
    }, [filteredRepos])

    if (!universeMode) return null

    return (
        <div className="uv-root anim-fade-in">
            {/* Background layers */}
            <div className="uv-bg" />
            <div className="uv-stars" />
            <div className="uv-scanline" />

            {/* HUD brackets */}
            <div className="uv-bracket uv-bracket--tl" />
            <div className="uv-bracket uv-bracket--tr" />
            <div className="uv-bracket uv-bracket--bl" />
            <div className="uv-bracket uv-bracket--br" />

            {/* ── Top bar ─────────────────────────────────────────────────── */}
            <header className="uv-topbar">
                <button className="p-btn p-btn-secondary uv-back" onClick={() => exitUniverse()}>
                    <ArrowLeft size={16} />
                    <span>Exit Atlas</span>
                </button>
                <div className="uv-status-pill">
                    <span className="uv-status-dot" />
                    <span>Galactic Atlas · Universe Online</span>
                </div>
            </header>

            {/* ── Commander panel (profile + stats) ───────────────────────── */}
            {universeProfile && (
                <section className="uv-commander">
                    <div className="uv-commander-left">
                        <div className="uv-avatar-frame">
                            <img
                                src={universeProfile.avatar_url}
                                alt=""
                                className="uv-avatar"
                            />
                        </div>
                        <div className="uv-commander-info">
                            <div className="uv-commander-tag">Commander</div>
                            <h1 className="uv-commander-name">
                                <Globe size={22} />
                                {universeProfile.name || universeOwner}
                            </h1>
                            {universeProfile.bio && (
                                <p className="uv-commander-bio">{universeProfile.bio}</p>
                            )}
                        </div>
                    </div>

                    {stats && (
                        <div className="uv-statgrid">
                            <Stat icon={Building2} label="Worlds" value={stats.totalRepos} />
                            <Stat icon={Star} label="Total Power" value={shortNum(stats.totalStars)} />
                            <Stat icon={GitFork} label="Forks" value={shortNum(stats.totalForks)} />
                            <Stat icon={Layers} label="Factions" value={stats.languages} accent={colorFor(stats.topLanguage)} />
                        </div>
                    )}
                </section>
            )}

            {/* ── Loading / Error ─────────────────────────────────────────── */}
            {universeLoading && (
                <div className="uv-loading">
                    <Loader2 size={48} className="anim-spin" />
                    <p>Charting <strong>{universeOwner}</strong>'s universe…</p>
                </div>
            )}
            {universeError && (
                <div className="uv-error" role="alert">
                    <AlertCircle size={48} />
                    <p>{universeError}</p>
                    <button onClick={() => exitUniverse()}>Return to Base</button>
                </div>
            )}

            {!universeLoading && !universeError && (
                <>
                    {/* ── Tier tabs ───────────────────────────────────────── */}
                    <div className="uv-tiers">
                        {TIER_ORDER.map(id => {
                            const meta = id === 'all'
                                ? { label: 'All Worlds', icon: Globe }
                                : id === 'featured' ? { label: 'Featured', icon: Flame }
                                : id === 'active' ? { label: 'Active', icon: Zap }
                                : id === 'recent' ? { label: 'Recent', icon: Clock }
                                : id === 'dormant' ? { label: 'Dormant', icon: Moon }
                                : { label: 'Archived', icon: Archive }
                            const count = tierCounts[id]
                            const Icon = meta.icon
                            return (
                                <button
                                    key={id}
                                    className={`uv-tier uv-tier--${id}${tier === id ? ' is-active' : ''}`}
                                    onClick={() => setTier(id)}
                                    disabled={count === 0 && id !== 'all'}
                                >
                                    <Icon size={13} />
                                    <span>{meta.label}</span>
                                    <span className="uv-tier-count">{count}</span>
                                </button>
                            )
                        })}
                    </div>

                    {/* ── Toolbar ─────────────────────────────────────────── */}
                    <div className="uv-toolbar">
                        <div className="uv-search">
                            <Search size={15} />
                            <input
                                type="text"
                                placeholder="Search worlds…"
                                value={universeFilter}
                                onChange={e => setUniverseFilter(e.target.value)}
                                className="p-input"
                            />
                        </div>

                        {/* Faction (language) chips */}
                        <div className="uv-factions">
                            <button
                                className={`uv-faction${!universeLanguageFilter ? ' is-active' : ''}`}
                                onClick={() => setUniverseLanguageFilter(null)}
                            >
                                All
                            </button>
                            {languages.slice(0, 6).map(({ language, count }) => {
                                const c = colorFor(language)
                                const active = universeLanguageFilter === language
                                return (
                                    <button
                                        key={language}
                                        className={`uv-faction${active ? ' is-active' : ''}`}
                                        style={active ? { borderColor: c, boxShadow: `0 0 0 1px ${c}55, 0 0 16px ${c}33` } : undefined}
                                        onClick={() => setUniverseLanguageFilter(active ? null : language)}
                                    >
                                        <span className="uv-faction-dot" style={{ background: c }} />
                                        <span>{language}</span>
                                        <span className="uv-faction-count">{count}</span>
                                    </button>
                                )
                            })}
                        </div>

                        {/* Sort + view toggle */}
                        <div className="uv-toolbar-right">
                            <div className="uv-sort">
                                <button className={universeSortBy === 'updated' ? 'is-active' : ''} onClick={() => setUniverseSort('updated')}>
                                    <Clock size={13} /> Recent
                                </button>
                                <button className={universeSortBy === 'stars' ? 'is-active' : ''} onClick={() => setUniverseSort('stars')}>
                                    <Star size={13} /> Power
                                </button>
                                <button className={universeSortBy === 'name' ? 'is-active' : ''} onClick={() => setUniverseSort('name')}>
                                    <Layers size={13} /> Name
                                </button>
                            </div>
                            <div className="uv-view-toggle">
                                <button className={viewMode === 'grid' ? 'is-active' : ''} onClick={() => setViewMode('grid')} title="Grid">
                                    <Grid3X3 size={14} />
                                </button>
                                <button className={viewMode === 'list' ? 'is-active' : ''} onClick={() => setViewMode('list')} title="List">
                                    <List size={14} />
                                </button>
                            </div>
                        </div>
                    </div>

                    {/* ── Worlds ─────────────────────────────────────────── */}
                    <div className={`uv-worlds uv-worlds--${viewMode}`}>
                        {tieredRepos.map((repo, i) => (
                            <WorldCard
                                key={repo.name}
                                repo={repo}
                                index={i}
                                isSelected={universeSelectedRepo === repo.name}
                                onSelect={() => selectUniverseRepo(repo.name)}
                                onEnter={() => enterCity(repo.name)}
                            />
                        ))}

                        {tieredRepos.length === 0 && (
                            <div className="uv-empty">
                                <Sparkles size={48} />
                                <p>No worlds match this filter</p>
                                <button className="p-btn p-btn-primary uv-empty-reset" onClick={() => { setTier('all'); setUniverseFilter(''); setUniverseLanguageFilter(null) }}>
                                    Reset filters
                                </button>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

/* ── Stat chip ─────────────────────────────────────────────────────── */
function Stat({ icon: Icon, label, value, accent }) {
    return (
        <div className="uv-stat">
            <Icon size={14} style={accent ? { color: accent } : undefined} />
            <div className="uv-stat-text">
                <div className="uv-stat-value" style={accent ? { color: accent } : undefined}>{value}</div>
                <div className="uv-stat-label">{label}</div>
            </div>
        </div>
    )
}

/* ── World card ────────────────────────────────────────────────────── */
function WorldCard({ repo, index, isSelected, onSelect, onEnter }) {
    const tier = classifyTier(repo)
    const TierIcon = tier.icon
    const c = colorFor(repo.language)

    // Procedural skyline silhouette per repo (deterministic from name)
    const skyline = useMemo(() => {
        const seed = (repo.name || '').split('').reduce((s, ch) => s + ch.charCodeAt(0), 0)
        const bars = []
        let h = seed
        for (let i = 0; i < 14; i++) {
            h = (h * 9301 + 49297) % 233280
            const height = 28 + (h / 233280) * 60
            bars.push(height)
        }
        return bars
    }, [repo.name])

    return (
        <article
            className={`uv-world uv-world--${tier.id}${isSelected ? ' is-selected' : ''}`}
            style={{ animationDelay: `${Math.min(index * 24, 280)}ms` }}
            onClick={onSelect}
            onDoubleClick={onEnter}
        >
            {/* Skyline preview */}
            <div className="uv-world-skyline" aria-hidden="true">
                {skyline.map((h, i) => (
                    <span
                        key={i}
                        className="uv-skyline-bar"
                        style={{
                            height: `${h}%`,
                            background: i % 4 === 0 ? c : undefined,
                        }}
                    />
                ))}
                <div className="uv-skyline-grid" />
            </div>

            {/* Tier badge */}
            <div className="uv-world-tier">
                <TierIcon size={10} />
                <span>{tier.label}</span>
            </div>

            {/* Privacy badge */}
            {repo.private && (
                <div className="uv-world-private">
                    <Lock size={10} />
                    <span>Private</span>
                </div>
            )}

            {/* Body */}
            <div className="uv-world-body">
                <h3 className="uv-world-name">{repo.name}</h3>
                {repo.description && (
                    <p className="uv-world-desc">{repo.description}</p>
                )}

                <div className="uv-world-meta">
                    {repo.language && (
                        <span className="uv-world-lang" style={{ color: c }}>
                            <span className="uv-world-lang-dot" style={{ background: c }} />
                            {repo.language}
                        </span>
                    )}
                    {repo.stargazers_count > 0 && (
                        <span className="uv-world-stat" title="Stars">
                            <Star size={11} /> {shortNum(repo.stargazers_count)}
                        </span>
                    )}
                    {repo.forks_count > 0 && (
                        <span className="uv-world-stat" title="Forks">
                            <GitFork size={11} /> {shortNum(repo.forks_count)}
                        </span>
                    )}
                    <span className="uv-world-stat uv-world-stat--time" title="Last updated">
                        <Clock size={11} /> {relativeDate(repo.updated_at)}
                    </span>
                </div>
            </div>

            <button
                className="p-btn p-btn-primary uv-world-land"
                onClick={(e) => { e.stopPropagation(); onEnter() }}
            >
                <span>Land</span>
                <ChevronRight size={14} />
            </button>
        </article>
    )
}
