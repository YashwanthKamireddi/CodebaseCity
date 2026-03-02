import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'

// --- High-Concept 2026 Sequence ---
const SEQUENCE = [
    { code: "SYS.INIT", desc: "Establishing deeply integrated local context", delay: 0 },
    { code: "NET.LINK", desc: "Acquiring access points to filesystem structure", delay: 15 },
    { code: "AST.PRSE", desc: "Deconstructing source code into abstract syntax trees", delay: 30 },
    { code: "GRPH.BLD", desc: "Resolving topological dependency graphs", delay: 45 },
    { code: "MTRC.CLC", desc: "Computing architectural depth and complexity metrics", delay: 65 },
    { code: "RNDR.GEO", desc: "Synthesizing three-dimensional layout coordinate space", delay: 85 },
    { code: "SYS.DONE", desc: "Virtual environment online. Initializing viewport.", delay: 95 }
]

export default function CityBuilderLoader() {
    const { analysisProgress } = useStore()
    const [simulatedProgress, setSimulatedProgress] = useState(0)

    // Simulate progress while waiting for backend
    useEffect(() => {
        if (analysisProgress >= 80) return

        const interval = setInterval(() => {
            setSimulatedProgress(p => {
                const increment = p > 60 ? 0.2 : p > 30 ? 0.8 : 1.5;
                return Math.min(p + increment, 85)
            })
        }, 300)
        return () => clearInterval(interval)
    }, [analysisProgress])

    const effectiveProgress = Math.max(analysisProgress || 0, simulatedProgress)

    // Determine active stage based on progress value for smoother reading
    let currentStageIndex = 0
    for (let i = 0; i < SEQUENCE.length; i++) {
        if (effectiveProgress >= SEQUENCE[i].delay) {
            currentStageIndex = i
        }
    }

    const stage = SEQUENCE[currentStageIndex]

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#020202', // Absolute deep black
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-mono)', // Strict monospace structural feel
                color: '#ffffff',
                overflow: 'hidden'
            }}
        >
            {/* Cinematic Background Gradient purely for visual separation from absolute black */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at center, rgba(255,255,255,0.02) 0%, transparent 60%)',
                zIndex: 0, pointerEvents: 'none'
            }} />

            <div style={{
                width: '100%',
                maxWidth: '640px',
                padding: '0 40px',
                display: 'flex',
                flexDirection: 'column',
                gap: '40px', // Extensive spacing
                zIndex: 1
            }}>

                {/* Header Information - "Atelier" style spacing */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'baseline',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '24px'
                }}>
                    <div style={{ fontSize: '0.65rem', letterSpacing: '0.2em', color: '#666', textTransform: 'uppercase' }}>
                        Dimensional Architecture Engine
                    </div>
                    <div style={{ fontSize: '0.75rem', fontWeight: 500, letterSpacing: '0.1em', color: '#888' }}>
                        SESSION // 0x4B2A
                    </div>
                </div>

                {/* Main Progress Block */}
                <div style={{
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px',
                    minHeight: '80px',
                    justifyContent: 'center'
                }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={stage.code}
                            initial={{ opacity: 0, y: 10, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}
                        >
                            <span style={{ fontSize: '2rem', fontWeight: 400, letterSpacing: '-0.02em', color: '#ffffff' }}>
                                [{stage.code}]
                            </span>
                            <span style={{ fontSize: '1rem', color: '#888', letterSpacing: '0.01em', fontFamily: 'var(--font-sans)', fontWeight: 300 }}>
                                {stage.desc}...
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* The "Precision Bar" */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: '#444', letterSpacing: '0.1em' }}>
                        <span>SYSTEM INITIALIZATION</span>
                        <span style={{ color: '#fff' }}>{effectiveProgress.toFixed(2)}%</span>
                    </div>

                    <div style={{
                        width: '100%',
                        height: '2px', // Ultra thin
                        background: 'rgba(255, 255, 255, 0.03)',
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
                                background: '#ffffff', // Stark white
                                boxShadow: '0 0 10px rgba(255,255,255,0.4)'
                            }}
                        />
                    </div>
                </div>

            </div>
        </motion.div>
    )
}
