/**
 * Intelligence Slice
 * State management for developer intelligence tools.
 */

const API_BASE = '/api'

export const createIntelligenceSlice = (set, get) => ({
    // Intelligence State
    healthReport: null,
    deadCodeReport: null,
    qualityReport: null,
    impactAnalysis: null,
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
    activeIntelligencePanel: null, // 'health' | 'deadCode' | 'quality' | 'impact' | 'search'
    
    setActiveIntelligencePanel: (panel) => set({ activeIntelligencePanel: panel }),
    
    // Fetch Code Health Report
    fetchHealthReport: async () => {
        const { cityId } = get()
        if (!cityId) return
        
        set(state => ({
            intelligenceLoading: { ...state.intelligenceLoading, health: true }
        }))
        
        try {
            const response = await fetch(`${API_BASE}/intelligence/health/${cityId}`)
            if (!response.ok) throw new Error('Health analysis failed')
            
            const data = await response.json()
            set(state => ({
                healthReport: data.health,
                intelligenceLoading: { ...state.intelligenceLoading, health: false }
            }))
        } catch (error) {
            console.error('Health report fetch failed:', error)
            set(state => ({
                intelligenceLoading: { ...state.intelligenceLoading, health: false }
            }))
        }
    },
    
    // Fetch Dead Code Report
    fetchDeadCodeReport: async () => {
        const { cityId } = get()
        if (!cityId) return
        
        set(state => ({
            intelligenceLoading: { ...state.intelligenceLoading, deadCode: true }
        }))
        
        try {
            const response = await fetch(`${API_BASE}/intelligence/dead-code/${cityId}`)
            if (!response.ok) throw new Error('Dead code detection failed')
            
            const data = await response.json()
            set(state => ({
                deadCodeReport: data.dead_code,
                intelligenceLoading: { ...state.intelligenceLoading, deadCode: false }
            }))
        } catch (error) {
            console.error('Dead code fetch failed:', error)
            set(state => ({
                intelligenceLoading: { ...state.intelligenceLoading, deadCode: false }
            }))
        }
    },
    
    // Fetch Code Quality Report
    fetchQualityReport: async () => {
        const { cityId } = get()
        if (!cityId) return
        
        set(state => ({
            intelligenceLoading: { ...state.intelligenceLoading, quality: true }
        }))
        
        try {
            const response = await fetch(`${API_BASE}/intelligence/quality/${cityId}`)
            if (!response.ok) throw new Error('Quality scan failed')
            
            const data = await response.json()
            set(state => ({
                qualityReport: data.quality,
                intelligenceLoading: { ...state.intelligenceLoading, quality: false }
            }))
        } catch (error) {
            console.error('Quality scan failed:', error)
            set(state => ({
                intelligenceLoading: { ...state.intelligenceLoading, quality: false }
            }))
        }
    },
    
    // Fetch Impact Analysis for a specific file
    fetchImpactAnalysis: async (fileId, depth = 3) => {
        const { cityId } = get()
        if (!cityId || !fileId) return
        
        set(state => ({
            intelligenceLoading: { ...state.intelligenceLoading, impact: true }
        }))
        
        try {
            const response = await fetch(
                `${API_BASE}/intelligence/impact/${cityId}/${fileId}?depth=${depth}`
            )
            if (!response.ok) throw new Error('Impact analysis failed')
            
            const data = await response.json()
            set(state => ({
                impactAnalysis: data.impact,
                intelligenceLoading: { ...state.intelligenceLoading, impact: false }
            }))
        } catch (error) {
            console.error('Impact analysis failed:', error)
            set(state => ({
                intelligenceLoading: { ...state.intelligenceLoading, impact: false }
            }))
        }
    },
    
    // Check Safe Delete
    checkSafeDelete: async (fileId) => {
        const { cityId } = get()
        if (!cityId || !fileId) return null
        
        try {
            const response = await fetch(
                `${API_BASE}/intelligence/safe-delete/${cityId}/${fileId}`
            )
            if (!response.ok) throw new Error('Safe delete check failed')
            
            const data = await response.json()
            return data.deletion_analysis
        } catch (error) {
            console.error('Safe delete check failed:', error)
            return null
        }
    },
    
    // Fetch Critical Paths
    fetchCriticalPaths: async () => {
        const { cityId } = get()
        if (!cityId) return
        
        set(state => ({
            intelligenceLoading: { ...state.intelligenceLoading, critical: true }
        }))
        
        try {
            const response = await fetch(`${API_BASE}/intelligence/critical-paths/${cityId}`)
            if (!response.ok) throw new Error('Critical path analysis failed')
            
            const data = await response.json()
            set(state => ({
                criticalPaths: data.critical_files,
                intelligenceLoading: { ...state.intelligenceLoading, critical: false }
            }))
        } catch (error) {
            console.error('Critical paths fetch failed:', error)
            set(state => ({
                intelligenceLoading: { ...state.intelligenceLoading, critical: false }
            }))
        }
    },
    
    // Smart Search
    performSmartSearch: async (query, type = 'exact', fileFilter = null) => {
        const { cityId } = get()
        if (!cityId || !query) return
        
        set(state => ({
            intelligenceLoading: { ...state.intelligenceLoading, search: true }
        }))
        
        try {
            const response = await fetch(`${API_BASE}/intelligence/search/${cityId}`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query, type, file_filter: fileFilter })
            })
            
            if (!response.ok) throw new Error('Search failed')
            
            const data = await response.json()
            set(state => ({
                searchResults: data.search_results,
                intelligenceLoading: { ...state.intelligenceLoading, search: false }
            }))
        } catch (error) {
            console.error('Smart search failed:', error)
            set(state => ({
                intelligenceLoading: { ...state.intelligenceLoading, search: false }
            }))
        }
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
