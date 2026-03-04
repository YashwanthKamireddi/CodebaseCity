import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hexagon, Cpu, Network, Layers, Activity, Box, Sparkles } from 'lucide-react'
import useStore from '../../../store/useStore'

// --- High-Concept 2026 Sequence ---
const SEQUENCE = [
    { icon: <Cpu />, code: "SYS.INIT", desc: "Establishing integrated local context", delay: 0 },
    { icon: <Network />, code: "NET.LINK", desc: "Acquiring structural filesystem access", delay: 15 },
    { icon: <Hexagon />, code: "AST.PRSE", desc: "Deconstructing abstract syntax trees", delay: 30 },
    { icon: <Layers />, code: "GRPH.BLD", desc: "Resolving topological dependencies", delay: 45 },
    { icon: <Activity />, code: "MTRC.CLC", desc: "Computing architectural depth metrics", delay: 65 },
    { icon: <Box />, code: "RNDR.GEO", desc: "Synthesizing 3D layout coordinates", delay: 85 },
    { icon: <Sparkles />, code: "SYS.DONE", desc: "Virtual environment online", delay: 95 }
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
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: 'rgba(5, 5, 5, 0.6)',
                backdropFilter: 'blur(20px)',
                WebkitBackdropFilter: 'blur(20px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                color: '#ffffff',
                overflow: 'hidden'
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.95, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{
                    width: '100%',
                    maxWidth: '480px',
                    padding: '40px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '32px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.4), inset 0 1px 0 rgba(255,255,255,0.1)'
                }}
            >
                {/* Header Information */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '20px'
                }}>
                    <div style={{ fontSize: '0.75rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box size={14} />
                        Codebase City Engine
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
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', color: '#ffffff' }}>
                                <div style={{
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    width: '32px', height: '32px', borderRadius: '8px',
                                    background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.1)'
                                }}>
                                    {React.cloneElement(stage.icon, { size: 16 })}
                                </div>
                                <span style={{ fontSize: '1.25rem', fontWeight: 500, letterSpacing: '-0.02em', color: '#ffffff' }}>
                                    {stage.code}
                                </span>
                            </div>
                            <span style={{ fontSize: '0.9rem', color: 'rgba(255,255,255,0.6)', lineHeight: 1.5, fontWeight: 300 }}>
                                {stage.desc}...
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* The "Precision Bar" */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)', fontFamily: 'var(--font-mono)' }}>
                        <span>BUILDING</span>
                        <span style={{ color: '#ffffff' }}>{effectiveProgress.toFixed(1)}%</span>
                    </div>

                    <div style={{
                        width: '100%',
                        height: '4px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderRadius: '4px',
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
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.5), #ffffff)',
                                borderRadius: '4px',
                                boxShadow: '0 0 10px rgba(255,255,255,0.2)'
                            }}
                        />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
