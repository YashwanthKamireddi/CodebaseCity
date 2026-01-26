export const BUILDING_COLOR = '#475569'

/**
 * Determines the color of a building based on analysis mode and interaction state.
 * @param {Object} data - The building data object (from cityData).
 * @param {string} mode - Current Color Mode ('layer', 'churn', 'language', 'default').
 * @param {Object} context - Interaction context ({ isSelected, isHovered, ... }).
 * @returns {string} Hex color string.
 */
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
        const ext = data.path.split('.').pop().toLowerCase()

        // Comprehensive Language Map
        switch (ext) {
            case 'ts': case 'tsx': return '#3178c6' // TypeScript Blue
            case 'js': case 'jsx': case 'cjs': case 'mjs': return '#f7df1e' // JavaScript Yellow
            case 'py': return '#3572a5' // Python Blue
            case 'go': return '#00add8' // Go Cyan
            case 'rs': return '#dea584' // Rust Brown
            case 'java': return '#b07219' // Java Orange
            case 'c': return '#555555' // C Grey
            case 'cpp': case 'h': case 'hpp': return '#f34b7d' // C++ Pink
            case 'cs': return '#178600' // C# Green
            case 'html': return '#e34c26' // HTML Orange
            case 'css': case 'scss': case 'sass': case 'less': return '#563d7c' // CSS Purple
            case 'vue': return '#41b883' // Vue Green
            case 'svelte': return '#ff3e00' // Svelte Orange
            case 'json': case 'yaml': case 'yml': return '#cb171e' // Data Red (YAML/JSON)
            case 'md': case 'markdown': return '#083fa1' // Markdown Blue
            case 'sh': case 'bash': case 'zsh': return '#89e051' // Shell Green
            case 'dockerfile': return '#384d54' // Docker Grey
            case 'sql': return '#e38c00' // SQL Orange
            case 'php': return '#4F5D95' // PHP Purple
            case 'rb': return '#701516' // Ruby Red
            case 'swift': return '#F05138' // Swift Orange
            case 'kt': case 'kts': return '#A97BFF' // Kotlin Purple
            case 'lua': return '#000080' // Lua Blue
            case 'r': return '#276dc3' // R Blue
            default: return '#64748b' // Slate (Unknown)
        }
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
