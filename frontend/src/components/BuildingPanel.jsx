import React from 'react'
import useStore from '../store/useStore'

export default function BuildingPanel({ building }) {
    const { clearSelection } = useStore()

    if (!building) return null

    const { metrics, name, path, is_hotspot, decay_level, language } = building

    // Calculate health score (0-100)
    const healthScore = calculateHealthScore(metrics, decay_level, is_hotspot)
    const healthClass = healthScore >= 70 ? 'excellent' : healthScore >= 40 ? 'moderate' : 'critical'

    // Get suggestions based on metrics
    const suggestions = getSuggestions(metrics, is_hotspot, decay_level)

    // Get language display
    const langDisplay = language?.charAt(0).toUpperCase() + language?.slice(1) || 'Unknown'

    return (
        <div className="building-panel panel">
            <div className="panel-content">
                {/* Header */}
                <div className="building-header">
                    <div>
                        <div className="building-name">{name}</div>
                        <div className="building-path">{path}</div>
                    </div>
                    <button className="building-close" onClick={clearSelection}>
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M18 6L6 18M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Language Badge */}
                <div className="language-badge" style={{ marginTop: '12px' }}>
                    <span className="badge">{langDisplay}</span>
                </div>

                {/* Health Score */}
                <div className="health-score-container">
                    <div className={`health-score ${healthClass}`}>
                        <span className="score-value">{healthScore}</span>
                        <span className="score-label">Health</span>
                    </div>
                    <div className="health-details">
                        {is_hotspot && <span className="tag critical">Hotspot</span>}
                        {decay_level > 0.6 && <span className="tag warning">Legacy</span>}
                        {metrics.complexity > 15 && <span className="tag info">Complex</span>}
                        {metrics.dependencies_in > 10 && <span className="tag info">High Coupling</span>}
                    </div>
                </div>

                {/* Metrics Grid */}
                <div className="building-metrics">
                    <div className="metric-card">
                        <div className="metric-value">{metrics.loc}</div>
                        <div className="metric-label">Lines</div>
                    </div>
                    <div className="metric-card">
                        <div className={`metric-value ${getMetricClass(metrics.complexity, 8, 15, 20)}`}>
                            {metrics.complexity}
                        </div>
                        <div className="metric-label">Complexity</div>
                    </div>
                    <div className="metric-card">
                        <div className={`metric-value ${getMetricClass(metrics.churn, 5, 12, 18)}`}>
                            {metrics.churn}
                        </div>
                        <div className="metric-label">Changes</div>
                    </div>
                </div>

                <div className="building-metrics">
                    <div className="metric-card">
                        <div className="metric-value">{formatAge(metrics.age_days)}</div>
                        <div className="metric-label">Age</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-value">{metrics.dependencies_in}</div>
                        <div className="metric-label">Imports</div>
                    </div>
                    <div className="metric-card">
                        <div className="metric-value">{metrics.dependencies_out}</div>
                        <div className="metric-label">Exports</div>
                    </div>
                </div>

                {/* Suggestions */}
                {suggestions.length > 0 && (
                    <div className="suggestions-section">
                        <div className="suggestions-header">Recommendations</div>
                        {suggestions.map((s, i) => (
                            <div key={i} className="suggestion-item">{s}</div>
                        ))}
                    </div>
                )}

                {/* Quick Actions */}
                <div className="quick-actions">
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => navigator.clipboard.writeText(path)}
                    >
                        Copy Path
                    </button>
                    <button
                        className="btn btn-secondary btn-sm"
                        onClick={() => window.open(`vscode://file/${path}`, '_blank')}
                    >
                        Open in Editor
                    </button>
                </div>
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

    if (isHotspot) {
        suggestions.push("This file changes frequently and is complex - prioritize for refactoring")
    }
    if (metrics.complexity > 20) {
        suggestions.push("Consider breaking into smaller functions or modules")
    }
    if (metrics.dependencies_in > 15) {
        suggestions.push("Many files depend on this - changes here have high impact")
    }
    if (decay > 0.7 && metrics.loc > 200) {
        suggestions.push("Legacy code - review for deprecated patterns")
    }
    if (metrics.churn > 12 && !isHotspot) {
        suggestions.push("Frequently modified - ensure test coverage is good")
    }

    return suggestions.slice(0, 3)
}

function getMetricClass(value, low, med, high) {
    if (value >= high) return 'health-critical'
    if (value >= med) return 'health-moderate'
    if (value >= low) return 'health-good'
    return ''
}

function formatAge(days) {
    if (days < 30) return `${days}d`
    if (days < 365) return `${Math.floor(days / 30)}mo`
    return `${(days / 365).toFixed(1)}y`
}
