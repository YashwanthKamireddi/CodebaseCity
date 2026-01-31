export const BUILDING_COLOR = '#1a1a2e'

/**
 * Premium Building Color System
 *
 * Design Philosophy:
 * - Dark glass base for all buildings (cyberpunk aesthetic)
 * - Accent colors for semantic meaning
 * - Smooth gradients based on metrics
 * - High contrast for selection states
 *
 * @param {Object} data - Building data object
 * @param {string} mode - Color mode ('layer', 'churn', 'language', 'complexity', 'default')
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
        isIssueHighlighted
    } = context

    // Base building color - dark glass
    const baseColor = '#1a1a2e'

    // ═══════════════════════════════════════════════════════════════
    // INTERACTION STATES (Highest Priority)
    // ═══════════════════════════════════════════════════════════════

    // Issue highlighting mode
    if (highlightedIssue) {
        if (isIssueHighlighted) return '#ff3366' // Hot pink for issues
        return '#0a0a12' // Nearly invisible
    }

    // Selection states
    if (isSelected) return '#00ffaa'   // Bright cyan-green (selected)
    if (isHovered) return '#00d4ff'    // Bright cyan (hover)
    if (isDependency) return '#00ff88' // Green (imports this)
    if (isDependent) return '#ff6b6b'  // Coral red (imported by)

    // Focus mode - dim unrelated buildings
    if (isUnrelated) return '#08080c'  // Almost black

    // ═══════════════════════════════════════════════════════════════
    // COLOR MODES
    // ═══════════════════════════════════════════════════════════════

    // LAYER MODE - Architecture visualization
    if (mode === 'layer') {
        const p = data.path.toLowerCase()
        let layer = data.layer || 'other'

        // Smart layer inference
        if (p.includes('component') || p.includes('page') || p.includes('ui') || p.match(/\.(jsx|tsx|vue|svelte)$/)) layer = 'ui'
        else if (p.includes('service') || p.includes('api') || p.includes('controller') || p.includes('handler')) layer = 'service'
        else if (p.includes('util') || p.includes('lib') || p.includes('helper') || p.includes('common')) layer = 'util'
        else if (p.includes('store') || p.includes('context') || p.includes('redux') || p.includes('hook')) layer = 'data'
        else if (p.includes('db') || p.includes('model') || p.includes('schema')) layer = 'db'

        // Premium layer colors (neon accents on dark base)
        const layerColors = {
            ui: '#00d4ff',       // Cyan - UI components
            service: '#a855f7',  // Purple - Services/API
            data: '#06b6d4',     // Teal - State management
            util: '#22c55e',     // Green - Utilities
            db: '#f59e0b',       // Amber - Database
            other: '#64748b'     // Slate - Unknown
        }
        return layerColors[layer] || layerColors.other
    }

    // CHURN MODE - Code change frequency
    if (mode === 'churn') {
        if (data.is_hotspot) return '#ff3366' // Hot pink for hotspots
        const churn = data.metrics?.churn || 0
        if (churn > 8) return '#ff6b35'   // Orange-red (very hot)
        if (churn > 5) return '#fbbf24'   // Amber (hot)
        if (churn > 2) return '#a3e635'   // Lime (warm)
        return '#22d3ee'                  // Cyan (stable)
    }

    // COMPLEXITY MODE - Cyclomatic complexity heatmap
    if (mode === 'complexity') {
        const c = data.metrics?.complexity || 0
        if (c > 30) return '#ff0066'  // Hot pink (extreme)
        if (c > 20) return '#a855f7'  // Purple (high)
        if (c > 10) return '#f59e0b'  // Amber (medium)
        if (c > 5) return '#84cc16'   // Lime (low)
        return '#22c55e'              // Green (simple)
    }

    // LANGUAGE MODE - File type colors (GitHub-inspired but enhanced)
    if (mode === 'language') {
        const ext = data.path.split('.').pop().toLowerCase()

        const languageColors = {
            // TypeScript/JavaScript ecosystem
            ts: '#3178c6', tsx: '#3178c6',
            js: '#f7df1e', jsx: '#f7df1e', cjs: '#f7df1e', mjs: '#f7df1e',

            // Python
            py: '#3572a5',

            // Systems languages
            go: '#00add8',
            rs: '#ff6b35',
            c: '#555555',
            cpp: '#f34b7d', h: '#f34b7d', hpp: '#f34b7d',

            // JVM
            java: '#ed8b00',
            kt: '#a855f7', kts: '#a855f7',

            // Web
            html: '#e34c26',
            css: '#663399', scss: '#cc6699', sass: '#cc6699',
            vue: '#42b883',
            svelte: '#ff3e00',

            // Data/Config
            json: '#292929',
            yaml: '#cb171e', yml: '#cb171e',
            md: '#083fa1',

            // Shell/DevOps
            sh: '#4eaa25', bash: '#4eaa25', zsh: '#4eaa25',
            dockerfile: '#2496ed',

            // Other
            sql: '#f29111',
            php: '#777bb3',
            rb: '#cc342d',
            swift: '#f05138',
            lua: '#000080',
            r: '#276dc3',
            cs: '#178600'
        }

        return languageColors[ext] || '#64748b'
    }

    // AUTHOR MODE - Contributor visualization
    if (mode === 'author') {
        if (data.author) {
            const name = typeof data.author === 'object' ? data.author.author : data.author
            return stringToColor(name || 'Unknown')
        }
        return '#475569'
    }

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT MODE - Height/size based gradient
    // ═══════════════════════════════════════════════════════════════

    const height = data.dimensions?.height || 5

    // Premium height gradient (small = cool, large = warm)
    if (height < 3) return '#0ea5e9'   // Sky blue (tiny files)
    if (height < 8) return '#22d3ee'   // Cyan
    if (height < 15) return '#2dd4bf'  // Teal
    if (height < 25) return '#34d399'  // Emerald
    if (height < 40) return '#a3e635'  // Lime
    if (height < 60) return '#facc15'  // Yellow
    if (height < 80) return '#fb923c'  // Orange
    return '#f87171'                   // Red (large files)
}

/**
 * Deterministic string to color conversion
 * Uses HSL for consistent saturation/lightness
 */
function stringToColor(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const h = Math.abs(hash % 360)
    return `hsl(${h}, 65%, 55%)`
}
