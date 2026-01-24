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
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            {/* Issues */}
            <div>
                <h4 style={{
                    fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                    color: '#71717a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                }}>
                    <AlertTriangle size={12} /> Analysis
                </h4>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {insights.map((insight, i) => (
                        <div key={i} style={{
                            background: '#18181b',
                            border: '1px solid #27272a',
                            borderLeft: `3px solid ${getColorForType(insight.type)}`,
                            borderRadius: '4px', // Technical corner
                            padding: '16px',
                            display: 'flex',
                            gap: '12px'
                        }}>
                            <div style={{ marginTop: '2px', color: getColorForType(insight.type) }}>
                                <insight.icon size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '0.9rem', fontWeight: 600, color: '#e4e4e7', marginBottom: '4px' }}>
                                    {insight.title}
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#a1a1aa', lineHeight: '1.5' }}>
                                    {insight.description}
                                </div>
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Suggestions */}
            {suggestions.length > 0 && (
                <div>
                    <h4 style={{
                        fontSize: '0.75rem', textTransform: 'uppercase', letterSpacing: '0.1em',
                        color: '#71717a', marginBottom: '12px', display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <Lightbulb size={12} /> Recommended Actions
                    </h4>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                        {suggestions.map((suggestion, i) => (
                            <div key={i} style={{
                                background: 'rgba(59, 130, 246, 0.05)', // Very subtle blue tint
                                border: '1px dashed #3f3f46',
                                borderRadius: '4px',
                                padding: '16px'
                            }}>
                                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '8px' }}>
                                    <span style={{ fontSize: '0.9rem', fontWeight: 600, color: '#60a5fa' }}>
                                        {suggestion.action}
                                    </span>
                                    <div style={{ display: 'flex', gap: '6px' }}>
                                        <Badge label={suggestion.impact} color="#10b981" />
                                        <Badge label={suggestion.effort} color="#f59e0b" />
                                    </div>
                                </div>
                                <p style={{ fontSize: '0.8rem', color: '#a1a1aa', margin: 0, lineHeight: '1.5' }}>
                                    {suggestion.description}
                                </p>
                            </div>
                        ))}
                    </div>
                </div>
            )}
        </div>
    )
}

// Helpers
function getColorForType(type) {
    switch (type) {
        case 'warning': return '#ef4444'; // Red-500
        case 'info': return '#3b82f6'; // Blue-500
        case 'success': return '#10b981'; // Emerald-500
        default: return '#71717a';
    }
}

const Badge = ({ label, color }) => (
    <span style={{
        fontSize: '0.65rem',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        fontWeight: 700,
        padding: '2px 6px',
        borderRadius: '2px',
        background: `${color}20`, // 20% opacity
        color: color,
        border: `1px solid ${color}40`
    }}>
        {label}
    </span>
)
