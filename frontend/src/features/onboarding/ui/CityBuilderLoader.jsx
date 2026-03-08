import React, { useState, useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { Hexagon, Cpu, Network, Layers, Activity, Box, Sparkles, FileCode, GitBranch } from 'lucide-react'
import useStore from '../../../store/useStore'

// --- High-Concept Sequence ---
const SEQUENCE = [
    { icon: <Cpu />, code: "SYS.INIT", desc: "Initializing analysis pipeline", detail: "Setting up parsers and resolvers", delay: 0 },
    { icon: <Network />, code: "NET.LINK", desc: "Scanning filesystem structure", detail: "Mapping directories and entry points", delay: 12 },
    { icon: <FileCode />, code: "FILE.SCN", desc: "Parsing source files", detail: "Extracting imports, classes, and functions", delay: 25 },
    { icon: <Hexagon />, code: "AST.PRSE", desc: "Building abstract syntax trees", detail: "Resolving cross-file dependencies", delay: 40 },
    { icon: <Layers />, code: "GRPH.BLD", desc: "Detecting architectural clusters", detail: "Running community detection on the graph", delay: 55 },
    { icon: <Activity />, code: "MTRC.CLC", desc: "Computing code metrics", detail: "Complexity, coupling, and cohesion scores", delay: 70 },
    { icon: <GitBranch />, code: "GIT.HST", desc: "Analyzing version history", detail: "Churn, hotspots, and author mapping", delay: 82 },
    { icon: <Box />, code: "CITY.GEN", desc: "Generating 3D city layout", detail: "Spiral treemap packing with grid alignment", delay: 92 },
    { icon: <Sparkles />, code: "SYS.RDY", desc: "Virtual city online", detail: "Rendering complete", delay: 98 },
]

// Fun facts shown during longer waits
const FACTS = [
    "Buildings are sized by lines of code — taller means more complex.",
    "Districts group files by dependency coupling, not just folders.",
    "Glowing buildings are hotspots — high churn + high complexity.",
    "Roads represent import relationships between modules.",
    "The spiral layout packs districts compactly around the center.",
    "Red buildings have high technical debt. Green means healthy.",
    "You can time-travel the city to see how architecture evolved.",
    "The AI Architect can explain any building's purpose.",
]

export default function CityBuilderLoader() {
    const { analysisProgress } = useStore()
    const [simulatedProgress, setSimulatedProgress] = useState(0)
    const [elapsedSec, setElapsedSec] = useState(0)
    const [factIndex, setFactIndex] = useState(0)
    const [fileCount, setFileCount] = useState(0)
    const startTime = useRef(Date.now())

    // Simulate progress while waiting for backend
    useEffect(() => {
        if (analysisProgress >= 80) return

        const interval = setInterval(() => {
            setSimulatedProgress(p => {
                const increment = p > 60 ? 0.15 : p > 30 ? 0.6 : 1.2
                return Math.min(p + increment, 85)
            })
        }, 300)
        return () => clearInterval(interval)
    }, [analysisProgress])

    // Elapsed timer
    useEffect(() => {
        const timer = setInterval(() => {
            setElapsedSec(Math.floor((Date.now() - startTime.current) / 1000))
        }, 1000)
        return () => clearInterval(timer)
    }, [])

    // Rotate fun facts every 6s
    useEffect(() => {
        const timer = setInterval(() => {
            setFactIndex(i => (i + 1) % FACTS.length)
        }, 6000)
        return () => clearInterval(timer)
    }, [])

    // Simulated file counter that ramps up with progress
    useEffect(() => {
        const targetFiles = Math.floor(effectiveProgressCalc() * 8)
        const timer = setInterval(() => {
            setFileCount(c => c < targetFiles ? c + 1 : c)
        }, 80)
        return () => clearInterval(timer)
    }, [analysisProgress, simulatedProgress])

    function effectiveProgressCalc() {
        return Math.max(analysisProgress || 0, simulatedProgress)
    }

    const effectiveProgress = effectiveProgressCalc()

    // Determine active stage
    let currentStageIndex = 0
    for (let i = 0; i < SEQUENCE.length; i++) {
        if (effectiveProgress >= SEQUENCE[i].delay) {
            currentStageIndex = i
        }
    }

    const stage = SEQUENCE[currentStageIndex]
    const minutes = Math.floor(elapsedSec / 60)
    const seconds = elapsedSec % 60

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
                background: 'rgba(5, 5, 5, 0.65)',
                backdropFilter: 'blur(24px)',
                WebkitBackdropFilter: 'blur(24px)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                color: '#ffffff',
                overflow: 'hidden',
            }}
        >
            <motion.div
                initial={{ opacity: 0, scale: 0.96, y: 10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                transition={{ duration: 1.0, ease: [0.16, 1, 0.3, 1], delay: 0.1 }}
                style={{
                    width: '100%',
                    maxWidth: '500px',
                    padding: '36px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '28px',
                    background: 'rgba(255, 255, 255, 0.02)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    borderRadius: '24px',
                    boxShadow: '0 20px 60px rgba(0,0,0,0.5), inset 0 1px 0 rgba(255,255,255,0.08)',
                }}
            >
                {/* Header */}
                <div style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    paddingBottom: '16px',
                }}>
                    <div style={{ fontSize: '0.7rem', letterSpacing: '0.15em', color: 'rgba(255,255,255,0.45)', textTransform: 'uppercase', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Box size={13} />
                        Building Your City
                    </div>
                    <div style={{ fontSize: '0.7rem', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.3)' }}>
                        {minutes > 0 ? `${minutes}m ` : ''}{seconds}s
                    </div>
                </div>

                {/* Active stage — animated transition */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px', minHeight: '90px', justifyContent: 'center' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={stage.code}
                            initial={{ opacity: 0, y: 12, filter: 'blur(4px)' }}
                            animate={{ opacity: 1, y: 0, filter: 'blur(0px)' }}
                            exit={{ opacity: 0, y: -10, filter: 'blur(4px)' }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                <motion.div
                                    animate={{ rotate: [0, 5, -5, 0] }}
                                    transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut' }}
                                    style={{
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        width: '34px', height: '34px', borderRadius: '10px',
                                        background: 'rgba(255,255,255,0.08)', border: '1px solid rgba(255,255,255,0.08)',
                                    }}
                                >
                                    {React.cloneElement(stage.icon, { size: 16 })}
                                </motion.div>
                                <div>
                                    <span style={{ fontSize: '0.65rem', fontFamily: 'var(--font-mono)', color: 'rgba(255,255,255,0.35)', letterSpacing: '0.1em' }}>
                                        {stage.code}
                                    </span>
                                    <div style={{ fontSize: '1.1rem', fontWeight: 500, letterSpacing: '-0.02em', color: '#fff', lineHeight: 1.3 }}>
                                        {stage.desc}
                                    </div>
                                </div>
                            </div>
                            <span style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.4)', lineHeight: 1.4, fontWeight: 300, paddingLeft: '46px' }}>
                                {stage.detail}
                            </span>
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Progress bar */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.7rem', color: 'rgba(255,255,255,0.35)', fontFamily: 'var(--font-mono)' }}>
                        <span>{fileCount > 0 ? `${fileCount} files processed` : 'BUILDING'}</span>
                        <span style={{ color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{effectiveProgress.toFixed(0)}%</span>
                    </div>

                    <div style={{
                        width: '100%', height: '4px',
                        background: 'rgba(255, 255, 255, 0.04)',
                        borderRadius: '4px', position: 'relative', overflow: 'hidden',
                    }}>
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: `${effectiveProgress}%` }}
                            transition={{ ease: 'easeOut', duration: 0.4 }}
                            style={{
                                position: 'absolute', top: 0, left: 0, height: '100%',
                                background: 'linear-gradient(90deg, rgba(255,255,255,0.4), #ffffff)',
                                borderRadius: '4px',
                                boxShadow: '0 0 12px rgba(255,255,255,0.15)',
                            }}
                        />
                        {/* Shimmer pulse on the bar */}
                        <motion.div
                            animate={{ x: ['-100%', '200%'] }}
                            transition={{ duration: 2, repeat: Infinity, ease: 'easeInOut', repeatDelay: 1 }}
                            style={{
                                position: 'absolute', top: 0, left: 0, width: '30%', height: '100%',
                                background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)',
                                borderRadius: '4px',
                            }}
                        />
                    </div>

                    {/* Stage dots */}
                    <div style={{ display: 'flex', gap: '4px', justifyContent: 'center', paddingTop: '4px' }}>
                        {SEQUENCE.map((s, i) => (
                            <motion.div
                                key={i}
                                animate={{
                                    background: i <= currentStageIndex ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.08)',
                                    scale: i === currentStageIndex ? 1.4 : 1,
                                }}
                                transition={{ duration: 0.3 }}
                                style={{
                                    width: 4, height: 4, borderRadius: '50%',
                                    background: 'rgba(255,255,255,0.08)',
                                }}
                            />
                        ))}
                    </div>
                </div>

                {/* Fun fact — rotates to keep users engaged during long waits */}
                <AnimatePresence mode="wait">
                    <motion.div
                        key={factIndex}
                        initial={{ opacity: 0, y: 6 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -6 }}
                        transition={{ duration: 0.4 }}
                        style={{
                            fontSize: '0.72rem',
                            color: 'rgba(255,255,255,0.25)',
                            textAlign: 'center',
                            lineHeight: 1.5,
                            fontStyle: 'italic',
                            padding: '0 8px',
                            borderTop: '1px solid rgba(255,255,255,0.03)',
                            paddingTop: '14px',
                        }}
                    >
                        {FACTS[factIndex]}
                    </motion.div>
                </AnimatePresence>
            </motion.div>
        </motion.div>
    )
}
