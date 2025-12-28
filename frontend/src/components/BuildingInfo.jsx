import React from 'react'
import useStore from '../store/useStore'

function BuildingInfo({ building }) {
    const { clearSelection } = useStore()

    if (!building) return null

    const { metrics } = building

    // Determine metric severity
    const complexityLevel = metrics.complexity > 15 ? 'high' : metrics.complexity > 8 ? 'medium' : 'low'
    const churnLevel = metrics.churn > 15 ? 'high' : metrics.churn > 5 ? 'medium' : 'low'
    const ageLevel = metrics.age_days > 365 ? 'high' : metrics.age_days > 90 ? 'medium' : 'low'

    // Generate tags
    const tags = []
    if (building.is_hotspot) tags.push({ label: '🔥 Hotspot', class: 'hotspot' })
    if (building.decay_level > 0.7) tags.push({ label: '🌿 Legacy', class: 'legacy' })
    if (metrics.dependencies_in > 15) tags.push({ label: '⭐ God Class', class: 'god-class' })

    return (
        <div className="building-info">
            <div className="building-info-header">
                <div>
                    <div className="building-name">{building.name}</div>
                    <div className="building-path">{building.path}</div>
                </div>
                <button className="building-close" onClick={clearSelection}>×</button>
            </div>

            <div className="building-metrics">
                <div className="metric">
                    <div className="metric-value">{metrics.loc}</div>
                    <div className="metric-label">Lines</div>
                </div>
                <div className="metric">
                    <div className={`metric-value ${complexityLevel}`}>{metrics.complexity}</div>
                    <div className="metric-label">Complexity</div>
                </div>
                <div className="metric">
                    <div className={`metric-value ${churnLevel}`}>{metrics.churn}</div>
                    <div className="metric-label">Churn</div>
                </div>
                <div className="metric">
                    <div className={`metric-value ${ageLevel}`}>{metrics.age_days}d</div>
                    <div className="metric-label">Age</div>
                </div>
                <div className="metric">
                    <div className="metric-value">{metrics.dependencies_in}</div>
                    <div className="metric-label">In-Deps</div>
                </div>
                <div className="metric">
                    <div className="metric-value">{metrics.dependencies_out}</div>
                    <div className="metric-label">Out-Deps</div>
                </div>
            </div>

            {building.summary && (
                <div className="building-summary">{building.summary}</div>
            )}

            {tags.length > 0 && (
                <div className="building-tags">
                    {tags.map((tag, i) => (
                        <span key={i} className={`tag ${tag.class}`}>{tag.label}</span>
                    ))}
                </div>
            )}
        </div>
    )
}

export default BuildingInfo
