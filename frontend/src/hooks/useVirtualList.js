/**
 * useVirtualList Hook
 * Efficient rendering of large lists
 */

import { useState, useCallback, useMemo, useRef, useEffect } from 'react'

export function useVirtualList({
  items,
  itemHeight,
  containerHeight,
  overscan = 5
}) {
  const [scrollTop, setScrollTop] = useState(0)
  const containerRef = useRef(null)

  const { startIndex, endIndex, visibleItems, totalHeight, offsetY } = useMemo(() => {
    const totalHeight = items.length * itemHeight
    const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
    const endIndex = Math.min(
      items.length - 1,
      Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
    )

    const visibleItems = items.slice(startIndex, endIndex + 1).map((item, index) => ({
      ...item,
      virtualIndex: startIndex + index
    }))

    const offsetY = startIndex * itemHeight

    return { startIndex, endIndex, visibleItems, totalHeight, offsetY }
  }, [items, itemHeight, containerHeight, scrollTop, overscan])

  const handleScroll = useCallback((e) => {
    setScrollTop(e.target.scrollTop)
  }, [])

  useEffect(() => {
    const container = containerRef.current
    if (container) {
      container.addEventListener('scroll', handleScroll, { passive: true })
      return () => container.removeEventListener('scroll', handleScroll)
    }
  }, [handleScroll])

  return {
    containerRef,
    visibleItems,
    totalHeight,
    offsetY,
    startIndex,
    endIndex
  }
}

export default useVirtualList
