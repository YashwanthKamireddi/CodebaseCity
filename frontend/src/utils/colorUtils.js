export const BUILDING_COLOR = '#1a1a2e'

/**
 * Premium Building Color System — "Elevated Dark" 2026
 *
 * Design Philosophy:
 * - VIBRANT but refined — buildings should pop against the dark ground
 * - Colors serve function: they communicate meaning, not decoration
 * - High contrast for interaction states (selected, hovered)
 * - Inspired by: Linear, Vercel, GitHub's language colors, modern dashboards
 *
 * @param {Object} data - Building data object
 * @param {string} mode - Color mode
 * @param {Object} context - Interaction state
 * @returns {string} Hex color
 */
export function getBuildingColor(data, mode, context = {}) {
    const {
        isSelected,
        isHovered,
        isDependency,
        isDependent,
        isUnrelated,
        highlightedIssue,
        isIssueHighlighted,
        activeIntelligencePanel,
        blastLevel
    } = context

    // ═══════════════════════════════════════════════════════════════
    // INTERACTION STATES (Highest Priority)
    // ═══════════════════════════════════════════════════════════════

    if (highlightedIssue) {
        if (isIssueHighlighted) return '#f43f5e' // Vivid rose for issues
        return '#0e0f14' // Nearly invisible
    }

    // Impact Analysis Mode
    if (activeIntelligencePanel === 'impact') {
        if (blastLevel === 0) return '#ffffff' // Pure White (Ground Zero / The File)
        if (blastLevel === 1) return '#ef4444' // Red (Direct Impact)
        if (blastLevel === 2) return '#f97316' // Orange (Secondary)
        if (blastLevel === 3) return '#eab308' // Yellow (Tertiary)
        return '#0e0f14' // Unimpacted shadow
    }

    if (isSelected) return '#34d399'   // Emerald — bright, clear selection
    if (isHovered) return '#60a5fa'    // Sky blue — obvious hover
    if (isDependency) return '#4ade80' // Green — "imports this"
    if (isDependent) return '#fb7185'  // Rose — "imported by"

    if (isUnrelated) return '#0e0f14'  // Deep shadow

    // ═══════════════════════════════════════════════════════════════
    // COLOR MODES
    // ═══════════════════════════════════════════════════════════════

    // LAYER MODE — Vivid architectural layers
    if (mode === 'layer') {
        const p = data.path.toLowerCase()
        let layer = data.layer || 'other'

        if (p.includes('component') || p.includes('page') || p.includes('ui') || p.match(/\.(jsx|tsx|vue|svelte)$/)) layer = 'ui'
        else if (p.includes('service') || p.includes('api') || p.includes('controller') || p.includes('handler')) layer = 'service'
        else if (p.includes('util') || p.includes('lib') || p.includes('helper') || p.includes('common')) layer = 'util'
        else if (p.includes('store') || p.includes('context') || p.includes('redux') || p.includes('hook')) layer = 'data'
        else if (p.includes('db') || p.includes('model') || p.includes('schema')) layer = 'db'

        const layerColors = {
            ui: '#ffffff',       // Pure white — UI components
            service: '#ff6d00',  // Vivid orange — Services/API
            data: '#40c4ff',     // Bright sky blue — State management
            util: '#00e676',     // Neon green — Utilities
            db: '#ffc400',       // Vivid gold — Database
            other: '#78909c'     // Blue gray — Unknown
        }
        return layerColors[layer] || layerColors.other
    }

    // CHURN MODE — Heat map (blue → red)
    if (mode === 'churn') {
        if (data.is_hotspot) return '#ef4444' // Red for hotspots
        const churn = data.metrics?.churn || 0
        if (churn > 8) return '#f97316'   // Orange (very hot)
        if (churn > 5) return '#eab308'   // Yellow (hot)
        if (churn > 2) return '#84cc16'   // Lime (warm)
        return '#38bdf8'                  // Sky blue (stable)
    }

    // COMPLEXITY MODE — Gradient
    if (mode === 'complexity') {
        const c = data.metrics?.complexity || 0
        if (c > 30) return '#e11d48'  // Deep rose (extreme)
        if (c > 20) return '#f97316'  // Hot orange (high)
        if (c > 10) return '#f59e0b'  // Amber (medium)
        if (c > 5) return '#84cc16'   // Lime (low)
        return '#22c55e'              // Green (simple)
    }

    // LANGUAGE MODE — GitHub-inspired vibrant colors
    if (mode === 'language') {
        const ext = data.path.split('.').pop().toLowerCase()

        const languageColors = {
            ts: '#3178c6', tsx: '#3178c6',
            js: '#f7df1e', jsx: '#f7df1e', cjs: '#f7df1e', mjs: '#f7df1e',
            py: '#3572a5',
            go: '#00add8',
            rs: '#dea584',
            c: '#555555', cpp: '#f34b7d', h: '#f34b7d', hpp: '#f34b7d',
            java: '#b07219',
            kt: '#a97bff', kts: '#a97bff',
            html: '#e34c26',
            css: '#563d7c', scss: '#c6538c', sass: '#c6538c',
            vue: '#41b883',
            svelte: '#ff3e00',
            json: '#ffc400',
            yaml: '#e53935', yml: '#e53935',
            md: '#083fa1',
            sh: '#89e051', bash: '#89e051', zsh: '#89e051',
            dockerfile: '#384d54',
            sql: '#e38c00',
            php: '#4F5D95',
            rb: '#701516',
            swift: '#f05138',
            lua: '#000080',
            r: '#276dc3',
            cs: '#178600'
        }

        return languageColors[ext] || '#64748b'
    }

    // AUTHOR MODE — Contributor visualization
    if (mode === 'author') {
        if (data.author) {
            const name = typeof data.author === 'object' ? data.author.author : data.author
            return stringToColor(name || 'Unknown')
        }
        return '#64748b'
    }

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT MODE — Vibrant height gradient
    // Cool blue (tiny) → warm coral (massive)
    // ═══════════════════════════════════════════════════════════════

    const height = data.dimensions?.height || 5

    if (height < 3) return '#3b9eff'   // Bright blue (tiny files)
    if (height < 8) return '#00d4aa'   // Vivid teal
    if (height < 15) return '#00e676'  // Neon green
    if (height < 25) return '#c6ff00'  // Electric lime
    if (height < 40) return '#ffc400'  // Vivid gold
    if (height < 60) return '#ff6d00'  // Bright orange
    if (height < 80) return '#ff3d00'  // Fire red
    return '#ff1744'                   // Hot red (massive files)
}

/**
 * Deterministic string to color
 * Full saturation for vibrancy
 */
function stringToColor(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const h = Math.abs(hash % 360)
    return `hsl(${h}, 65%, 55%)`
}
