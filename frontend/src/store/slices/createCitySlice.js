import logger from '../../utils/logger'

/**
 * City Slice
 * Handles all domain data: City structure, Metadata, Analysis, and File Content.
 * Fully client-side — no backend required.
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
            const response = await fetch('/demo-city.json')
            setProgress(80)
            if (!response.ok) throw new Error('Demo data unavailable')
            const data = await response.json()
            setCityData(data)
        } catch (error) {
            logger.error('Demo load failed:', error)
            setError('Demo data unavailable')
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
            const { analyzeGitHub, isGitHubUrl } = await import('../../engine/ClientAnalyzer.js')

            if (isGitHubUrl(path)) {
                // Client-side GitHub analysis — downloads ZIP, parses in Web Worker
                const cityData = await analyzeGitHub({
                    url: path,
                    onProgress: (phase, current, total) => {
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
                setCityData(cityData)
                set({ currentRepoPath: cityData.name || path, commits: [], currentCommitIndex: -1 })
            } else {
                setError('Please enter a valid GitHub URL (e.g. https://github.com/owner/repo) or use "Open Local Folder" for local projects.')
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

        const { cityData } = get()

        // Demo mode
        if (cityData?.id?.startsWith('demo_')) {
            set({ fileContent: { path, content: '// Source code not available in demo mode.\n// Try analyzing a real GitHub repository!', loading: false } })
            return
        }

        // Check in-memory file contents first (from client-side analysis)
        if (cityData?.fileContents) {
            // Try exact match
            let content = cityData.fileContents.get?.(path) || cityData.fileContents[path]

            // Try matching by filename suffix (handles relative vs absolute paths)
            if (!content) {
                const cleanPath = path.replace(/^[./\\]+/, '')
                const entries = cityData.fileContents instanceof Map
                    ? [...cityData.fileContents.entries()]
                    : Object.entries(cityData.fileContents)

                for (const [key, val] of entries) {
                    if (key.endsWith(cleanPath) || cleanPath.endsWith(key)) {
                        content = val
                        break
                    }
                }
            }

            if (content) {
                set({ fileContent: { path, content, loading: false } })
                return
            }
        }

        // Fallback: try fetching raw content from GitHub if it's a GitHub-sourced repo
        if (cityData?.source === 'github-client' && cityData?.name) {
            try {
                const repoName = cityData.name
                const cleanPath = path.replace(/^[./\\]+/, '')
                const rawUrl = `https://raw.githubusercontent.com/${repoName}/HEAD/${cleanPath}`
                const res = await fetch(rawUrl)
                if (res.ok) {
                    const content = await res.text()
                    set({ fileContent: { path, content, loading: false } })
                    return
                }
            } catch {
                // Fall through to error
            }
        }

        set({ fileContent: { path, content: '// File content not available.\n// Re-analyze the repository to load source code.', loading: false } })
    },

    searchCode: (query) => {
        const { cityData } = get()
        if (!query || !cityData?.buildings) return []

        const q = query.toLowerCase()
        return cityData.buildings
            .filter(b => {
                const name = (b.name || '').toLowerCase()
                const path = (b.file_path || b.path || '').toLowerCase()
                const funcs = (b.functions || []).map(f => (typeof f === 'string' ? f : f.name || '').toLowerCase())
                const classes = (b.classes || []).map(c => (typeof c === 'string' ? c : c.name || '').toLowerCase())

                return name.includes(q) || path.includes(q) ||
                    funcs.some(f => f.includes(q)) ||
                    classes.some(c => c.includes(q))
            })
            .slice(0, 20)
            .map(b => ({
                id: b.id,
                name: b.name,
                path: b.file_path || b.path,
                type: 'file'
            }))
    }
})
