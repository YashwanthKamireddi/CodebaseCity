/**
 * @fileoverview Achievements feature barrel export
 * @module @features/achievements
 */

// Definitions
export { 
  ACHIEVEMENTS,
  getAchievementsByCategory,
  getTotalAchievementCount,
  CATEGORY_LABELS
} from './achievementDefinitions'

// Hook
export { useAchievements } from './useAchievements'

// Components
export { AchievementToast } from './ui/AchievementToast'
export { AchievementBadges, AchievementBadgesCompact } from './ui/AchievementBadges'
