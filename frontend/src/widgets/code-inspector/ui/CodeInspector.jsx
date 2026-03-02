import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Code, GitCommit, FileCode, Layers, Activity, AlertTriangle, ScanEye } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function CodeInspector() {
    const {
        selectedBuilding, clearSelection, graphNeighbors,
        fetchImpactAnalysis, activeIntelligencePanel, setActiveIntelligencePanel, intelligenceLoading
    } = useStore()

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
                background: 'rgba(5, 10, 20, 0.8)',
                backdropFilter: 'blur(16px)',
                WebkitBackdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.3)',
                boxShadow: '0 0 40px rgba(255, 255, 255, 0.05) inset, 0 20px 40px rgba(0,0,0,0.8)',
                borderRadius: '8px', // Sharper corners for tech look
                display: 'flex',
                flexDirection: 'column',
                zIndex: 1500,
                color: 'white',
                fontFamily: '"Fira Code", monospace, var(--font-sans)',
                overflow: 'hidden'
            }}
        >
            {/* Header */}
            <div style={{
                padding: '16px',
                background: 'linear-gradient(90deg, rgba(255, 255, 255,0.1), transparent)',
                borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'start'
            }}>
                <div style={{ flex: 1, overflow: 'hidden' }}>
                    <div style={{
                        fontSize: '0.65rem',
                        color: '#ffffff',
                        textTransform: 'uppercase',
                        letterSpacing: '2px',
                        marginBottom: '8px',
                        display: 'flex', alignItems: 'center', gap: '6px',
                        opacity: 0.9
                    }}>
                        <Code size={12} /> Deep Dive Inspection
                    </div>
                    <div style={{
                        fontSize: '1rem',
                        fontWeight: 700,
                        whiteSpace: 'nowrap',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        color: '#fff',
                        textShadow: '0 0 10px rgba(255, 255, 255,0.4)',
                        fontFamily: 'var(--font-sans)'
                    }}>
                        {name}
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        color: 'rgba(255, 255, 255,0.6)',
                        marginTop: '4px',
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
                        background: 'transparent', border: 'none', color: '#ffffff',
                        cursor: 'pointer', padding: '4px', opacity: 0.7
                    }}
                    onMouseEnter={e => e.currentTarget.style.opacity = '1'}
                    onMouseLeave={e => e.currentTarget.style.opacity = '0.7'}
                >
                    <X size={20} />
                </button>
            </div>

            {/* Content */}
            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                {/* Health Score HUD */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    padding: '12px', background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)', borderRadius: '6px'
                }}>
                    <div style={{ position: 'relative', width: '50px', height: '50px' }}>
                        <svg width="50" height="50" viewBox="0 0 100 100">
                            <circle cx="50" cy="50" r="45" fill="none" stroke="rgba(255, 255, 255,0.1)" strokeWidth="8" />
                            <circle cx="50" cy="50" r="45" fill="none" stroke={getHealthColor(healthScore)} strokeWidth="8"
                                strokeDasharray={`${healthScore * 2.8} 280`} strokeLinecap="square" transform="rotate(-90 50 50)"
                                style={{ filter: `drop-shadow(0 0 4px ${getHealthColor(healthScore)})` }} />
                        </svg>
                        <div style={{
                            position: 'absolute', inset: 0,
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontWeight: 'bold', fontSize: '1.1rem', color: getHealthColor(healthScore),
                            textShadow: `0 0 10px ${getHealthColor(healthScore)}`
                        }}>
                            {healthScore}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontWeight: 600, color: '#ffffff', fontSize: '0.8rem', letterSpacing: '1px' }}>SYSTEM HEALTH</div>
                        <div style={{ fontSize: '0.7rem', color: 'rgba(255, 255, 255,0.5)', marginTop: '2px' }}>Complexity / Churn Ratio</div>
                    </div>
                </div>

                {/* Metrics Grid */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                    <MetricCard label="LINES" value={metrics.loc} />
                    <MetricCard label="COMPLEX" value={metrics.complexity} />
                    <MetricCard label="CHURN" value={metrics.churn} />
                    <MetricCard label="DEPENDS" value={graphNeighbors.dependencies.length} />
                </div>

                {/* Dependency Flow HUD */}
                <div style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    borderRadius: '6px',
                    padding: '12px',
                    position: 'relative'
                }}>
                    {/* Decorative HUD corners */}
                    <div style={{ position: 'absolute', top: '-1px', left: '-1px', width: '4px', height: '4px', background: '#ffffff' }} />
                    <div style={{ position: 'absolute', top: '-1px', right: '-1px', width: '4px', height: '4px', background: '#ffffff' }} />
                    <div style={{ position: 'absolute', bottom: '-1px', left: '-1px', width: '4px', height: '4px', background: '#ffffff' }} />
                    <div style={{ position: 'absolute', bottom: '-1px', right: '-1px', width: '4px', height: '4px', background: '#ffffff' }} />

                    <div style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255,0.8)', letterSpacing: '1px', marginBottom: '12px' }}>
                        DATA TRACING
                    </div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ff0055', textShadow: '0 0 10px rgba(255,0,85,0.5)' }}>
                                {graphNeighbors.dependents.length}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>INBOUND</div>
                        </div>
                        <div style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div style={{ width: '100%', height: '1px', background: 'linear-gradient(90deg, #ff0055, #ffffff)', opacity: 0.5 }} />
                        </div>
                        <div style={{ textAlign: 'center', flex: 1 }}>
                            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: '#ffffff', textShadow: '0 0 10px rgba(255, 255, 255,0.5)' }}>
                                {graphNeighbors.dependencies.length}
                            </div>
                            <div style={{ fontSize: '0.6rem', color: 'rgba(255,255,255,0.5)' }}>OUTBOUND</div>
                        </div>
                    </div>
                </div>

                {/* Intelligence Actions Row */}
                <div style={{ display: 'flex', gap: '8px', width: '100%' }}>
                    {/* X-Ray */}
                    <button
                        onClick={() => setActiveIntelligencePanel(activeIntelligencePanel === 'xray' ? null : 'xray')}
                        style={{
                            flex: 1,
                            background: activeIntelligencePanel === 'xray' ? 'rgba(255, 255, 255, 0.2)' : 'transparent',
                            border: `1px solid ${activeIntelligencePanel === 'xray' ? '#ffffff' : 'rgba(255, 255, 255,0.2)'}`,
                            padding: '10px',
                            borderRadius: '4px',
                            color: activeIntelligencePanel === 'xray' ? '#fff' : '#ffffff',
                            fontSize: '0.75rem',
                            letterSpacing: '1px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: activeIntelligencePanel === 'xray' ? '0 0 15px rgba(255, 255, 255, 0.4)' : 'none'
                        }}
                        onMouseEnter={e => { if (activeIntelligencePanel !== 'xray') e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)' }}
                        onMouseLeave={e => { if (activeIntelligencePanel !== 'xray') e.currentTarget.style.background = 'transparent' }}
                    >
                        <ScanEye size={14} /> X-RAY
                    </button>

                    {/* Blast Radius */}
                    <button
                        onClick={() => {
                            if (activeIntelligencePanel === 'impact') {
                                setActiveIntelligencePanel(null)
                            } else {
                                setActiveIntelligencePanel('impact')
                                fetchImpactAnalysis(selectedBuilding.id)
                            }
                        }}
                        style={{
                            flex: 1,
                            background: activeIntelligencePanel === 'impact' ? 'rgba(255, 0, 85, 0.2)' : 'transparent',
                            border: `1px solid ${activeIntelligencePanel === 'impact' ? '#ff0055' : 'rgba(255,0,85,0.2)'}`,
                            padding: '10px',
                            borderRadius: '4px',
                            color: activeIntelligencePanel === 'impact' ? '#fff' : '#ff0055',
                            fontSize: '0.75rem',
                            letterSpacing: '1px',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                            transition: 'all 0.2s',
                            boxShadow: activeIntelligencePanel === 'impact' ? '0 0 15px rgba(255, 0, 85, 0.4)' : 'none'
                        }}
                        onMouseEnter={e => { if (activeIntelligencePanel !== 'impact') e.currentTarget.style.background = 'rgba(255, 0, 85, 0.1)' }}
                        onMouseLeave={e => { if (activeIntelligencePanel !== 'impact') e.currentTarget.style.background = 'transparent' }}
                    >
                        <AlertTriangle size={14} /> IMPACT
                    </button>
                </div>

                {/* VS Code Button */}
                <button style={{
                    background: 'transparent',
                    border: '1px solid rgba(255, 255, 255, 0.2)',
                    padding: '10px',
                    borderRadius: '4px',
                    color: '#ffffff',
                    fontSize: '0.75rem',
                    letterSpacing: '1px',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                    transition: 'all 0.2s'
                }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                    <FileCode size={14} /> VIEW SOURCE
                </button>

            </div>
        </motion.div>
    )
}

function MetricCard({ label, value }) {
    return (
        <div style={{
            background: 'transparent',
            padding: '8px',
            display: 'flex', flexDirection: 'column', gap: '2px',
            borderLeft: '2px solid rgba(255, 255, 255, 0.3)'
        }}>
            <div style={{ color: 'rgba(255, 255, 255,0.6)', fontSize: '0.6rem', letterSpacing: '1px' }}>
                {label}
            </div>
            <div style={{ fontSize: '1.1rem', fontWeight: 600, color: '#fff', textShadow: '0 0 5px rgba(255, 255, 255,0.3)' }}>
                {value}
            </div>
        </div>
    )
}
