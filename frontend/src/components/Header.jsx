import React, { useState, useMemo, useRef, useEffect } from 'react'
import useStore from '../store/useStore'

export default function Header() {
    const { cityData, analyzeRepo, loading, selectBuilding, setFocusedDistrict } = useStore()
    const [showAnalyze, setShowAnalyze] = useState(false)
    const [folderPath, setFolderPath] = useState('')
    const [searchValue, setSearchValue] = useState('')
    const [showResults, setShowResults] = useState(false)
    const searchRef = useRef(null)

    const stats = cityData?.stats || {}

    // Search results - filter buildings by name/path
    const searchResults = useMemo(() => {
        if (!searchValue.trim() || !cityData?.buildings) return []

        const query = searchValue.toLowerCase()
        return cityData.buildings
            .filter(b =>
                b.name.toLowerCase().includes(query) ||
                b.path.toLowerCase().includes(query) ||
                b.language?.toLowerCase().includes(query)
            )
            .slice(0, 8) // Max 8 results
    }, [searchValue, cityData?.buildings])

    // Close results on outside click
    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowResults(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [])

    const handleAnalyze = (e) => {
        e.preventDefault()
        if (folderPath.trim()) {
            analyzeRepo(folderPath.trim())
            setShowAnalyze(false)
            setFolderPath('')
        }
    }

    const handleSelectResult = (building) => {
        selectBuilding(building)
        setShowResults(false)
        setSearchValue('')
        // TODO: Could add camera focus on building here
    }

    const handleSearch = (e) => {
        e.preventDefault()
        if (searchResults.length > 0) {
            handleSelectResult(searchResults[0])
        }
    }

    return (
        <header className="header">
            <div className="header-left">
                <div className="logo">
                    <div className="logo-mark">C</div>
                    <span>Codebase City</span>
                </div>

                <button
                    className="btn btn-primary"
                    onClick={() => setShowAnalyze(!showAnalyze)}
                    disabled={loading}
                    style={{ marginLeft: '16px' }}
                >
                    {loading ? 'Analyzing...' : 'Analyze Project'}
                </button>
            </div>

            {/* Analyze Modal */}
            {showAnalyze && (
                <div style={{
                    position: 'fixed',
                    top: '70px',
                    left: '20px',
                    background: 'var(--color-surface-primary)',
                    border: '1px solid var(--color-border-default)',
                    borderRadius: '12px',
                    padding: '20px',
                    zIndex: 1000,
                    width: '420px',
                    boxShadow: 'var(--shadow-xl)'
                }}>
                    <h3 style={{ marginBottom: '12px', fontSize: '16px' }}>Analyze a Project</h3>
                    <p style={{ fontSize: '13px', color: 'var(--color-text-secondary)', marginBottom: '16px' }}>
                        Enter a GitHub URL or local folder path:
                    </p>
                    <form onSubmit={handleAnalyze}>
                        <input
                            type="text"
                            value={folderPath}
                            onChange={(e) => setFolderPath(e.target.value)}
                            placeholder="https://github.com/facebook/react"
                            style={{
                                width: '100%',
                                padding: '10px 12px',
                                background: 'var(--color-bg-elevated)',
                                border: '1px solid var(--color-border-default)',
                                borderRadius: '8px',
                                color: 'var(--color-text-primary)',
                                fontSize: '14px',
                                marginBottom: '8px'
                            }}
                        />
                        <p style={{ fontSize: '11px', color: 'var(--color-text-tertiary)', marginBottom: '12px' }}>
                            Examples: https://github.com/expressjs/express or C:\Users\you\project
                        </p>
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>
                                Analyze
                            </button>
                            <button
                                type="button"
                                className="btn btn-secondary"
                                onClick={() => setShowAnalyze(false)}
                            >
                                Cancel
                            </button>
                        </div>
                    </form>
                </div>
            )}

            {/* Search Bar with Results */}
            <div className="header-center" ref={searchRef}>
                <form onSubmit={handleSearch} className="search-input">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <circle cx="11" cy="11" r="8" />
                        <path d="M21 21l-4.35-4.35" />
                    </svg>
                    <input
                        type="text"
                        placeholder="Search files, functions, or languages..."
                        value={searchValue}
                        onChange={(e) => {
                            setSearchValue(e.target.value)
                            setShowResults(true)
                        }}
                        onFocus={() => searchValue && setShowResults(true)}
                    />
                    {searchValue && (
                        <button
                            type="button"
                            onClick={() => { setSearchValue(''); setShowResults(false) }}
                            style={{
                                background: 'none',
                                border: 'none',
                                cursor: 'pointer',
                                color: 'var(--color-text-tertiary)',
                                padding: '4px'
                            }}
                        >
                            ✕
                        </button>
                    )}
                </form>

                {/* Search Results Dropdown */}
                {showResults && searchResults.length > 0 && (
                    <div className="search-results">
                        {searchResults.map((b, i) => (
                            <div
                                key={b.id}
                                className="search-result-item"
                                onClick={() => handleSelectResult(b)}
                            >
                                <span className="result-name">{b.name}</span>
                                <span className="result-path">{b.path}</span>
                                <span className="result-lang">{b.language}</span>
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* Stats */}
            <div className="header-right">
                {cityData && (
                    <div className="stats-bar">
                        <div className="stat-item">
                            <span className="stat-value">{stats.total_files || 0}</span>
                            <span className="stat-label">Files</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">{stats.total_districts || 0}</span>
                            <span className="stat-label">Districts</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value">{formatNumber(stats.total_loc)}</span>
                            <span className="stat-label">LOC</span>
                        </div>
                        <div className="stat-divider" />
                        <div className="stat-item">
                            <span className="stat-value" style={{ color: stats.hotspots > 0 ? '#ef4444' : undefined }}>
                                {stats.hotspots || 0}
                            </span>
                            <span className="stat-label">Hotspots</span>
                        </div>
                    </div>
                )}
            </div>
        </header>
    )
}

function formatNumber(num) {
    if (!num) return '0'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
}
