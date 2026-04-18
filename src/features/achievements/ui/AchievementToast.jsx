/**
 * @fileoverview Achievement unlock toast notification with confetti effect
 * @module @features/achievements/AchievementToast
 */

import { useEffect, useState, useCallback, useRef } from 'react'
import { createPortal } from 'react-dom'
import { X, Trophy } from 'lucide-react'
import './AchievementToast.css'

/**
 * Generate confetti particles
 * @param {number} count - Number of particles
 * @returns {Array} Particle configs
 */
function generateParticles(count = 30) {
  const colors = ['#ffd700', '#ff6b6b', '#4ecdc4', '#a855f7', '#22c55e', '#f97316']
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    color: colors[Math.floor(Math.random() * colors.length)],
    x: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 0.8 + Math.random() * 0.6,
    rotation: Math.random() * 360,
    scale: 0.5 + Math.random() * 0.5,
  }))
}

/**
 * Confetti particle component
 */
function ConfettiParticle({ color, x, delay, duration, rotation, scale }) {
  return (
    <div
      className="achievement-confetti-particle"
      style={{
        '--x': `${x}%`,
        '--delay': `${delay}s`,
        '--duration': `${duration}s`,
        '--rotation': `${rotation}deg`,
        '--scale': scale,
        backgroundColor: color,
      }}
    />
  )
}

/**
 * Achievement Toast Component
 * 
 * Slides in from bottom-right with confetti animation
 * Auto-dismisses after 5 seconds
 * 
 * @param {Object} props
 * @param {Object} props.achievement - Achievement data
 * @param {Function} props.onDismiss - Dismiss callback
 * @param {number} [props.duration=5000] - Auto-dismiss duration in ms
 */
export function AchievementToast({ achievement, onDismiss, duration = 5000 }) {
  const [isVisible, setIsVisible] = useState(false)
  const [isExiting, setIsExiting] = useState(false)
  const [particles] = useState(() => generateParticles(30))
  const timeoutRef = useRef(null)
  const dismissTimeoutRef = useRef(null)

  // Entry animation
  useEffect(() => {
    const entryTimer = setTimeout(() => setIsVisible(true), 50)
    return () => clearTimeout(entryTimer)
  }, [])

  // Auto-dismiss
  useEffect(() => {
    if (duration > 0) {
      timeoutRef.current = setTimeout(() => {
        handleDismiss()
      }, duration)
    }
    
    return () => {
      if (timeoutRef.current) clearTimeout(timeoutRef.current)
      if (dismissTimeoutRef.current) clearTimeout(dismissTimeoutRef.current)
    }
  }, [duration])

  const handleDismiss = useCallback(() => {
    if (isExiting) return
    setIsExiting(true)
    setIsVisible(false)
    
    dismissTimeoutRef.current = setTimeout(() => {
      onDismiss?.()
    }, 400)
  }, [isExiting, onDismiss])

  if (!achievement) return null

  const toast = (
    <div
      className={`achievement-toast-container ${isVisible ? 'visible' : ''} ${isExiting ? 'exiting' : ''}`}
      role="alert"
      aria-live="polite"
    >
      {/* Confetti effect */}
      <div className="achievement-confetti">
        {particles.map(p => (
          <ConfettiParticle key={p.id} {...p} />
        ))}
      </div>

      {/* Toast card */}
      <div className="achievement-toast">
        {/* Glow effect */}
        <div className="achievement-toast-glow" />
        
        {/* Icon */}
        <div className="achievement-toast-icon">
          <span className="achievement-toast-emoji">{achievement.icon}</span>
          <div className="achievement-toast-icon-ring" />
        </div>

        {/* Content */}
        <div className="achievement-toast-content">
          <div className="achievement-toast-label">
            <Trophy size={12} />
            <span>Achievement Unlocked!</span>
          </div>
          <h3 className="achievement-toast-title">{achievement.title}</h3>
          <p className="achievement-toast-description">{achievement.description}</p>
        </div>

        {/* Close button */}
        <button
          className="achievement-toast-close"
          onClick={handleDismiss}
          aria-label="Dismiss"
        >
          <X size={16} />
        </button>

        {/* Progress bar */}
        <div 
          className="achievement-toast-progress"
          style={{ '--duration': `${duration}ms` }}
        />
      </div>
    </div>
  )

  return createPortal(toast, document.body)
}

export default AchievementToast
