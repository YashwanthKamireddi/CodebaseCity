import logger from '../../utils/logger'
const API_BASE = import.meta.env.VITE_API_URL || '/api'

/**
 * Time Slice
 * Handles Git History, Commits, and Time Travel Animation.
 */
export const createTimeSlice = (set, get) => ({
    // State
    commits: [],
    currentCommitIndex: -1,  // -1 means latest (HEAD)
    historyLoading: false,
    showTimeline: false,

    // Animation State
    isAnimating: false,
    animationSpeed: 1000, // ms per commit

    // Actions
    setShowTimeline: (show) => set({ showTimeline: show }),
    setCommitIndex: (index) => set({ currentCommitIndex: index }),

    setAnimating: (isAnimating) => set({ isAnimating }),
    setAnimationSpeed: (speed) => set({ animationSpeed: speed }),

    fetchHistory: async (path) => {
        set({ historyLoading: true })
        try {
            const response = await fetch(`${API_BASE}/history?path=${encodeURIComponent(path)}&limit=30`)
            if (!response.ok) throw new Error('Failed to fetch history')

            const data = await response.json()
            set({
                commits: data.commits || [],
                historyLoading: false,
                currentCommitIndex: -1
            })
        } catch (error) {
            logger.error('History fetch error:', error)
            set({ historyLoading: false, commits: [] })
        }
    },

    analyzeAtCommit: async (commitHash) => {
        const { currentRepoPath, setLoading, setCityData, setError } = get()

        if (!currentRepoPath) {
            setError('No repository path. Please analyze a local repo first.')
            return
        }

        setLoading(true)
        setError(null)

        try {
            const response = await fetch(`${API_BASE}/analyze-at-commit`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path: currentRepoPath, commit_hash: commitHash })
            })

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({}))
                throw new Error(errorData.detail || 'Failed to analyze at commit')
            }

            const data = await response.json()
            setCityData(data) // Updates CitySlice
        } catch (error) {
            logger.error('analyzeAtCommit error:', error)
            setError(error.message)
        } finally {
            setLoading(false)
        }
    },

    startTimeTravel: async (startIndex, endIndex, direction = 'backward') => {
        const { commits, analyzeAtCommit, setAnimating, animationSpeed } = get()

        if (commits.length === 0) return

        setAnimating(true)

        const step = direction === 'backward' ? 1 : -1
        let current = startIndex

        while (
            (direction === 'backward' && current <= endIndex) ||
            (direction === 'forward' && current >= endIndex)
        ) {
            // Check if still animating (allows cancellation)
            if (!get().isAnimating) break

            const commit = commits[current]
            if (commit) {
                set({ currentCommitIndex: current })
                await analyzeAtCommit(commit.hash)
                await new Promise(r => setTimeout(r, animationSpeed))
            }
            current += step
        }

        setAnimating(false)
    },

    stopTimeTravel: () => set({ isAnimating: false }),
})
