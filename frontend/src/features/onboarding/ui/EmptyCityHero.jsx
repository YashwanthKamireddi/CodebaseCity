/**
 * EmptyCityHero.jsx
 *
 * Landing page overlay — renders OVER the live 3D demo city canvas.
 * Auto-loads demo city JSON so users see a real 3D city behind the UI.
 * Inspired by git-city's approach: city as backdrop, UI floats on top.
 */
import React, { useState, useEffect } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Terminal, Github, Gamepad2, Sparkles } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function EmptyCityHero() {
    const { analyzeRepo, error, authToken, setCityData, cityData, isLandingOverlayActive, setLandingOverlayActive } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)
    const [repos, setRepos] = useState([])
    const [loadingRepos, setLoadingRepos] = useState(false)

    // Auto-load demo city on mount so users see it behind this overlay
    useEffect(() => {
        if (!cityData) {
            fetch('/demo-city.json')
                .then(res => res.json())
                .then(data => {
                    setCityData(data)
                })
                .catch(err => console.error("Failed to load demo city", err))
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (authToken) {
            setLoadingRepos(true)
            fetch('http://localhost:8000/auth/github/repos', {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setRepos(data)
                    setLoadingRepos(false)
                })
                .catch(err => {
                    console.error("Failed to fetch repos", err)
                    setLoadingRepos(false)
                })
        }
    }, [authToken])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (path.trim()) {
            setLandingOverlayActive(false) // Dismiss hero on analyze
            analyzeRepo(path.trim())
        }
    }

    const handleExploreDemoCity = () => {
        setLandingOverlayActive(false) // Dismiss hero, reveal the demo city
    }

    // If hero has been dismissed, render nothing — the 3D city is already showing
    if (!isLandingOverlayActive) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.5 }}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 40px',
                // Translucent dark overlay so the 3D city is visible behind
                background: 'linear-gradient(180deg, rgba(2,2,2,0.85) 0%, rgba(2,2,2,0.6) 40%, rgba(2,2,2,0.85) 100%)',
                backdropFilter: 'blur(4px)',
                WebkitBackdropFilter: 'blur(4px)'
            }}
        >
            <motion.div
                initial={{ opacity: 0, y: 30 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    display: 'flex',
                    flexDirection: 'column',
                    alignItems: 'center',
                    gap: '48px',
                    width: '100%',
                    maxWidth: '700px'
                }}
            >
                {/* Badge */}
                <motion.div
                    initial={{ scale: 0.9, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ delay: 0.2 }}
                    style={{
                        display: 'inline-flex',
                        alignItems: 'center',
                        gap: '10px',
                        padding: '6px 18px',
                        background: 'rgba(0, 242, 255, 0.06)',
                        border: '1px solid rgba(0, 242, 255, 0.15)',
                        borderRadius: '100px',
                    }}
                >
                    <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00f2ff', boxShadow: '0 0 12px #00f2ff' }} />
                    <span style={{ fontSize: '0.7rem', letterSpacing: '0.15em', textTransform: 'uppercase', color: '#00f2ff', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                        Architectural Intelligence Engine
                    </span>
                </motion.div>

                {/* Title */}
                <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <h1 style={{
                        fontSize: 'clamp(2.5rem, 5.5vw, 5rem)',
                        fontWeight: 300,
                        letterSpacing: '-0.05em',
                        lineHeight: 1.05,
                        margin: 0,
                        color: '#ffffff',
                        fontFamily: 'var(--font-display)',
                    }}>
                        Your codebase,<br />
                        <span style={{ fontWeight: 500, background: 'linear-gradient(135deg, #00f2ff, #818cf8)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                            as a city.
                        </span>
                    </h1>
                    <p style={{
                        fontSize: '1.1rem',
                        color: 'rgba(255,255,255,0.45)',
                        maxWidth: '520px',
                        margin: '0 auto',
                        lineHeight: 1.6,
                        fontWeight: 300
                    }}>
                        Navigate architecture spatially. Spot tech debt instantly.
                        Plan refactors visually — before writing a single line of code.
                    </p>
                </div>

                {/* Primary Input */}
                <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        background: isFocused ? 'rgba(10, 10, 12, 0.9)' : 'rgba(10, 10, 12, 0.6)',
                        border: `1px solid ${isFocused ? 'rgba(0, 242, 255, 0.3)' : 'rgba(255, 255, 255, 0.08)'}`,
                        borderRadius: '20px',
                        padding: '6px 6px 6px 20px',
                        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                        boxShadow: isFocused
                            ? '0 16px 40px rgba(0,242,255,0.1), inset 0 1px 0 rgba(255,255,255,0.05)'
                            : '0 4px 16px rgba(0,0,0,0.3)',
                    }}>
                        <Terminal size={16} color={isFocused ? "#00f2ff" : "#555"} style={{ transition: 'color 0.3s', flexShrink: 0 }} />
                        <input
                            type="text"
                            value={path}
                            onChange={(e) => setPath(e.target.value)}
                            onFocus={() => setIsFocused(true)}
                            onBlur={() => setIsFocused(false)}
                            placeholder="Paste GitHub URL or local path..."
                            spellCheck="false"
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                outline: 'none',
                                color: '#fff',
                                fontSize: '1rem',
                                fontFamily: 'var(--font-sans)',
                                padding: '0 14px',
                            }}
                        />
                        <button
                            type="submit"
                            disabled={!path.trim()}
                            onMouseEnter={() => setIsHovered(true)}
                            onMouseLeave={() => setIsHovered(false)}
                            style={{
                                background: path.trim() ? '#00f2ff' : 'rgba(255,255,255,0.04)',
                                color: path.trim() ? '#000' : 'rgba(255,255,255,0.2)',
                                border: 'none',
                                borderRadius: '14px',
                                padding: '0 28px',
                                height: '48px',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '10px',
                                fontSize: '0.9rem',
                                fontWeight: 600,
                                cursor: path.trim() ? 'pointer' : 'default',
                                transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                transform: isHovered && path.trim() ? 'scale(1.02)' : 'scale(1)',
                            }}
                        >
                            Analyze <ArrowRight size={16} />
                        </button>
                    </div>

                    {/* Action Row: Explore Demo + GitHub OAuth */}
                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        <button
                            type="button"
                            onClick={handleExploreDemoCity}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                background: 'rgba(0, 242, 255, 0.06)',
                                color: '#00f2ff',
                                border: '1px solid rgba(0, 242, 255, 0.15)',
                                borderRadius: '12px',
                                padding: '10px 24px',
                                fontSize: '0.85rem',
                                fontWeight: 500,
                                cursor: 'pointer',
                                fontFamily: 'var(--font-sans)',
                                transition: 'all 0.3s ease',
                            }}
                            onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(0, 242, 255, 0.12)'; e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.3)' }}
                            onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(0, 242, 255, 0.06)'; e.currentTarget.style.borderColor = 'rgba(0, 242, 255, 0.15)' }}
                        >
                            <Gamepad2 size={16} /> Explore Demo City
                        </button>

                        {!authToken && (
                            <button
                                type="button"
                                onClick={() => window.location.href = "http://localhost:8000/auth/github/login"}
                                style={{
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    background: 'rgba(255,255,255,0.04)',
                                    color: 'rgba(255,255,255,0.6)',
                                    border: '1px solid rgba(255,255,255,0.08)',
                                    borderRadius: '12px',
                                    padding: '10px 24px',
                                    fontSize: '0.85rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    fontFamily: 'var(--font-sans)',
                                    transition: 'all 0.3s ease',
                                }}
                                onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.08)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.15)' }}
                                onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.04)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.08)' }}
                            >
                                <Github size={16} /> Private Repos
                            </button>
                        )}
                    </div>

                    {/* GitHub session indicator */}
                    {authToken && (
                        <motion.div
                            initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                            style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}
                        >
                            <div style={{
                                display: 'flex', alignItems: 'center', gap: '8px', padding: '6px 14px',
                                background: 'rgba(0, 242, 255, 0.05)', borderRadius: '100px',
                                border: '1px solid rgba(0, 242, 255, 0.15)'
                            }}>
                                <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#00f2ff', boxShadow: '0 0 8px #00f2ff' }} />
                                <span style={{ fontSize: '0.75rem', color: '#00f2ff', fontFamily: 'var(--font-mono)' }}>
                                    GitHub Connected
                                </span>
                            </div>

                            {/* Repo list */}
                            <div style={{
                                width: '100%', maxHeight: '200px', overflowY: 'auto', display: 'flex',
                                flexDirection: 'column', gap: '6px',
                                scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.2) transparent'
                            }}>
                                {loadingRepos ? (
                                    <div style={{ color: 'rgba(255,255,255,0.4)', textAlign: 'center', fontSize: '0.85rem', padding: '16px' }}>
                                        Loading repositories...
                                    </div>
                                ) : repos.map((repo, i) => (
                                    <motion.div
                                        key={repo.id}
                                        initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.02 }}
                                        onClick={() => setPath(repo.html_url)}
                                        style={{
                                            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                            padding: '12px 16px', background: 'rgba(255,255,255,0.03)',
                                            border: '1px solid rgba(255,255,255,0.05)',
                                            borderRadius: '12px', cursor: 'pointer', transition: 'all 0.2s'
                                        }}
                                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,242,255,0.2)' }}
                                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.05)' }}
                                    >
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                            <Github size={14} color="rgba(255,255,255,0.5)" />
                                            <span style={{ fontWeight: 500, color: '#fff', fontSize: '0.9rem' }}>{repo.name}</span>
                                            {repo.private && (
                                                <span style={{ fontSize: '0.6rem', padding: '1px 6px', background: 'rgba(255,255,255,0.08)', borderRadius: '100px', color: '#999', textTransform: 'uppercase' }}>Private</span>
                                            )}
                                        </div>
                                        <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.3)', fontFamily: 'var(--font-mono)' }}>Select</span>
                                    </motion.div>
                                ))}
                            </div>
                        </motion.div>
                    )}

                    {error && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                            style={{ textAlign: 'center', color: '#f87171', fontSize: '0.8rem', fontFamily: 'var(--font-mono)' }}
                        >
                            {error}
                        </motion.div>
                    )}
                </form>

                {/* Feature highlights */}
                <div style={{
                    display: 'flex', gap: '24px', flexWrap: 'wrap', justifyContent: 'center'
                }}>
                    {[
                        { icon: '🏙️', text: 'Architecture Visualization' },
                        { icon: '🔬', text: 'Blast Radius Analysis' },
                        { icon: '🤖', text: 'AI Architect' },
                        { icon: '⏰', text: 'Git Time Travel' }
                    ].map((feat, i) => (
                        <motion.div
                            key={i}
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: 0.8 + i * 0.1 }}
                            style={{
                                display: 'flex', alignItems: 'center', gap: '6px',
                                fontSize: '0.75rem', color: 'rgba(255,255,255,0.35)',
                                fontFamily: 'var(--font-sans)'
                            }}
                        >
                            <span>{feat.icon}</span> {feat.text}
                        </motion.div>
                    ))}
                </div>
            </motion.div>
        </motion.div>
    )
}
