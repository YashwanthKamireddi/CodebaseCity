/**
 * FileInsights.jsx
 *
 * Actionable insights for a file - what's wrong and what to do about it
 * This is what makes the tool USEFUL, not just pretty
 */

import {
    AlertTriangle,
    TrendingUp,
    Clock,
    GitBranch,
    Lightbulb,
    FileCode,
    Users,
    Code
} from 'lucide-react'
import './FileInsights.css'

// Generate insights based on file metrics
function generateInsights(file) {
    const insights = []
    const suggestions = []

    const { metrics = {}, decay_level = 0, is_hotspot } = file
    const { loc = 0, complexity = 0, churn = 0, dependencies_in = 0, dependencies_out = 0 } = metrics

    // High LOC
    if (loc > 300) {
        insights.push({
            type: 'warning',
            icon: FileCode,
            title: 'Large file',
            description: `${loc.toLocaleString()} lines of code. Files over 300 lines are harder to maintain.`
        })
        suggestions.push({
            action: 'Split into smaller modules',
            impact: 'high',
            effort: 'medium',
            description: `Consider breaking this into ${Math.ceil(loc / 150)} smaller files based on responsibility.`
        })
    }

    // High complexity
    if (complexity > 15) {
        insights.push({
            type: 'warning',
            icon: Code,
            title: 'High complexity',
            description: `Complexity score of ${complexity}. This makes the code harder to test and modify.`
        })
        suggestions.push({
            action: 'Reduce cyclomatic complexity',
            impact: 'high',
            effort: 'medium',
            description: 'Extract complex conditionals into separate functions. Consider early returns.'
        })
    }

    // High churn
    if (churn > 10) {
        insights.push({
            type: 'info',
            icon: GitBranch,
            title: 'Frequently modified',
            description: `Changed ${churn} times recently. High churn often indicates unclear requirements or design issues.`
        })
    }

    // Many dependencies
    if (dependencies_in > 8) {
        insights.push({
            type: 'warning',
            icon: TrendingUp,
            title: 'Many dependents',
            description: `${dependencies_in} files depend on this. Changes here ripple through the codebase.`
        })
        suggestions.push({
            action: 'Stabilize interface',
            impact: 'high',
            effort: 'low',
            description: 'Add tests to prevent breaking changes. Consider versioning the API.'
        })
    }

    // High decay
    if (decay_level > 0.5) {
        insights.push({
            type: 'warning',
            icon: Clock,
            title: 'Technical debt accumulating',
            description: `Decay level: ${Math.round(decay_level * 100)}%. This file needs attention.`
        })
    }

    // If no issues found
    if (insights.length === 0) {
        insights.push({
            type: 'success',
            icon: Lightbulb,
            title: 'Healthy file',
            description: 'No major issues detected. Keep it up!'
        })
    }

    return { insights, suggestions }
}

export default function FileInsights({ file }) {
    if (!file) return null

    const { insights, suggestions } = generateInsights(file)

    return (
        <div className="file-insights">
            {/* Issues */}
            <div className="insights-section">
                <h4 className="insights-heading">
                    <AlertTriangle size={14} />
                    Analysis
                </h4>
                <div className="insights-list">
                    {insights.map((insight, i) => (
                        <div key={i} className={`insight-item insight-${insight.type}`}>
                            <div className="insight-icon">
                                <insight.icon size={16} />
                            </div>
                            <div className="insight-content">
                                <span className="insight-title">{insight.title}</span>
                                <span className="insight-description">{insight.description}</span>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div className="insights-section">
                    <h4 className="insights-heading">
                        <Lightbulb size={14} />
                        Suggested Actions
                    </h4>
                    <div className="suggestions-list">
                        {suggestions.map((suggestion, i) => (
                            <div key={i} className="suggestion-item">
                                <div className="suggestion-header">
                                    <span className="suggestion-action">{suggestion.action}</span>
                                    <div className="suggestion-badges">
                                        <span className={`badge badge-${suggestion.impact}`}>
                                            {suggestion.impact} impact
                                        </span>
                                        <span className={`badge badge-effort-${suggestion.effort}`}>
                                            {suggestion.effort} effort
                                        </span>
                                    </div>
                                </div>
                                <p className="suggestion-description">{suggestion.description}</p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}
