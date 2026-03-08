import logger from '../../utils/logger'

/**
 * Time Slice
 * Handles Git History and Time Travel Animation.
 *
 * For local repos: synthesizes a timeline from building metrics
 * (age_days, commits, churn) and projects building heights backward in time.
 * For GitHub repos: fetches real commit history via REST API.
 */
export const createTimeSlice = (set, get) => ({
    // State
    commits: [],
    currentCommitIndex: -1,
    historyLoading: false,
    showTimeline: false,
    _treeCache: {}, // sha → { path → size } — caches fetched trees

    // Animation State
    isAnimating: false,
    animationSpeed: 1000,

    // Actions
    setShowTimeline: (show) => set({ showTimeline: show }),
    setCommitIndex: (index) => set({ currentCommitIndex: index }),
    setAnimating: (isAnimating) => set({ isAnimating }),
    setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

    /**
     * Fetch or synthesize commit history.
     * GitHub repos → real commits via REST API.
     * Local repos  → synthetic timeline from building metrics.
     */
    fetchHistory: async (path) => {
        set({ historyLoading: true })
        try {
            const { cityData } = get()
            const repoName = cityData?.name || path || ''

            // Try GitHub API for public repos
            // Handle github:owner/repo format from analyzeRepo
            let repoSlug = null
            const githubPrefix = repoName.match(/^github:(.+)/) || path?.match(/^github:(.+)/)
            if (githubPrefix) {
                repoSlug = githubPrefix[1]
            } else {
                const match = repoName.match(/(?:github\.com\/)?([^/\s]+\/[^/\s]+)/)
                if (match) repoSlug = match[1].replace(/\.git$/, '')
            }

            if (repoSlug) {
                try {
                    const response = await fetch(`https://api.github.com/repos/${repoSlug}/commits?per_page=30`)
                    if (response.ok) {
                        const data = await response.json()
                        const commits = data.map(c => ({
                            hash: c.sha,
                            short_hash: c.sha.slice(0, 7),
                            message: c.commit.message.split('\n')[0],
                            author: c.commit.author.name,
                            email: c.commit.author.email,
                            date: new Date(c.commit.author.date).toLocaleDateString(),
                            timestamp: new Date(c.commit.author.date).getTime() / 1000,
                            files_changed: c.stats?.total || 0
                        }))
                        set({ commits, historyLoading: false, currentCommitIndex: -1 })
                        return
                    }
                } catch {
                    // Fall through to synthetic timeline
                }
            }

            // No real git history available for local analysis
            set({ historyLoading: false, commits: [] })
        } catch (error) {
            logger.error('History fetch error:', error)
            set({ historyLoading: false, commits: [] })
        }
    },

    /**
     * Navigate to a specific commit in the timeline.
     * For GitHub repos: fetches the actual file tree at that commit SHA
     * to get real file sizes. Results are cached per SHA.
     * Fallback: lightweight projection for non-GitHub repos.
     */
    analyzeAtCommit: async (hash) => {
        const { commits, applyTimelineSnapshot, cityData, masterCityData, _treeCache } = get()
        if (!commits.length || !cityData) return

        const idx = commits.findIndex(c => c.hash === hash)
        if (idx < 0) return

        set({ currentCommitIndex: idx })

        // Detect GitHub repo slug
        const repoName = cityData?.name || cityData?.path || ''
        let repoSlug = null
        const githubPrefix = repoName.match(/^github:(.+)/)
        if (githubPrefix) {
            repoSlug = githubPrefix[1]
        } else {
            const match = repoName.match(/(?:github\.com\/)?([^/\s]+\/[^/\s]+)/)
            if (match) repoSlug = match[1].replace(/\.git$/, '')
        }

        if (repoSlug) {
            // Check cache first
            if (_treeCache[hash]) {
                applyTimelineSnapshot({ files: _treeCache[hash] })
                return
            }

            try {
                const treeRes = await fetch(
                    `https://api.github.com/repos/${encodeURIComponent(repoSlug.split('/')[0])}/${encodeURIComponent(repoSlug.split('/')[1])}/git/trees/${hash}?recursive=1`
                )
                if (treeRes.ok) {
                    const treeData = await treeRes.json()
                    const files = {}
                    for (const item of treeData.tree || []) {
                        if (item.type === 'blob' && item.size !== undefined) {
                            files[item.path] = item.size
                        }
                    }
                    // Cache the result
                    set(state => ({
                        _treeCache: { ...state._treeCache, [hash]: files }
                    }))
                    applyTimelineSnapshot({ files })
                    return
                }
            } catch {
                // Fall through to projection
            }
        }

        // Fallback: projection for non-GitHub repos or API failures
        const source = masterCityData || cityData
        const ratio = (idx + 1) / commits.length
        const snapshot = { files: {} }
        source.buildings.forEach(b => {
            const key = b.path || b.file_path
            const currentSize = b.metrics?.size_bytes || 100
            const scale = 0.2 + 0.8 * Math.pow(ratio, 0.7)
            const churnFactor = Math.min(1, (b.metrics?.churn || 0) / 10)
            const variance = 1 - churnFactor * (1 - scale)
            snapshot.files[key] = currentSize * variance
        })
        applyTimelineSnapshot(snapshot)
    },

    startTimeTravel: async (startIndex, endIndex, direction = 'backward') => {
        const { commits, setAnimating, animationSpeed } = get()

        if (commits.length === 0) return
        setAnimating(true)

        const step = direction === 'backward' ? 1 : -1
        let current = startIndex

        while (
            (direction === 'backward' && current <= endIndex) ||
            (direction === 'forward' && current >= endIndex)
        ) {
            if (!get().isAnimating) break

            const commit = commits[current]
            if (commit) {
                // Reuse analyzeAtCommit which handles real tree fetching + caching
                await get().analyzeAtCommit(commit.hash)
                await new Promise(r => setTimeout(r, animationSpeed))
            }
            current += step
        }

        set({ isAnimating: false })
    },

    stopTimeTravel: () => {
        const { masterCityData } = get()
        set({ isAnimating: false })
        if (masterCityData) {
            set({ cityData: masterCityData })
        }
    }
})
