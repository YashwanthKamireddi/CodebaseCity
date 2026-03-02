import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'

// --- Highly Structured Sequence ---
const SEQUENCE = [
    { code: "SYS.INIT", desc: "Establishing deep context" },
    { code: "NET.LINK", desc: "Connecting local repository" },
    { code: "AST.PRSE", desc: "Constructing syntax trees" },
    { code: "GRPH.BLD", desc: "Resolving internal dependencies" },
    { code: "MTRC.CLC", desc: "Computing architectural metrics" },
    { code: "RNDR.GEO", desc: "Synthesizing three-dimensional layout" },
    { code: "SYS.DONE", desc: "Virtual environment online" }
]

export default function CityBuilderLoader() {
    const { analysisProgress } = useStore()
    const [simulatedProgress, setSimulatedProgress] = useState(0)

    // Simulate progress while waiting for backend
    useEffect(() => {
        if (analysisProgress >= 80) return

        const interval = setInterval(() => {
            setSimulatedProgress(p => {
                const increment = p > 60 ? 0.3 : p > 30 ? 1 : 2;
                return Math.min(p + increment, 85)
            })
        }, 400)
        return () => clearInterval(interval)
    }, [analysisProgress])

    const effectiveProgress = Math.max(analysisProgress || 0, simulatedProgress)
    const currentStageIndex = Math.min(
        Math.floor(effectiveProgress / (100 / SEQUENCE.length)),
        SEQUENCE.length - 1
    )

    const stage = SEQUENCE[currentStageIndex]

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#000000', // True black for ultimate polish
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)', // Strict monospace structural feel
                color: '#ffffff'
            }}
        >
            <div style={{
                width: '100%',
                maxWidth: '480px',
                padding: '0 40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '24px'
            }}>

                {/* Header Information */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', borderBottom: '1px solid rgba(255,255,255,0.1)', paddingBottom: '12px' }}>
                    <div style={{ fontSize: '0.75rem', letterSpacing: '0.1em', color: '#888' }}>
                        CODEBASE METROPOLIS
                    </div>
                    <div style={{ fontSize: '0.85rem', fontWeight: 500, letterSpacing: '0.05em' }}>
                        v2.0_SYNC
                    </div>
                </div>

                {/* Main Progress Block */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', height: '60px', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={stage.code}
                            initial={{ opacity: 0, x: -10 }}
                            animate={{ opacity: 1, x: 0 }}
                            exit={{ opacity: 0, x: 10 }}
                            transition={{ duration: 0.3, ease: 'easeOut' }}
                            style={{ display: 'flex', alignItems: 'baseline', gap: '16px' }}
                        >
                            <span style={{ fontSize: '1.25rem', fontWeight: 600, letterSpacing: '0.05em' }}>
                                [{stage.code}]
                            </span>
                            <span style={{ fontSize: '0.9rem', color: '#888', letterSpacing: '0.02em', fontFamily: 'var(--font-sans)' }}>
                                {stage.desc}...
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Laser-Thin Progress Line */}
                <div style={{
                    width: '100%',
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    position: 'relative',
                    overflow: 'hidden'
                }}>
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${effectiveProgress}%` }}
                        transition={{ ease: "easeOut", duration: 0.4 }}
                        style={{
                            position: 'absolute',
                            top: 0, left: 0, height: '100%',
                            background: '#ffffff' // No cheap glow, just stark white
                        }}
                    />
                </div>

                {/* Precision Counter */}
                <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: '#666', letterSpacing: '0.05em' }}>
                    <span>ETA: CALCULATING</span>
                    <span style={{ color: '#fff' }}>{effectiveProgress.toFixed(1)}%</span>
                </div>

            </div>
        </motion.div>
    )
}
