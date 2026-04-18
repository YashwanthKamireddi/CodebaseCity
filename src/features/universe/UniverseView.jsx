/**
 * UniverseView.jsx
 *
 * Main Universe Mode UI - displays all repositories of a user
 * as a galaxy of cities to explore.
 */

import React, { useState, useEffect, useMemo } from 'react'
import {
    ArrowLeft,
    Star,
    GitFork,
    Clock,
    Search,
    Grid3X3,
    List,
    SortAsc,
    SortDesc,
    Globe,
    Code,
    Sparkles,
    Building2,
    Loader2,
    AlertCircle,
    ChevronRight
} from 'lucide-react'
import useStore from '../../store/useStore'
import './UniverseView.css'

// Language color mapping
const LANGUAGE_COLORS = {
    JavaScript: '#f7df1e',
    TypeScript: '#3178c6',
    Python: '#3776ab',
    Java: '#b07219',
    Go: '#00add8',
    Rust: '#dea584',
    Ruby: '#cc342d',
    PHP: '#777bb4',
    'C++': '#f34b7d',
    C: '#555555',
    'C#': '#178600',
    Swift: '#fa7343',
    Kotlin: '#a97bff',
    Dart: '#00b4ab',
    Vue: '#42b883',
    HTML: '#e34c26',
    CSS: '#563d7c',
    Shell: '#89e051',
    Unknown: '#8b949e'
}

export default function UniverseView() {
    const universeMode = useStore(s => s.universeMode)
    const universeOwner = useStore(s => s.universeOwner)
    const universeProfile = useStore(s => s.universeProfile)
    const universeLoading = useStore(s => s.universeLoading)
    const universeError = useStore(s => s.universeError)
    const universeFilter = useStore(s => s.universeFilter)
    const universeSortBy = useStore(s => s.universeSortBy)
    const universeSortDir = useStore(s => s.universeSortDir)
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
    
    const [viewMode, setViewMode] = useState('grid') // 'grid' or 'list'
    
    const filteredRepos = useMemo(() => getFilteredRepos(), [
        useStore(s => s.universeRepos),
        universeFilter,
        universeSortBy,
        universeSortDir,
        universeLanguageFilter
    ])
    
    const languages = useMemo(() => getUniverseLanguages(), [useStore(s => s.universeRepos)])
    const stats = useMemo(() => getUniverseStats(), [useStore(s => s.universeRepos)])
    
    if (!universeMode) return null
    
    return (
        <div className="universe-view anim-fade-in">
            {/* Header */}
            <header className="universe-header">
                <button className="universe-back-btn" onClick={() => exitUniverse()}>
                    <ArrowLeft size={20} />
                    <span>Back</span>
                </button>
                
                {universeProfile && (
                    <div className="universe-profile">
                        <img 
                            src={universeProfile.avatar_url} 
                            alt={universeProfile.name}
                            className="universe-avatar"
                        />
                        <div className="universe-profile-info">
                            <h1 className="universe-title">
                                <Globe size={24} />
                                {universeProfile.name}'s Universe
                            </h1>
                            {universeProfile.bio && (
                                <p className="universe-bio">{universeProfile.bio}</p>
                            )}
                        </div>
                    </div>
                )}
                
                {stats && (
                    <div className="universe-stats">
                        <div className="universe-stat">
                            <Building2 size={16} />
                            <span>{stats.totalRepos} cities</span>
                        </div>
                        <div className="universe-stat">
                            <Star size={16} />
                            <span>{stats.totalStars.toLocaleString()} stars</span>
                        </div>
                        <div className="universe-stat">
                            <Code size={16} />
                            <span>{stats.languages} languages</span>
                        </div>
                    </div>
                )}
            </header>
            
            {/* Loading State */}
            {universeLoading && (
                <div className="universe-loading">
                    <Loader2 size={48} className="anim-spin" />
                    <p>Discovering {universeOwner}'s repositories...</p>
                </div>
            )}
            
            {/* Error State */}
            {universeError && (
                <div className="universe-error">
                    <AlertCircle size={48} />
                    <p>{universeError}</p>
                    <button onClick={() => exitUniverse()}>Go Back</button>
                </div>
            )}
            
            {/* Repos Content */}
            {!universeLoading && !universeError && (
                <>
                    {/* Toolbar */}
                    <div className="universe-toolbar">
                        <div className="universe-search">
                            <Search size={16} />
                            <input
                                type="text"
                                placeholder="Search repositories..."
                                value={universeFilter}
                                onChange={e => setUniverseFilter(e.target.value)}
                            />
                        </div>
                        
                        {/* Language Filter */}
                        <div className="universe-language-filter">
                            <select
                                value={universeLanguageFilter || ''}
                                onChange={e => setUniverseLanguageFilter(e.target.value || null)}
                            >
                                <option value="">All Languages</option>
                                {languages.map(({ language, count }) => (
                                    <option key={language} value={language}>
                                        {language} ({count})
                                    </option>
                                ))}
                            </select>
                        </div>
                        
                        {/* Sort Controls */}
                        <div className="universe-sort">
                            <button
                                className={universeSortBy === 'updated' ? 'active' : ''}
                                onClick={() => setUniverseSort('updated')}
                            >
                                <Clock size={14} />
                                Recent
                            </button>
                            <button
                                className={universeSortBy === 'stars' ? 'active' : ''}
                                onClick={() => setUniverseSort('stars')}
                            >
                                <Star size={14} />
                                Stars
                            </button>
                            <button
                                className={universeSortBy === 'name' ? 'active' : ''}
                                onClick={() => setUniverseSort('name')}
                            >
                                <SortAsc size={14} />
                                Name
                            </button>
                        </div>
                        
                        {/* View Toggle */}
                        <div className="universe-view-toggle">
                            <button
                                className={viewMode === 'grid' ? 'active' : ''}
                                onClick={() => setViewMode('grid')}
                            >
                                <Grid3X3 size={16} />
                            </button>
                            <button
                                className={viewMode === 'list' ? 'active' : ''}
                                onClick={() => setViewMode('list')}
                            >
                                <List size={16} />
                            </button>
                        </div>
                    </div>
                    
                    {/* Repos Grid/List */}
                    <div className={`universe-repos ${viewMode}`}>
                        {filteredRepos.map((repo, index) => (
                            <RepoCard
                                key={repo.name}
                                repo={repo}
                                index={index}
                                isSelected={universeSelectedRepo === repo.name}
                                onSelect={() => selectUniverseRepo(repo.name)}
                                onEnter={() => enterCity(repo.name)}
                                viewMode={viewMode}
                            />
                        ))}
                        
                        {filteredRepos.length === 0 && (
                            <div className="universe-empty">
                                <Sparkles size={48} />
                                <p>No repositories match your search</p>
                            </div>
                        )}
                    </div>
                </>
            )}
        </div>
    )
}

function RepoCard({ repo, index, isSelected, onSelect, onEnter, viewMode }) {
    const langColor = LANGUAGE_COLORS[repo.language] || LANGUAGE_COLORS.Unknown
    
    const formatDate = (date) => {
        const d = new Date(date)
        const now = new Date()
        const diffDays = Math.floor((now - d) / (1000 * 60 * 60 * 24))
        
        if (diffDays === 0) return 'today'
        if (diffDays === 1) return 'yesterday'
        if (diffDays < 7) return `${diffDays}d ago`
        if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
        if (diffDays < 365) return `${Math.floor(diffDays / 30)}mo ago`
        return `${Math.floor(diffDays / 365)}y ago`
    }
    
    return (
        <article
            className={`repo-card ${isSelected ? 'selected' : ''} anim-scale-in`}
            style={{ animationDelay: `${Math.min(index * 30, 300)}ms` }}
            onClick={onSelect}
            onDoubleClick={onEnter}
        >
            <div className="repo-card-header">
                <h3 className="repo-name">{repo.name}</h3>
                {repo.private && <span className="repo-private">Private</span>}
            </div>
            
            {repo.description && (
                <p className="repo-description">{repo.description}</p>
            )}
            
            <div className="repo-meta">
                {repo.language && (
                    <span className="repo-language">
                        <span 
                            className="language-dot" 
                            style={{ background: langColor }}
                        />
                        {repo.language}
                    </span>
                )}
                
                {repo.stargazers_count > 0 && (
                    <span className="repo-stat">
                        <Star size={12} />
                        {repo.stargazers_count.toLocaleString()}
                    </span>
                )}
                
                {repo.forks_count > 0 && (
                    <span className="repo-stat">
                        <GitFork size={12} />
                        {repo.forks_count.toLocaleString()}
                    </span>
                )}
                
                <span className="repo-updated">
                    <Clock size={12} />
                    {formatDate(repo.updated_at)}
                </span>
            </div>
            
            <button 
                className="repo-enter-btn"
                onClick={(e) => {
                    e.stopPropagation()
                    onEnter()
                }}
            >
                <span>Enter City</span>
                <ChevronRight size={16} />
            </button>
        </article>
    )
}
