import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'
import { Loader2, Server, FolderTree, Cpu, ScanLine } from 'lucide-react'

// Realistic loading stages that map to the actual analyzer backend
const STAGES = [
    { threshold: 0, icon: Server, text: "Connecting to local workspace..." },
    { threshold: 20, icon: FolderTree, text: "Parsing repository structure..." },
    { threshold: 45, icon: ScanLine, text: "Constructing abstract syntax trees..." },
    { threshold: 70, icon: Cpu, text: "Analyzing architectural complexity..." },
    { threshold: 90, icon: Server, text: "Formatting 3D geometry engine..." }
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
        }, 300)
        return () => clearInterval(interval)
    }, [analysisProgress])

    const effectiveProgress = Math.max(analysisProgress || 0, simulatedProgress)

    // Determine active stage
    let currentStage = STAGES[0]
    for (const stage of STAGES) {
        if (effectiveProgress >= stage.threshold) {
            currentStage = stage
        }
    }
    const Icon = currentStage.icon

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#050508', // Match the main background
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                color: '#fff'
            }}
        >
            {/* Vercel/Linear style loading card */}
            <motion.div
                initial={{ scale: 0.95, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                transition={{ duration: 0.4, delay: 0.1, ease: [0.16, 1, 0.3, 1] }}
                style={{
                    width: '100%',
                    maxWidth: '420px',
                    background: '#09090b', // Zinc 950
                    border: '1px solid #27272a', // Zinc 800
                    borderRadius: '16px',
                    padding: '32px',
                    boxShadow: '0 24px 48px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '40px', height: '40px', borderRadius: '10px', background: '#18181b', // Zinc 900
                        border: '1px solid #27272a', display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <motion.div animate={{ rotate: 360 }} transition={{ repeat: Infinity, duration: 2, ease: "linear" }}>
                            <Loader2 size={20} color="#a1a1aa" />
                        </motion.div>
                    </div>
                    <div>
                        <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 600, color: '#f4f4f5', letterSpacing: '-0.01em' }}>
                            Synthesizing Codebase
                        </h2>
                        <p style={{ margin: 0, fontSize: '0.85rem', color: '#a1a1aa', marginTop: '2px' }}>
                            This might take a few seconds.
                        </p>
                    </div>
                </div>

                {/* Progress Details */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '0.85rem' }}>
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={currentStage.text}
                                initial={{ opacity: 0, y: 5 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -5 }}
                                transition={{ duration: 0.2 }}
                                style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#e4e4e7' }}
                            >
                                <Icon size={14} color="#a1a1aa" />
                                {currentStage.text}
                            </motion.div>
                        </AnimatePresence>
                        <span style={{ color: '#71717a', fontFamily: 'var(--font-mono)' }}>
                            {Math.round(effectiveProgress)}%
                        </span>
                    </div>

                    {/* Linear/Standard Progress Bar */}
                    <div style={{
                        width: '100%', height: '4px', background: '#18181b', // Zinc 900
                        borderRadius: '2px', overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: `${effectiveProgress}%` }}
                            transition={{ ease: "easeOut", duration: 0.3 }}
                            style={{ height: '100%', background: '#ffffff', borderRadius: '2px' }}
                        />
                    </div>
                </div>
            </motion.div>
        </motion.div>
    )
}
