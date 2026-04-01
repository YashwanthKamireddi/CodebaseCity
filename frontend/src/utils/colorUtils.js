export const BUILDING_COLOR = '#1a1a2e'

/**
 * 4-stop gradient anchored to the legend colours shown in ViewControl:
 *   Small → Mid → Large → Huge
 *   Blue  → Green → Gold → Red
 * color_metric is rank-normalised 0→1 so distribution is always even.
 */
const PALETTE = [
    [59,  158, 255],  // #3b9eff — Small  (blue)
    [0,   230, 118],  // #00e676 — Mid    (green)
    [255, 196,   0],  // #ffc400 — Large  (gold)
    [255,  23,  68],  // #ff1744 — Huge   (red)
]

export function metricToHex(t) {
    const clamped = Math.min(1, Math.max(0, t))
    const scaled = clamped * (PALETTE.length - 1)
    const idx = Math.min(Math.floor(scaled), PALETTE.length - 2)
    const frac = scaled - idx
    const a = PALETTE[idx], b = PALETTE[idx + 1]
    const r = Math.round(a[0] + (b[0] - a[0]) * frac)
    const g = Math.round(a[1] + (b[1] - a[1]) * frac)
    const bl = Math.round(a[2] + (b[2] - a[2]) * frac)
    return '#' + ((1 << 24) | (r << 16) | (g << 8) | bl).toString(16).slice(1)
}

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
        isUnrelated,
        highlightedIssue,
        isIssueHighlighted
    } = context

    // ═══════════════════════════════════════════════════════════════
    // INTERACTION STATES (Highest Priority)
    // ═══════════════════════════════════════════════════════════════

    if (highlightedIssue) {
        if (isIssueHighlighted) return '#f43f5e' // Vivid rose for issues
        return '#0e0f14' // Nearly invisible
    }

    if (isSelected) return '#34d399'   // Emerald — bright, clear selection
    if (isHovered) return '#7dd3fc'    // Light sky — obvious hover

    if (isUnrelated) return '#111318'  // Deep shadow — visible but clearly dimmed

    // ═══════════════════════════════════════════════════════════════
    // COLOR MODES
    // ═══════════════════════════════════════════════════════════════

    // Quick Cache for Base Colors to avoid string operations and regex loops
    if (!data._colorCache) data._colorCache = {}
    if (data._colorCache[mode]) return data._colorCache[mode]

    let resultColor = '#64748b' // default fallback

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
        resultColor = layerColors[layer] || layerColors.other
    }

    // CHURN MODE — Heat map (blue → red)
    else if (mode === 'churn') {
        if (data.is_hotspot) resultColor = '#ef4444' // Red for hotspots
        else {
            const churn = data.metrics?.churn || 0
            if (churn > 8) resultColor = '#f97316'   // Orange (very hot)
            else if (churn > 5) resultColor = '#eab308'   // Yellow (hot)
            else if (churn > 2) resultColor = '#84cc16'   // Lime (warm)
            else resultColor = '#38bdf8'                  // Sky blue (stable)
        }
    }

    // COMPLEXITY MODE — Gradient
    else if (mode === 'complexity') {
        const c = data.metrics?.complexity || 0
        if (c > 30) resultColor = '#e11d48'  // Deep rose (extreme)
        else if (c > 20) resultColor = '#f97316'  // Hot orange (high)
        else if (c > 10) resultColor = '#f59e0b'  // Amber (medium)
        else if (c > 5) resultColor = '#84cc16'   // Lime (low)
        else resultColor = '#22c55e'              // Green (simple)
    }

    // LANGUAGE MODE — GitHub-inspired vibrant colors
    else if (mode === 'language') {
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

        resultColor = languageColors[ext] || '#64748b'
    }

    // AUTHOR MODE — Contributor visualization
    else if (mode === 'author') {
        if (data.author) {
            const name = typeof data.author === 'object' ? data.author.author : data.author
            resultColor = stringToColor(name || 'Unknown')
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DEFAULT MODE — Legend-aligned size gradient
    // Blue (small) → Green → Gold → Red (huge)
    // Uses color_metric (rank-normalized 0-1) for even distribution.
    // ═══════════════════════════════════════════════════════════════
    else {
        // color_metric is rank-normalized (0-1) computed at city load time.
        // Smallest file = 0 (blue), largest file = 1 (red), evenly distributed.
        // Fallback: simple height-based ratio for edge cases.
        if (data.color_metric != null) resultColor = metricToHex(data.color_metric)
        else {
            const h = data.dimensions?.height || 8
            resultColor = metricToHex(Math.min(1, Math.max(0, h / 80)))
        }
    }

    data._colorCache[mode] = resultColor
    return resultColor
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
