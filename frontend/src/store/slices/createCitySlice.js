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



    /**
     * Analyze a public GitHub repository via the GitHub API.
     * Fetches file tree, sizes, and languages — no backend required.
     * Accepts: "owner/repo" or "https://github.com/owner/repo"
     */
    analyzeRepo: async (repoInput) => {
        const { setLoading, setCityData, setError, setProgress } = get()

        set({ error: null, selectedBuilding: null, highlightedIssue: null, highlightedCategory: null })
        setProgress(0)
        setLoading(true)

        try {
            // Parse GitHub URL or owner/repo string
            let owner, repo
            const urlMatch = repoInput.match(/github\.com\/([^/]+)\/([^/\s#?]+)/)
            if (urlMatch) {
                owner = urlMatch[1]
                repo = urlMatch[2].replace(/\.git$/, '')
            } else {
                const parts = repoInput.trim().replace(/^\/|\/$/g, '').split('/')
                if (parts.length === 2) {
                    owner = parts[0]
                    repo = parts[1]
                } else {
                    throw new Error('Invalid format. Use "owner/repo" or a GitHub URL.')
                }
            }

            setProgress(10)

            // Fetch default branch
            const repoRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
            if (!repoRes.ok) {
                if (repoRes.status === 404) throw new Error(`Repository "${owner}/${repo}" not found. Make sure it's public.`)
                if (repoRes.status === 403) throw new Error('GitHub API rate limit exceeded. Try again in a minute.')
                throw new Error(`GitHub API error: ${repoRes.status}`)
            }
            const repoData = await repoRes.json()
            const branch = repoData.default_branch || 'main'

            setProgress(25)

            // Fetch full file tree
            const treeRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
            if (!treeRes.ok) throw new Error('Failed to fetch repository file tree.')
            const treeData = await treeRes.json()

            if (treeData.truncated) {
                logger.warn('Repository tree was truncated (very large repo)')
            }

            if (!treeData.tree || !Array.isArray(treeData.tree)) {
                throw new Error('Invalid repository tree response from GitHub API.')
            }

            setProgress(45)

            // Fetch recent commits and their per-file change lists for accurate author attribution
            let commitAuthors = {} // path → author name
            let authorEmails = {} // authorName → email (for Gravatar)
            let fileCommitCounts = {} // path → { author → count }
            try {
                const commitsRes = await fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=100`)
                if (commitsRes.ok) {
                    const commitsData = await commitsRes.json()

                    // Build global author frequency from ALL 100 commits
                    const globalAuthorFreq = {} // author → commit count
                    for (const c of commitsData) {
                        const name = c.commit?.author?.name
                        const email = c.commit?.author?.email
                        if (name) {
                            globalAuthorFreq[name] = (globalAuthorFreq[name] || 0) + 1
                            if (email) authorEmails[name] = email
                        }
                    }

                    // Fetch file lists from 30 most recent commits for broader coverage
                    const detailPromises = commitsData.slice(0, 30).map(c =>
                        fetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${c.sha}`)
                            .then(r => r.ok ? r.json() : null)
                            .catch(() => null)
                    )
                    const details = await Promise.all(detailPromises)

                    // Build path → author mapping from real commit file lists
                    for (const detail of details) {
                        if (!detail?.files) continue
                        const author = detail.commit?.author?.name || 'Unknown'
                        for (const file of detail.files) {
                            if (!commitAuthors[file.filename]) {
                                commitAuthors[file.filename] = author
                            }
                            if (!fileCommitCounts[file.filename]) fileCommitCounts[file.filename] = {}
                            fileCommitCounts[file.filename][author] = (fileCommitCounts[file.filename][author] || 0) + 1
                        }
                    }

                    // Build directory → author distribution from detailed commits
                    // Walk all ancestor directories for each file, not just immediate parent
                    const dirAuthorCounts = {}
                    for (const [path, authors] of Object.entries(fileCommitCounts)) {
                        const parts = path.split('/')
                        // Attribute to every ancestor directory level
                        for (let depth = 1; depth < parts.length; depth++) {
                            const dir = parts.slice(0, depth).join('/')
                            if (!dirAuthorCounts[dir]) dirAuthorCounts[dir] = {}
                            for (const [author, count] of Object.entries(authors)) {
                                dirAuthorCounts[dir][author] = (dirAuthorCounts[dir][author] || 0) + count
                            }
                        }
                        // Also attribute to (root) for root-level files
                        if (parts.length === 1) {
                            if (!dirAuthorCounts['(root)']) dirAuthorCounts['(root)'] = {}
                            for (const [author, count] of Object.entries(authors)) {
                                dirAuthorCounts['(root)'][author] = (dirAuthorCounts['(root)'][author] || 0) + count
                            }
                        }
                    }

                    // Helper: pick author from a weighted distribution using a deterministic seed
                    const pickWeightedAuthor = (authorCounts, seed) => {
                        const entries = Object.entries(authorCounts).sort((a, b) => b[1] - a[1])
                        const total = entries.reduce((s, e) => s + e[1], 0)
                        // Deterministic pseudo-random from seed (simple hash mod)
                        let hash = 0
                        for (let i = 0; i < seed.length; i++) {
                            hash = ((hash << 5) - hash + seed.charCodeAt(i)) | 0
                        }
                        const pick = ((hash >>> 0) % total)
                        let cumulative = 0
                        for (const [author, count] of entries) {
                            cumulative += count
                            if (pick < cumulative) return author
                        }
                        return entries[0][0]
                    }

                    // Assign remaining files using weighted directory attribution
                    for (const item of treeData.tree) {
                        if (item.type !== 'blob' || commitAuthors[item.path]) continue

                        // Walk up directory tree to find the closest directory with author data
                        const parts = item.path.split('/')
                        let assigned = false
                        for (let depth = parts.length - 1; depth >= 1; depth--) {
                            const dir = parts.slice(0, depth).join('/')
                            if (dirAuthorCounts[dir]) {
                                commitAuthors[item.path] = pickWeightedAuthor(dirAuthorCounts[dir], item.path)
                                assigned = true
                                break
                            }
                        }
                        // Check (root) level
                        if (!assigned && dirAuthorCounts['(root)']) {
                            commitAuthors[item.path] = pickWeightedAuthor(dirAuthorCounts['(root)'], item.path)
                            assigned = true
                        }
                        // Ultimate fallback: distribute across ALL authors by global commit frequency
                        if (!assigned && Object.keys(globalAuthorFreq).length > 0) {
                            commitAuthors[item.path] = pickWeightedAuthor(globalAuthorFreq, item.path)
                        }
                    }
                }
            } catch {
                // Non-critical — author data is optional
            }

            setProgress(50)

            // Filter to source code files only
            const EXT_TO_LANG = {
                '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
                '.ts': 'typescript', '.tsx': 'typescript',
                '.py': 'python', '.pyw': 'python',
                '.java': 'java',
                '.go': 'go',
                '.rs': 'rust',
                '.rb': 'ruby',
                '.php': 'php',
                '.c': 'c', '.h': 'c',
                '.cpp': 'cpp', '.hpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp',
                '.cs': 'csharp',
                '.swift': 'swift',
                '.kt': 'kotlin', '.kts': 'kotlin',
                '.scala': 'scala',
                '.vue': 'vue',
                '.svelte': 'svelte',
                '.dart': 'dart',
                '.lua': 'lua',
                '.r': 'r', '.R': 'r',
                '.sql': 'sql',
                '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell',
                '.css': 'css', '.scss': 'scss', '.less': 'less',
                '.html': 'html', '.htm': 'html',
            }

            const IGNORE_DIRS = new Set([
                'node_modules', '.git', 'dist', 'build', 'vendor', '__pycache__',
                '.next', '.nuxt', 'coverage', '.cache', 'target', '.venv', 'venv',
            ])

            const sourceFiles = treeData.tree.filter(item => {
                if (item.type !== 'blob') return false
                // Check for ignored directories
                const parts = item.path.split('/')
                if (parts.some(p => IGNORE_DIRS.has(p))) return false
                // Check extension
                const lastDot = item.path.lastIndexOf('.')
                if (lastDot === -1) return false
                const ext = item.path.substring(lastDot).toLowerCase()
                return EXT_TO_LANG[ext] !== undefined
            })

            if (sourceFiles.length === 0) {
                throw new Error('No source code files found in this repository.')
            }

            setProgress(65)

            // Build city data from file tree
            const DISTRICT_COLORS = [
                '#FF6B6B', '#45B7D1', '#96CEB4', '#4ECDC4', '#DDA0DD',
                '#FFEAA7', '#74B9FF', '#FD79A8', '#A29BFE', '#55E6C1',
                '#FC427B', '#F8B500', '#6C5CE7', '#00B894', '#E17055',
            ]

            // Group files by top-level directory
            const dirGroups = {}
            for (const file of sourceFiles) {
                const parts = file.path.split('/')
                const dir = parts.length > 1 ? parts.slice(0, -1).join('/') : '(root)'
                if (!dirGroups[dir]) dirGroups[dir] = []
                dirGroups[dir].push(file)
            }

            // Create districts from directory groups
            const dirNames = Object.keys(dirGroups).sort()
            const districts = []
            const districtMap = {}

            // Merge small directories (< 3 files) into parent or (misc)
            // Threshold matches DistrictLabels' filter (building_count >= 3)
            const mergedGroups = {}
            for (const dir of dirNames) {
                if (dirGroups[dir].length < 3 && dir !== '(root)') {
                    const parent = dir.includes('/') ? dir.split('/')[0] : '(misc)'
                    if (!mergedGroups[parent]) mergedGroups[parent] = []
                    mergedGroups[parent].push(...dirGroups[dir])
                } else {
                    if (!mergedGroups[dir]) mergedGroups[dir] = []
                    mergedGroups[dir].push(...dirGroups[dir])
                }
            }

            const finalDirNames = Object.keys(mergedGroups).sort()
            const cols = Math.ceil(Math.sqrt(finalDirNames.length))
            const rows = Math.ceil(finalDirNames.length / cols)

            // Compute per-district grid sizes first
            const districtSizes = finalDirNames.map(dir => {
                const files = mergedGroups[dir]
                return Math.ceil(Math.sqrt(files.length)) * 25 + 20
            })

            // Use uniform cell size (max across all districts) for consistent grid
            const cellSize = Math.max(...districtSizes, 60)
            const cellSpacing = cellSize + 40
            const totalW = cols * cellSpacing
            const totalH = rows * cellSpacing

            finalDirNames.forEach((dir, idx) => {
                const districtId = `district_${idx}`
                const col = idx % cols
                const row = Math.floor(idx / cols)
                const files = mergedGroups[dir]

                const cx = col * cellSpacing - totalW / 2 + cellSpacing / 2
                const cy = row * cellSpacing - totalH / 2 + cellSpacing / 2

                districts.push({
                    id: districtId,
                    name: dir,
                    color: DISTRICT_COLORS[idx % DISTRICT_COLORS.length],
                    center: { x: cx, y: cy },
                    boundary: [
                        { x: cx - cellSize / 2, y: cy - cellSize / 2 },
                        { x: cx + cellSize / 2, y: cy - cellSize / 2 },
                        { x: cx + cellSize / 2, y: cy + cellSize / 2 },
                        { x: cx - cellSize / 2, y: cy + cellSize / 2 },
                    ],
                    building_count: files.length,
                })

                districtMap[dir] = districtId
            })

            setProgress(80)

            // Create buildings
            const maxSize = Math.max(...sourceFiles.map(f => f.size || 100))
            const buildings = []
            const languageCounts = {}

            for (const dir of finalDirNames) {
                const files = mergedGroups[dir]
                const districtId = districtMap[dir]
                const district = districts.find(d => d.id === districtId)
                const bcols = Math.ceil(Math.sqrt(files.length))
                const brows = Math.ceil(files.length / bcols)

                // Compute spacing to fit buildings within the district boundary with padding
                const usableSize = cellSize - 10 // 5px padding each side
                const spacing = Math.min(23, usableSize / Math.max(bcols, brows))

                files.forEach((file, fileIdx) => {
                    const ext = file.path.substring(file.path.lastIndexOf('.')).toLowerCase()
                    const lang = EXT_TO_LANG[ext] || 'unknown'
                    languageCounts[lang] = (languageCounts[lang] || 0) + 1

                    const size = file.size || 100
                    // Log-scale sizing prevents one huge file from crushing everything else
                    const logSize = Math.log2(size + 1)
                    const logMax = Math.log2(maxSize + 1)
                    const sizeNorm = logSize / Math.max(logMax, 1)

                    const width = Math.max(4, 4 + 14 * sizeNorm)
                    const height = Math.max(5, 5 + 55 * sizeNorm)
                    const depth = width

                    const fcol = fileIdx % bcols
                    const frow = Math.floor(fileIdx / bcols)
                    const offsetX = district.center.x + (fcol - (bcols - 1) / 2) * spacing
                    const offsetZ = district.center.y + (frow - (brows - 1) / 2) * spacing

                    const name = file.path.split('/').pop()
                    const complexity = Math.ceil(1 + (size / 500))
                    const fileAuthor = commitAuthors[file.path] || null
                    const fileAuthorEmail = fileAuthor ? (authorEmails[fileAuthor] || null) : null

                    buildings.push({
                        id: file.path,
                        name,
                        path: file.path,
                        file_path: file.path,
                        language: lang,
                        author: fileAuthor,
                        email: fileAuthorEmail,
                        district_id: districtId,
                        directory: file.path.includes('/') ? file.path.substring(0, file.path.lastIndexOf('/')) : '(root)',
                        position: { x: offsetX, y: 0, z: offsetZ },
                        dimensions: { width, height, depth },
                        color_metric: sizeNorm,
                        coupling_score: 0,
                        lines_of_code: Math.ceil(size / 40),
                        complexity,
                        in_degree: 0,
                        functions: [],
                        classes: [],
                        imports: [],
                        metrics: {
                            size_bytes: size,
                            loc: Math.ceil(size / 40),
                            complexity,
                            churn: 0,
                            commits: 0,
                            age_days: 0,
                            dependencies_in: 0,
                            debt: sizeNorm > 0.7 ? sizeNorm : 0,
                        },
                    })
                })
            }

            setProgress(90)

            // Build roads from co-directory proximity (files in same dir are connected)
            const roads = []
            for (const dir of finalDirNames) {
                const files = mergedGroups[dir]
                for (let i = 0; i < files.length - 1 && i < 5; i++) {
                    const src = buildings.find(b => b.id === files[i].path)
                    const tgt = buildings.find(b => b.id === files[i + 1].path)
                    if (src && tgt) {
                        roads.push({
                            id: `${src.id}->${tgt.id}`,
                            source: src.id,
                            target: tgt.id,
                            from_position: { ...src.position },
                            to_position: { ...tgt.position },
                        })
                    }
                }
            }

            const cityData = {
                name: `${owner}/${repo}`,
                path: `github:${owner}/${repo}`,
                city_id: `github_${owner}_${repo}_${Date.now()}`,
                analyzed_at: new Date().toISOString(),
                source: 'github',
                buildings,
                districts,
                roads,
                metrics: {
                    total_files: buildings.length,
                    total_lines: buildings.reduce((s, b) => s + (b.metrics?.loc || 0), 0),
                    languages: languageCounts,
                    avg_complexity: buildings.reduce((s, b) => s + b.complexity, 0) / buildings.length,
                },
                dependency_graph: { nodes: buildings.map(b => ({ id: b.id })), edges: [] },
                metadata: { issues: { god_objects: [], circular_dependencies: [] } },
            }

            setProgress(95)
            await new Promise(r => setTimeout(r, 800))

            setCityData(cityData)
            set({ currentRepoPath: `${owner}/${repo}`, commits: [], currentCommitIndex: -1 })

        } catch (error) {
            logger.error("GitHub Analysis Error:", error)
            setError(error.message || 'GitHub analysis failed')
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
        if ((cityData?.source === 'github' || cityData?.source === 'github-client') && cityData?.name) {
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
