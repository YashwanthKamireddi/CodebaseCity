import React, { useState } from 'react'
import { motion } from 'framer-motion'
import { ArrowRight, Terminal } from 'lucide-react'
import useStore from '../../../store/useStore'

// A highly-optimized, zero-lag, pure DOM background
function PureAtelierBackground() {
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, overflow: 'hidden', pointerEvents: 'none' }}>
            {/* Base deep black */}
            <div style={{ position: 'absolute', inset: 0, background: '#020202' }} />

            {/* Subtle, highly optimized CSS radial glow */}
            <motion.div
                animate={{
                    scale: [1, 1.05, 1],
                    opacity: [0.15, 0.2, 0.15]
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    top: '50%',
                    left: '50%',
                    width: '80vw',
                    height: '80vw',
                    transform: 'translate(-50%, -50%)',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.05) 0%, transparent 60%)',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    willChange: 'transform, opacity' // Hardware acceleration
                }}
            />

            {/* Micro-grid overlay for structural tech feel - perfectly static */}
            <div style={{
                position: 'absolute',
                inset: 0,
                backgroundImage: 'linear-gradient(rgba(255,255,255,0.015) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.015) 1px, transparent 1px)',
                backgroundSize: '40px 40px',
                maskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)',
                WebkitMaskImage: 'radial-gradient(circle at center, black 0%, transparent 80%)'
            }} />
        </div>
    )
}

export default function EmptyCityHero() {
    const { analyzeRepo, error } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (path.trim()) {
            analyzeRepo(path.trim())
        }
    }

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            background: '#020202', // Absolute deep black fallback
            overflow: 'hidden',
            fontFamily: 'var(--font-sans)',
            color: '#fff'
        }}>
            {/* Zero-Lag DOM Background */}
            <PureAtelierBackground />

            {/* High-End Editoral UI Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 40px',
                pointerEvents: 'none'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '64px',
                        width: '100%',
                        maxWidth: '900px',
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            margin: '0 auto',
                            padding: '8px 20px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '100px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px #fff' }} />
                            <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                                System Ready
                            </span>
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                            fontWeight: 400,
                            letterSpacing: '-0.04em',
                            lineHeight: 1.05,
                            margin: 0,
                            color: '#ffffff',
                            fontFamily: 'var(--font-display)',
                        }}>
                            Instantiate City.
                        </h1>
                        <p style={{
                            fontSize: '1.25rem',
                            color: 'rgba(255,255,255,0.4)',
                            maxWidth: '600px',
                            margin: '0 auto',
                            lineHeight: 1.6,
                            letterSpacing: '-0.01em',
                            fontWeight: 300
                        }}>
                            Connect your codebase to the dimensional engine.
                            <br />We transform raw syntax into structural geometry.
                        </p>
                    </div>

                    {/* Architectural Input Console */}
                    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '640px', position: 'relative' }}>

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: isFocused ? 'rgba(10, 10, 12, 0.8)' : 'rgba(10, 10, 12, 0.4)',
                            border: `1px solid ${isFocused ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'}`,
                            borderRadius: '24px',
                            padding: '8px 8px 8px 24px',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isFocused
                                ? '0 16px 40px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
                                : '0 8px 24px rgba(0,0,0,0.4)',
                            willChange: 'transform, box-shadow, background'
                        }}>
                            <Terminal size={18} color={isFocused ? "#fff" : "#444"} style={{ transition: 'color 0.3s' }} />
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Enter absolute repository path..."
                                spellCheck="false"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#fff',
                                    fontSize: '1.05rem',
                                    fontFamily: 'var(--font-sans)',
                                    letterSpacing: '-0.01em',
                                    padding: '0 16px',
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!path.trim()}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                style={{
                                    background: path.trim() ? '#ffffff' : 'rgba(255,255,255,0.03)',
                                    color: path.trim() ? '#000000' : 'rgba(255,255,255,0.2)',
                                    border: path.trim() ? 'none' : '1px solid rgba(255,255,255,0.02)',
                                    borderRadius: '16px',
                                    padding: '0 32px',
                                    height: '52px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    cursor: path.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    transform: isHovered && path.trim() ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: path.trim() && isHovered ? '0 8px 16px rgba(255,255,255,0.1)' : 'none',
                                    willChange: 'transform, box-shadow, background'
                                }}
                            >
                                Process <ArrowRight size={18} />
                            </button>
                        </div>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                style={{
                                    position: 'absolute', top: '100%', left: 0, width: '100%',
                                    marginTop: '20px', textAlign: 'center',
                                    color: '#f87171', fontSize: '0.85rem', fontFamily: 'var(--font-mono)'
                                }}
                            >
                                ERR: {error}
                            </motion.div>
                        )}
                    </form>

                </motion.div>
            </div>
        </div>
    )
}
