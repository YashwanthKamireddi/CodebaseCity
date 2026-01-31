/**
 * Performance Utilities
 * Optimizations for large codebases
 */

/**
 * Debounce function calls
 */
export function debounce(fn, delay) {
  let timeoutId
  return function (...args) {
    clearTimeout(timeoutId)
    timeoutId = setTimeout(() => fn.apply(this, args), delay)
  }
}

/**
 * Throttle function calls
 */
export function throttle(fn, limit) {
  let inThrottle
  return function (...args) {
    if (!inThrottle) {
      fn.apply(this, args)
      inThrottle = true
      setTimeout(() => (inThrottle = false), limit)
    }
  }
}

/**
 * Request Idle Callback polyfill
 */
export const requestIdleCallback =
  window.requestIdleCallback ||
  function (cb) {
    const start = Date.now()
    return setTimeout(() => {
      cb({
        didTimeout: false,
        timeRemaining: () => Math.max(0, 50 - (Date.now() - start))
      })
    }, 1)
  }

export const cancelIdleCallback =
  window.cancelIdleCallback || ((id) => clearTimeout(id))

/**
 * Lazy load with intersection observer
 */
export function createLazyLoader(callback, options = {}) {
  const observer = new IntersectionObserver(
    (entries) => {
      entries.forEach((entry) => {
        if (entry.isIntersecting) {
          callback(entry.target)
          observer.unobserve(entry.target)
        }
      })
    },
    {
      rootMargin: '50px',
      threshold: 0.1,
      ...options
    }
  )

  return {
    observe: (el) => observer.observe(el),
    unobserve: (el) => observer.unobserve(el),
    disconnect: () => observer.disconnect()
  }
}

/**
 * Memory-efficient object pool for Three.js objects
 */
export class ObjectPool {
  constructor(factory, reset, initialSize = 10) {
    this.factory = factory
    this.reset = reset
    this.pool = []

    // Pre-allocate
    for (let i = 0; i < initialSize; i++) {
      this.pool.push(factory())
    }
  }

  acquire() {
    return this.pool.pop() || this.factory()
  }

  release(obj) {
    this.reset(obj)
    this.pool.push(obj)
  }

  clear() {
    this.pool.length = 0
  }
}

/**
 * Batch DOM updates
 */
export function batchUpdate(updates) {
  return new Promise((resolve) => {
    requestAnimationFrame(() => {
      updates.forEach((update) => update())
      resolve()
    })
  })
}

/**
 * Virtual list helper - calculate visible range
 */
export function getVisibleRange(scrollTop, containerHeight, itemHeight, totalItems, overscan = 3) {
  const startIndex = Math.max(0, Math.floor(scrollTop / itemHeight) - overscan)
  const endIndex = Math.min(
    totalItems - 1,
    Math.ceil((scrollTop + containerHeight) / itemHeight) + overscan
  )

  return { startIndex, endIndex }
}

/**
 * Measure performance
 */
export function measurePerformance(name, fn) {
  const start = performance.now()
  const result = fn()
  const duration = performance.now() - start

  if (duration > 16) {
    console.warn(`[Perf] ${name} took ${duration.toFixed(2)}ms (> 16ms budget)`)
  }

  return result
}

/**
 * Web Worker helper
 */
export function createWorker(workerFn) {
  const blob = new Blob([`(${workerFn.toString()})()`], { type: 'application/javascript' })
  const url = URL.createObjectURL(blob)
  const worker = new Worker(url)

  return {
    worker,
    terminate: () => {
      worker.terminate()
      URL.revokeObjectURL(url)
    }
  }
}

/**
 * Memory usage tracker
 */
export function getMemoryUsage() {
  if (performance.memory) {
    return {
      usedJSHeapSize: performance.memory.usedJSHeapSize,
      totalJSHeapSize: performance.memory.totalJSHeapSize,
      jsHeapSizeLimit: performance.memory.jsHeapSizeLimit,
      percentUsed: (performance.memory.usedJSHeapSize / performance.memory.jsHeapSizeLimit) * 100
    }
  }
  return null
}

/**
 * FPS Monitor
 */
export class FPSMonitor {
  constructor() {
    this.frames = []
    this.lastTime = performance.now()
  }

  tick() {
    const now = performance.now()
    const delta = now - this.lastTime
    this.lastTime = now

    this.frames.push(1000 / delta)
    if (this.frames.length > 60) {
      this.frames.shift()
    }

    return this.getFPS()
  }

  getFPS() {
    if (this.frames.length === 0) return 0
    return Math.round(this.frames.reduce((a, b) => a + b, 0) / this.frames.length)
  }
}
