/**
 * NativeGraph — Ultra-lightweight zero-dependency directed graph.
 * Solves Web Worker CJS module initialization crashes.
 */
export class NativeGraph {
  constructor() {
    this.nodeMap = new Map()
    this.edgeList = []
    this._edgeSet = new Set()
    this.inDegrees = new Map()
  }
  mergeNode(id, attrs = {}) {
    if (!this.nodeMap.has(id)) {
      this.nodeMap.set(id, attrs)
      this.inDegrees.set(id, 0)
    }
  }
  mergeEdge(source, target) {
    if (!this.nodeMap.has(source) || !this.nodeMap.has(target)) return
    const key = `${source}\0${target}`
    if (!this._edgeSet.has(key)) {
      this._edgeSet.add(key)
      this.edgeList.push({ source, target })
      this.inDegrees.set(target, (this.inDegrees.get(target) || 0) + 1)
    }
  }
  get nodes() { return Array.from(this.nodeMap.keys()) }
  get edges() { return this.edgeList }
  inDegree(id) { return this.inDegrees.get(id) || 0 }
  get order() { return this.nodeMap.size }
}

/**
 * Simple LRU Cache for import resolution.
 * Dramatically speeds up repeated path lookups in large codebases.
 */
export class LRUCache {
  constructor(maxSize = 10000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key) {
    if (!this.cache.has(key)) return undefined
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value
      this.cache.delete(firstKey)
    }
    this.cache.set(key, value)
  }

  has(key) {
    return this.cache.has(key)
  }

  clear() {
    this.cache.clear()
  }
}
