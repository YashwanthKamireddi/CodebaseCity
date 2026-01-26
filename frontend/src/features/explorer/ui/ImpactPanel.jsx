import React, { useRef, useEffect } from 'react'
import { motion } from 'framer-motion'
import { Activity, GitCommit, AlertOctagon, TrendingUp, Zap } from 'lucide-react'
import './ImpactPanel.css'

export default function ImpactPanel({ building }) {
    const cardRef = useRef(null)

    // Mouse tracking for localized glow effect
    useEffect(() => {
        const handleMouseMove = (e) => {
            if (cardRef.current) {
                const rect = cardRef.current.getBoundingClientRect()
                const x = e.clientX - rect.left
                const y = e.clientY - rect.top
                cardRef.current.style.setProperty('--mouse-x', `${x}px`)
                cardRef.current.style.setProperty('--mouse-y', `${y}px`)
            }
        }
        window.addEventListener('mousemove', handleMouseMove)
        return () => window.removeEventListener('mousemove', handleMouseMove)
    }, [])

    if (!building || !building.impact) return null

    const { direct, transitive } = building.impact
    const totalImpact = direct + transitive

    // Determine Impact Level
    let level = 'Low'
    let color = '#10b981' // Emerald
    if (totalImpact > 5) { level = 'Medium'; color = '#f59e0b' } // Amber
    if (totalImpact > 15) { level = 'High'; color = '#ef4444' } // Red
    if (totalImpact > 30) { level = 'Critical'; color = '#db2777' } // Pink

    return (
        <motion.div
            ref={cardRef}
            className="impact-panel-root"
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
        >
            <div className="impact-header">
                <div style={{
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    width: '24px', height: '24px', borderRadius: '6px',
                    background: `${color}15`, border: `1px solid ${color}30`
                }}>
                    <Zap size={14} color={color} fill={`${color}20`} />
                </div>
                <span className="impact-title">Blast Radius</span>
                <span
                    className="impact-badge"
                    style={{
                        background: `${color}15`,
                        color: color,
                        border: `1px solid ${color}30`
                    }}
                >
                    {level}
                </span>
            </div>

            <div className="impact-grid">
                {/* Direct Dependents */}
                <div className="impact-card">
                    <div className={`impact-value ${direct > 0 ? 'has-impact' : ''}`}>{direct}</div>
                    <div className="impact-label">
                        <GitCommit size={12} /> Direct
                    </div>
                </div>

                {/* Transitive Dependents */}
                <div className="impact-card">
                    <div className={`impact-value ${transitive > 0 ? 'has-impact' : ''}`}>{transitive}</div>
                    <div className="impact-label">
                        <TrendingUp size={12} /> Transitive
                    </div>
                </div>
            </div>

            {totalImpact > 0 && (
                <div className="impact-description">
                    Modifying this file could affect <strong className="impact-highlight" style={{ color: color, background: `${color}10` }}>{totalImpact} other components</strong>.
                    {level === 'Critical' && <span style={{ display: 'block', marginTop: '4px', color: '#ff8888' }}>⚠️ High regression risk.</span>}
                </div>
            )}
        </motion.div>
    )
}
