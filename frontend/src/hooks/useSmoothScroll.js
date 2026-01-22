/**
 * useSmoothScroll.js
 *
 * Lenis smooth scroll integration for butter-smooth scrolling
 * Used by award-winning websites for premium feel
 */

import { useEffect, useRef } from 'react'
import Lenis from 'lenis'

/**
 * Initialize Lenis smooth scroll
 * Note: For 3D apps, we mainly use this for any scrollable panels/sidebars
 */
export function useSmoothScroll(options = {}) {
  const lenisRef = useRef(null)

  useEffect(() => {
    const lenis = new Lenis({
      duration: 1.2,
      easing: (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t)), // Exponential ease out
      orientation: 'vertical',
      gestureOrientation: 'vertical',
      smoothWheel: true,
      wheelMultiplier: 1,
      touchMultiplier: 2,
      infinite: false,
      ...options
    })

    lenisRef.current = lenis

    // Animation frame loop
    function raf(time) {
      lenis.raf(time)
      requestAnimationFrame(raf)
    }

    requestAnimationFrame(raf)

    // Cleanup
    return () => {
      lenis.destroy()
    }
  }, [])

  return lenisRef
}

/**
 * Scroll to element smoothly
 */
export function scrollToElement(elementOrSelector, options = {}) {
  const {
    offset = 0,
    duration = 1.2,
    easing = (t) => Math.min(1, 1.001 - Math.pow(2, -10 * t))
  } = options

  const element = typeof elementOrSelector === 'string'
    ? document.querySelector(elementOrSelector)
    : elementOrSelector

  if (!element) return

  const targetY = element.getBoundingClientRect().top + window.scrollY + offset

  const startY = window.scrollY
  const distance = targetY - startY
  const startTime = performance.now()
  const totalDuration = duration * 1000

  function animate(currentTime) {
    const elapsed = currentTime - startTime
    const progress = Math.min(elapsed / totalDuration, 1)
    const easeProgress = easing(progress)

    window.scrollTo(0, startY + distance * easeProgress)

    if (progress < 1) {
      requestAnimationFrame(animate)
    }
  }

  requestAnimationFrame(animate)
}

export default useSmoothScroll
