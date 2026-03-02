import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'

// --- CONSTANTS ---
const TEXT_SEQUENCE = [
    "INITIALIZING_WORKSPACE",
    "CONNECTING_TO_MAIN_FRAME",
    "PARSING_AST_NODES",
    "BUILDING_DEPENDENCY_GRAPH",
    "CALCULATING_METRICS",
    "RENDERING_VIRTUAL_CITY",
    "SYSTEM_READY"
]

export default function CityBuilderLoader() {
    const { analysisProgress } = useStore()
    const [simulatedProgress, setSimulatedProgress] = useState(0)

    // Simulate progress while backend is blocking
    useEffect(() => {
        if (analysisProgress >= 80) return

        const interval = setInterval(() => {
            setSimulatedProgress(p => {
                // Slow down dramatically as we get closer to the fake limit
                const increment = p > 65 ? 0.2 : p > 40 ? 0.8 : 2;
                return Math.min(p + increment, 78)
            })
        }, 500)
        return () => clearInterval(interval)
    }, [analysisProgress])

    const effectiveProgress = Math.max(analysisProgress || 0, simulatedProgress)

    const currentStage = Math.min(
        Math.floor(effectiveProgress / (100 / TEXT_SEQUENCE.length)),
        TEXT_SEQUENCE.length - 1
    )

    const text = TEXT_SEQUENCE[currentStage] || TEXT_SEQUENCE[0]

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
                background: '#050508',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                color: '#fff',
                overflow: 'hidden'
            }}
        >
            {/* Elegant Background Glow */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '800px',
                height: '800px',
                background: 'radial-gradient(circle, rgba(255,255,255,0.03) 0%, rgba(5,5,8,0) 60%)',
                pointerEvents: 'none',
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '320px', zIndex: 1 }}>

                {/* Ultra-stark typographic status */}
                <div style={{ height: '32px', position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={text}
                            initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                            exit={{ opacity: 0, filter: 'blur(8px)', scale: 1.02 }}
                            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                color: '#ffffff',
                                fontSize: '0.85rem',
                                fontFamily: 'var(--font-mono)',
                                letterSpacing: '0.2em',
                                position: 'absolute',
                                whiteSpace: 'nowrap',
                                textTransform: 'uppercase'
                            }}
                        >
                            {text}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Ultra-sleek Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '1px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '16px'
                }}>
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${effectiveProgress}%` }}
                        transition={{ ease: "easeOut", duration: 0.5 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            background: '#ffffff',
                            boxShadow: '0 0 10px rgba(255,255,255,1)'
                        }}
                    />
                </div>

                <div style={{
                    color: 'rgba(255, 255, 255, 0.3)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.65rem',
                    letterSpacing: '0.25em'
                }}>
                    {String(Math.round(effectiveProgress)).padStart(2, '0')}%
                </div>
            </div>
        </motion.div>
    )
}
