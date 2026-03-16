import logger from '../../utils/logger'
import { ghFetch, ghFetchBatch, ghFetchRaw } from '../../engine/api/githubApi'
import { getCachedCity, cacheCity } from '../../utils/cityCache'

/**
 * City Slice
 * Handles all domain data: City structure, Metadata, Analysis, and File Content.
 * Fully client-side — no backend required.
 */

// Module-level file content cache — kept outside Zustand to avoid state bloat.
// For large repos, fileContents can be 50MB+. Storing in Zustand would cause
// every subscriber to re-render when any state changes.
let _fileContentCache = null // Map or Object of path → content

export function getFileContentCache() { return _fileContentCache }
export function clearFileContentCache() { _fileContentCache = null }

export const createCitySlice = (set, get) => ({
    // State
    cityData: null,
    masterCityData: null, // Ground-truth robust AST map for timeline projection
    cityId: null, // Cache key for API calls
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
        // Extract fileContents from data before storing in Zustand.
        // This prevents 50MB+ of source code from bloating reactive state.
        if (data.fileContents) {
            _fileContentCache = data.fileContents
            data = { ...data }
            delete data.fileContents
        }

        // Use city_id from API response, or generate from path as fallback
        let cityId = data.city_id
        if (!cityId) {
            const path = data.path || ''
            cityId = path.replace(/\//g, '_').replace(/:/g, '').replace(/\\/g, '_').replace(/^_/, '')
        }

        // Pre-compute rank-based color_metric for buildings that don't have one.
        // This ensures the default color gradient distributes evenly across the full
        // cyan→blue→violet→magenta→orange→rose range regardless of LOC distribution.
        if (data.buildings?.length) {
            const needsMetric = data.buildings.some(b => b.color_metric == null)
            if (needsMetric) {
                const sorted = data.buildings
                    .map((b, i) => ({ i, loc: b.metrics?.loc || b.lines_of_code || 0 }))
                    .sort((a, b) => a.loc - b.loc)
                const n = sorted.length
                for (let rank = 0; rank < n; rank++) {
                    const b = data.buildings[sorted[rank].i]
                    if (b.color_metric == null) {
                        b.color_metric = n > 1 ? rank / (n - 1) : 0.5
                    }
                }
            }
        }

        // Check if this is the background demo city loaded by the Landing Page
        // We do not want to dismiss the landing page if it's just loading the backdrop.
        const isDemoBackdrop = data.id?.startsWith('demo_') || window.location.pathname === '/' && get().isLandingOverlayActive && !data.source

        set((state) => ({
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
            // Update existing drift (immutable replace to avoid stale refs)
            newDrifts[existingDriftIndex] = { ...newDrifts[existingDriftIndex], newDistrictId };
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

            // Check IndexedDB before doing any expensive network work
            const cacheKey = `github:${owner}/${repo}`
            const cachedData = await getCachedCity(cacheKey)
            if (cachedData) {
                setProgress(100)
                setCityData(cachedData)
                set({ currentRepoPath: `${owner}/${repo}`, commits: [], currentCommitIndex: -1 })
                return
            }

            setProgress(10)

            // Fetch default branch
            let repoData
            try {
                const res = await ghFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
                repoData = res.data
            } catch (err) {
                if (err.message === 'not_found') throw new Error(`Repository "${owner}/${repo}" not found. Make sure it's public.`)
                throw err
            }
            const branch = repoData.default_branch || 'main'

            setProgress(25)

            // Fetch full file tree
            const treeResult = await ghFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/git/trees/${encodeURIComponent(branch)}?recursive=1`)
            const treeData = treeResult.data

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
                const commitsResult = await ghFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits?per_page=100`)
                if (commitsResult.data) {
                    const commitsData = commitsResult.data

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

                    // Fetch file lists from 10 most recent commits (reduced from 30 to conserve rate limit)
                    const commitUrls = commitsData.slice(0, 10).map(c =>
                        `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/commits/${c.sha}`
                    )
                    const details = await ghFetchBatch(commitUrls)

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

            // Compute per-district cell sizes — each district sized to its own content
            // Ensure cells are large enough so buildings never overlap (min 24-unit spacing)
            const districtCellSizes = finalDirNames.map(dir => {
                const files = mergedGroups[dir]
                const gridSide = Math.ceil(Math.sqrt(files.length))
                const contentBased = gridSide * 25 + 20
                const overlapSafe = gridSide * 24 + 10 // 24 min spacing + 10 margin
                return Math.max(60, contentBased, overlapSafe)
            })

            // Grid layout with per-district sizes: use cumulative offsets
            // Build rows of districts with adaptive widths
            const districtGap = 40
            const rowHeights = []
            const colWidths = []

            // Calculate max dimensions per grid row/column
            for (let r = 0; r < rows; r++) {
                let maxH = 0
                for (let c = 0; c < cols; c++) {
                    const idx = r * cols + c
                    if (idx < finalDirNames.length) {
                        maxH = Math.max(maxH, districtCellSizes[idx])
                    }
                }
                rowHeights.push(maxH)
            }
            for (let c = 0; c < cols; c++) {
                let maxW = 0
                for (let r = 0; r < rows; r++) {
                    const idx = r * cols + c
                    if (idx < finalDirNames.length) {
                        maxW = Math.max(maxW, districtCellSizes[idx])
                    }
                }
                colWidths.push(maxW)
            }

            const totalW = colWidths.reduce((s, w) => s + w + districtGap, -districtGap)
            const totalH = rowHeights.reduce((s, h) => s + h + districtGap, -districtGap)

            finalDirNames.forEach((dir, idx) => {
                const districtId = `district_${idx}`
                const col = idx % cols
                const row = Math.floor(idx / cols)
                const files = mergedGroups[dir]
                const thisCellSize = districtCellSizes[idx]

                // Compute center from cumulative offsets
                let cx = -totalW / 2
                for (let c = 0; c < col; c++) cx += colWidths[c] + districtGap
                cx += colWidths[col] / 2

                let cy = -totalH / 2
                for (let r = 0; r < row; r++) cy += rowHeights[r] + districtGap
                cy += rowHeights[row] / 2

                districts.push({
                    id: districtId,
                    name: dir,
                    color: DISTRICT_COLORS[idx % DISTRICT_COLORS.length],
                    center: { x: cx, y: cy },
                    boundary: [
                        { x: cx - thisCellSize / 2, y: cy - thisCellSize / 2 },
                        { x: cx + thisCellSize / 2, y: cy - thisCellSize / 2 },
                        { x: cx + thisCellSize / 2, y: cy + thisCellSize / 2 },
                        { x: cx - thisCellSize / 2, y: cy + thisCellSize / 2 },
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

            for (let di = 0; di < finalDirNames.length; di++) {
                const dir = finalDirNames[di]
                const files = mergedGroups[dir]
                const districtId = districtMap[dir]
                const district = districts.find(d => d.id === districtId)
                const thisCellSize = districtCellSizes[di]
                const bcols = Math.ceil(Math.sqrt(files.length))
                const brows = Math.ceil(files.length / bcols)

                // Spacing adapts to THIS district's size with overlap guard
                const usableSize = thisCellSize - 10
                const rawSpacing = usableSize / Math.max(bcols, brows)
                // Prevent overlap: minimum gap = max possible building width (20) + 4
                const spacing = Math.max(24, rawSpacing)

                files.forEach((file, fileIdx) => {
                    const ext = file.path.substring(file.path.lastIndexOf('.')).toLowerCase()
                    const lang = EXT_TO_LANG[ext] || 'unknown'
                    languageCounts[lang] = (languageCounts[lang] || 0) + 1

                    const size = file.size || 100
                    // Log-scale sizing prevents one huge file from crushing everything else
                    const logSize = Math.log2(size + 1)
                    const logMax = Math.log2(maxSize + 1)
                    const sizeNorm = logSize / Math.max(logMax, 1)

                    const width = Math.max(8, 8 + 12 * sizeNorm)
                    const height = Math.max(8, 8 + 72 * sizeNorm)
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
            const buildingById = new Map(buildings.map(b => [b.id, b]))
            const roads = []
            for (const dir of finalDirNames) {
                const files = mergedGroups[dir]
                for (let i = 0; i < files.length - 1 && i < 5; i++) {
                    const src = buildingById.get(files[i].path)
                    const tgt = buildingById.get(files[i + 1].path)
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
                branch,
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
            cacheCity(cacheKey, cityData).catch(() => {}) // Persist for next visit (24h TTL)
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
        set({ fileContent: { path, content: null, loading: true, error: null } })

        try {
            const { cityData } = get()

            // Demo mode
            if (cityData?.id?.startsWith('demo_')) {
                set({ fileContent: { path, content: '// Source code not available in demo mode.\n// Try analyzing a real GitHub repository!', loading: false } })
                return
            }

            // Check in-memory file contents first (from client-side analysis)
            if (_fileContentCache) {
                // Try exact match
                let content = _fileContentCache.get?.(path) || _fileContentCache[path]

                // Try matching by normalized path (handles relative vs absolute)
                if (!content) {
                    const cleanPath = path.replace(/^[./\\]+/, '').replace(/\\/g, '/')
                    const entries = _fileContentCache instanceof Map
                        ? [..._fileContentCache.entries()]
                        : Object.entries(_fileContentCache)

                    for (const [key, val] of entries) {
                        const cleanKey = key.replace(/^[./\\]+/, '').replace(/\\/g, '/')
                        if (cleanKey === cleanPath || cleanKey.endsWith(cleanPath) || cleanPath.endsWith(cleanKey)) {
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
                const repoName = cityData.name
                const cleanPath = path.replace(/^[./\\]+/, '').replace(/\\/g, '/')
                // Guard against path traversal attempts
                if (cleanPath.includes('..') || cleanPath.startsWith('http') || /[<>"'|?*]/.test(cleanPath)) {
                    set({ fileContent: { path, content: '', loading: false }, error: 'Invalid file path' })
                    return
                }
                const ref = cityData.branch || 'main'
                const mainUrl = `https://raw.githubusercontent.com/${repoName}/${ref}/${cleanPath}`
                const headUrl = `https://raw.githubusercontent.com/${repoName}/HEAD/${cleanPath}`
                try {
                    // Race both branch and HEAD fetches in parallel
                    const controller = new AbortController()
                    const timeout = setTimeout(() => controller.abort(), 8000)
                    const results = await Promise.allSettled([
                        ghFetchRaw(mainUrl, { signal: controller.signal }),
                        ghFetchRaw(headUrl, { signal: controller.signal })
                    ])
                    clearTimeout(timeout)
                    const success = results.find(r => r.status === 'fulfilled' && r.value.ok)
                    if (success) {
                        const content = await success.value.text()
                        set({ fileContent: { path, content, loading: false } })
                        return
                    }
                } catch {
                    // Fall through to error
                }
            }

            set({ fileContent: { path, content: null, loading: false, error: 'File content not available. Re-analyze the repository to load source code.' } })
        } catch (err) {
            // Safety net — never leave loading stuck
            set({ fileContent: { path, content: null, loading: false, error: err.message || 'Failed to load file content.' } })
        }
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
