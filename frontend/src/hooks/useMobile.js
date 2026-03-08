/**
 * useMobile.js — Mobile Detection & Touch Gesture Utilities
 *
 * Provides hooks for:
 * - Mobile device detection
 * - Touch gesture handling (swipe to close panels)
 * - Safe area insets
 * - Viewport height fix for mobile browsers
 */

import { useState, useEffect, useRef, useCallback } from 'react'

/**
 * Detect if the user is on a mobile/touch device
 */
export function useIsMobile() {
    const [isMobile, setIsMobile] = useState(false)

    useEffect(() => {
        const checkMobile = () => {
            const hasTouch = 'ontouchstart' in window || navigator.maxTouchPoints > 0
            const isNarrow = window.innerWidth <= 768
            setIsMobile(hasTouch && isNarrow)
        }

        checkMobile()
        window.addEventListener('resize', checkMobile)
        return () => window.removeEventListener('resize', checkMobile)
    }, [])

    return isMobile
}

/**
 * Detect if it's a touch-capable device (regardless of screen size)
 */
export function useIsTouch() {
    const [isTouch, setIsTouch] = useState(false)

    useEffect(() => {
        setIsTouch('ontouchstart' in window || navigator.maxTouchPoints > 0)
    }, [])

    return isTouch
}

/**
 * Fix mobile viewport height (100vh issue on iOS Safari)
 * Sets a CSS variable --vh that represents the true viewport height
 */
export function useViewportHeight() {
    useEffect(() => {
        const setVH = () => {
            const vh = window.innerHeight * 0.01
            document.documentElement.style.setProperty('--vh', `${vh}px`)
        }

        setVH()
        window.addEventListener('resize', setVH)
        window.addEventListener('orientationchange', setVH)

        return () => {
            window.removeEventListener('resize', setVH)
            window.removeEventListener('orientationchange', setVH)
        }
    }, [])
}

/**
 * Swipe gesture hook for dismissing panels
 * @param {Object} options
 * @param {Function} options.onSwipeDown - Called when swipe down detected
 * @param {number} options.threshold - Minimum swipe distance (default: 50)
 * @param {boolean} options.enabled - Enable/disable the gesture
 */
export function useSwipeGesture({ onSwipeDown, threshold = 50, enabled = true }) {
    const touchStartY = useRef(0)
    const touchEndY = useRef(0)
    const elementRef = useRef(null)

    const handleTouchStart = useCallback((e) => {
        touchStartY.current = e.touches[0].clientY
    }, [])

    const handleTouchMove = useCallback((e) => {
        touchEndY.current = e.touches[0].clientY
    }, [])

    const handleTouchEnd = useCallback(() => {
        const diff = touchEndY.current - touchStartY.current
        if (diff > threshold && onSwipeDown) {
            onSwipeDown()
        }
        touchStartY.current = 0
        touchEndY.current = 0
    }, [threshold, onSwipeDown])

    useEffect(() => {
        const element = elementRef.current
        if (!element || !enabled) return

        element.addEventListener('touchstart', handleTouchStart, { passive: true })
        element.addEventListener('touchmove', handleTouchMove, { passive: true })
        element.addEventListener('touchend', handleTouchEnd, { passive: true })

        return () => {
            element.removeEventListener('touchstart', handleTouchStart)
            element.removeEventListener('touchmove', handleTouchMove)
            element.removeEventListener('touchend', handleTouchEnd)
        }
    }, [enabled, handleTouchStart, handleTouchMove, handleTouchEnd])

    return elementRef
}

/**
 * Prevent body scroll when a modal/panel is open
 * @param {boolean} isOpen - Whether the modal is open
 */
export function useLockBodyScroll(isOpen) {
    useEffect(() => {
        if (!isOpen) return

        const originalStyle = window.getComputedStyle(document.body).overflow
        document.body.style.overflow = 'hidden'

        // Also handle iOS Safari
        document.body.style.position = 'fixed'
        document.body.style.width = '100%'

        return () => {
            document.body.style.overflow = originalStyle
            document.body.style.position = ''
            document.body.style.width = ''
        }
    }, [isOpen])
}

/**
 * Get safe area insets for notched devices
 */
export function useSafeAreaInsets() {
    const [insets, setInsets] = useState({
        top: 0,
        bottom: 0,
        left: 0,
        right: 0
    })

    useEffect(() => {
        const computeInsets = () => {
            const style = getComputedStyle(document.documentElement)
            setInsets({
                top: parseInt(style.getPropertyValue('--safe-top') || '0', 10),
                bottom: parseInt(style.getPropertyValue('--safe-bottom') || '0', 10),
                left: parseInt(style.getPropertyValue('--safe-left') || '0', 10),
                right: parseInt(style.getPropertyValue('--safe-right') || '0', 10)
            })
        }

        computeInsets()
        window.addEventListener('resize', computeInsets)
        return () => window.removeEventListener('resize', computeInsets)
    }, [])

    return insets
}

export default {
    useIsMobile,
    useIsTouch,
    useViewportHeight,
    useSwipeGesture,
    useLockBodyScroll,
    useSafeAreaInsets
}
