/**
 * @fileoverview Achievement badges display component
 * @module @features/achievements/AchievementBadges
 */

import { useMemo, useState } from 'react'
import { Trophy, Lock, Star } from 'lucide-react'
import { 
  ACHIEVEMENTS, 
  getAchievementsByCategory, 
  CATEGORY_LABELS 
} from '../achievementDefinitions'
import './AchievementBadges.css'

/**
 * Single achievement badge
 * 
 * @param {Object} props
 * @param {Object} props.achievement - Achievement definition
 * @param {boolean} props.isUnlocked - Whether achievement is unlocked
 * @param {string} [props.unlockedAt] - ISO timestamp of unlock
 * @param {Function} [props.onClick] - Click handler
 */
function AchievementBadge({ achievement, isUnlocked, unlockedAt, onClick }) {
  const [showTooltip, setShowTooltip] = useState(false)
  
  const formattedDate = useMemo(() => {
    if (!unlockedAt) return null
    try {
      return new Date(unlockedAt).toLocaleDateString(undefined, {
        month: 'short',
        day: 'numeric',
        year: 'numeric'
      })
    } catch {
      return null
    }
  }, [unlockedAt])

  return (
    <div
      className={`achievement-badge ${isUnlocked ? 'unlocked' : 'locked'}`}
      onClick={onClick}
      onMouseEnter={() => setShowTooltip(true)}
      onMouseLeave={() => setShowTooltip(false)}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => e.key === 'Enter' && onClick?.()}
      aria-label={`${achievement.title}: ${achievement.description}${isUnlocked ? ' (Unlocked)' : ' (Locked)'}`}
    >
      {/* Badge icon */}
      <div className="achievement-badge-icon">
        {isUnlocked ? (
          <span className="achievement-badge-emoji">{achievement.icon}</span>
        ) : (
          <Lock size={20} />
        )}
      </div>

      {/* Unlock indicator */}
      {isUnlocked && (
        <div className="achievement-badge-check">
          <Star size={10} fill="currentColor" />
        </div>
      )}

      {/* Tooltip */}
      {showTooltip && (
        <div className="achievement-badge-tooltip">
          <div className="achievement-badge-tooltip-icon">
            {achievement.icon}
          </div>
          <div className="achievement-badge-tooltip-content">
            <h4 className="achievement-badge-tooltip-title">
              {achievement.title}
            </h4>
            <p className="achievement-badge-tooltip-desc">
              {achievement.description}
            </p>
            {isUnlocked && formattedDate && (
              <span className="achievement-badge-tooltip-date">
                Unlocked {formattedDate}
              </span>
            )}
            {!isUnlocked && (
              <span className="achievement-badge-tooltip-locked">
                <Lock size={10} /> Locked
              </span>
            )}
          </div>
        </div>
      )}
    </div>
  )
}

/**
 * Achievement badges grid display
 * 
 * @param {Object} props
 * @param {Object} props.unlocked - Map of unlocked achievement IDs to unlock data
 * @param {boolean} [props.showLocked=true] - Whether to show locked achievements
 * @param {boolean} [props.groupByCategory=false] - Whether to group by category
 * @param {'grid' | 'inline'} [props.layout='grid'] - Layout style
 * @param {Function} [props.onBadgeClick] - Badge click handler
 */
export function AchievementBadges({ 
  unlocked = {}, 
  showLocked = true, 
  groupByCategory = false,
  layout = 'grid',
  onBadgeClick 
}) {
  const achievements = useMemo(() => {
    if (groupByCategory) {
      return getAchievementsByCategory()
    }
    return { all: Object.values(ACHIEVEMENTS) }
  }, [groupByCategory])

  const unlockedCount = Object.keys(unlocked).length
  const totalCount = Object.keys(ACHIEVEMENTS).length

  return (
    <div className={`achievement-badges achievement-badges--${layout}`}>
      {/* Header */}
      <div className="achievement-badges-header">
        <div className="achievement-badges-title">
          <Trophy size={18} />
          <span>Achievements</span>
        </div>
        <div className="achievement-badges-progress">
          <span className="achievement-badges-count">
            {unlockedCount}/{totalCount}
          </span>
          <div className="achievement-badges-progress-bar">
            <div 
              className="achievement-badges-progress-fill"
              style={{ width: `${(unlockedCount / totalCount) * 100}%` }}
            />
          </div>
        </div>
      </div>

      {/* Badge groups */}
      {Object.entries(achievements).map(([category, categoryAchievements]) => (
        <div key={category} className="achievement-badges-group">
          {groupByCategory && category !== 'all' && (
            <h3 className="achievement-badges-category">
              {CATEGORY_LABELS[category] || category}
            </h3>
          )}
          
          <div className="achievement-badges-grid">
            {categoryAchievements
              .filter(a => showLocked || unlocked[a.id])
              .map(achievement => (
                <AchievementBadge
                  key={achievement.id}
                  achievement={achievement}
                  isUnlocked={!!unlocked[achievement.id]}
                  unlockedAt={unlocked[achievement.id]?.unlockedAt}
                  onClick={() => onBadgeClick?.(achievement)}
                />
              ))}
          </div>
        </div>
      ))}

      {/* Empty state */}
      {unlockedCount === 0 && !showLocked && (
        <div className="achievement-badges-empty">
          <Trophy size={32} />
          <p>No achievements unlocked yet</p>
          <span>Start exploring to earn badges!</span>
        </div>
      )}
    </div>
  )
}

/**
 * Compact inline achievement display (for headers, profiles)
 * 
 * @param {Object} props
 * @param {Object} props.unlocked - Map of unlocked achievement IDs
 * @param {number} [props.maxDisplay=5] - Max badges to show
 */
export function AchievementBadgesCompact({ unlocked = {}, maxDisplay = 5 }) {
  const unlockedAchievements = useMemo(() => {
    return Object.values(ACHIEVEMENTS)
      .filter(a => unlocked[a.id])
      .slice(0, maxDisplay)
  }, [unlocked, maxDisplay])

  const remaining = Object.keys(unlocked).length - maxDisplay

  if (unlockedAchievements.length === 0) {
    return null
  }

  return (
    <div className="achievement-badges-compact">
      {unlockedAchievements.map(achievement => (
        <span 
          key={achievement.id} 
          className="achievement-badge-compact"
          title={`${achievement.title}: ${achievement.description}`}
        >
          {achievement.icon}
        </span>
      ))}
      {remaining > 0 && (
        <span className="achievement-badge-more">+{remaining}</span>
      )}
    </div>
  )
}

export default AchievementBadges
