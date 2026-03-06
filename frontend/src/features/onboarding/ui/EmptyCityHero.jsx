/**
 * EmptyCityHero.jsx
 *
 * Landing page overlay — renders OVER the live 3D demo city canvas.
 * Auto-loads demo city JSON so users see a real 3D city behind the UI.
 *
 * Design: Bottom-anchored frosted glass panel leaves the top 60%+ of the
 * viewport fully transparent so the 3D city is the hero. Thin gradient
 * at the top ensures smooth blending without obscuring the scene.
 */
import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Terminal, Github, Gamepad2, Sparkles, Building2, Microscope, Bot, Clock, FolderOpen } from 'lucide-react'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'

const API_BASE = import.meta.env.VITE_API_URL || '/api'

const FEATURES = [
    { icon: <Building2 size={13} />, text: 'Architecture Viz' },
    { icon: <Microscope size={13} />, text: 'Blast Radius' },
    { icon: <Bot size={13} />, text: 'AI Architect' },
    { icon: <Clock size={13} />, text: 'Git Time Travel' },
]

export default function EmptyCityHero() {
    const { analyzeRepo, analyzeLocal, error, authToken, setCityData, cityData, isLandingOverlayActive, setLandingOverlayActive } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [repos, setRepos] = useState([])
    const [loadingRepos, setLoadingRepos] = useState(false)

    // Auto-load demo city on mount so users see it behind this overlay
    useEffect(() => {
        if (!cityData) {
            fetch('/demo-city.json')
                .then(res => res.json())
                .then(data => { setCityData(data) })
                .catch(err => logger.error("Failed to load demo city", err))
        }
    }, []) // eslint-disable-line react-hooks/exhaustive-deps

    useEffect(() => {
        if (authToken) {
            setLoadingRepos(true)
            fetch(`${API_BASE}/auth/github/repos`, {
                headers: { 'Authorization': `Bearer ${authToken}` }
            })
                .then(res => res.json())
                .then(data => {
                    if (Array.isArray(data)) setRepos(data)
                    setLoadingRepos(false)
                })
                .catch(err => {
                    logger.error("Failed to fetch repos", err)
                    setLoadingRepos(false)
                })
        }
    }, [authToken])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (path.trim()) {
            setLandingOverlayActive(false)
            analyzeRepo(path.trim())
        }
    }

    const handleExploreDemoCity = () => {
        setLandingOverlayActive(false)
    }

    if (!isLandingOverlayActive) return null

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.6 }}
            style={{
                position: 'absolute',
                inset: 0,
                zIndex: 50,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'flex-end',
                pointerEvents: 'none',
            }}
        >
            {/* Subtle top gradient — just enough to read the badge over bright buildings */}
            <div style={{
                position: 'absolute',
                top: 0, left: 0, right: 0,
                height: '30%',
                background: 'linear-gradient(180deg, rgba(0,0,0,0.5) 0%, transparent 100%)',
                pointerEvents: 'none',
            }} />

            {/* Floating badge — top center */}
            <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    position: 'absolute',
                    top: '28px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: '8px',
                    padding: '6px 18px',
                    background: 'rgba(255, 255, 255, 0.06)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '100px',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    pointerEvents: 'auto',
                }}
            >
                <Sparkles size={13} color="rgba(255,255,255,0.55)" />
                <span style={{ fontSize: '0.7rem', letterSpacing: '0.06em', color: 'rgba(255,255,255,0.6)', fontWeight: 500, fontFamily: 'var(--font-sans)', textTransform: 'uppercase' }}>
                    Codebase City Engine
                </span>
            </motion.div>

            {/* Bottom panel — frosted glass command center */}
            <motion.div
                initial={{ opacity: 0, y: 40 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 1, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{
                    pointerEvents: 'auto',
                    padding: '0 32px 32px',
                    background: 'linear-gradient(180deg, transparent 0%, rgba(0,0,0,0.55) 25%, rgba(0,0,0,0.78) 100%)',
                    backdropFilter: 'blur(2px)',
                    WebkitBackdropFilter: 'blur(2px)',
                }}
            >
                <div style={{
                    maxWidth: '680px',
                    margin: '0 auto',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '20px',
                }}>
                    {/* Title + Subtitle */}
                    <div style={{ textAlign: 'center' }}>
                        <h1 style={{
                            fontSize: 'clamp(1.8rem, 4vw, 3rem)',
                            fontWeight: 300,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.15,
                            margin: '0 0 8px',
                            color: '#ffffff',
                            fontFamily: 'var(--font-display)',
                        }}>
                            See your architecture{' '}
                            <span style={{ color: 'rgba(255,255,255,0.4)' }}>in 3D</span>
                        </h1>
                        <p style={{
                            fontSize: '0.95rem',
                            color: 'rgba(255,255,255,0.5)',
                            margin: 0,
                            lineHeight: 1.5,
                            fontWeight: 300,
                        }}>
                            Paste a GitHub URL to visualize dependencies, debt, and complexity.
                        </p>
                    </div>

                    {/* Input bar */}
                    <form onSubmit={handleSubmit} style={{ width: '100%', display: 'flex', flexDirection: 'column', gap: '14px' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: isFocused ? 'rgba(255, 255, 255, 0.1)' : 'rgba(255, 255, 255, 0.06)',
                            border: `1px solid ${isFocused ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
                            borderRadius: '16px',
                            padding: '5px 5px 5px 18px',
                            transition: 'all 0.35s cubic-bezier(0.16, 1, 0.3, 1)',
                            backdropFilter: 'blur(20px)',
                            WebkitBackdropFilter: 'blur(20px)',
                            boxShadow: isFocused
                                ? '0 8px 32px rgba(0,0,0,0.25), inset 0 1px 0 rgba(255,255,255,0.08)'
                                : '0 2px 12px rgba(0,0,0,0.15)',
                        }}>
                            <Terminal size={15} color={isFocused ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.25)'} style={{ transition: 'color 0.3s', flexShrink: 0 }} />
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Paste any public GitHub URL..."
                                spellCheck="false"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#fff',
                                    fontSize: '0.95rem',
                                    fontFamily: 'var(--font-sans)',
                                    padding: '0 12px',
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!path.trim()}
                                style={{
                                    background: path.trim() ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.04)',
                                    color: path.trim() ? '#fff' : 'rgba(255,255,255,0.2)',
                                    border: 'none',
                                    borderRadius: '12px',
                                    padding: '0 24px',
                                    height: '44px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.85rem',
                                    fontWeight: 600,
                                    cursor: path.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    fontFamily: 'var(--font-sans)',
                                }}
                            >
                                Analyze <ArrowRight size={15} />
                            </button>
                        </div>

                        {/* Action buttons — compact row */}
                        <div style={{ display: 'flex', gap: '10px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <ActionButton onClick={handleExploreDemoCity} icon={<Gamepad2 size={15} />} label="Explore Demo City" />
                            <ActionButton onClick={analyzeLocal} icon={<FolderOpen size={15} />} label="Open Local Folder" variant="green" />
                            {!authToken && (
                                <ActionButton
                                    onClick={() => { window.location.href = `${API_BASE}/auth/github/login` }}
                                    icon={<Github size={15} />}
                                    label="Connect GitHub"
                                    variant="dim"
                                />
                            )}
                        </div>

                        {/* GitHub session */}
                        {authToken && (
                            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '10px' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', gap: '8px', padding: '5px 14px',
                                    background: 'rgba(0, 242, 255, 0.05)', borderRadius: '100px',
                                    border: '1px solid rgba(0, 242, 255, 0.15)',
                                }}>
                                    <div style={{ width: 5, height: 5, borderRadius: '50%', background: '#00f2ff', boxShadow: '0 0 6px #00f2ff' }} />
                                    <span style={{ fontSize: '0.7rem', color: '#00f2ff', fontFamily: 'var(--font-mono)' }}>GitHub Connected</span>
                                </div>
                                <div style={{
                                    width: '100%', maxHeight: '160px', overflowY: 'auto', display: 'flex',
                                    flexDirection: 'column', gap: '4px',
                                    scrollbarWidth: 'thin', scrollbarColor: 'rgba(255,255,255,0.15) transparent',
                                }}>
                                    {loadingRepos ? (
                                        <div style={{ color: 'rgba(255,255,255,0.35)', textAlign: 'center', fontSize: '0.8rem', padding: '12px' }}>Loading repositories...</div>
                                    ) : repos.map((repo, i) => (
                                        <motion.div
                                            key={repo.id}
                                            initial={{ opacity: 0, y: 6 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            transition={{ delay: i * 0.02 }}
                                            onClick={() => setPath(repo.html_url)}
                                            style={{
                                                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                                                padding: '10px 14px', background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.04)',
                                                borderRadius: '10px', cursor: 'pointer', transition: 'all 0.2s',
                                            }}
                                            onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)'; e.currentTarget.style.borderColor = 'rgba(0,242,255,0.2)' }}
                                            onMouseLeave={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.03)'; e.currentTarget.style.borderColor = 'rgba(255,255,255,0.04)' }}
                                        >
                                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                                <Github size={13} color="rgba(255,255,255,0.4)" />
                                                <span style={{ fontWeight: 500, color: '#fff', fontSize: '0.85rem' }}>{repo.name}</span>
                                                {repo.private && (
                                                    <span style={{ fontSize: '0.55rem', padding: '1px 5px', background: 'rgba(255,255,255,0.07)', borderRadius: '100px', color: '#888', textTransform: 'uppercase' }}>Private</span>
                                                )}
                                            </div>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.25)', fontFamily: 'var(--font-mono)' }}>Select</span>
                                        </motion.div>
                                    ))}
                                </div>
                            </motion.div>
                        )}

                        <AnimatePresence>
                            {error && (
                                <motion.div
                                    initial={{ opacity: 0, y: 6 }}
                                    animate={{ opacity: 1, y: 0 }}
                                    exit={{ opacity: 0 }}
                                    style={{ textAlign: 'center', color: '#f87171', fontSize: '0.78rem', fontFamily: 'var(--font-mono)' }}
                                >
                                    {error}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </form>

                    {/* Feature chips */}
                    <div style={{ display: 'flex', gap: '16px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {FEATURES.map((feat, i) => (
                            <motion.div
                                key={i}
                                initial={{ opacity: 0 }}
                                animate={{ opacity: 1 }}
                                transition={{ delay: 0.6 + i * 0.08 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '5px',
                                    fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)',
                                    fontFamily: 'var(--font-sans)', fontWeight: 400,
                                }}
                            >
                                <span style={{ display: 'flex', alignItems: 'center', opacity: 0.6 }}>{feat.icon}</span>
                                {feat.text}
                            </motion.div>
                        ))}
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}

/* Reusable action button to keep JSX clean */
function ActionButton({ onClick, icon, label, variant }) {
    const isGreen = variant === 'green'
    const isDim = variant === 'dim'

    const baseBg = isGreen
        ? 'linear-gradient(135deg, rgba(34,197,94,0.12), rgba(34,197,94,0.04))'
        : isDim ? 'rgba(255,255,255,0.03)' : 'rgba(255,255,255,0.06)'
    const hoverBg = isGreen
        ? 'linear-gradient(135deg, rgba(34,197,94,0.22), rgba(34,197,94,0.08))'
        : isDim ? 'rgba(255,255,255,0.07)' : 'rgba(255,255,255,0.12)'
    const baseColor = isGreen ? 'rgba(34,197,94,0.85)' : isDim ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.75)'
    const baseBorder = isGreen ? 'rgba(34,197,94,0.2)' : isDim ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.1)'
    const hoverBorder = isGreen ? 'rgba(34,197,94,0.35)' : isDim ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.18)'

    return (
        <button
            type="button"
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '7px',
                background: baseBg, color: baseColor,
                border: `1px solid ${baseBorder}`, borderRadius: '10px',
                padding: '9px 20px', fontSize: '0.8rem', fontWeight: 500,
                cursor: 'pointer', fontFamily: 'var(--font-sans)',
                transition: 'all 0.25s ease',
            }}
            onMouseEnter={e => { e.currentTarget.style.background = hoverBg; e.currentTarget.style.borderColor = hoverBorder }}
            onMouseLeave={e => { e.currentTarget.style.background = baseBg; e.currentTarget.style.borderColor = baseBorder }}
        >
            {icon} {label}
        </button>
    )
}
