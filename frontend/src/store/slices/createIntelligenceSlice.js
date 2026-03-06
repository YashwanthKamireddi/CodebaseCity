/**
 * Intelligence Slice
 * Fully client-side developer intelligence tools.
 * All analysis runs against in-memory cityData (buildings + roads).
 */

import logger from '../../utils/logger'

export const createIntelligenceSlice = (set, get) => ({
    // Intelligence State
    healthReport: null,
    deadCodeReport: null,
    qualityReport: null,
    impactAnalysis: null,
    dependencyReport: null,
    criticalPaths: null,
    searchResults: null,

    // Loading States
    intelligenceLoading: {
        health: false,
        deadCode: false,
        quality: false,
        impact: false,
        critical: false,
        search: false
    },

    // Active Intelligence Panel
    activeIntelligencePanel: null,
    setActiveIntelligencePanel: (panel) => set({ activeIntelligencePanel: panel }),

    // Client-side layer violation analysis
    analyzeLayerViolations: () => {
        const { cityData } = get()
        if (!cityData?.buildings) return

        const getLayer = (path) => {
            if (!path) return 'unknown'
            const p = path.toLowerCase()
            if (p.includes('/ui/') || p.includes('/components/') || p.includes('/views/') || p.includes('/pages/')) return 'ui'
            if (p.includes('/api/') || p.includes('/routes/') || p.includes('/controllers/')) return 'api'
            if (p.includes('/service') || p.includes('/logic/') || p.includes('/core/')) return 'service'
            if (p.includes('/model') || p.includes('/entities/') || p.includes('/schema')) return 'data'
            if (p.includes('/util') || p.includes('/helpers/') || p.includes('/lib/')) return 'utility'
            return 'unknown'
        }

        const layerRank = { ui: 4, api: 3, service: 2, data: 1, utility: 0, unknown: -1 }
        const violations = []
        cityData.buildings.forEach(building => {
            const srcLayer = getLayer(building.file_path || building.path)
            if (srcLayer === 'unknown') return
            const imports = building.imports || []
            imports.forEach(imp => {
                const impPath = typeof imp === 'string' ? imp : imp.text || imp.path || ''
                const target = cityData.buildings.find(b =>
                    (b.file_path || b.path || '').endsWith(impPath.replace(/^[./]+/, ''))
                )
                if (!target) return
                const tgtLayer = getLayer(target.file_path || target.path)
                if (tgtLayer === 'unknown') return
                if (layerRank[srcLayer] < layerRank[tgtLayer]) {
                    violations.push({
                        source_id: building.id,
                        target_id: target.id,
                        violation_type: `${srcLayer} → ${tgtLayer}`,
                        source_path: building.file_path || building.path,
                        target_path: target.file_path || target.path
                    })
                }
            })
        })
        set({ dependencyReport: { layer_violations: violations } })
    },

    // Client-side health report
    fetchHealthReport: () => {
        const { cityData } = get()
        if (!cityData?.buildings) return

        set(state => ({ intelligenceLoading: { ...state.intelligenceLoading, health: true } }))

        const buildings = cityData.buildings
        const total = buildings.length
        if (total === 0) {
            set(state => ({ healthReport: { score: 100, grade: 'A', issues: {} }, intelligenceLoading: { ...state.intelligenceLoading, health: false } }))
            return
        }

        const avgComplexity = buildings.reduce((s, b) => s + (b.metrics?.complexity || 0), 0) / total
        const avgLines = buildings.reduce((s, b) => s + (b.metrics?.lines || 0), 0) / total
        const hotspots = buildings.filter(b => b.is_hotspot).length
        const godObjects = buildings.filter(b => (b.metrics?.lines || 0) > 500 && (b.functions?.length || 0) > 15)
        const deadFiles = buildings.filter(b => {
            const incoming = (cityData.roads || []).filter(r => r.target === b.id)
            return incoming.length === 0 && !b.name?.includes('index') && !b.name?.includes('main') && !b.name?.includes('app')
        })

        // Score: 100 - penalties
        let score = 100
        score -= Math.min(20, avgComplexity * 2)
        score -= Math.min(15, (hotspots / total) * 100)
        score -= Math.min(10, godObjects.length * 3)
        score -= Math.min(10, (deadFiles.length / total) * 50)
        score = Math.max(0, Math.round(score))

        const grade = score >= 90 ? 'A' : score >= 80 ? 'B' : score >= 70 ? 'C' : score >= 60 ? 'D' : 'F'

        set(state => ({
            healthReport: {
                score,
                grade,
                total_files: total,
                avg_complexity: Math.round(avgComplexity * 10) / 10,
                avg_lines: Math.round(avgLines),
                hotspots: hotspots,
                god_objects: godObjects.map(b => ({ id: b.id, name: b.name, lines: b.metrics?.lines, functions: b.functions?.length })),
                dead_files: deadFiles.length,
            },
            intelligenceLoading: { ...state.intelligenceLoading, health: false }
        }))
    },

    // Client-side dead code detection
    fetchDeadCodeReport: () => {
        const { cityData } = get()
        if (!cityData?.buildings) return

        set(state => ({ intelligenceLoading: { ...state.intelligenceLoading, deadCode: true } }))

        const importedIds = new Set()
        ;(cityData.roads || []).forEach(r => importedIds.add(r.target))

        const entryPatterns = /^(index|main|app|server|entry|boot)/i
        const deadFiles = cityData.buildings.filter(b => {
            if (importedIds.has(b.id)) return false
            if (entryPatterns.test(b.name || '')) return false
            return true
        }).map(b => ({
            id: b.id,
            name: b.name,
            path: b.file_path || b.path,
            lines: b.metrics?.lines || 0
        }))

        set(state => ({
            deadCodeReport: deadFiles,
            intelligenceLoading: { ...state.intelligenceLoading, deadCode: false }
        }))
    },

    // Client-side quality report
    fetchQualityReport: () => {
        const { cityData } = get()
        if (!cityData?.buildings) return

        set(state => ({ intelligenceLoading: { ...state.intelligenceLoading, quality: true } }))

        const buildings = cityData.buildings
        const complexFiles = [...buildings].sort((a, b) => (b.metrics?.complexity || 0) - (a.metrics?.complexity || 0)).slice(0, 10)
        const largeFiles = [...buildings].sort((a, b) => (b.metrics?.lines || 0) - (a.metrics?.lines || 0)).slice(0, 10)

        const totalComplexity = buildings.reduce((s, b) => s + (b.metrics?.complexity || 0), 0)
        const totalLines = buildings.reduce((s, b) => s + (b.metrics?.lines || 0), 0)

        // Simple maintainability index (0-100)
        const avgComplexity = buildings.length > 0 ? totalComplexity / buildings.length : 0
        const maintainability = Math.max(0, Math.min(100, Math.round(100 - avgComplexity * 3)))

        set(state => ({
            qualityReport: {
                maintainability_index: maintainability,
                total_lines: totalLines,
                total_complexity: totalComplexity,
                most_complex: complexFiles.map(b => ({ id: b.id, name: b.name, complexity: b.metrics?.complexity || 0 })),
                largest_files: largeFiles.map(b => ({ id: b.id, name: b.name, lines: b.metrics?.lines || 0 })),
            },
            intelligenceLoading: { ...state.intelligenceLoading, quality: false }
        }))
    },

    // Client-side impact analysis (BFS through roads graph)
    fetchImpactAnalysis: (fileId, depth = 3) => {
        const { cityData } = get()
        if (!cityData?.buildings || !fileId) return

        set(state => ({ intelligenceLoading: { ...state.intelligenceLoading, impact: true } }))

        // Build adjacency list (who imports fileId → level 1, who imports those → level 2, etc.)
        const adj = new Map()
        ;(cityData.roads || []).forEach(r => {
            if (!adj.has(r.target)) adj.set(r.target, [])
            adj.get(r.target).push(r.source)
        })

        const levels = {}
        const visited = new Set([fileId])
        let frontier = [fileId]

        for (let d = 1; d <= depth; d++) {
            const nextFrontier = []
            for (const id of frontier) {
                for (const dep of (adj.get(id) || [])) {
                    if (!visited.has(dep)) {
                        visited.add(dep)
                        nextFrontier.push(dep)
                    }
                }
            }
            const levelBuildings = nextFrontier.map(id => {
                const b = cityData.buildings.find(b => b.id === id)
                return b ? { id: b.id, name: b.name, path: b.file_path || b.path } : null
            }).filter(Boolean)
            levels[`level_${d}`] = levelBuildings
            frontier = nextFrontier
        }

        set(state => ({
            impactAnalysis: { file_id: fileId, levels },
            intelligenceLoading: { ...state.intelligenceLoading, impact: false }
        }))
    },

    // Client-side safe delete check
    checkSafeDelete: (fileId) => {
        const { cityData } = get()
        if (!cityData || !fileId) return null

        const dependents = (cityData.roads || [])
            .filter(r => r.target === fileId)
            .map(r => {
                const b = cityData.buildings.find(b => b.id === r.source)
                return b ? { id: b.id, name: b.name } : null
            })
            .filter(Boolean)

        return {
            is_safe: dependents.length === 0,
            dependents,
            score: dependents.length === 0 ? 100 : Math.max(0, 100 - dependents.length * 20)
        }
    },

    // Client-side critical paths (highest in-degree + out-degree nodes)
    fetchCriticalPaths: () => {
        const { cityData } = get()
        if (!cityData?.buildings) return

        set(state => ({ intelligenceLoading: { ...state.intelligenceLoading, critical: true } }))

        const inDeg = new Map()
        const outDeg = new Map()
        ;(cityData.roads || []).forEach(r => {
            inDeg.set(r.target, (inDeg.get(r.target) || 0) + 1)
            outDeg.set(r.source, (outDeg.get(r.source) || 0) + 1)
        })

        const scored = cityData.buildings.map(b => ({
            id: b.id,
            name: b.name,
            path: b.file_path || b.path,
            in_degree: inDeg.get(b.id) || 0,
            out_degree: outDeg.get(b.id) || 0,
            centrality: (inDeg.get(b.id) || 0) + (outDeg.get(b.id) || 0)
        })).sort((a, b) => b.centrality - a.centrality).slice(0, 15)

        set(state => ({
            criticalPaths: scored,
            intelligenceLoading: { ...state.intelligenceLoading, critical: false }
        }))
    },

    // Client-side text search
    performSmartSearch: (query) => {
        const { cityData } = get()
        if (!query || !cityData?.buildings) return

        set(state => ({ intelligenceLoading: { ...state.intelligenceLoading, search: true } }))

        const q = query.toLowerCase()
        const results = []

        // Search in file contents if available
        if (cityData.fileContents) {
            const entries = cityData.fileContents instanceof Map
                ? [...cityData.fileContents.entries()]
                : Object.entries(cityData.fileContents)

            for (const [filePath, content] of entries) {
                if (results.length >= 50) break
                const lines = content.split('\n')
                for (let i = 0; i < lines.length; i++) {
                    if (lines[i].toLowerCase().includes(q)) {
                        results.push({
                            file: filePath,
                            line: i + 1,
                            text: lines[i].trim().slice(0, 200),
                            building_id: cityData.buildings.find(b => (b.file_path || b.path || '').endsWith(filePath))?.id
                        })
                        if (results.length >= 50) break
                    }
                }
            }
        }

        // Also search in building names/paths
        if (results.length < 50) {
            cityData.buildings.forEach(b => {
                if (results.length >= 50) return
                const name = (b.name || '').toLowerCase()
                const path = (b.file_path || b.path || '').toLowerCase()
                if (name.includes(q) || path.includes(q)) {
                    results.push({ file: b.file_path || b.path, line: 0, text: b.name, building_id: b.id })
                }
            })
        }

        set(state => ({
            searchResults: results,
            intelligenceLoading: { ...state.intelligenceLoading, search: false }
        }))
    },

    // Clear Intelligence Data (on city change)
    clearIntelligenceData: () => set({
        healthReport: null,
        deadCodeReport: null,
        qualityReport: null,
        impactAnalysis: null,
        criticalPaths: null,
        searchResults: null,
        activeIntelligencePanel: null
    })
})
