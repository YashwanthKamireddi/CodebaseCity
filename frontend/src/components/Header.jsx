import React, { useState, useMemo, useRef, useEffect } from 'react'
import useStore from '../store/useStore'

export default function Header() {
    const { cityData, analyzeRepo, loading } = useStore()
    const [showAnalyze, setShowAnalyze] = useState(false)
    const [folderPath, setFolderPath] = useState('')
    const [searchValue, setSearchValue] = useState('')
    const [showResults, setShowResults] = useState(false)
    const { selectBuilding } = useStore()
    const searchRef = useRef(null)

    const stats = cityData?.stats || {}

    const searchResults = useMemo(() => {
        if (!searchValue.trim() || !cityData?.buildings) return []
        const query = searchValue.toLowerCase()
        return cityData.buildings
            .filter(b => b.name.toLowerCase().includes(query) || b.path.toLowerCase().includes(query))
            .slice(0, 5)
    }, [searchValue, cityData?.buildings])

    useEffect(() => {
        const handleClickOutside = (e) => {
            if (searchRef.current && !searchRef.current.contains(e.target)) {
                setShowResults(false)
            }
            // Close analyze modal on outside click
            if (showAnalyze && !e.target.closest('.analyze-modal') && !e.target.closest('.analyze-btn')) {
                setShowAnalyze(false)
            }
        }
        document.addEventListener('mousedown', handleClickOutside)
        return () => document.removeEventListener('mousedown', handleClickOutside)
    }, [showAnalyze])

    const handleAnalyze = (e) => {
        e.preventDefault()
        if (folderPath.trim()) {
            analyzeRepo(folderPath.trim())
            setShowAnalyze(false)
            setFolderPath('')
        }
    }

    return (
        <>
            {/* Main Header Bar */}
            <header style={{
                position: 'fixed',
                top: 0,
                left: 0,
                right: 0,
                height: '56px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '0 20px',
                background: 'rgba(13, 13, 18, 0.95)',
                backdropFilter: 'blur(12px)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 1000
            }}>
                {/* Logo */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
                        <rect x="4" y="14" width="6" height="14" rx="1" fill="#818cf8" />
                        <rect x="13" y="8" width="6" height="20" rx="1" fill="#a78bfa" />
                        <rect x="22" y="11" width="6" height="17" rx="1" fill="#c4b5fd" />
                        <rect x="2" y="28" width="28" height="2" rx="1" fill="#22c55e" />
                    </svg>
                    <span style={{ fontSize: '17px', fontWeight: 600, color: '#fff' }}>Codebase City</span>
                </div>

                {/* Center - Analyze + Search */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <button
                        className="analyze-btn"
                        onClick={() => setShowAnalyze(!showAnalyze)}
                        disabled={loading}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 14px',
                            background: '#818cf8',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            fontWeight: 500,
                            cursor: loading ? 'not-allowed' : 'pointer',
                            opacity: loading ? 0.6 : 1
                        }}
                    >
                        {loading ? 'Analyzing...' : 'Analyze'}
                    </button>

                    {cityData && (
                        <div ref={searchRef} style={{ position: 'relative' }}>
                            <input
                                type="text"
                                placeholder="Search files..."
                                value={searchValue}
                                onChange={(e) => { setSearchValue(e.target.value); setShowResults(true) }}
                                onFocus={() => searchValue && setShowResults(true)}
                                style={{
                                    width: '180px',
                                    height: '36px',
                                    padding: '0 12px',
                                    background: 'rgba(255, 255, 255, 0.06)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    outline: 'none'
                                }}
                            />
                            {showResults && searchResults.length > 0 && (
                                <div style={{
                                    position: 'absolute',
                                    top: '42px',
                                    left: 0,
                                    width: '250px',
                                    background: '#1c1c24',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '8px',
                                    overflow: 'hidden',
                                    zIndex: 1001
                                }}>
                                    {searchResults.map(b => (
                                        <div
                                            key={b.id}
                                            onClick={() => { selectBuilding(b); setShowResults(false); setSearchValue('') }}
                                            style={{
                                                padding: '10px 12px',
                                                cursor: 'pointer',
                                                borderBottom: '1px solid rgba(255,255,255,0.05)'
                                            }}
                                            onMouseOver={(e) => e.currentTarget.style.background = 'rgba(129, 140, 248, 0.15)'}
                                            onMouseOut={(e) => e.currentTarget.style.background = 'transparent'}
                                        >
                                            <div style={{ fontSize: '13px', color: '#fff' }}>{b.name}</div>
                                            <div style={{ fontSize: '11px', color: '#7a7a8c' }}>{b.path}</div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Stats */}
                {cityData && (
                    <div style={{ display: 'flex', gap: '20px' }}>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{stats.total_files || 0}</span>
                            <span style={{ fontSize: '11px', color: '#7a7a8c' }}>files</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{((stats.total_loc || 0) / 1000).toFixed(1)}k</span>
                            <span style={{ fontSize: '11px', color: '#7a7a8c' }}>lines</span>
                        </div>
                        <div style={{ display: 'flex', alignItems: 'baseline', gap: '4px' }}>
                            <span style={{ fontSize: '16px', fontWeight: 600, color: '#ef4444' }}>{stats.hotspots || 0}</span>
                            <span style={{ fontSize: '11px', color: '#7a7a8c' }}>hotspots</span>
                        </div>
                    </div>
                )}
            </header>

            {/* Analyze Modal - Separate from header */}
            {showAnalyze && (
                <div className="analyze-modal" style={{
                    position: 'fixed',
                    top: '70px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '400px',
                    background: '#1c1c24',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '20px',
                    boxShadow: '0 16px 48px rgba(0,0,0,0.5)',
                    zIndex: 1001
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '16px' }}>
                        <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#fff' }}>Analyze Project</h3>
                        <button
                            onClick={() => setShowAnalyze(false)}
                            style={{ background: 'none', border: 'none', color: '#7a7a8c', fontSize: '20px', cursor: 'pointer' }}
                        >×</button>
                    </div>
                    <p style={{ fontSize: '13px', color: '#7a7a8c', marginBottom: '16px' }}>
                        Enter a GitHub URL or local folder path
                    </p>
                    <form onSubmit={handleAnalyze}>
                        <input
                            type="text"
                            value={folderPath}
                            onChange={(e) => setFolderPath(e.target.value)}
                            placeholder="https://github.com/user/repo"
                            autoFocus
                            style={{
                                width: '100%',
                                height: '42px',
                                padding: '0 14px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                borderRadius: '8px',
                                color: '#fff',
                                fontSize: '14px',
                                marginBottom: '16px',
                                outline: 'none',
                                boxSizing: 'border-box'
                            }}
                        />
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'flex-end' }}>
                            <button
                                type="button"
                                onClick={() => setShowAnalyze(false)}
                                style={{
                                    padding: '8px 16px',
                                    background: 'rgba(255, 255, 255, 0.08)',
                                    border: '1px solid rgba(255, 255, 255, 0.1)',
                                    borderRadius: '6px',
                                    color: '#b4b4c0',
                                    fontSize: '13px',
                                    cursor: 'pointer'
                                }}
                            >Cancel</button>
                            <button
                                type="submit"
                                disabled={!folderPath.trim()}
                                style={{
                                    padding: '8px 16px',
                                    background: '#818cf8',
                                    border: 'none',
                                    borderRadius: '6px',
                                    color: '#fff',
                                    fontSize: '13px',
                                    fontWeight: 500,
                                    cursor: folderPath.trim() ? 'pointer' : 'not-allowed',
                                    opacity: folderPath.trim() ? 1 : 0.5
                                }}
                            >Analyze</button>
                        </div>
                    </form>
                    <div style={{ display: 'flex', gap: '8px', marginTop: '12px', paddingTop: '12px', borderTop: '1px solid rgba(255,255,255,0.06)' }}>
                        <span style={{ fontSize: '12px', color: '#7a7a8c' }}>Examples:</span>
                        <button
                            onClick={() => setFolderPath('https://github.com/expressjs/express')}
                            style={{ padding: '4px 10px', background: 'rgba(129, 140, 248, 0.15)', border: 'none', borderRadius: '4px', color: '#a5b4fc', fontSize: '12px', cursor: 'pointer' }}
                        >Express</button>
                        <button
                            onClick={() => setFolderPath('https://github.com/vercel/next.js')}
                            style={{ padding: '4px 10px', background: 'rgba(129, 140, 248, 0.15)', border: 'none', borderRadius: '4px', color: '#a5b4fc', fontSize: '12px', cursor: 'pointer' }}
                        >Next.js</button>
                    </div>
                </div>
            )}
        </>
    )
}
