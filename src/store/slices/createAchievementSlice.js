/**
 * Achievement Slice
 * Handles achievement tracking state integrated with Zustand store.
 * Works alongside useAchievements hook for React component integration.
 * 
 * Achievements are user-specific — only tracked for logged-in users.
 */

import { ACHIEVEMENTS, getTotalAchievementCount } from '../../features/achievements/achievementDefinitions'

const STORAGE_KEY_PREFIX = 'codebase_city_achievements'
const STATS_KEY_PREFIX = 'codebase_city_stats'
const USER_STORAGE_KEY = 'codebase_city_user'

const DEFAULT_STATS = {
  totalAnalyzed: 0,
  districtsVisited: 0,
  totalDistricts: 0,
  avgComplexity: 0,
  maxComplexity: 0,
  testRatio: 0,
  fileCount: 0,
  usedTimeline: false,
  aiQuestions: 0,
  usedUfoMode: false,
}

function getCurrentUserId() {
  try {
    const stored = localStorage.getItem(USER_STORAGE_KEY)
    if (stored) {
      const user = JSON.parse(stored)
      return user?.id || null
    }
  } catch { /* ignore */ }
  return null
}

function getStorageKey(prefix) {
  const userId = getCurrentUserId()
  return userId ? `${prefix}_${userId}` : null
}

function loadUnlocked() {
  try {
    const key = getStorageKey(STORAGE_KEY_PREFIX)
    if (!key) return {}
    const stored = localStorage.getItem(key)
    return stored ? JSON.parse(stored) : {}
  } catch {
    return {}
  }
}

function loadStats() {
  try {
    const key = getStorageKey(STATS_KEY_PREFIX)
    if (!key) return { ...DEFAULT_STATS }
    const stored = localStorage.getItem(key)
    return stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : { ...DEFAULT_STATS }
  } catch {
    return { ...DEFAULT_STATS }
  }
}

function saveUnlocked(unlocked) {
  try {
    const key = getStorageKey(STORAGE_KEY_PREFIX)
    if (!key) return // Don't persist for anonymous users
    localStorage.setItem(key, JSON.stringify(unlocked))
  } catch { /* ignore */ }
}

function saveStats(stats) {
  try {
    const key = getStorageKey(STATS_KEY_PREFIX)
    if (!key) return // Don't persist for anonymous users
    localStorage.setItem(key, JSON.stringify(stats))
  } catch { /* ignore */ }
}

function isUserAuthenticated() {
  return getCurrentUserId() !== null
}

export const createAchievementSlice = (set, get) => ({
  // Achievement State
  achievementUnlocked: loadUnlocked(),
  achievementStats: loadStats(),
  achievementNewUnlock: null,
  achievementToastQueue: [],
  achievementsEnabled: isUserAuthenticated(),

  // Reload achievements when auth state changes (login/logout)
  reloadAchievementsForUser: () => {
    const authenticated = isUserAuthenticated()
    set({
      achievementUnlocked: loadUnlocked(),
      achievementStats: loadStats(),
      achievementsEnabled: authenticated,
      achievementNewUnlock: null,
      achievementToastQueue: [],
    })
  },

  // Check achievements and unlock any newly earned (only for authenticated users)
  checkAchievements: (newStats = {}) => {
    // Only track achievements for logged-in users
    if (!isUserAuthenticated()) {
      return
    }

    const { achievementUnlocked, achievementStats } = get()
    const mergedStats = { ...achievementStats, ...newStats }
    
    const newUnlocks = []
    Object.values(ACHIEVEMENTS).forEach(achievement => {
      if (!achievementUnlocked[achievement.id]) {
        try {
          if (achievement.condition(mergedStats)) {
            newUnlocks.push(achievement)
          }
        } catch {
          // Condition threw - achievement not met
        }
      }
    })

    if (newUnlocks.length > 0) {
      const updated = { ...achievementUnlocked }
      newUnlocks.forEach(a => {
        updated[a.id] = { unlockedAt: new Date().toISOString() }
      })
      saveUnlocked(updated)
      
      set({
        achievementUnlocked: updated,
        achievementStats: mergedStats,
        achievementNewUnlock: newUnlocks[0],
        achievementToastQueue: [...get().achievementToastQueue, ...newUnlocks],
      })
    } else {
      saveStats(mergedStats)
      set({ achievementStats: mergedStats })
    }
  },

  // Update stats without checking achievements
  updateAchievementStats: (newStats) => {
    if (!isUserAuthenticated()) return
    const stats = { ...get().achievementStats, ...newStats }
    saveStats(stats)
    set({ achievementStats: stats })
  },

  // Increment a stat and check achievements
  incrementAchievementStat: (key, amount = 1) => {
    const { achievementStats } = get()
    const newStats = { ...achievementStats, [key]: (achievementStats[key] || 0) + amount }
    get().checkAchievements(newStats)
  },

  // Dismiss current toast
  dismissAchievementToast: () => {
    const { achievementToastQueue } = get()
    const remaining = achievementToastQueue.slice(1)
    
    set({ achievementNewUnlock: null, achievementToastQueue: remaining })
    
    // Show next queued achievement after delay
    if (remaining.length > 0) {
      setTimeout(() => {
        set({ achievementNewUnlock: remaining[0] })
      }, 300)
    }
  },

  // Computed getters
  getAchievementCount: () => Object.keys(get().achievementUnlocked).length,
  getTotalAchievementCount: () => getTotalAchievementCount(),
  getAchievementProgress: () => {
    const unlocked = Object.keys(get().achievementUnlocked).length
    const total = getTotalAchievementCount()
    return total > 0 ? Math.round((unlocked / total) * 100) : 0
  },
})
