/**
 * @fileoverview React hook for achievement tracking with localStorage persistence
 * @module @features/achievements/useAchievements
 */

import { useState, useEffect, useCallback, useMemo } from 'react'
import { ACHIEVEMENTS, getTotalAchievementCount } from './achievementDefinitions'

const STORAGE_KEY = 'codebase_city_achievements'
const STATS_KEY = 'codebase_city_stats'

/**
 * Default stats structure
 */
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

/**
 * Load persisted achievements from localStorage
 * @returns {Object} Unlocked achievements map
 */
function loadUnlocked() {
  try {
    const stored = localStorage.getItem(STORAGE_KEY)
    return stored ? JSON.parse(stored) : {}
  } catch (e) {
    console.warn('Failed to load achievements from localStorage:', e)
    return {}
  }
}

/**
 * Load persisted stats from localStorage
 * @returns {Object} User stats
 */
function loadStats() {
  try {
    const stored = localStorage.getItem(STATS_KEY)
    return stored ? { ...DEFAULT_STATS, ...JSON.parse(stored) } : { ...DEFAULT_STATS }
  } catch (e) {
    console.warn('Failed to load stats from localStorage:', e)
    return { ...DEFAULT_STATS }
  }
}

/**
 * Save achievements to localStorage
 * @param {Object} unlocked - Unlocked achievements map
 */
function saveUnlocked(unlocked) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(unlocked))
  } catch (e) {
    console.warn('Failed to save achievements to localStorage:', e)
  }
}

/**
 * Save stats to localStorage
 * @param {Object} stats - User stats
 */
function saveStats(stats) {
  try {
    localStorage.setItem(STATS_KEY, JSON.stringify(stats))
  } catch (e) {
    console.warn('Failed to save stats to localStorage:', e)
  }
}

/**
 * Hook for managing achievements
 * @returns {Object} Achievement state and actions
 */
export function useAchievements() {
  const [unlocked, setUnlocked] = useState(loadUnlocked)
  const [stats, setStats] = useState(loadStats)
  const [newUnlock, setNewUnlock] = useState(null)
  const [toastQueue, setToastQueue] = useState([])

  // Sync unlocked to localStorage
  useEffect(() => {
    saveUnlocked(unlocked)
  }, [unlocked])

  // Sync stats to localStorage
  useEffect(() => {
    saveStats(stats)
  }, [stats])

  /**
   * Check achievements against current stats and unlock any newly earned
   * @param {Object} newStats - Stats to merge and check against
   */
  const checkAchievements = useCallback((newStats = {}) => {
    setStats(prevStats => {
      const mergedStats = { ...prevStats, ...newStats }
      
      const newUnlocks = []

      Object.values(ACHIEVEMENTS).forEach(achievement => {
        if (!unlocked[achievement.id]) {
          try {
            if (achievement.condition(mergedStats)) {
              newUnlocks.push(achievement)
            }
          } catch (e) {
            // Condition threw - achievement not met
          }
        }
      })

      if (newUnlocks.length > 0) {
        const updated = { ...unlocked }
        newUnlocks.forEach(a => {
          updated[a.id] = { unlockedAt: new Date().toISOString() }
        })
        setUnlocked(updated)
        
        // Queue all unlocks for toast display
        setToastQueue(prev => [...prev, ...newUnlocks])
        setNewUnlock(newUnlocks[0])
      }

      return mergedStats
    })
  }, [unlocked])

  /**
   * Update stats without checking achievements
   * @param {Object} newStats - Stats to merge
   */
  const updateStats = useCallback((newStats) => {
    setStats(prev => ({ ...prev, ...newStats }))
  }, [])

  /**
   * Increment a numeric stat
   * @param {string} key - Stat key to increment
   * @param {number} amount - Amount to increment by (default: 1)
   */
  const incrementStat = useCallback((key, amount = 1) => {
    setStats(prev => ({ ...prev, [key]: (prev[key] || 0) + amount }))
  }, [])

  /**
   * Dismiss the current toast notification
   */
  const dismissToast = useCallback(() => {
    setNewUnlock(null)
    setToastQueue(prev => {
      const remaining = prev.slice(1)
      if (remaining.length > 0) {
        // Show next queued achievement after a delay
        setTimeout(() => setNewUnlock(remaining[0]), 300)
      }
      return remaining
    })
  }, [])

  /**
   * Force unlock an achievement (for testing/admin)
   * @param {string} achievementId - Achievement ID to unlock
   */
  const forceUnlock = useCallback((achievementId) => {
    const achievement = Object.values(ACHIEVEMENTS).find(a => a.id === achievementId)
    if (achievement && !unlocked[achievementId]) {
      setUnlocked(prev => ({
        ...prev,
        [achievementId]: { unlockedAt: new Date().toISOString() }
      }))
      setNewUnlock(achievement)
    }
  }, [unlocked])

  /**
   * Reset all achievements (for testing)
   */
  const resetAchievements = useCallback(() => {
    setUnlocked({})
    setStats({ ...DEFAULT_STATS })
    setNewUnlock(null)
    setToastQueue([])
    localStorage.removeItem(STORAGE_KEY)
    localStorage.removeItem(STATS_KEY)
  }, [])

  // Computed values
  const unlockedCount = useMemo(() => Object.keys(unlocked).length, [unlocked])
  const totalCount = useMemo(() => getTotalAchievementCount(), [])
  const progress = useMemo(() => 
    totalCount > 0 ? Math.round((unlockedCount / totalCount) * 100) : 0, 
    [unlockedCount, totalCount]
  )

  return {
    // State
    unlocked,
    stats,
    newUnlock,
    
    // Actions
    checkAchievements,
    updateStats,
    incrementStat,
    dismissToast,
    forceUnlock,
    resetAchievements,
    
    // Computed
    unlockedCount,
    totalCount,
    progress,
    
    // Reference
    allAchievements: ACHIEVEMENTS,
  }
}

export default useAchievements
