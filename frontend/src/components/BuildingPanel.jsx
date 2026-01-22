/**
 * BuildingPanel.jsx
 *
 * Stable, fixed-position details panel.
 * Replaces floating behavior to ensure usability.
 */
import React from 'react'
import useStore from '../store/useStore'
import { detectPattern } from './BuildingLabel'
import FileInsights from './FileInsights'
import { X, FileText, Code, Layers, GitCommit, Copy, ExternalLink, Activity } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/ProfessionalUI.css'

export default function BuildingPanel({ building }) {
    const { clearSelection } = useStore()

    if (!building) return null

    const { metrics, name, path, is_hotspot, decay_level, language } = building
    const healthScore = calculateHealthScore(metrics, decay_level, is_hotspot)
    const healthColor = healthScore >= 70 ? 'var(--color-success)' :
        healthScore >= 40 ? 'var(--color-warning)' :
            'var(--color-error)'

    const pattern = detectPattern(building)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ type: 'spring', stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed',
                    top: '80px',
                    left: '24px',
                    width: '320px',
                    maxHeight: 'calc(100vh - 100px)',
                    zIndex: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(20, 20, 23, 0.85)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '16px',
                    boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div className="p-panel-header" style={{ background: 'transparent', borderBottom: '1px solid rgba(255,255,255,0.06)' }}>
                    <div className="p-panel-title">
                        <FileText size={16} color="var(--color-accent)" />
                        <span className="truncate" style={{ maxWidth: '200px', fontWeight: 600 }} title={name}>{name}</span>
                    </div>
                    <button className="p-icon-btn" onClick={clearSelection}>
                        <X size={16} />
                    </button>
                </div>

                {/* Scrollable Content */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

                    {/* Path & Tags */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            fontSize: '0.75rem',
                            color: 'var(--color-text-tertiary)',
                            marginBottom: '12px',
                            wordBreak: 'break-all',
                            fontFamily: 'var(--font-mono)',
                            lineHeight: '1.4'
                        }}>
                            {path}
                        </div>
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                            <span className="p-tag p-tag-default" style={{ fontFamily: 'var(--font-mono)' }}>
                                {language || 'text'}
                            </span>
                            {is_hotspot && <span className="p-tag p-tag-red">Hotspot</span>}
                            {decay_level > 0.6 && <span className="p-tag p-tag-yellow">Legacy</span>}
                            {pattern && (
                                <span className="p-tag p-tag-blue">
                                    {pattern.label}
                                </span>
                            )}
                        </div>
                    </div>

                    {/* Metrics Grid */}
                    <div className="p-grid-2" style={{ marginBottom: '24px' }}>
                        <MetricCard
                            label="Health"
                            value={healthScore}
                            color={healthColor}
                            isBig
                        />
                        <MetricCard
                            label="Complexity"
                            value={metrics.complexity}
                            icon={<Code size={14} />}
                        />
                        <MetricCard
                            label="LOC"
                            value={metrics.loc}
                            icon={<Layers size={14} />}
                        />
                        <MetricCard
                            label="Churn"
                            value={metrics.churn}
                            icon={<GitCommit size={14} />}
                        />
                    </div>

                    {/* Bars */}
                    <div style={{ marginBottom: '24px', display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        <ProgressBar
                            label="Complexity Impact"
                            value={metrics.complexity}
                            max={30}
                            color={metrics.complexity > 20 ? 'var(--color-error)' : 'var(--color-accent)'}
                        />
                        <ProgressBar
                            label="Churn Frequency"
                            value={metrics.churn}
                            max={20}
                            color={metrics.churn > 15 ? 'var(--color-warning)' : 'var(--color-info)'}
                        />
                    </div>

                    {/* Insights */}
                    <div style={{ marginBottom: '24px' }}>
                        <div className="p-sidebar-section-title">Analysis</div>
                        <FileInsights file={building} />
                    </div>

                    {/* Actions */}
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginTop: 'auto' }}>
                        <button
                            className="p-btn p-btn-secondary"
                            onClick={() => navigator.clipboard.writeText(path)}
                            style={{ fontSize: '0.8rem' }}
                        >
                            <Copy size={14} />
                            Copy Path
                        </button>
                        <button
                            className="p-btn p-btn-primary"
                            onClick={() => window.open(`vscode://file/${path}`, '_blank')}
                            style={{ fontSize: '0.8rem' }}
                        >
                            <ExternalLink size={14} />
                            Open
                        </button>
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

function MetricCard({ label, value, color, icon, isBig }) {
    return (
        <div style={{
            padding: isBig ? '16px' : '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '12px',
            border: '1px solid rgba(255,255,255,0.05)',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'space-between',
            height: isBig ? 'auto' : '80px'
        }}>
            <div style={{
                fontSize: '0.7rem',
                color: 'var(--color-text-tertiary)',
                marginBottom: '4px',
                display: 'flex', alignItems: 'center', gap: '6px',
                textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 600
            }}>
                {icon}
                {label}
            </div>
            <div style={{
                fontSize: isBig ? '2rem' : '1.25rem',
                fontWeight: 700,
                color: color || 'white',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1
            }}>
                {value}
            </div>
        </div>
    )
}

function ProgressBar({ label, value, max, color }) {
    const percentage = Math.min(100, (value / max) * 100)
    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px', fontSize: '0.75rem' }}>
                <span style={{ color: 'var(--color-text-secondary)' }}>{label}</span>
                <span style={{ fontFamily: 'var(--font-mono)', opacity: 0.7 }}>{value}/{max}</span>
            </div>
            <div style={{
                height: '4px',
                background: 'rgba(255,255,255,0.05)',
                borderRadius: '2px',
                overflow: 'hidden'
            }}>
                <div style={{
                    height: '100%',
                    width: `${percentage}%`,
                    background: color,
                    borderRadius: '2px',
                    transition: 'width 0.5s cubic-bezier(0.2, 0, 0, 1)'
                }} />
            </div>
        </div>
    )
}

function calculateHealthScore(metrics, decay, isHotspot) {
    let score = 100
    if (metrics.complexity > 25) score -= 30
    else if (metrics.complexity > 15) score -= 20
    else if (metrics.complexity > 10) score -= 10
    if (metrics.churn > 15) score -= 20
    else if (metrics.churn > 8) score -= 10
    if (decay > 0.8) score -= 15
    else if (decay > 0.5) score -= 8
    if (metrics.dependencies_in > 20) score -= 15
    else if (metrics.dependencies_in > 10) score -= 8
    if (isHotspot) score -= 20
    return Math.max(0, score)
}
