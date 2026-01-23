/**
 * BuildingPanel.jsx
 *
 * Premium, world-class file details panel.
 * Features: Glassmorphism, gradient cards, animated bars, refined typography.
 */
import React from 'react'
import useStore from '../store/useStore'
import { detectPattern } from './BuildingLabel'
import FileInsights from './FileInsights'
import { X, FileCode2, Code, Layers, GitCommit, Copy, ExternalLink, Sparkles, AlertTriangle } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import '../styles/ProfessionalUI.css'

export default function BuildingPanel({ building }) {
    const { clearSelection } = useStore()

    if (!building) return null

    const { metrics, name, path, is_hotspot, decay_level, language } = building
    const healthScore = calculateHealthScore(metrics, decay_level, is_hotspot)
    const healthGradient = healthScore >= 70
        ? 'linear-gradient(135deg, #10b981, #059669)'
        : healthScore >= 40
            ? 'linear-gradient(135deg, #f59e0b, #d97706)'
            : 'linear-gradient(135deg, #ef4444, #dc2626)'

    const pattern = detectPattern(building)

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, x: -24, scale: 0.98 }}
                animate={{ opacity: 1, x: 0, scale: 1 }}
                exit={{ opacity: 0, x: -24, scale: 0.98 }}
                transition={{ type: 'spring', stiffness: 400, damping: 35 }}
                style={{
                    position: 'fixed',
                    top: '80px',
                    left: '24px',
                    width: '340px',
                    maxHeight: 'calc(100vh - 120px)',
                    zIndex: 600,
                    display: 'flex',
                    flexDirection: 'column',
                    background: 'rgba(12, 12, 14, 0.92)',
                    backdropFilter: 'blur(48px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(48px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.06)',
                    borderRadius: '20px',
                    boxShadow: '0 32px 64px -16px rgba(0, 0, 0, 0.65), 0 0 0 1px rgba(255,255,255,0.05) inset',
                    overflow: 'hidden'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px 20px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    borderBottom: '1px solid rgba(255,255,255,0.04)',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1, minWidth: 0 }}>
                        <div style={{
                            width: '36px',
                            height: '36px',
                            borderRadius: '10px',
                            background: 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                        }}>
                            <FileCode2 size={18} color="white" />
                        </div>
                        <span style={{
                            fontWeight: 600,
                            fontSize: '0.95rem',
                            color: 'white',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }} title={name}>
                            {name}
                        </span>
                    </div>
                    <motion.button
                        whileHover={{ scale: 1.1, backgroundColor: 'rgba(255,255,255,0.1)' }}
                        whileTap={{ scale: 0.95 }}
                        onClick={clearSelection}
                        style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '8px',
                            border: 'none',
                            background: 'transparent',
                            color: 'rgba(255,255,255,0.5)',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <X size={16} />
                    </motion.button>
                </div>

                {/* Scrollable Content */}
                <div style={{ padding: '20px', overflowY: 'auto', flex: 1 }}>

                    {/* Tags Row */}
                    <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginBottom: '20px' }}>
                        <Tag text={language || 'text'} variant="default" />
                        {is_hotspot && <Tag text="Hotspot" variant="danger" icon={<AlertTriangle size={11} />} />}
                        {decay_level > 0.6 && <Tag text="Legacy" variant="warning" />}
                        {pattern && <Tag text={pattern.label} variant="info" icon={<Sparkles size={11} />} />}
                    </div>

                    {/* Metrics Grid - Premium Cards */}
                    <div style={{
                        display: 'grid',
                        gridTemplateColumns: 'repeat(2, 1fr)',
                        gap: '12px',
                        marginBottom: '24px'
                    }}>
                        <MetricCard
                            label="LOC"
                            value={metrics.loc}
                            icon={<Layers size={14} />}
                            gradient="linear-gradient(135deg, rgba(99,102,241,0.15), rgba(139,92,246,0.08))"
                            accentColor="#a5b4fc"
                        />
                        <MetricCard
                            label="Churn"
                            value={metrics.churn}
                            icon={<GitCommit size={14} />}
                            gradient="linear-gradient(135deg, rgba(34,211,238,0.15), rgba(6,182,212,0.08))"
                            accentColor="#67e8f9"
                        />
                    </div>

                    {/* Progress Bars */}
                    <div style={{ marginBottom: '28px', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <PremiumProgressBar
                            label="Complexity Impact"
                            value={metrics.complexity}
                            max={30}
                            gradient={metrics.complexity > 20
                                ? 'linear-gradient(90deg, #ef4444, #f97316)'
                                : 'linear-gradient(90deg, #6366f1, #a855f7)'}
                        />
                        <PremiumProgressBar
                            label="Churn Frequency"
                            value={metrics.churn}
                            max={20}
                            gradient={metrics.churn > 15
                                ? 'linear-gradient(90deg, #f59e0b, #fcd34d)'
                                : 'linear-gradient(90deg, #06b6d4, #22d3ee)'}
                        />
                    </div>

                    {/* Analysis Section */}
                    <div style={{ marginBottom: '24px' }}>
                        <div style={{
                            fontSize: '0.7rem',
                            fontWeight: 600,
                            textTransform: 'uppercase',
                            letterSpacing: '0.08em',
                            color: 'rgba(255,255,255,0.4)',
                            marginBottom: '12px'
                        }}>
                            Analysis
                        </div>
                        <FileInsights file={building} />
                    </div>
                </div>

                {/* Footer Actions */}
                <div style={{
                    padding: '16px 20px',
                    borderTop: '1px solid rgba(255,255,255,0.04)',
                    display: 'grid',
                    gridTemplateColumns: '1fr 1fr',
                    gap: '12px',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <ActionButton
                        icon={<Copy size={14} />}
                        label="Copy Path"
                        onClick={() => navigator.clipboard.writeText(path)}
                        variant="secondary"
                    />
                    <ActionButton
                        icon={<ExternalLink size={14} />}
                        label="Open"
                        onClick={() => window.open(`vscode://file/${path}`, '_blank')}
                        variant="primary"
                    />
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

// Premium Tag Component
function Tag({ text, variant, icon }) {
    const styles = {
        default: { bg: 'rgba(255,255,255,0.08)', color: 'rgba(255,255,255,0.7)', border: 'rgba(255,255,255,0.1)' },
        danger: { bg: 'rgba(239,68,68,0.15)', color: '#fca5a5', border: 'rgba(239,68,68,0.3)' },
        warning: { bg: 'rgba(245,158,11,0.15)', color: '#fcd34d', border: 'rgba(245,158,11,0.3)' },
        info: { bg: 'rgba(99,102,241,0.15)', color: '#a5b4fc', border: 'rgba(99,102,241,0.3)' }
    }
    const s = styles[variant] || styles.default

    return (
        <span style={{
            display: 'inline-flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            fontSize: '0.7rem',
            fontWeight: 500,
            fontFamily: 'var(--font-mono)',
            background: s.bg,
            color: s.color,
            border: `1px solid ${s.border}`,
            borderRadius: '6px'
        }}>
            {icon}
            {text}
        </span>
    )
}

// Premium Metric Card
function MetricCard({ label, value, icon, gradient, accentColor }) {
    return (
        <motion.div
            whileHover={{ scale: 1.02, y: -2 }}
            transition={{ type: 'spring', stiffness: 400, damping: 25 }}
            style={{
                padding: '16px',
                background: gradient,
                borderRadius: '14px',
                border: '1px solid rgba(255,255,255,0.06)',
                cursor: 'default'
            }}
        >
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '6px',
                fontSize: '0.65rem',
                fontWeight: 600,
                textTransform: 'uppercase',
                letterSpacing: '0.06em',
                color: 'rgba(255,255,255,0.5)',
                marginBottom: '8px'
            }}>
                <span style={{ color: accentColor }}>{icon}</span>
                {label}
            </div>
            <div style={{
                fontSize: '1.75rem',
                fontWeight: 700,
                color: 'white',
                fontFamily: 'var(--font-mono)',
                lineHeight: 1
            }}>
                {value}
            </div>
        </motion.div>
    )
}

// Premium Progress Bar with Glow
function PremiumProgressBar({ label, value, max, gradient }) {
    const percentage = Math.min(100, (value / max) * 100)

    return (
        <div>
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                marginBottom: '8px'
            }}>
                <span style={{
                    fontSize: '0.75rem',
                    color: 'rgba(255,255,255,0.6)',
                    fontWeight: 500
                }}>
                    {label}
                </span>
                <span style={{
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    color: 'rgba(255,255,255,0.4)'
                }}>
                    {value}/{max}
                </span>
            </div>
            <div style={{
                height: '6px',
                background: 'rgba(255,255,255,0.06)',
                borderRadius: '3px',
                overflow: 'hidden',
                position: 'relative'
            }}>
                <motion.div
                    initial={{ width: 0 }}
                    animate={{ width: `${percentage}%` }}
                    transition={{ duration: 0.8, ease: [0.4, 0, 0.2, 1] }}
                    style={{
                        height: '100%',
                        background: gradient,
                        borderRadius: '3px',
                        boxShadow: `0 0 12px ${percentage > 50 ? 'rgba(239,68,68,0.4)' : 'rgba(99,102,241,0.4)'}`
                    }}
                />
            </div>
        </div>
    )
}

// Premium Action Button
function ActionButton({ icon, label, onClick, variant }) {
    const isPrimary = variant === 'primary'

    return (
        <motion.button
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.98 }}
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                gap: '8px',
                padding: '12px 16px',
                fontSize: '0.8rem',
                fontWeight: 600,
                border: isPrimary ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                cursor: 'pointer',
                background: isPrimary
                    ? 'linear-gradient(135deg, #6366f1, #8b5cf6)'
                    : 'rgba(255,255,255,0.05)',
                color: isPrimary ? 'white' : 'rgba(255,255,255,0.7)',
                boxShadow: isPrimary ? '0 4px 14px rgba(99, 102, 241, 0.35)' : 'none',
                transition: 'background 0.2s ease'
            }}
        >
            {icon}
            {label}
        </motion.button>
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
