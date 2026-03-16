/**
 * dependencyBuilder.js — Builds directed dependency graphs from parsed files.
 *
 * Uses O(1) suffix maps and LRU caching for fast import resolution
 * even on repos with 70K+ files.
 */

import { resolveImport } from '../parser/regexParser.js'
import { NativeGraph, LRUCache } from './NativeGraph.js'

// Global import resolution cache — persists across analysis runs
const importResolutionCache = new LRUCache(50000)

/**
 * Build a directed dependency graph from parsed files.
 */
export function buildDependencyGraph(parsedFiles) {
  const graph = new NativeGraph()

  const exactMap = new Map()
  const suffixMap = new Map()

  for (const file of parsedFiles) {
    const normalized = normalizePath(file.file_path)
    exactMap.set(normalized, file.file_path)

    const parts = normalized.split('/')
    for (let i = 0; i < parts.length; i++) {
       const suffix = parts.slice(i).join('/')
       if (!suffixMap.has(suffix)) {
          suffixMap.set(suffix, file.file_path)
       }
    }

    graph.mergeNode(file.file_path, { file })
  }

  // Scale cache to repo size
  const idealCacheSize = Math.max(50000, parsedFiles.length * 40)
  if (importResolutionCache.maxSize < idealCacheSize) {
    importResolutionCache.maxSize = Math.min(idealCacheSize, 500000)
  }

  for (const file of parsedFiles) {
    for (const imp of file.imports) {
      const resolved = resolveImport(imp.text || imp, file.file_path, file.language)
      if (!resolved || resolved.length < 2) continue

      const target = findMatchingFile(resolved, file.file_path, exactMap, suffixMap, file.language)
      if (target && target !== file.file_path) {
        graph.mergeEdge(file.file_path, target)
      }
    }
  }

  return graph
}

/**
 * O(1) import matching using suffix and exact maps with LRU caching.
 */
function findMatchingFile(importSpec, currentFilePath, exactMap, suffixMap, language) {
  const cacheKey = `${currentFilePath}::${importSpec}`
  const cached = importResolutionCache.get(cacheKey)
  if (cached !== undefined) return cached

  const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.py', '/index.js', '/index.ts', '/index.jsx', '.mjs', '.cjs']
  const normalizedSpec = normalizePath(importSpec)

  let result = null

  // Resolve relative paths
  if (normalizedSpec.startsWith('.')) {
      const currentDir = currentFilePath.split('/').slice(0, -1).join('/')
      const parts = currentDir.split('/')
      const specParts = normalizedSpec.split('/')

      for (const p of specParts) {
          if (p === '.') continue
          if (p === '..') parts.pop()
          else parts.push(p)
      }

      const absoluteSpec = parts.join('/')
      for (const ext of extensions) {
          const cand = absoluteSpec + ext
          if (exactMap.has(cand)) {
            result = exactMap.get(cand)
            break
          }
      }
  }

  // Suffix map lookup for absolute/module paths
  if (result === null) {
    for (const ext of extensions) {
        const cand = normalizedSpec + ext
        if (suffixMap.has(cand)) {
          result = suffixMap.get(cand)
          break
        }
    }
  }

  importResolutionCache.set(cacheKey, result)
  return result
}

function normalizePath(p) {
  return p.replace(/\\/g, '/').toLowerCase()
}
