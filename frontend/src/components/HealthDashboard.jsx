import React, { useMemo } from 'react'
import useStore from '../store/useStore'
import { detectPattern } from './BuildingLabel'
import { Activity, AlertTriangle, CheckCircle, BarChart2 } from 'lucide-react'
import '../styles/ProfessionalUI.css'

export default function HealthDashboard() {
    const { cityData } = useStore()

    const stats = useMemo(() => {
        if (!cityData?.buildings) return null

        const buildings = cityData.buildings
        const total = buildings.length

        // Language distribution
        const languages = {}
        buildings.forEach(b => {
            const lang = b.language || 'unknown'
            languages[lang] = (languages[lang] || 0) + 1
        })

        // Pattern counts
        const patterns = { god_class: 0, data_class: 0, lazy_class: 0, brain_class: 0, blob: 0 }
        let totalLoc = 0
        let totalComplexity = 0
        let hotspots = 0

        buildings.forEach(b => {
            totalLoc += b.metrics?.loc || 0
            totalComplexity += b.metrics?.complexity || 0
            if (b.is_hotspot) hotspots++

            const pattern = detectPattern(b)
            if (pattern) patterns[pattern.type] = (patterns[pattern.type] || 0) + 1
        })

        const avgComplexity = total > 0 ? (totalComplexity / total).toFixed(1) : 0
        const avgLoc = total > 0 ? Math.round(totalLoc / total) : 0

        // Health score (0-100)
        const patternPenalty = (patterns.god_class * 10 + patterns.blob * 8 + patterns.brain_class * 5)
        const hotspotPenalty = hotspots * 3
        const healthScore = Math.max(0, Math.min(100, 100 - patternPenalty - hotspotPenalty))

        // Top languages
        const topLangs = Object.entries(languages)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 4)

        return {
            total,
            totalLoc,
            avgLoc,
            avgComplexity,
            hotspots,
            patterns,
            healthScore,
            topLangs,
            districts: cityData.districts?.length || 0
        }
    }, [cityData])

    if (!stats) return null

    const healthColor = stats.healthScore >= 70 ? 'var(--color-health-excellent)' :
        stats.healthScore >= 40 ? 'var(--color-health-moderate)' :
            'var(--color-health-critical)'

    const patternCount = Object.values(stats.patterns).reduce((a, b) => a + b, 0)

    return (
        <div style={{
            position: 'fixed',
            top: '16px',
            right: '336px',
            width: '260px',
            zIndex: 400,
            maxHeight: 'calc(100vh - 120px)',
            overflowY: 'auto',
            background: 'rgba(20, 20, 23, 0.75)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06) inset',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div className="p-panel-header" style={{
                height: '56px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                padding: '0 16px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'transparent'
            }}>
                <div className="p-panel-title" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <BarChart2 size={16} color="var(--color-text-secondary)" />
                    <span style={{ fontSize: '0.85rem', fontWeight: 600, letterSpacing: '0.01em' }}>Project Health</span>
                </div>
                <div className="p-tag" style={{
                    color: healthColor,
                    background: `color-mix(in srgb, ${healthColor}, transparent 90%)`,
                    padding: '2px 8px',
                    borderRadius: '6px',
                    fontSize: '0.75rem',
                    fontWeight: 600,
                    border: `1px solid color-mix(in srgb, ${healthColor}, transparent 80%)`
                }}>
                    {stats.healthScore}/100
                </div>
            </div>

            <div style={{ padding: '16px' }}>
                {/* Health Score Ring */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '16px',
                    marginBottom: '20px',
                    padding: '16px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '12px',
                    border: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{
                        position: 'relative',
                        width: '56px', height: '56px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <svg width="56" height="56" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="28" cy="28" r="24" stroke="rgba(255,255,255,0.05)" strokeWidth="6" fill="none" />
                            <circle cx="28" cy="28" r="24" stroke={healthColor} strokeWidth="6" fill="none"
                                strokeDasharray="150.8"
                                strokeDashoffset={150.8 * (1 - stats.healthScore / 100)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div style={{ position: 'absolute', fontSize: '12px', fontWeight: 700 }}>
                            {stats.healthScore}
                        </div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Status</div>
                        <div style={{ fontSize: '1rem', fontWeight: 600, color: healthColor }}>
                            {stats.healthScore >= 70 ? 'Healthy' : stats.healthScore >= 40 ? 'Moderate' : 'Critical'}
                        </div>
                    </div>
                </div>

                {/* Quick Stats Grid */}
                <div className="p-grid-2" style={{ marginBottom: '24px', gap: '12px' }}>
                    <StatBox label="Files" value={stats.total} />
                    <StatBox label="Modules" value={stats.districts} />
                    <StatBox label="LOC" value={formatNumber(stats.totalLoc)} />
                    <StatBox label="Complexity" value={stats.avgComplexity} />
                </div>

                {/* Issues */}
                <div style={{ marginBottom: '20px' }}>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Issues Detected</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {stats.hotspots > 0 && (
                            <Badge color="var(--color-accent-danger)" label={`${stats.hotspots} Hotspots`} icon={<AlertTriangle size={10} />} />
                        )}
                        {stats.patterns.god_class > 0 && (
                            <Badge color="var(--color-accent-danger)" label={`${stats.patterns.god_class} God Class`} />
                        )}
                        {stats.patterns.blob > 0 && (
                            <Badge color="var(--color-accent-danger)" label={`${stats.patterns.blob} Blob`} />
                        )}
                        {patternCount === 0 && stats.hotspots === 0 && (
                            <Badge color="var(--color-accent-success)" label="All systems nominal" icon={<CheckCircle size={10} />} />
                        )}
                    </div>
                </div>

                {/* Languages */}
                <div>
                    <div style={{ fontSize: '0.7rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '12px' }}>Tech Stack</div>
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                        {stats.topLangs.map(([lang, count]) => (
                            <span key={lang} style={{
                                padding: '4px 8px',
                                background: 'rgba(255,255,255,0.05)',
                                borderRadius: '6px',
                                fontSize: '0.75rem',
                                color: 'var(--color-text-secondary)',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {lang} <span style={{ opacity: 0.5, marginLeft: '4px' }}>{count}</span>
                            </span>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    )
}

function StatBox({ label, value }) {
    return (
        <div style={{
            padding: '12px',
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.05)',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '1rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>{value}</div>
            <div style={{ fontSize: '0.65rem', color: 'var(--color-text-tertiary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>{label}</div>
        </div>
    )
}

function Badge({ color, label, icon }) {
    return (
        <span style={{
            display: 'flex',
            alignItems: 'center',
            gap: '4px',
            padding: '4px 10px',
            background: `color-mix(in srgb, ${color}, transparent 88%)`,
            border: `1px solid color-mix(in srgb, ${color}, transparent 80%)`,
            borderRadius: '6px',
            fontSize: '0.75rem',
            color: color,
            fontWeight: 500
        }}>
            {icon}
            {label}
        </span>
    )
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
}
