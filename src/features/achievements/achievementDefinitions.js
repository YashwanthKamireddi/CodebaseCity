/**
 * @fileoverview Achievement definitions for Codebase City
 * 
 * Each achievement has:
 * - id: Unique identifier (used for localStorage key)
 * - title: Display name
 * - description: How to unlock
 * - icon: Emoji representation
 * - condition: Function that checks if achievement is unlocked
 * 
 * @module @features/achievements/achievementDefinitions
 */

export const ACHIEVEMENTS = {
  // ═══════════════════════════════════════════════════════════════════════════
  // EXPLORATION
  // ═══════════════════════════════════════════════════════════════════════════
  FIRST_CITY: {
    id: 'first_city',
    title: 'City Founder',
    description: 'Analyze your first repository',
    icon: '🏙️',
    category: 'exploration',
    condition: (stats) => stats.totalAnalyzed >= 1,
  },
  EXPLORER: {
    id: 'explorer',
    title: 'Urban Explorer',
    description: 'Explore 10 different repositories',
    icon: '🧭',
    category: 'exploration',
    condition: (stats) => stats.totalAnalyzed >= 10,
  },
  DISTRICT_HOPPER: {
    id: 'district_hopper',
    title: 'District Hopper',
    description: 'Visit every district in a city',
    icon: '🚶',
    category: 'exploration',
    condition: (stats) => stats.districtsVisited >= stats.totalDistricts && stats.totalDistricts > 0,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // CODE QUALITY
  // ═══════════════════════════════════════════════════════════════════════════
  CLEAN_CODE: {
    id: 'clean_code',
    title: 'Clean Code Champion',
    description: 'Analyze a repo with average complexity < 5',
    icon: '✨',
    category: 'quality',
    condition: (stats) => stats.avgComplexity > 0 && stats.avgComplexity < 5,
  },
  TEST_GUARDIAN: {
    id: 'test_guardian',
    title: 'Test Guardian',
    description: 'Analyze a repo with >50% test files',
    icon: '🛡️',
    category: 'quality',
    condition: (stats) => stats.testRatio > 0.5,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // SCALE
  // ═══════════════════════════════════════════════════════════════════════════
  MEGACITY: {
    id: 'megacity',
    title: 'Megacity Architect',
    description: 'Analyze a repo with 1000+ files',
    icon: '🌆',
    category: 'scale',
    condition: (stats) => stats.fileCount >= 1000,
  },
  COMPLEXITY_SLAYER: {
    id: 'complexity_slayer',
    title: 'Complexity Slayer',
    description: 'Find a file with complexity > 50',
    icon: '⚔️',
    category: 'scale',
    condition: (stats) => stats.maxComplexity > 50,
  },

  // ═══════════════════════════════════════════════════════════════════════════
  // FEATURES
  // ═══════════════════════════════════════════════════════════════════════════
  TIME_TRAVELER: {
    id: 'time_traveler',
    title: 'Time Traveler',
    description: 'Use the timeline feature',
    icon: '⏰',
    category: 'features',
    condition: (stats) => stats.usedTimeline === true,
  },
  AI_WHISPERER: {
    id: 'ai_whisperer',
    title: 'AI Whisperer',
    description: 'Ask 10 questions to AI Architect',
    icon: '🤖',
    category: 'features',
    condition: (stats) => stats.aiQuestions >= 10,
  },
  UFO_PILOT: {
    id: 'ufo_pilot',
    title: 'UFO Pilot',
    description: 'Explore the city in UFO mode',
    icon: '🛸',
    category: 'features',
    condition: (stats) => stats.usedUfoMode === true,
  },
}

/**
 * Get achievements grouped by category
 * @returns {Object} Achievements grouped by category
 */
export function getAchievementsByCategory() {
  const categories = {}
  
  Object.values(ACHIEVEMENTS).forEach(achievement => {
    const category = achievement.category || 'other'
    if (!categories[category]) {
      categories[category] = []
    }
    categories[category].push(achievement)
  })
  
  return categories
}

/**
 * Get total achievement count
 * @returns {number} Total number of achievements
 */
export function getTotalAchievementCount() {
  return Object.keys(ACHIEVEMENTS).length
}

/**
 * Category display names
 */
export const CATEGORY_LABELS = {
  exploration: 'Exploration',
  quality: 'Code Quality',
  scale: 'Scale',
  features: 'Features',
  other: 'Other',
}
