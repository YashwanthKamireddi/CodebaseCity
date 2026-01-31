const API_BASE = '/api'

/**
 * City Slice
 * Handles all domain data: City structure, Metadata, Analysis, and File Content.
 */
export const createCitySlice = (set, get) => ({
    // State
    cityData: null,
    cityId: null, // Cache key for API calls
    previousCityData: null, // For morphing
    currentRepoPath: null,
    loading: false,
    error: null,
    analysisProgress: 0,
    fileContent: null, // { path: string, content: string, loading: boolean }

    // Primitive Actions
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
    setProgress: (progress) => set({ analysisProgress: progress }),

    setCityData: (data) => {
        // Generate cityId from path
        const path = data.path || ''
        const cityId = path.replace(/\//g, '_').replace(/:/g, '').replace(/\\/g, '_').replace(/^_/, '')
        
        set((state) => ({
            previousCityData: state.cityData,
            cityData: data,
            cityId: cityId,
            currentRepoPath: data.path || state.currentRepoPath,
            loading: false,
            error: null,
            analysisProgress: 100
        }))
    },

    // Async Actions
    fetchDemo: async () => {
        const { setCityData } = get()
        try {
            const response = await fetch(`${API_BASE}/demo`)
            if (!response.ok) throw new Error('Failed to load demo')
            const data = await response.json()
            setCityData(data)
        } catch (error) {
            console.warn('API unavailable, using built-in demo data')
            // Fallback would need the local createDemoCity function,
            // but for clean slice architecture we might import it or fetch from a static file.
            // For now, we will assume API availability or handle this in a util.
            set({ error: "Demo API unavailable" })
        }
    },

    analyzeRepo: async (path) => {
        const { setLoading, setCityData, setError, setProgress } = get()

        // Reset UI state via cross-slice call if possible, or just local data cleaning
        setLoading(true)
        setProgress(0)
        setError(null)
        set({ selectedBuilding: null, highlightedIssue: null, highlightedCategory: null }) // Cross-slice reset

        // Minimum time to ensure UI feedback (1.5s)
        const minTime = new Promise(resolve => setTimeout(resolve, 1500))

        setLoading(true)

        try {
            setProgress(10)
            const responsePromise = fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, max_files: 5000 })
            })

            const [response] = await Promise.all([responsePromise, minTime])
            setProgress(80)

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || `Analysis failed (${response.status})`)
            }

            const data = await response.json()
            setCityData(data)
            // Reset Time Travel state (Cross-slice)
            set({ currentRepoPath: data.path || path, commits: [], currentCommitIndex: -1 })

        } catch (error) {
            console.error("Analysis Error:", error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    },

    fetchFileContent: async (path) => {
        set({ fileContent: { path, content: null, loading: true } })

        const { currentRepoPath, cityData } = get()
        let fullPath = path

        // Path resolution logic
        const repoRootPromise = currentRepoPath || cityData?.path

        if (path.startsWith('http')) {
             try {
                const url = new URL(path)
                const parts = url.pathname.split('/').filter(Boolean)
                const relativeParts = parts.slice(2)
                if (relativeParts[0] === 'blob' || relativeParts[0] === 'tree') {
                    relativeParts.splice(0, 2)
                }

                if (repoRootPromise && !repoRootPromise.startsWith('http')) {
                   const cleanRepo = repoRootPromise.endsWith('/') ? repoRootPromise.slice(0, -1) : repoRootPromise
                   fullPath = `${cleanRepo}/${relativeParts.join('/')}`
                } else {
                   fullPath = relativeParts.join('/')
                }
            } catch (e) {
                console.warn('Failed to parse URL path', e)
            }
        } else if (repoRootPromise && !path.startsWith('/') && !path.includes(':')) {
           const cleanRepo = repoRootPromise.endsWith('/') ? repoRootPromise.slice(0, -1) : repoRootPromise
           const cleanPath = path.startsWith('/') ? path.slice(1) : path
           fullPath = `${cleanRepo}/${cleanPath}`
        }

        try {
            const response = await fetch(`${API_BASE}/files/content?path=${encodeURIComponent(fullPath)}`)
            if (!response.ok) throw new Error('Failed to load content')
            const data = await response.json()
            set({ fileContent: { path, content: data.content, loading: false } })
        } catch (error) {
            set({ fileContent: { path, content: `Error: ${error.message}`, loading: false, error: true } })
        }
    },

    searchCode: async (query) => {
        try {
            const response = await fetch(`${API_BASE}/search`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ query })
            })
            if (!response.ok) return []
            const data = await response.json()
            return data.results || []
        } catch (error) {
            console.error("Search failed:", error)
            return []
        }
    }
})
