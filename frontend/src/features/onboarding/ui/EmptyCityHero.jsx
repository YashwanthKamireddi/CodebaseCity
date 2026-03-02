import React, { useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderSearch, ArrowRight, Layers, ShieldAlert, Cpu, GitMerge } from 'lucide-react'
import useStore from '../../../store/useStore'

const FeatureCard = ({ icon: Icon, title, description, delay }) => (
    <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.8, delay, ease: [0.16, 1, 0.3, 1] }}
        style={{
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '20px',
            padding: '24px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            backdropFilter: 'blur(20px)',
            boxShadow: '0 4px 24px rgba(0,0,0,0.2), inset 0 1px 0 rgba(255,255,255,0.05)'
        }}
        whileHover={{
            y: -5,
            background: 'rgba(255, 255, 255, 0.04)',
            borderColor: 'rgba(255, 255, 255, 0.1)',
            boxShadow: '0 12px 32px rgba(0,0,0,0.3), inset 0 1px 0 rgba(255,255,255,0.1)'
        }}
    >
        <div style={{
            width: '40px', height: '40px',
            borderRadius: '12px',
            background: 'linear-gradient(135deg, rgba(255,255,255,0.1) 0%, rgba(255,255,255,0) 100%)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <Icon size={20} color="rgba(255,255,255,0.9)" strokeWidth={1.5} />
        </div>
        <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 500, color: '#fff', letterSpacing: '-0.01em', fontFamily: 'var(--font-sans)' }}>
            {title}
        </h3>
        <p style={{ margin: 0, fontSize: '0.9rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5, fontFamily: 'var(--font-sans)' }}>
            {description}
        </p>
    </motion.div>
)

export default function EmptyCityHero() {
    const { analyzeRepo, error } = useStore()
    const [path, setPath] = useState('')
    const [isHoveringInput, setIsHoveringInput] = useState(false)
    const [isFocused, setIsFocused] = useState(false)

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
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 50,
            background: '#050508',
            overflow: 'hidden' // Prevent scrolling so it feels like a native app
        }}>
            {/* Dynamic Background Grid and Glows */}
            <div style={{
                position: 'absolute', inset: 0,
                backgroundImage: 'url("data:image/svg+xml,%3Csvg width=\\"40\\" height=\\"40\\" viewBox=\\"0 0 40 40\\" xmlns=\\"http://www.w3.org/2000/svg\\"%3E%3Cpath d=\\"M0 0h40v40H0V0zm39 39V1H1v38h38z\\" fill=\\"rgba(255,255,255,0.015)\\" fill-rule=\\"evenodd\\"%3E%3C/svg%3E")',
                maskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)',
                WebkitMaskImage: 'radial-gradient(ellipse at center, black 0%, transparent 80%)',
                zIndex: -2
            }} />

            <motion.div
                animate={{
                    scale: [1, 1.2, 1],
                    opacity: [0.3, 0.5, 0.3],
                }}
                transition={{ duration: 10, repeat: Infinity, ease: 'easeInOut' }}
                style={{
                    position: 'absolute',
                    top: '20%', left: '30%',
                    width: '600px', height: '600px',
                    background: 'radial-gradient(circle, rgba(59, 130, 246, 0.15) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(80px)',
                    zIndex: -1
                }}
            />
            <motion.div
                animate={{
                    scale: [1, 1.1, 1],
                    opacity: [0.2, 0.4, 0.2],
                }}
                transition={{ duration: 15, repeat: Infinity, ease: 'easeInOut', delay: 2 }}
                style={{
                    position: 'absolute',
                    bottom: '10%', right: '20%',
                    width: '700px', height: '700px',
                    background: 'radial-gradient(circle, rgba(168, 85, 247, 0.1) 0%, transparent 70%)',
                    borderRadius: '50%',
                    filter: 'blur(100px)',
                    zIndex: -1
                }}
            />

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '64px', // Huge spacing for premium feel
                pointerEvents: 'auto',
                width: '100%',
                maxWidth: '1200px',
                padding: '0 40px',
                marginTop: '-5vh' // Sight optical balance lift
            }}>
                {/* Hero Header */}
                <motion.div
                    initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', textAlign: 'center' }}
                >
                    <div style={{
                        padding: '6px 16px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        borderRadius: '100px',
                        color: 'rgba(255, 255, 255, 0.6)',
                        fontSize: '0.8rem',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.1em',
                        textTransform: 'uppercase',
                        display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#3b82f6', boxShadow: '0 0 10px #3b82f6' }} />
                        Codebase City V2.0
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                        fontWeight: 400,
                        margin: 0,
                        color: '#ffffff',
                        letterSpacing: '-0.04em',
                        lineHeight: 1.1,
                        fontFamily: 'var(--font-display)',
                        textShadow: '0 0 80px rgba(255,255,255,0.1)'
                    }}>
                        See Your Architecture.<br />
                        <span style={{ color: 'transparent', backgroundImage: 'linear-gradient(90deg, #fff 0%, rgba(255,255,255,0.3) 100%)', WebkitBackgroundClip: 'text' }}>
                            Understand Everything.
                        </span>
                    </h1>

                    <p style={{
                        fontSize: '1.25rem',
                        color: 'rgba(255, 255, 255, 0.5)',
                        margin: '0 auto',
                        lineHeight: 1.6,
                        maxWidth: '640px',
                        fontFamily: 'var(--font-sans)',
                        fontWeight: 400,
                        letterSpacing: '-0.01em'
                    }}>
                        Transform raw code into a living, navigable 3D metropolis. Instantly grasp complex dependencies, detect god objects, and navigate technical debt.
                    </p>
                </motion.div>

                {/* Inline Command Input */}
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                    style={{ width: '100%', maxWidth: '640px' }}
                >
                    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                        <div style={{
                            position: 'absolute', inset: '-1px',
                            background: isFocused ? 'linear-gradient(90deg, #3b82f6, #a855f7)' : 'rgba(255,255,255,0.1)',
                            borderRadius: '24px',
                            opacity: isFocused ? 0.3 : 0.5,
                            transition: 'all 0.5s ease',
                            filter: 'blur(4px)',
                            zIndex: -1
                        }} />
                        <div
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                background: 'rgba(10, 10, 15, 0.8)',
                                border: `1px solid ${isFocused ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.1)'}`,
                                borderRadius: '24px',
                                padding: '8px 8px 8px 24px',
                                backdropFilter: 'blur(20px)',
                                transition: 'all 0.3s ease',
                                boxShadow: isFocused ? '0 20px 40px rgba(0,0,0,0.5), inset 0 0 0 1px rgba(255,255,255,0.05)' : '0 10px 30px rgba(0,0,0,0.3)'
                            }}
                        >
                            <FolderSearch size={22} color={isFocused ? "#ffffff" : "rgba(255, 255, 255, 0.4)"} style={{ transition: 'color 0.3s ease' }} />
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Enter local absolute path (e.g., /home/user/project)"
                                spellCheck="false"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'white',
                                    fontSize: '1.05rem',
                                    padding: '0 16px',
                                    fontFamily: 'var(--font-sans)',
                                    letterSpacing: '-0.01em'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!path.trim()}
                                onMouseEnter={() => setIsHoveringInput(true)}
                                onMouseLeave={() => setIsHoveringInput(false)}
                                style={{
                                    background: path.trim() ? '#ffffff' : 'rgba(255,255,255,0.05)',
                                    color: path.trim() ? '#000000' : 'rgba(255,255,255,0.3)',
                                    border: 'none',
                                    padding: '0 24px',
                                    height: '44px',
                                    borderRadius: '16px',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    cursor: path.trim() ? 'pointer' : 'default',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    fontFamily: 'var(--font-sans)',
                                    transform: isHoveringInput && path.trim() ? 'scale(1.02)' : 'scale(1)'
                                }}
                            >
                                Synthesize
                                <ArrowRight size={18} strokeWidth={2.5} />
                            </button>
                        </div>
                        {error && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, width: '100%',
                                marginTop: '12px', textAlign: 'center',
                                color: '#ef4444', fontSize: '0.85rem', fontFamily: 'var(--font-sans)'
                            }}>
                                {error}
                            </div>
                        )}
                    </form>
                </motion.div>

                {/* Bento Grid Features */}
                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
                    gap: '24px',
                    width: '100%',
                    marginTop: '20px'
                }}>
                    <FeatureCard
                        icon={Layers}
                        title="Topographical Analysis"
                        description="Directories are districts, files are skyscrapers. Height maps directly to code complexity and churn."
                        delay={0.6}
                    />
                    <FeatureCard
                        icon={GitMerge}
                        title="Dependency Pathways"
                        description="Trace invisible connections. See how data flows and which files are heavily coupled."
                        delay={0.7}
                    />
                    <FeatureCard
                        icon={ShieldAlert}
                        title="Blast Radius Intel"
                        description="Select an issue and see exactly which buildings will collapse if a core service is modified."
                        delay={0.8}
                    />
                </div>
            </div>
        </div>
    )
}
