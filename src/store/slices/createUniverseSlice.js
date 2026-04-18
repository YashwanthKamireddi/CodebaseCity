/**
 * createUniverseSlice.js
 *
 * State management for "Universe Mode" - viewing all repositories
 * of a GitHub user as a collection of cities.
 */

import { fetchUserRepos, fetchUserProfile } from '../../engine/api/githubApi'

export const createUniverseSlice = (set, get) => ({
    // Universe Mode State
    universeMode: false,
    universeOwner: null,        // GitHub username
    universeProfile: null,      // User profile info
    universeRepos: [],          // Array of repo metadata
    universeLoading: false,
    universeError: null,
    universeSelectedRepo: null, // Currently highlighted repo (before entering)
    
    // Sorting & filtering
    universeSortBy: 'updated',  // 'updated', 'stars', 'name', 'size'
    universeSortDir: 'desc',
    universeFilter: '',         // Search filter
    universeLanguageFilter: null, // Filter by language
    
    /**
     * Enter Universe Mode - fetch all repos for a username
     */
    enterUniverse: async (username) => {
        if (!username?.trim()) return
        
        const cleanUsername = username.trim().replace(/^@/, '')
        
        set({
            universeMode: true,
            universeOwner: cleanUsername,
            universeLoading: true,
            universeError: null,
            universeRepos: [],
            universeProfile: null,
            universeSelectedRepo: null
        })
        
        try {
            // Fetch profile and repos in parallel
            const [profile, repos] = await Promise.all([
                fetchUserProfile(cleanUsername),
                fetchUserRepos(cleanUsername, { maxRepos: 300, sort: 'updated' })
            ])
            
            set({
                universeProfile: profile,
                universeRepos: repos,
                universeLoading: false
            })
            
            return { profile, repos }
        } catch (err) {
            set({
                universeError: err.message,
                universeLoading: false
            })
            throw err
        }
    },
    
    /**
     * Exit Universe Mode and optionally enter a specific repo
     */
    exitUniverse: (enterRepo = null) => {
        set({
            universeMode: false,
            universeSelectedRepo: null
        })
        
        // If a repo is specified, analyze it
        if (enterRepo) {
            const { analyzeRepo } = get()
            analyzeRepo(`${get().universeOwner}/${enterRepo}`)
        }
    },
    
    /**
     * Select a repo in universe view (highlight before entering)
     */
    selectUniverseRepo: (repoName) => {
        set({ universeSelectedRepo: repoName })
    },
    
    /**
     * Enter a specific city from the universe
     */
    enterCity: (repoName) => {
        const owner = get().universeOwner
        if (!owner || !repoName) return
        
        const { analyzeRepo } = get()
        set({ universeMode: false })
        analyzeRepo(`${owner}/${repoName}`)
    },
    
    /**
     * Update sorting
     */
    setUniverseSort: (sortBy, sortDir = null) => {
        const current = get()
        const newDir = sortDir || (current.universeSortBy === sortBy && current.universeSortDir === 'desc' ? 'asc' : 'desc')
        set({ universeSortBy: sortBy, universeSortDir: newDir })
    },
    
    /**
     * Update filter
     */
    setUniverseFilter: (filter) => {
        set({ universeFilter: filter })
    },
    
    /**
     * Filter by language
     */
    setUniverseLanguageFilter: (language) => {
        set({ universeLanguageFilter: language })
    },
    
    /**
     * Get filtered and sorted repos
     */
    getFilteredRepos: () => {
        const state = get()
        let repos = [...state.universeRepos]
        
        // Apply language filter
        if (state.universeLanguageFilter) {
            repos = repos.filter(r => r.language === state.universeLanguageFilter)
        }
        
        // Apply search filter
        if (state.universeFilter) {
            const filter = state.universeFilter.toLowerCase()
            repos = repos.filter(r => 
                r.name.toLowerCase().includes(filter) ||
                r.description?.toLowerCase().includes(filter)
            )
        }
        
        // Sort
        repos.sort((a, b) => {
            let cmp = 0
            switch (state.universeSortBy) {
                case 'stars':
                    cmp = a.stargazers_count - b.stargazers_count
                    break
                case 'name':
                    cmp = a.name.localeCompare(b.name)
                    break
                case 'size':
                    cmp = a.size - b.size
                    break
                case 'updated':
                default:
                    cmp = new Date(a.updated_at) - new Date(b.updated_at)
            }
            return state.universeSortDir === 'desc' ? -cmp : cmp
        })
        
        return repos
    },
    
    /**
     * Get unique languages from repos
     */
    getUniverseLanguages: () => {
        const repos = get().universeRepos
        const langs = new Map()
        repos.forEach(r => {
            if (r.language) {
                langs.set(r.language, (langs.get(r.language) || 0) + 1)
            }
        })
        return [...langs.entries()]
            .sort((a, b) => b[1] - a[1])
            .map(([lang, count]) => ({ language: lang, count }))
    },
    
    /**
     * Get universe stats
     */
    getUniverseStats: () => {
        const repos = get().universeRepos
        if (!repos.length) return null
        
        return {
            totalRepos: repos.length,
            totalStars: repos.reduce((sum, r) => sum + r.stargazers_count, 0),
            totalForks: repos.reduce((sum, r) => sum + r.forks_count, 0),
            languages: get().getUniverseLanguages().length,
            topLanguage: get().getUniverseLanguages()[0]?.language || 'Unknown'
        }
    }
})

export default createUniverseSlice
