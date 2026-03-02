const API_BASE = '/api'

/**
 * City Slice
 * Handles all domain data: City structure, Metadata, Analysis, and File Content.
 */
export const createCitySlice = (set, get) => ({
    // State
    cityData: null,
    masterCityData: null, // Ground-truth robust AST map for timeline projection
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
        // Use city_id from API response, or generate from path as fallback
        let cityId = data.city_id
        if (!cityId) {
            const path = data.path || ''
            cityId = path.replace(/\//g, '_').replace(/:/g, '').replace(/\\/g, '_').replace(/^_/, '')
        }
        console.log('[CitySlice] Setting cityData with cityId:', cityId)

        set((state) => ({
            previousCityData: state.cityData,
            cityData: data,
            masterCityData: data, // Store the present-day ground truth
            cityId: cityId,
            currentRepoPath: data.path || state.currentRepoPath,
            loading: false,
            error: null,
            analysisProgress: 100
        }))
    },

    // Async Actions
    fetchDemo: async () => {
        const { setCityData, setLoading, setError, setProgress } = get()
        set({ error: null, selectedBuilding: null, highlightedIssue: null, highlightedCategory: null })
        setLoading(true)
        setProgress(0)

        try {
            setProgress(30)
            const response = await fetch(`${API_BASE}/demo`)
            setProgress(80)
            if (!response.ok) throw new Error('Failed to load demo')
            const data = await response.json()
            setCityData(data)
        } catch (error) {
            console.warn('API unavailable, using built-in demo data')
            setError("Demo API unavailable")
        } finally {
            setLoading(false)
        }
    },

    analyzeRepo: async (path) => {
        const { setLoading, setCityData, setError, setProgress } = get()

        // Reset UI state safely before loading
        set({ error: null, selectedBuilding: null, highlightedIssue: null, highlightedCategory: null })
        setProgress(0)
        setLoading(true)


        try {
            setProgress(10)
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, max_files: 5000 })
            })
            setProgress(80)

            // Artificial cinematic delay for the premium loader experience (user requested)
            await new Promise(r => setTimeout(r, 3000))

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

    applyTimelineSnapshot: (snapshot) => {
        const { masterCityData } = get()
        if (!masterCityData || !snapshot || !snapshot.files) return

        const projectedBuildings = []
        masterCityData.buildings.forEach(building => {
            const histSize = snapshot.files[building.path]
            // If the file existed at this historical commit
            if (histSize !== undefined) {
                // We use size_bytes from the AST analyzer as the denominator
                // If the analyzer missed it, safely fallback
                const currentSize = building.metrics?.size_bytes || Math.max(1, histSize)

                // Scale historical height based on byte displacement compared to modern day
                // Clamp it so massive historical rewrites don't glitch the camera
                const ratio = Math.max(0.1, Math.min(1.5, histSize / currentSize))

                projectedBuildings.push({
                    ...building,
                    dimensions: {
                        ...building.dimensions,
                        height: building.dimensions.height * ratio
                    }
                })
            }
        })

        // Remove roads bridging to vanished historical buildings
        const activeIds = new Set(projectedBuildings.map(b => b.id))
        const projectedRoads = (masterCityData.roads || []).filter(r =>
            activeIds.has(r.source) && activeIds.has(r.target)
        )

        set({
            cityData: {
                ...masterCityData,
                buildings: projectedBuildings,
                roads: projectedRoads
            }
        })
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
