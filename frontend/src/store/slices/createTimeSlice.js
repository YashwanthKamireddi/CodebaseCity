import logger from '../../utils/logger'

/**
 * Time Slice
 * Handles Git History and Time Travel Animation.
 * Uses GitHub REST API for commit history (no backend needed).
 */
export const createTimeSlice = (set, get) => ({
    // State
    commits: [],
    currentCommitIndex: -1,
    historyLoading: false,
    showTimeline: false,

    // Animation State
    isAnimating: false,
    animationSpeed: 1000,

    // Actions
    setShowTimeline: (show) => set({ showTimeline: show }),
    setCommitIndex: (index) => set({ currentCommitIndex: index }),
    setAnimating: (isAnimating) => set({ isAnimating }),
    setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

    fetchHistory: async (path) => {
        set({ historyLoading: true })
        try {
            // Extract owner/repo from GitHub URL or cityData name
            const { cityData } = get()
            const repoName = cityData?.name || path || ''

            // Try GitHub API for commit history
            const match = repoName.match(/(?:github\.com\/)?([^/]+\/[^/]+)/)
            if (!match) {
                set({ historyLoading: false, commits: [] })
                return
            }

            const repo = match[1]
            const response = await fetch(`https://api.github.com/repos/${repo}/commits?per_page=30`)
            if (!response.ok) throw new Error('Failed to fetch history')

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
        } catch (error) {
            logger.error('History fetch error:', error)
            set({ historyLoading: false, commits: [] })
        }
    },

    analyzeAtCommit: async (commitHash) => {
        // Client-side: we can't checkout a commit, but we can re-analyze
        // the repo at a specific tree using GitHub's API
        const { cityData, setLoading, setCityData, setError } = get()
        if (!cityData?.name) {
            setError('Git time travel requires a GitHub repository.')
            return
        }

        const match = cityData.name.match(/(?:github\.com\/)?([^/]+\/[^/]+)/)
        if (!match) {
            setError('Git time travel is only available for GitHub repositories.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const repo = match[1]
            const { analyzeGitHub } = await import('../../engine/ClientAnalyzer.js')

            // Re-analyze at the specific commit by downloading that tree
            const result = await analyzeGitHub({
                url: `https://github.com/${repo}`,
                ref: commitHash,
                onProgress: () => {},
                maxFiles: 3000,
            })

            setCityData(result)
        } catch (error) {
            logger.error('analyzeAtCommit error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    },

    startTimeTravel: async (startIndex, endIndex, direction = 'backward') => {
        const { commits, setAnimating, animationSpeed, applyTimelineSnapshot, cityData } = get()

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
                set({ currentCommitIndex: current })
                // Use lightweight projection instead of full re-analysis
                if (applyTimelineSnapshot && cityData) {
                    // Simple: scale buildings by commit age ratio
                    const ratio = 1 - (current / commits.length) * 0.5
                    const snapshot = { files: {} }
                    cityData.buildings.forEach(b => {
                        snapshot.files[b.path || b.file_path] = (b.metrics?.size_bytes || 100) * ratio
                    })
                    applyTimelineSnapshot(snapshot)
                }
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
