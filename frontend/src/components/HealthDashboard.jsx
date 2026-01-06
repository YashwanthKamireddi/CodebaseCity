import React, { useMemo } from 'react'
import useStore from '../store/useStore'
import { detectPattern } from './BuildingLabel'

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

    const healthColor = stats.healthScore >= 70 ? '#22c55e' : stats.healthScore >= 40 ? '#eab308' : '#ef4444'
    const patternCount = Object.values(stats.patterns).reduce((a, b) => a + b, 0)

    return (
        <div style={{
            position: 'fixed',
            top: '72px',
            right: '360px',
            width: '280px',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            zIndex: 400
        }}>
            {/* Header */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '16px' }}>
                <span style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>📊 Health Dashboard</span>
            </div>

            {/* Health Score */}
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                marginBottom: '16px',
                padding: '12px',
                background: 'rgba(255,255,255,0.04)',
                borderRadius: '8px'
            }}>
                <div style={{
                    width: '60px', height: '60px', borderRadius: '50%',
                    background: `conic-gradient(${healthColor} ${stats.healthScore * 3.6}deg, #374151 0deg)`,
                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: '#1a1a24',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '16px', fontWeight: 700, color: healthColor
                    }}>
                        {stats.healthScore}
                    </div>
                </div>
                <div>
                    <div style={{ fontSize: '12px', color: '#7a7a8c' }}>Project Health</div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: healthColor }}>
                        {stats.healthScore >= 70 ? 'Good' : stats.healthScore >= 40 ? 'Moderate' : 'Needs Attention'}
                    </div>
                </div>
            </div>

            {/* Quick Stats */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', marginBottom: '16px' }}>
                <StatBox label="Files" value={stats.total} />
                <StatBox label="Districts" value={stats.districts} />
                <StatBox label="Total LOC" value={formatNumber(stats.totalLoc)} />
                <StatBox label="Avg Complexity" value={stats.avgComplexity} />
            </div>

            {/* Issues */}
            <div style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '11px', color: '#7a7a8c', marginBottom: '8px', textTransform: 'uppercase' }}>Issues Found</div>
                <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                    {stats.hotspots > 0 && (
                        <Badge color="#ef4444" label={`${stats.hotspots} Hotspots`} />
                    )}
                    {stats.patterns.god_class > 0 && (
                        <Badge color="#ef4444" label={`${stats.patterns.god_class} God Class`} />
                    )}
                    {stats.patterns.blob > 0 && (
                        <Badge color="#dc2626" label={`${stats.patterns.blob} Blob`} />
                    )}
                    {stats.patterns.brain_class > 0 && (
                        <Badge color="#8b5cf6" label={`${stats.patterns.brain_class} Brain Class`} />
                    )}
                    {patternCount === 0 && stats.hotspots === 0 && (
                        <Badge color="#22c55e" label="No issues!" />
                    )}
                </div>
            </div>

            {/* Languages */}
            <div>
                <div style={{ fontSize: '11px', color: '#7a7a8c', marginBottom: '8px', textTransform: 'uppercase' }}>Languages</div>
                <div style={{ display: 'flex', gap: '4px', flexWrap: 'wrap' }}>
                    {stats.topLangs.map(([lang, count]) => (
                        <span key={lang} style={{
                            padding: '3px 8px',
                            background: 'rgba(129,140,248,0.15)',
                            borderRadius: '4px',
                            fontSize: '11px',
                            color: '#a5b4fc'
                        }}>
                            {lang} ({count})
                        </span>
                    ))}
                </div>
            </div>
        </div>
    )
}

function StatBox({ label, value }) {
    return (
        <div style={{
            padding: '10px',
            background: 'rgba(255,255,255,0.04)',
            borderRadius: '6px',
            textAlign: 'center'
        }}>
            <div style={{ fontSize: '16px', fontWeight: 600, color: '#fff' }}>{value}</div>
            <div style={{ fontSize: '10px', color: '#7a7a8c' }}>{label}</div>
        </div>
    )
}

function Badge({ color, label }) {
    return (
        <span style={{
            padding: '3px 8px',
            background: `${color}20`,
            borderRadius: '4px',
            fontSize: '11px',
            color: color,
            fontWeight: 500
        }}>
            {label}
        </span>
    )
}

function formatNumber(num) {
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M'
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k'
    return num.toString()
}
