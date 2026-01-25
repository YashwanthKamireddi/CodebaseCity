export const BUILDING_COLOR = '#475569'

export function getBuildingColor(data, mode, context = {}) {
    const {
        isSelected,
        isHovered,
        isDependency,
        isDependent,
        isUnrelated,
        highlightedIssue,
        isIssueHighlighted
    } = context

    // 1. Issue Mode Priority
    if (highlightedIssue) {
        if (isIssueHighlighted) return '#ef4444' // Red For Issues
        return '#1e293b' // Dimmed
    }

    // 2. Selection / Graph State
    if (isSelected) return '#facc15' // Gold
    if (isHovered) return '#60a5fa' // Blue Highlight
    if (isDependency) return '#4ade80' // Green (Dependency)
    if (isDependent) return '#f87171' // Red (Dependent)
    if (isUnrelated) return '#1e293b' // Dimmed

    // 3. Color Modes
    if (mode === 'layer') {
        const p = data.path.toLowerCase()
        let layer = data.layer || 'other'

        // Inference fallback
        if (p.includes('component') || p.includes('page') || p.includes('ui') || p.match(/\.(jsx|tsx|vue|svelte)$/)) layer = 'ui'
        else if (p.includes('service') || p.includes('api') || p.includes('controll')) layer = 'service'
        else if (p.includes('util') || p.includes('lib') || p.includes('help')) layer = 'util'
        else if (p.includes('store') || p.includes('context') || p.includes('redux') || p.includes('hook')) layer = 'data'
        else if (p.includes('db') || p.includes('model') || p.includes('schema')) layer = 'db'

        if (layer === 'ui') return '#3b82f6' // Blue
        if (layer === 'service') return '#8b5cf6' // Violet
        if (layer === 'data') return '#06b6d4' // Cyan
        if (layer === 'util') return '#10b981' // Emerald
        if (layer === 'db') return '#f59e0b' // Amber
        return '#475569' // Slate
    }

    if (mode === 'churn') {
        if (data.is_hotspot) return '#ef4444'
        const churn = data.metrics?.churn || 0
        if (churn > 5) return '#f97316' // Orange
        if (churn > 2) return '#fbbf24' // Yellow
        return '#3b82f6' // Blue
    }

    if (mode === 'language') {
        const ext = data.path.split('.').pop()
        if (['ts', 'tsx'].includes(ext)) return '#3178c6'
        if (['js', 'jsx'].includes(ext)) return '#f7df1e'
        if (ext === 'py') return '#3572a5'
        if (ext === 'css') return '#563d7c'
        if (ext === 'html') return '#e34c26'
        return '#64748b'
    }

    // 4. Default Structure Mode (Height/Complexity based)
    const height = data.dimensions?.height || 5
    if (height < 2) return '#22d3ee'
    if (height < 5) return '#34d399'
    if (height < 10) return '#a3e635'
    if (height < 20) return '#facc15'
    if (height < 40) return '#fb923c'
    if (height < 60) return '#f87171'
    return '#d946ef'
}
