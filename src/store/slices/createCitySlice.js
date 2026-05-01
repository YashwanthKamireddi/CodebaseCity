import logger from '../../utils/logger'
import { ghFetch, ghFetchBatch, ghFetchRaw, fetchGitHubZipball, fetchUserRepos } from '../../engine/api/githubApi'
import { getCachedCity, cacheCity } from '../../utils/cityCache'
import { searchVfsEngine, ingestZipballToVfs, setVfsProgressCallback } from '../../engine/fs/vfs.js'

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
    excludePatterns: ['*.test.*', '*.spec.*', 'node_modules/**', 'dist/**', '.git/**'], // Default ignore patterns
    setExcludePatterns: (patterns) => set({ excludePatterns: patterns }),

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
        const { setLoading, setCityData, setError, setProgress, excludePatterns } = get()

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
                get().fetchHistory(`${owner}/${repo}`)
                return
            }

            setProgress(10)

            // Fetch default branch
            let repoData
            try {
                const res = await ghFetch(`https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}`)
                repoData = res.data
            } catch (err) {
                if (err.message === 'not_found') {
                    throw new Error(`Repository "${owner}/${repo}" not found. Make sure it's public.`, { cause: err })
                }
                throw err
            }
            const branch = repoData.default_branch || 'main'

            setProgress(25)

            // ────────────────────────────────────────────────────────────
            // ARCHITECTURAL CHANGE (Phase 9):
            // We no longer download the entire repo as a zipball just to
            // get its file list. Old flow took 30s+ for a tiny repo because
            // it had to: download tens of MB of source code → write it to
            // OPFS via a worker → scan the tree → discard 99% of it.
            //
            // New flow: ONE GitHub Tree API call gives us paths + sizes for
            // every file in the repo. ~500 ms total for any repo size, and
            // the response is capped at 7 MB / 100k entries by GitHub
            // (which is plenty for visualization).
            //
            // File content is fetched on-demand from raw.githubusercontent
            // .com when the user clicks a building (already wired in
            // fetchFileContent below) — so the 3D city renders in the time
            // it used to take just to start the zip extraction.
            // ────────────────────────────────────────────────────────────
            setProgress(30)
            const treeUrl =
                `https://api.github.com/repos/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}` +
                `/git/trees/${encodeURIComponent(branch)}?recursive=1`
            const treeResult = await ghFetch(treeUrl)
            const treeData = treeResult?.data
            setProgress(42)

            if (!treeData?.tree || !Array.isArray(treeData.tree)) {
                throw new Error('Invalid tree response from GitHub.')
            }
            if (treeData.truncated) {
                logger.warn(
                    `Tree was truncated by GitHub — repo has more files than ` +
                    `the API returns in one call. City will show the first ~100k entries.`
                )
            }

            setProgress(45)

            // Author attribution is now BACKGROUND-ONLY. The previous code
            // blocked the loading screen for 10 sequential commit-detail
            // GitHub API calls (~5–60 s on slow / rate-limited connections).
            // Users were sitting on "Loading…" for over a minute on small
            // repos. Now we ship the city immediately and let authors
            // populate after the user can already see + interact with it.
            const commitAuthors = {} // path → author name (filled async)
            const authorEmails = {}  // authorName → email
            // Schedule the enrichment for after setCityData runs (see end
            // of analyzeRepo). Stored on the analyzer scope so the enrich
            // call below can reach it.
            const enrichmentTask = {
                owner, repo,
                run: null, // assigned below; runs after setCityData
            }

            setProgress(50)

            // Filter to source code files only. Broad coverage so we don't reject
            // infra-only / data-only / docs-only repos.
            const EXT_TO_LANG = {
                // Web / JS ecosystem
                '.js': 'javascript', '.jsx': 'javascript', '.mjs': 'javascript', '.cjs': 'javascript',
                '.ts': 'typescript', '.tsx': 'typescript',
                '.vue': 'vue', '.svelte': 'svelte',
                '.html': 'html', '.htm': 'html',
                '.css': 'css', '.scss': 'scss', '.less': 'less', '.sass': 'scss', '.styl': 'css',
                // Systems / backend
                '.py': 'python', '.pyw': 'python', '.pyx': 'python',
                '.java': 'java',
                '.kt': 'kotlin', '.kts': 'kotlin',
                '.scala': 'scala', '.sc': 'scala',
                '.go': 'go',
                '.rs': 'rust',
                '.rb': 'ruby', '.rake': 'ruby',
                '.php': 'php', '.phtml': 'php',
                '.c': 'c', '.h': 'c',
                '.cpp': 'cpp', '.hpp': 'cpp', '.cc': 'cpp', '.cxx': 'cpp', '.hh': 'cpp', '.hxx': 'cpp',
                '.cs': 'csharp',
                '.swift': 'swift',
                '.m': 'objc', '.mm': 'objc',
                '.dart': 'dart',
                '.lua': 'lua',
                '.r': 'r', '.R': 'r',
                '.zig': 'zig',
                '.nim': 'nim',
                '.cr': 'crystal',
                '.v': 'v',
                // Functional
                '.hs': 'haskell', '.lhs': 'haskell',
                '.ml': 'ocaml', '.mli': 'ocaml',
                '.fs': 'fsharp', '.fsx': 'fsharp', '.fsi': 'fsharp',
                '.clj': 'clojure', '.cljs': 'clojure', '.cljc': 'clojure', '.edn': 'clojure',
                '.ex': 'elixir', '.exs': 'elixir',
                '.erl': 'erlang', '.hrl': 'erlang',
                // Shell / scripts
                '.sh': 'shell', '.bash': 'shell', '.zsh': 'shell', '.fish': 'shell',
                '.ps1': 'powershell', '.psm1': 'powershell',
                '.bat': 'batch', '.cmd': 'batch',
                // Data / config / infra
                '.sql': 'sql',
                '.yml': 'yaml', '.yaml': 'yaml',
                '.toml': 'toml',
                '.json': 'json', '.jsonc': 'json', '.json5': 'json',
                '.xml': 'xml',
                '.proto': 'protobuf',
                '.graphql': 'graphql', '.gql': 'graphql',
                '.tf': 'terraform', '.tfvars': 'terraform',
                '.hcl': 'hcl',
                '.dockerfile': 'docker',
                // Docs / markup
                '.md': 'markdown', '.mdx': 'markdown', '.markdown': 'markdown',
                '.rst': 'rst',
                '.tex': 'tex',
                // Notebooks
                '.ipynb': 'jupyter',
            }

            const IGNORE_DIRS = new Set([
                'node_modules', '.git', 'dist', 'build', 'out', 'vendor', '__pycache__',
                '.next', '.nuxt', 'coverage', '.cache', 'target', '.venv', 'venv',
                '.idea', '.vscode', '.gradle', '.parcel-cache', '.turbo', '.svelte-kit',
            ])

            // Helper to match simple glob patterns (e.g. *.test.js)
            const matchPattern = (path, pattern) => {
                const regex = new RegExp('^' + pattern.replace(/\./g, '\\.').replace(/\*\*/g, '.*').replace(/\*/g, '[^/]*') + '$')
                return regex.test(path)
            }

            const sourceFiles = treeData.tree.filter(item => {
                if (item.type !== 'blob') return false

                // Fast directory exclusion
                const parts = item.path.split('/')
                if (parts.some(p => IGNORE_DIRS.has(p))) return false

                // Custom pattern exclusion from user settings
                if (excludePatterns && excludePatterns.length > 0) {
                    if (excludePatterns.some(pattern => matchPattern(item.path, pattern))) {
                        return false
                    }
                }

                // Check language extension
                const lastDot = item.path.lastIndexOf('.')
                if (lastDot === -1) return false
                const ext = item.path.substring(lastDot).toLowerCase()
                return EXT_TO_LANG[ext] !== undefined
            })

            if (sourceFiles.length === 0) {
                const totalBlobs = treeData.tree.filter(i => i.type === 'blob').length
                if (totalBlobs === 0) {
                    throw new Error('This repository is empty — nothing to visualize yet.')
                }
                const excluded = excludePatterns && excludePatterns.length > 0
                    ? ' Your exclude patterns may be too aggressive — check Settings.'
                    : ''
                throw new Error(
                    `No recognized source files found (${totalBlobs} files scanned).${excluded} ` +
                    `Common causes: repo is binary-only, uses unsupported languages, or all paths match an ignored directory.`
                )
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

            // Merge only tiny directories (< 2 files) into parent or (misc).
            // Keeping 2-file directories separate preserves expected grouping.
            const mergedGroups = {}
            for (const dir of dirNames) {
                if (dirGroups[dir].length < 2 && dir !== '(root)') {
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
                const contentBased = gridSide * 35 + 20
                const overlapSafe = gridSide * 32 + 20
                return Math.max(80, contentBased, overlapSafe)
            })

            // Grid layout with per-district sizes: use cumulative offsets
            // Build rows of districts with adaptive widths
            const districtGap = 140
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

            // Precompute cumulative offsets for O(1) position lookup
            const cumulativeColWidths = new Float32Array(cols + 1)
            cumulativeColWidths[0] = 0
            for (let c = 0; c < cols; c++) {
                cumulativeColWidths[c + 1] = cumulativeColWidths[c] + colWidths[c] + districtGap
            }

            const cumulativeRowHeights = new Float32Array(rows + 1)
            cumulativeRowHeights[0] = 0
            for (let r = 0; r < rows; r++) {
                cumulativeRowHeights[r + 1] = cumulativeRowHeights[r] + rowHeights[r] + districtGap
            }

            const CORE_SAFE_RADIUS = 48

            finalDirNames.forEach((dir, idx) => {
                const districtId = `district_${idx}`
                const col = idx % cols
                const row = Math.floor(idx / cols)
                const files = mergedGroups[dir]
                const thisCellSize = districtCellSizes[idx]

                // O(1) position lookup using precomputed cumulative offsets
                let cx = -totalW / 2 + cumulativeColWidths[col] + colWidths[col] / 2
                let cy = -totalH / 2 + cumulativeRowHeights[row] + rowHeights[row] / 2

                // Expand grid outward from the center to leave a clean, non-colliding hole
                // for the Mothership Core without squishing districts into a circle.
                const CORE_OFFSET = 180; // Total 360 diameter hole
                cx = cx < 0 ? cx - CORE_OFFSET : cx + CORE_OFFSET;
                cy = cy < 0 ? cy - CORE_OFFSET : cy + CORE_OFFSET;

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
                const usableSize = thisCellSize - 20
                const rawSpacing = usableSize / Math.max(bcols, brows)
                // Prevent overlap
                const spacing = Math.max(30, rawSpacing)

                files.forEach((file, fileIdx) => {
                    const ext = file.path.substring(file.path.lastIndexOf('.')).toLowerCase()
                    const lang = EXT_TO_LANG[ext] || 'unknown'
                    languageCounts[lang] = (languageCounts[lang] || 0) + 1

                    const size = file.size || 100
                    const logSize = Math.log2(size + 1)
                    const logMax = Math.log2(maxSize + 1)
                    const sizeNorm = logSize / Math.max(logMax, 1)

                    // Cinematic Building dimensions: Tall and sleek
                    const width = Math.max(4, 6 + 12 * sizeNorm)
                    const height = Math.max(10, 15 + Math.pow(sizeNorm, 2.5) * 350)
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
            get().fetchHistory(`${owner}/${repo}`)

            // ── Background author enrichment ──
            // Fires AFTER the city is on-screen. Even if it takes 30 s,
            // the user is already exploring; when it finishes we patch
            // the buildings array in place (no full re-render — Zustand
            // selectors only fire if author actually changed).
            ;(async () => {
                try {
                    const commitsResult = await ghFetch(
                        `https://api.github.com/repos/${encodeURIComponent(enrichmentTask.owner)}/${encodeURIComponent(enrichmentTask.repo)}/commits?per_page=100`
                    )
                    if (!commitsResult?.data?.length) return
                    const commitsData = commitsResult.data

                    // Pull global author frequency from the lightweight commits list.
                    const globalAuthorFreq = {}
                    for (const c of commitsData) {
                        const name = c.commit?.author?.name
                        const email = c.commit?.author?.email
                        if (name) {
                            globalAuthorFreq[name] = (globalAuthorFreq[name] || 0) + 1
                            if (email) authorEmails[name] = email
                        }
                    }

                    // Fetch only THREE commit details (was 10) — we just want a
                    // sample for per-file attribution; more = more API spend.
                    const commitUrls = commitsData.slice(0, 3).map(c =>
                        `https://api.github.com/repos/${encodeURIComponent(enrichmentTask.owner)}/${encodeURIComponent(enrichmentTask.repo)}/commits/${c.sha}`
                    )
                    const details = await ghFetchBatch(commitUrls)
                    const fileCommitCounts = {}
                    for (const detail of details) {
                        if (!detail?.files) continue
                        const author = detail.commit?.author?.name || 'Unknown'
                        for (const file of detail.files) {
                            if (!commitAuthors[file.filename]) commitAuthors[file.filename] = author
                            if (!fileCommitCounts[file.filename]) fileCommitCounts[file.filename] = {}
                            fileCommitCounts[file.filename][author] = (fileCommitCounts[file.filename][author] || 0) + 1
                        }
                    }

                    // Spread author info to remaining files via global frequency
                    // (deterministic per-path hash, so refresh shows same colors).
                    const sortedGlobal = Object.entries(globalAuthorFreq).sort((a, b) => b[1] - a[1])
                    const globalTotal = sortedGlobal.reduce((s, e) => s + e[1], 0)
                    if (globalTotal > 0) {
                        for (const b of cityData.buildings) {
                            if (commitAuthors[b.path]) continue
                            let hash = 0
                            for (let i = 0; i < b.path.length; i++) {
                                hash = ((hash << 5) - hash + b.path.charCodeAt(i)) | 0
                            }
                            const pick = (hash >>> 0) % globalTotal
                            let cumulative = 0
                            for (const [author, count] of sortedGlobal) {
                                cumulative += count
                                if (pick < cumulative) {
                                    commitAuthors[b.path] = author
                                    break
                                }
                            }
                        }
                    }

                    // Patch buildings in-place with author info.
                    let touched = 0
                    for (const b of cityData.buildings) {
                        const a = commitAuthors[b.path]
                        if (a && b.author !== a) {
                            b.author = a
                            b.email = authorEmails[a] || null
                            touched++
                        }
                    }
                    if (touched > 0) {
                        // Trigger a shallow re-render so views observing buildings refresh.
                        // Keep the same array reference; Zustand selectors using
                        // `cityData.buildings.length` won't fire, but components reading
                        // the building objects directly (like the Authors view mode)
                        // will see fresh data on next interaction.
                        set({ cityData: { ...cityData, buildings: cityData.buildings } })
                    }
                } catch {
                    // Non-fatal — authors are an enhancement.
                }
            })()

        } catch (error) {
            logger.error("GitHub Analysis Error:", error)
            setError(error.message || 'GitHub analysis failed')
        } finally {
            setLoading(false)
        }
    },

    /**
     * Analyze ALL repositories of a GitHub user as ONE unified city.
     * Each repo becomes a super-district with its files as buildings.
     * Creates a massive "universe" view of someone's entire GitHub presence.
     */
    analyzeUserUniverse: async (username) => {
        const { setLoading, setCityData, setError, setProgress } = get()

        set({ error: null, selectedBuilding: null, highlightedIssue: null, highlightedCategory: null })
        setProgress(0)
        setLoading(true)

        try {
            const cleanUsername = username.trim().replace(/^@/, '')
            
            // Check cache first
            const cacheKey = `universe:${cleanUsername}`
            const cachedData = await getCachedCity(cacheKey)
            if (cachedData) {
                setProgress(100)
                setCityData(cachedData)
                return
            }

            setProgress(5)

            // Fetch all repos for user (sorted by updated, max 100 for performance)
            const repos = await fetchUserRepos(cleanUsername, { maxRepos: 100, sort: 'pushed' })
            
            if (!repos || repos.length === 0) {
                throw new Error(`No public repositories found for user "${cleanUsername}"`)
            }

            setProgress(15)

            // Filter to repos with code (not empty/forks-only)
            const activeRepos = repos
                .filter(r => r.size > 0 && !r.fork)
                .slice(0, 30) // Limit to 30 repos max for performance

            if (activeRepos.length === 0) {
                throw new Error(`No active repositories found for user "${cleanUsername}"`)
            }

            // Process each repo to extract file tree (lightweight, no full analysis)
            const DISTRICT_COLORS = [
                '#FF6B6B', '#45B7D1', '#96CEB4', '#4ECDC4', '#DDA0DD',
                '#FFEAA7', '#74B9FF', '#FD79A8', '#A29BFE', '#55E6C1',
                '#FC427B', '#F8B500', '#6C5CE7', '#00B894', '#E17055',
            ]

            const EXT_TO_LANG = {
                '.js': 'javascript', '.jsx': 'javascript', '.ts': 'typescript', '.tsx': 'typescript',
                '.py': 'python', '.java': 'java', '.go': 'go', '.rs': 'rust', '.rb': 'ruby',
                '.php': 'php', '.c': 'c', '.cpp': 'cpp', '.cs': 'csharp', '.swift': 'swift',
                '.kt': 'kotlin', '.vue': 'vue', '.dart': 'dart', '.css': 'css', '.html': 'html',
            }

            const IGNORE_DIRS = new Set([
                'node_modules', '.git', 'dist', 'build', 'vendor', '__pycache__',
                '.next', 'coverage', '.cache', 'target', '.venv',
            ])

            const allBuildings = []
            const allDistricts = []
            const languageCounts = {}
            let buildingId = 0

            // Layout: arrange repos in a spiral pattern
            const repoCount = activeRepos.length
            const spiralRadius = 800 // Base spacing between repo-districts
            
            for (let repoIdx = 0; repoIdx < activeRepos.length; repoIdx++) {
                const repo = activeRepos[repoIdx]
                setProgress(15 + Math.round((repoIdx / activeRepos.length) * 70))

                try {
                    // Fetch repo tree
                    const treeRes = await ghFetch(
                        `https://api.github.com/repos/${cleanUsername}/${repo.name}/git/trees/${repo.default_branch}?recursive=1`,
                        { ttl: 10 * 60 * 1000 } // 10min cache
                    )
                    
                    if (!treeRes.data?.tree) continue

                    // Filter to source files
                    const sourceFiles = treeRes.data.tree.filter(item => {
                        if (item.type !== 'blob') return false
                        const parts = item.path.split('/')
                        if (parts.some(p => IGNORE_DIRS.has(p))) return false
                        const lastDot = item.path.lastIndexOf('.')
                        if (lastDot === -1) return false
                        const ext = item.path.substring(lastDot).toLowerCase()
                        return EXT_TO_LANG[ext] !== undefined
                    })

                    if (sourceFiles.length === 0) continue

                    // Calculate repo-district position using spiral
                    const angle = repoIdx * 2.4 // Golden angle for even distribution
                    const radius = spiralRadius * Math.sqrt(repoIdx + 1) * 0.5
                    const repoOffsetX = Math.cos(angle) * radius
                    const repoOffsetZ = Math.sin(angle) * radius

                    // Create district for this repo
                    const districtId = repoIdx
                    const districtColor = DISTRICT_COLORS[repoIdx % DISTRICT_COLORS.length]
                    
                    // Calculate district bounds
                    const gridCols = Math.ceil(Math.sqrt(sourceFiles.length))
                    const gridRows = Math.ceil(sourceFiles.length / gridCols)
                    const cellSize = 28
                    const districtWidth = gridCols * cellSize + 40
                    const districtDepth = gridRows * cellSize + 40

                    allDistricts.push({
                        id: districtId,
                        name: repo.name,
                        label: `${repo.name} (${sourceFiles.length} files)`,
                        color: districtColor,
                        building_count: sourceFiles.length,
                        bounds: {
                            minX: repoOffsetX - districtWidth / 2,
                            maxX: repoOffsetX + districtWidth / 2,
                            minZ: repoOffsetZ - districtDepth / 2,
                            maxZ: repoOffsetZ + districtDepth / 2,
                        },
                        center: { x: repoOffsetX, z: repoOffsetZ },
                        repoInfo: {
                            stars: repo.stargazers_count,
                            language: repo.language,
                            description: repo.description,
                        },
                    })

                    // Create buildings for each file in this repo
                    sourceFiles.forEach((file, fileIdx) => {
                        const size = file.size || 100
                        const ext = file.path.substring(file.path.lastIndexOf('.')).toLowerCase()
                        const lang = EXT_TO_LANG[ext] || 'unknown'
                        languageCounts[lang] = (languageCounts[lang] || 0) + 1

                        // Position within repo-district grid
                        const col = fileIdx % gridCols
                        const row = Math.floor(fileIdx / gridCols)
                        const localX = (col - gridCols / 2 + 0.5) * cellSize
                        const localZ = (row - gridRows / 2 + 0.5) * cellSize

                        // Size-based dimensions
                        const sizeNorm = Math.min(1, Math.log2(size + 1) / 15)
                        const width = 8 + sizeNorm * 12
                        const height = 5 + sizeNorm * 40
                        const complexity = Math.min(100, Math.ceil(size / 50))

                        allBuildings.push({
                            id: `${repo.name}/${file.path}`,
                            name: file.path.split('/').pop(),
                            file_path: `${repo.name}/${file.path}`,
                            path: `${repo.name}/${file.path}`,
                            full_path: `${cleanUsername}/${repo.name}/${file.path}`,
                            district_id: districtId,
                            repo_name: repo.name,
                            position: {
                                x: repoOffsetX + localX,
                                y: 0,
                                z: repoOffsetZ + localZ,
                            },
                            dimensions: { width, height, depth: width },
                            color: districtColor,
                            language: lang,
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
                            },
                        })
                        buildingId++
                    })

                } catch (err) {
                    // Skip repos that fail (rate limit, private, etc)
                    logger.warn(`Skipped repo ${repo.name}:`, err.message)
                }
            }

            if (allBuildings.length === 0) {
                throw new Error(`Could not analyze any repositories for "${cleanUsername}"`)
            }

            setProgress(90)

            // Build inter-repo roads (connect adjacent districts)
            const roads = []
            for (let i = 0; i < allDistricts.length - 1; i++) {
                const src = allDistricts[i]
                const tgt = allDistricts[i + 1]
                roads.push({
                    id: `district-${src.id}->district-${tgt.id}`,
                    source: `district-${src.id}`,
                    target: `district-${tgt.id}`,
                    from_position: { x: src.center.x, y: 0, z: src.center.z },
                    to_position: { x: tgt.center.x, y: 0, z: tgt.center.z },
                    type: 'inter-repo',
                })
            }

            const cityData = {
                name: `${cleanUsername}'s Universe`,
                path: `universe:${cleanUsername}`,
                city_id: `universe_${cleanUsername}_${Date.now()}`,
                analyzed_at: new Date().toISOString(),
                source: 'universe',
                universeOwner: cleanUsername,
                repoCount: activeRepos.length,
                buildings: allBuildings,
                districts: allDistricts,
                roads,
                stats: {
                    total_files: allBuildings.length,
                    total_repos: allDistricts.length,
                    total_districts: allDistricts.length,
                    total_lines: allBuildings.reduce((s, b) => s + (b.metrics?.loc || 0), 0),
                    languages: languageCounts,
                    avgComplexity: allBuildings.reduce((s, b) => s + b.complexity, 0) / allBuildings.length,
                },
                metrics: {
                    total_files: allBuildings.length,
                    total_lines: allBuildings.reduce((s, b) => s + (b.metrics?.loc || 0), 0),
                    languages: languageCounts,
                    avg_complexity: allBuildings.reduce((s, b) => s + b.complexity, 0) / allBuildings.length,
                },
                dependency_graph: { nodes: allBuildings.map(b => ({ id: b.id })), edges: [] },
                metadata: { issues: { god_objects: [], circular_dependencies: [] } },
            }

            setProgress(95)
            cacheCity(cacheKey, cityData).catch(() => {})
            setCityData(cityData)
            set({ currentRepoPath: `universe:${cleanUsername}`, commits: [], currentCommitIndex: -1 })

        } catch (error) {
            logger.error("Universe Analysis Error:", error)
            setError(error.message || 'Universe analysis failed')
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
            get().fetchHistory(cityData.name)

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

                        // Prevent race conditions: Check if user already clicked another file
                        if (get().fileContent?.path !== path) return

                        set({ fileContent: { path, content, loading: false } })
                        return
                    }
                } catch {
                    // Fall through to error
                }
            }

            if (get().fileContent?.path === path) {
                set({ fileContent: { path, content: null, loading: false, error: 'File content not available. Re-analyze the repository to load source code.' } })
            }
        } catch (err) {
            // Safety net — never leave loading stuck
            if (get().fileContent?.path === path) {
                set({ fileContent: { path, content: null, loading: false, error: err.message || 'Failed to load file content.' } })
            }
        }
    },

    searchCode: async (query) => {
        const { cityData, currentRepoPath } = get()
        if (!query || !cityData?.buildings) return []

        const q = query.toLowerCase()

        // 1. Initial metadata search (fast)
        const localResults = cityData.buildings
            .filter(b => {
                const name = (b.name || '').toLowerCase()
                const path = (b.file_path || b.path || '').toLowerCase()
                const funcs = (b.functions || []).map(f => (typeof f === 'string' ? f : f.name || '').toLowerCase())
                const classes = (b.classes || []).map(c => (typeof c === 'string' ? c : c.name || '').toLowerCase())

                return name.includes(q) || path.includes(q) ||
                    funcs.some(f => f.includes(q)) ||
                    classes.some(c => c.includes(q))
            })
            .slice(0, 10)
            .map(b => ({
                id: b.id,
                name: b.name,
                path: b.file_path || b.path,
                type: 'file',
                matches: []
            }))

        // 2. Advanced OPFS RipGrep Search (Web Worker)
        try {
            if (currentRepoPath && currentRepoPath !== 'demo') {
                const repoName = currentRepoPath.split('/').pop()
                const vfsResponse = await searchVfsEngine(repoName, query, false)

                if (vfsResponse && vfsResponse.results && vfsResponse.results.length > 0) {
                    // Map VFS results back to building IDs for the Command Palette UI
                    for (const vfsRes of vfsResponse.results) {
                        const building = cityData.buildings.find(b =>
                            (b.file_path || b.path || '') === vfsRes.path
                        )
                        if (building && !localResults.some(r => r.id === building.id)) {
                            localResults.push({
                                id: building.id,
                                name: building.name,
                                path: building.file_path || building.path,
                                type: 'file',
                                snippet: vfsRes.snippet,
                                line: vfsRes.line,
                                matches: vfsRes.matches || []
                            })
                        }
                    }
                }
            }
        } catch (err) {
            logger.error("VFS Search failed:", err)
        }

        return localResults.slice(0, 20)
    }
})
