/**
 * useIntersectionObserver Hook
 * Lazy loading and visibility detection
 */

import { useState, useEffect, useRef } from 'react'

export function useIntersectionObserver(options = {}) {
  const [isIntersecting, setIsIntersecting] = useState(false)
  const [entry, setEntry] = useState(null)
  const targetRef = useRef(null)

  useEffect(() => {
    const target = targetRef.current
    if (!target) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting)
        setEntry(entry)
      },
      {
        rootMargin: '0px',
        threshold: 0.1,
        ...options
      }
    )

    observer.observe(target)

    return () => {
      observer.disconnect()
    }
  }, [options.rootMargin, options.threshold])

  return { targetRef, isIntersecting, entry }
}

export default useIntersectionObserver
