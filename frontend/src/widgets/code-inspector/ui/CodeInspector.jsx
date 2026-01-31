import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Code, GitCommit, FileCode, Layers, Activity, AlertTriangle } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function CodeInspector() {
    const { selectedBuilding, clearSelection, graphNeighbors } = useStore()

    if (!selectedBuilding) return null

    const { metrics, name, path, language } = selectedBuilding

    // Calculate a rough "Health Score"
    const complexityScore = Math.min(100, metrics.complexity * 5)
    const churnScore = Math.min(100, metrics.churn * 2)
    const healthScore = Math.max(0, 100 - (complexityScore * 0.4 + churnScore * 0.6)).toFixed(0)

    const getHealthColor = (score) => {
        if (score > 80) return '#4ade80' // Green
        if (score > 50) return '#facc15' // Yellow
        return '#f43f5e' // Red
    }

    return (
        <motion.div
            initial={{ x: 100, opacity: 0 }}
            animate={{ x: 0, opacity: 1 }}
            exit={{ x: 100, opacity: 0 }}
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            style={{
                position: 'fixed',
                top: '90px',
                right: '24px',
                width: '320px',
                background: 'var(--glass-surface)',
                backdropFilter: 'var(--glass-backdrop)',
                WebkitBackdropFilter: 'var(--glass-backdrop)',
                border: '1px solid var(--glass-border)',
                borderRadius: '16px',
                boxShadow: '0 20px 40px rgba(0,0,0,0.3)',
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1500,
                color: 'white',
                fontFamily: 'var(--font-sans)',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start'
            }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255,255,255,0.5)',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        marginBottom: '4px',
                        display: 'flex', alignItems: 'center', gap: '6px'
                    }}>
                        <FileCode size={12} /> {language}
                    </div>
                    <div style={{
                        fontSize: '1.1rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {name}
                    </div>
                    <div style={{
                        fontSize: '0.8rem',
                        color: 'rgba(255,255,255,0.4)',
                        marginTop: '2px',
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis'
                    }}>
                        {path}
                    </div>
                </div>
                <button
                    onClick={clearSelection}
                    style={{
                        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', padding: '4px'
                    }}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '24px' }}>

                {/* Health Score */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{ position: 'relative', width: '60px', height: '60px' }}>
                        <svg width="60" height="60" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255,255,255,0.1)" strokeWidth="10" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke={getHealthColor(healthScore)} strokeWidth="10"
                                strokeDasharray={`${healthScore * 2.8} 280`} strokeLinecap="round" transform="rotate(-90 50 50)" />
                        </svg>
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '1.2rem', color: getHealthColor(healthScore)
                        }}>
                            {healthScore}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: '#e4e4e7' }}>Health Score</div>
                        <div style={{ fontSize: '0.8rem', color: '#a1a1aa' }}>Based on complexity & churn</div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                    <MetricCard icon={<Code size={16} />} label="LOC" value={metrics.loc} color="#38bdf8" />
                    <MetricCard icon={<Activity size={16} />} label="Complexity" value={metrics.complexity} color="#f472b6" />
                    <MetricCard icon={<GitCommit size={16} />} label="Churn" value={metrics.churn} color="#fbbf24" />
                    <MetricCard icon={<Layers size={16} />} label="Dependencies" value={graphNeighbors.dependencies.length} color="#c084fc" />
                </div>

                {/* Dependency Flow */}
                <div style={{
                    background: 'rgba(0,0,0,0.2)',
                    borderRadius: '12px',
                    padding: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{ fontSize: '0.8rem', fontWeight: 600, color: '#a1a1aa', marginBottom: '8px' }}>
                        DEPENDENCY FLOW
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ff0055' }}>
                                {graphNeighbors.dependents.length}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Incoming</div>
                        </div>
                        <div style={{ height: '1px', flex: 1, background: 'rgba(255,255,255,0.1)', margin: '0 12px' }} />
                        <div style={{ textAlign: 'center' }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#00f2ff' }}>
                                {graphNeighbors.dependencies.length}
                            </div>
                            <div style={{ fontSize: '0.7rem', color: '#a1a1aa' }}>Outgoing</div>
                        </div>
                    </div>
                </div>

                {/* VS Code Button */}
                <button style={{
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(255,255,255,0.1)',
                    padding: '10px',
                    borderRadius: '8px',
                    color: 'white',
                    fontWeight: 600,
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'background 0.2s'
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.2)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                >
                    <Code size={16} /> Open in Editor
                </button>

            </div>
        </motion.div>
    )
}

function MetricCard({ icon, label, value, color }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            padding: '10px',
            display: 'flex', flexDirection: 'column', gap: '4px',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: color, fontSize: '0.75rem' }}>
                {icon} <span style={{ opacity: 0.8 }}>{label}</span>
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600 }}>{value}</div>
        </div>
    )
}
