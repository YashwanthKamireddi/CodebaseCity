/**
 * Accessibility Utilities
 * WCAG 2.1 AA compliant helpers
 */

/**
 * Announce a message to screen readers
 * @param {string} message - Message to announce
 * @param {'polite' | 'assertive'} priority - Announcement priority
 */
export function announceToScreenReader(message, priority = 'polite') {
  const announcer = document.getElementById('sr-announcer') || createAnnouncer()
  announcer.setAttribute('aria-live', priority)

  // Clear then set to trigger announcement
  announcer.textContent = ''
  requestAnimationFrame(() => {
    announcer.textContent = message
  })
}

/**
 * Create the screen reader announcer element
 */
function createAnnouncer() {
  const announcer = document.createElement('div')
  announcer.id = 'sr-announcer'
  announcer.setAttribute('aria-live', 'polite')
  announcer.setAttribute('aria-atomic', 'true')
  announcer.className = 'sr-only'
  document.body.appendChild(announcer)
  return announcer
}

/**
 * Focus trap for modals
 * @param {HTMLElement} container - Container element
 * @returns {Function} Cleanup function
 */
export function createFocusTrap(container) {
  const focusableElements = container.querySelectorAll(
    'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
  )

  const firstFocusable = focusableElements[0]
  const lastFocusable = focusableElements[focusableElements.length - 1]

  const handleKeyDown = (e) => {
    if (e.key !== 'Tab') return

    if (e.shiftKey) {
      if (document.activeElement === firstFocusable) {
        e.preventDefault()
        lastFocusable?.focus()
      }
    } else {
      if (document.activeElement === lastFocusable) {
        e.preventDefault()
        firstFocusable?.focus()
      }
    }
  }

  container.addEventListener('keydown', handleKeyDown)
  firstFocusable?.focus()

  return () => {
    container.removeEventListener('keydown', handleKeyDown)
  }
}

/**
 * Check if reduced motion is preferred
 */
export function prefersReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

/**
 * Get appropriate animation duration based on user preferences
 * @param {number} normalDuration - Normal duration in ms
 */
export function getAnimationDuration(normalDuration) {
  return prefersReducedMotion() ? 0 : normalDuration
}

/**
 * Generate unique ID for accessibility
 */
let idCounter = 0
export function generateA11yId(prefix = 'a11y') {
  return `${prefix}-${++idCounter}`
}

/**
 * Color contrast checker (WCAG AA: 4.5:1 for normal text, 3:1 for large text)
 * @param {string} foreground - Foreground color hex
 * @param {string} background - Background color hex
 */
export function getContrastRatio(foreground, background) {
  const getLuminance = (hex) => {
    const rgb = parseInt(hex.slice(1), 16)
    const r = (rgb >> 16) & 0xff
    const g = (rgb >> 8) & 0xff
    const b = rgb & 0xff

    const [rs, gs, bs] = [r, g, b].map(c => {
      c = c / 255
      return c <= 0.03928 ? c / 12.92 : Math.pow((c + 0.055) / 1.055, 2.4)
    })

    return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs
  }

  const l1 = getLuminance(foreground)
  const l2 = getLuminance(background)

  const lighter = Math.max(l1, l2)
  const darker = Math.min(l1, l2)

  return (lighter + 0.05) / (darker + 0.05)
}

/**
 * Check if contrast meets WCAG AA
 */
export function meetsContrastAA(foreground, background, isLargeText = false) {
  const ratio = getContrastRatio(foreground, background)
  return isLargeText ? ratio >= 3 : ratio >= 4.5
}

/**
 * Keyboard navigation helpers
 */
export const KEYS = {
  ENTER: 'Enter',
  SPACE: ' ',
  ESCAPE: 'Escape',
  TAB: 'Tab',
  ARROW_UP: 'ArrowUp',
  ARROW_DOWN: 'ArrowDown',
  ARROW_LEFT: 'ArrowLeft',
  ARROW_RIGHT: 'ArrowRight',
  HOME: 'Home',
  END: 'End'
}

/**
 * Handle arrow key navigation in a list
 */
export function handleListNavigation(e, items, currentIndex, setIndex) {
  switch (e.key) {
    case KEYS.ARROW_DOWN:
      e.preventDefault()
      setIndex(Math.min(currentIndex + 1, items.length - 1))
      break
    case KEYS.ARROW_UP:
      e.preventDefault()
      setIndex(Math.max(currentIndex - 1, 0))
      break
    case KEYS.HOME:
      e.preventDefault()
      setIndex(0)
      break
    case KEYS.END:
      e.preventDefault()
      setIndex(items.length - 1)
      break
  }
}
