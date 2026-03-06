import logger from '../../utils/logger'
const API_BASE = import.meta.env.VITE_API_URL || '/api'

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

    // Refactoring Simulator State (Workstream 12B)
    refactoringDrifts: [], // Array of { buildingId, oldPath, newPath, oldDistrictId, newDistrictId }
    refactoringModeActive: false,

    // Exploration Mode State (First-Person Flight)
    explorationMode: false,
    showTraffic: true, // Default to true for premium experience

    // Landing overlay state — true until user dismisses the hero
    isLandingOverlayActive: true,
    setLandingOverlayActive: (active) => set({ isLandingOverlayActive: active }),

    // Auth State
    authToken: localStorage.getItem('codebase_city_token') || null,

    // Primitive Actions
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
    setProgress: (progress) => set({ analysisProgress: progress }),

    setAuthToken: (token) => {
        if (token) {
            localStorage.setItem('codebase_city_token', token)
        } else {
            localStorage.removeItem('codebase_city_token')
        }
        set({ authToken: token })
    },

    setCityData: (data) => {
        // Use city_id from API response, or generate from path as fallback
        let cityId = data.city_id
        if (!cityId) {
            const path = data.path || ''
            cityId = path.replace(/\//g, '_').replace(/:/g, '').replace(/\\/g, '_').replace(/^_/, '')
        }

        // Check if this is the background demo city loaded by the Landing Page
        // We do not want to dismiss the landing page if it's just loading the backdrop.
        const isDemoBackdrop = data.id?.startsWith('demo_') || window.location.pathname === '/' && get().isLandingOverlayActive && !data.source

        set((state) => ({
            previousCityData: state.cityData,
            cityData: data,
            masterCityData: data, // Store the present-day ground truth
            cityId: cityId,
            currentRepoPath: data.path || state.currentRepoPath,
            loading: false,
            error: null,
            analysisProgress: 100,
            refactoringDrifts: [], // Reset drifts on new city
            refactoringModeActive: false,
            isLandingOverlayActive: isDemoBackdrop ? state.isLandingOverlayActive : false, // Only dismiss for real analysis
        }))
    },

    // Refactoring Actions
    toggleRefactoringMode: () => set((state) => ({ refactoringModeActive: !state.refactoringModeActive })),
    clearRefactoringDrifts: () => set({ refactoringDrifts: [], refactoringModeActive: false }),

    // Exploration Mode Actions
    toggleExplorationMode: () => set((state) => ({ explorationMode: !state.explorationMode })),
    setExplorationMode: (active) => set({ explorationMode: active }),
    toggleShowTraffic: () => set((state) => ({ showTraffic: !state.showTraffic })),

    applyRefactoringDrift: (buildingId, oldDistrictId, newDistrictId) => set((state) => {
        // Prevent no-op drags
        if (oldDistrictId === newDistrictId) return state;

        const newDrifts = [...state.refactoringDrifts];
        const existingDriftIndex = newDrifts.findIndex(d => d.buildingId === buildingId);

        if (existingDriftIndex >= 0) {
            // Update existing drift
            newDrifts[existingDriftIndex].newDistrictId = newDistrictId;
            // If dragging back to origin, remove the drift
            if (newDrifts[existingDriftIndex].originalDistrictId === newDistrictId) {
                newDrifts.splice(existingDriftIndex, 1);
            }
        } else {
            // Add new drift
            newDrifts.push({
                buildingId,
                originalDistrictId: oldDistrictId,
                newDistrictId
            });
        }

        return { refactoringDrifts: newDrifts };
    }),

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
            logger.warn('API unavailable, using built-in demo data')
            // Fallback: load static demo-city.json (has real author data)
            try {
                const fallback = await fetch('/demo-city.json')
                if (fallback.ok) {
                    const data = await fallback.json()
                    setCityData(data)
                } else {
                    setError('Demo data unavailable')
                }
            } catch {
                setError('Demo data unavailable')
            }
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
            // Detect GitHub URLs and analyze entirely client-side
            const { analyzeGitHub, isGitHubUrl } = await import('../../engine/ClientAnalyzer.js')

            if (isGitHubUrl(path)) {
                // ===== CLIENT-SIDE GITHUB ANALYSIS (no backend needed) =====
                const cityData = await analyzeGitHub({
                    url: path,
                    onProgress: (phase, current, total, detail) => {
                        if (phase === 'cloning') {
                            setProgress(total > 0 ? Math.round((current / total) * 30) : 5)
                        } else if (phase === 'reading') {
                            setProgress(30 + (total > 0 ? Math.round((current / total) * 20) : 0))
                        } else if (phase === 'analyzing') {
                            setProgress(50 + (total > 0 ? Math.round((current / total) * 40) : 0))
                        }
                    },
                    maxFiles: 5000,
                })

                setProgress(95)
                await new Promise(r => setTimeout(r, 1500))

                setCityData(cityData)
                set({ currentRepoPath: cityData.name || path, commits: [], currentCommitIndex: -1 })
            } else {
                // ===== LOCAL PATH: use backend API =====
                setProgress(10)

                const { authToken } = get()
                const headers = { 'Content-Type': 'application/json' }
                if (authToken) {
                    headers['Authorization'] = `Bearer ${authToken}`
                }

                const response = await fetch(`${API_BASE}/analyze`, {
                    method: 'POST',
                    headers: headers,
                    body: JSON.stringify({ path, max_files: 5000 })
                })
                setProgress(80)

                await new Promise(r => setTimeout(r, 3000))

                if (!response.ok) {
                    const errorData = await response.json().catch(() => ({}))
                    throw new Error(errorData.detail || `Analysis failed (${response.status})`)
                }

                const data = await response.json()
                setCityData(data)
                set({ currentRepoPath: data.path || path, commits: [], currentCommitIndex: -1 })
            }

        } catch (error) {
            logger.error("Analysis Error:", error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    },

    /**
     * Analyze a local directory entirely client-side (no backend required).
     * Uses File System Access API + tree-sitter WASM in a Web Worker.
     */
    analyzeLocal: async () => {
        const { setLoading, setCityData, setError, setProgress } = get()

        set({ error: null, selectedBuilding: null, highlightedIssue: null, highlightedCategory: null })
        setProgress(0)
        setLoading(true)

        try {
            // Dynamic import to avoid loading the engine unless needed
            const { analyzeLocal: runAnalysis } = await import('../../engine/ClientAnalyzer.js')

            const cityData = await runAnalysis({
                onProgress: (phase, current, total, detail) => {
                    if (total > 0) {
                        const pct = phase === 'reading'
                            ? Math.round((current / total) * 30)       // 0-30%: reading files
                            : 30 + Math.round((current / total) * 60)  // 30-90%: analyzing
                        setProgress(pct)
                    }
                },
                maxFiles: 5000,
            })

            setProgress(95)
            // Cinematic delay for premium loader
            await new Promise(r => setTimeout(r, 1500))

            setCityData(cityData)
            set({ currentRepoPath: cityData.name, commits: [], currentCommitIndex: -1 })

        } catch (error) {
            logger.error("Client Analysis Error:", error)
            setError(error.message || 'Local analysis failed')
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
        if (cityData?.id?.startsWith('demo_')) {
            set({ fileContent: { path, content: '// Source code not available in demo mode.\n// Try analyzing a real GitHub repository!', loading: false } })
            return
        }

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
                logger.warn('Failed to parse URL path', e)
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
            logger.error("Search failed:", error)
            return []
        }
    }
})
