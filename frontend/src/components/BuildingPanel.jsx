import React from 'react'
import useStore from '../store/useStore'
import { detectPattern } from './BuildingLabel'

export default function BuildingPanel({ building }) {
    const { clearSelection } = useStore()

    if (!building) return null

    const { metrics, name, path, is_hotspot, decay_level, language } = building
    const healthScore = calculateHealthScore(metrics, decay_level, is_hotspot)
    const healthColor = healthScore >= 70 ? '#22c55e' : healthScore >= 40 ? '#eab308' : '#ef4444'
    const langDisplay = language?.charAt(0).toUpperCase() + language?.slice(1) || 'Unknown'
    const suggestions = getSuggestions(metrics, is_hotspot, decay_level)
    const pattern = detectPattern(building)

    return (
        <div style={{
            position: 'fixed',
            top: '72px',
            left: '16px',
            width: '300px',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            zIndex: 600,
            maxHeight: 'calc(100vh - 100px)',
            overflowY: 'auto'
        }}>
            {/* Header */}
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '12px' }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff', marginBottom: '4px' }}>{name}</div>
                    <div style={{ fontSize: '11px', color: '#7a7a8c', wordBreak: 'break-all' }}>{path}</div>
                </div>
                <button
                    onClick={clearSelection}
                    style={{ background: 'none', border: 'none', color: '#7a7a8c', cursor: 'pointer', padding: '2px' }}
                >
                    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Tags Row */}
            <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap', marginBottom: '16px' }}>
                <span style={{ padding: '4px 8px', background: 'rgba(129,140,248,0.2)', borderRadius: '4px', fontSize: '11px', color: '#a5b4fc' }}>
                    {langDisplay}
                </span>
                {is_hotspot && (
                    <span style={{ padding: '4px 8px', background: 'rgba(239,68,68,0.2)', borderRadius: '4px', fontSize: '11px', color: '#f87171' }}>
                        Hotspot
                    </span>
                )}
                {decay_level > 0.6 && (
                    <span style={{ padding: '4px 8px', background: 'rgba(234,179,8,0.2)', borderRadius: '4px', fontSize: '11px', color: '#fbbf24' }}>
                        Legacy
                    </span>
                )}
                {pattern && (
                    <span style={{
                        padding: '4px 8px',
                        background: `${pattern.color}20`,
                        borderRadius: '4px',
                        fontSize: '11px',
                        color: pattern.color,
                        fontWeight: 600
                    }}>
                        ⚠ {pattern.label}
                    </span>
                )}
            </div>

            {/* Health Score */}
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px', padding: '12px', background: 'rgba(255,255,255,0.04)', borderRadius: '8px' }}>
                <div style={{
                    width: '50px', height: '50px', borderRadius: '10px',
                    background: `rgba(${healthScore >= 70 ? '34,197,94' : healthScore >= 40 ? '234,179,8' : '239,68,68'}, 0.15)`,
                    border: `2px solid ${healthColor}`,
                    display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center'
                }}>
                    <span style={{ fontSize: '16px', fontWeight: 700, color: healthColor }}>{healthScore}</span>
                    <span style={{ fontSize: '9px', color: healthColor }}>Health</span>
                </div>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', flex: 1 }}>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{metrics.loc}</div>
                        <div style={{ fontSize: '10px', color: '#7a7a8c' }}>Lines</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: metrics.complexity > 15 ? '#ef4444' : '#fff' }}>{metrics.complexity}</div>
                        <div style={{ fontSize: '10px', color: '#7a7a8c' }}>Complexity</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{metrics.dependencies_in}</div>
                        <div style={{ fontSize: '10px', color: '#7a7a8c' }}>Imports</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>{metrics.churn}</div>
                        <div style={{ fontSize: '10px', color: '#7a7a8c' }}>Changes</div>
                    </div>
                </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '10px', color: '#7a7a8c', marginBottom: '6px', textTransform: 'uppercase' }}>Recommendations</div>
                    {suggestions.map((s, i) => (
                        <div key={i} style={{ fontSize: '12px', color: '#b4b4c0', marginBottom: '4px', paddingLeft: '8px', borderLeft: '2px solid #818cf8' }}>
                            {s}
                        </div>
                    ))}
                </div>
            )}

            {/* Actions */}
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={() => navigator.clipboard.writeText(path)}
                    style={{
                        flex: 1, padding: '8px', background: 'rgba(255,255,255,0.08)',
                        border: '1px solid rgba(255,255,255,0.1)', borderRadius: '6px',
                        color: '#b4b4c0', fontSize: '12px', cursor: 'pointer'
                    }}
                >
                    Copy Path
                </button>
                <button
                    onClick={() => window.open(`vscode://file/${path}`, '_blank')}
                    style={{
                        flex: 1, padding: '8px', background: '#818cf8',
                        border: 'none', borderRadius: '6px',
                        color: '#fff', fontSize: '12px', fontWeight: 500, cursor: 'pointer'
                    }}
                >
                    Open in VS Code
                </button>
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

function getSuggestions(metrics, isHotspot, decay) {
    const suggestions = []
    if (isHotspot) suggestions.push("Prioritize for refactoring")
    if (metrics.complexity > 20) suggestions.push("Break into smaller functions")
    if (metrics.dependencies_in > 15) suggestions.push("High coupling - changes have wide impact")
    if (decay > 0.7 && metrics.loc > 200) suggestions.push("Review for deprecated patterns")
    return suggestions.slice(0, 2)
}
