import { useState, useEffect, useCallback, useRef } from 'react'

/**
 * Hook that delays unmounting so CSS exit animations can play.
 * Returns [shouldRender, isAnimatingOut].
 *  - shouldRender: keep the element in the DOM until the exit animation finishes
 *  - isAnimatingOut: true during the exit phase (apply exit CSS class)
 */
export function useExitAnimation(isVisible, durationMs = 250) {
    const [shouldRender, setShouldRender] = useState(isVisible)
    const [isAnimatingOut, setIsAnimatingOut] = useState(false)
    const timerRef = useRef(null)

    useEffect(() => {
        if (isVisible) {
            clearTimeout(timerRef.current)
            setIsAnimatingOut(false)
            setShouldRender(true)
        } else if (shouldRender) {
            setIsAnimatingOut(true)
            timerRef.current = setTimeout(() => {
                setShouldRender(false)
                setIsAnimatingOut(false)
            }, durationMs)
        }
        return () => clearTimeout(timerRef.current)
    }, [isVisible, durationMs])

    return [shouldRender, isAnimatingOut]
}
