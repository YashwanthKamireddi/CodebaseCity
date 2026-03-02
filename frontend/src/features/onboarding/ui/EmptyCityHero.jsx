import React from 'react'
import { motion } from 'framer-motion'
import { FolderSearch, ArrowRight } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function EmptyCityHero() {
    const { setAnalyzeModalOpen } = useStore()

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            pointerEvents: 'none',
            zIndex: 50
        }}>
            {/* Cinematic Background Glow - Extremely subtle */}
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 2, ease: "easeOut" }}
                style={{
                    position: 'absolute',
                    width: '800px',
                    height: '800px',
                    background: 'radial-gradient(circle, rgba(255, 255, 255, 0.02) 0%, transparent 60%)',
                    borderRadius: '50%',
                    filter: 'blur(60px)',
                    zIndex: -1
                }}
            />

            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '40px',
                pointerEvents: 'auto',
                textAlign: 'center',
                maxWidth: '800px',
                width: '100%',
                padding: '0 24px'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 30, filter: 'blur(10px)' }}
                    animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px' }}
                >
                    {/* Minimalist Icon */}
                    <div style={{
                        width: '56px',
                        height: '56px',
                        borderRadius: '16px',
                        background: 'linear-gradient(180deg, rgba(255, 255, 255, 0.08) 0%, rgba(255, 255, 255, 0.02) 100%)',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        boxShadow: '0 16px 32px rgba(0, 0, 0, 0.4), inset 0 1px 0 rgba(255, 255, 255, 0.1)'
                    }}>
                        <FolderSearch size={24} color="rgba(255, 255, 255, 0.9)" strokeWidth={1.5} />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <h1 style={{
                            fontSize: '5rem',
                            fontWeight: 400,
                            margin: 0,
                            color: '#ffffff',
                            letterSpacing: '-0.04em',
                            lineHeight: 1.05,
                            fontFamily: 'var(--font-sans)'
                        }}>
                            Codebase <span style={{ color: 'rgba(255, 255, 255, 0.3)', fontWeight: 300 }}>Explorer</span>
                        </h1>
                        <p style={{
                            fontSize: '1.25rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            margin: '0 auto',
                            lineHeight: 1.6,
                            maxWidth: '560px',
                            fontFamily: 'var(--font-sans)',
                            fontWeight: 400,
                            letterSpacing: '-0.01em'
                        }}>
                            Instantly map your architecture, technical debt, and execution flows in a living 3D environment.
                        </p>
                    </div>
                </motion.div>

                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1, delay: 0.3, ease: [0.16, 1, 0.3, 1] }}
                >
                    <button
                        onClick={() => setAnalyzeModalOpen(true)}
                        className="touch-target"
                        style={{
                            background: '#ffffff',
                            color: '#000000',
                            border: 'none',
                            padding: '0 32px',
                            height: '52px',
                            borderRadius: '26px',
                            fontSize: '1rem',
                            fontWeight: 500,
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '12px',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            fontFamily: 'var(--font-sans)',
                            letterSpacing: '-0.01em',
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'scale(1.02) translateY(-1px)'
                            e.currentTarget.style.boxShadow = '0 12px 24px rgba(255, 255, 255, 0.15)'
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'scale(1) translateY(0)'
                            e.currentTarget.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.1)'
                        }}
                    >
                        Connect Workspace
                        <ArrowRight size={18} strokeWidth={2} />
                    </button>

                    <div style={{
                        marginTop: '24px',
                        fontSize: '0.85rem',
                        color: 'rgba(255, 255, 255, 0.3)',
                        fontFamily: 'var(--font-mono)',
                        letterSpacing: '0.02em',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '8px'
                    }}>
                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: 'rgba(255, 255, 255, 0.2)' }} />
                        AWAITING REPOSITORY PATH
                    </div>
                </motion.div>
            </div>
        </div>
    )
}
