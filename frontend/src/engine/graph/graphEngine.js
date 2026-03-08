/**
 * graphEngine.js — Client-side dependency graph analysis
 *
 * 100% Native Zero-Dependency Implementation.
 * Uses a custom Louvain algorithm for community detection and
 * spiral treemap packing for beautiful city layouts.
 *
 * Performance Optimizations:
 * - LRU cache for import resolution (avoids repeated path lookups)
 * - Pre-computed suffix maps for O(1) file matching
 * - Optimized community merging with edge-count tracking
 */

import { resolveImport } from '../parser/regexParser.js'
import { detectCommunities } from './louvain.js'
import logger from '../../utils/logger.js'

// Layout constants matching backend's city_builder.py
const BUILDING_SPACING = 3
const DISTRICT_PADDING = 8
const MIN_BUILDING_WIDTH = 2
const MAX_BUILDING_WIDTH = 20
const MIN_BUILDING_HEIGHT = 1
const MAX_BUILDING_HEIGHT = 80

/**
 * Simple LRU Cache for import resolution
 * Dramatically speeds up repeated path lookups in large codebases
 */
class LRUCache {
  constructor(maxSize = 10000) {
    this.cache = new Map()
    this.maxSize = maxSize
  }

  get(key) {
    if (!this.cache.has(key)) return undefined
    // Move to end (most recently used)
    const value = this.cache.get(key)
    this.cache.delete(key)
    this.cache.set(key, value)
    return value
  }

  set(key, value) {
    if (this.cache.has(key)) {
      this.cache.delete(key)
    } else if (this.cache.size >= this.maxSize) {
      // Delete oldest entry (first key)
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

// Global import resolution cache - persists across analysis runs for incremental updates
const importResolutionCache = new LRUCache(10000)

/**
 * A ultra-lightweight, zero-dependency directed graph.
 * Solves all Web Worker CJS module initialization crashes.
 */
class NativeGraph {
  constructor() {
    this.nodeMap = new Map() // id -> attrs
    this.edgeList = []
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
    // Prevent duplicate edges trivially
    const exists = this.edgeList.find(e => e.source === source && e.target === target)
    if (!exists) {
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
 * Build the full city data from parsed files.
 */
export function buildCityData(parsedFiles, rootName) {
  // 1. Build the dependency graph natively
  const graph = buildDependencyGraph(parsedFiles)

  // 2. Detect communities (Louvain with directory fallback)
  const communities = detectCommunitiesSafe(graph)

  // 3. Calculate metrics
  const metrics = calculateMetrics(parsedFiles, graph)

  // 4. Generate layout positions
  const buildings = generateBuildings(parsedFiles, communities, metrics)

  // 5. Build districts from communities
  const districts = generateDistricts(buildings, communities)

  // 6. Build roads (edges between buildings)
  const roads = generateRoads(graph, buildings)

  return {
    name: rootName,
    buildings,
    districts,
    roads,
    metrics: {
      total_files: parsedFiles.length,
      total_lines: parsedFiles.reduce((sum, f) => sum + f.lines_of_code, 0),
      languages: countLanguages(parsedFiles),
      avg_complexity: metrics.avgComplexity,
    },
    dependency_graph: {
      nodes: graph.nodes.map(n => ({ id: n })),
      edges: graph.edges.map(e => ({
        source: e.source,
        target: e.target,
      })),
    },
  }
}

/**
 * Build a directed dependency graph from parsed files.
 */
function buildDependencyGraph(parsedFiles) {
  const graph = new NativeGraph()

  // Create fast O(1) lookup maps
  const exactMap = new Map()
  const suffixMap = new Map() // suffix -> full path

  for (const file of parsedFiles) {
    const normalized = normalizePath(file.file_path)
    exactMap.set(normalized, file.file_path)

    // Store common suffixes for fast O(1) substring lookups
    // e.g. "src/utils/foo.js" maps "utils/foo.js" and "foo.js" to the full path.
    const parts = normalized.split('/')
    for (let i = 0; i < parts.length; i++) {
       const suffix = parts.slice(i).join('/')
       if (!suffixMap.has(suffix)) {
          suffixMap.set(suffix, file.file_path)
       }
    }

    graph.mergeNode(file.file_path, { file })
  }

  // Resolve imports to create edges
  for (const file of parsedFiles) {
    for (const imp of file.imports) {
      const resolved = resolveImport(imp.text || imp, file.file_path, file.language)
      if (!resolved || resolved.length < 2) continue

      const target = findMatchingFileOptimized(resolved, file.file_path, exactMap, suffixMap, file.language)
      if (target && target !== file.file_path) {
        graph.mergeEdge(file.file_path, target)
      }
    }
  }

  return graph
}

/**
 * Highly optimized O(1) matching for imports using suffix and exact maps.
 * Replaces the O(N^2) loop that was crashing the Web Worker on large repos.
 * Now with LRU caching for repeated lookups.
 */
function findMatchingFileOptimized(importSpec, currentFilePath, exactMap, suffixMap, language) {
  // Check cache first - key includes current file path for relative import context
  const cacheKey = `${currentFilePath}::${importSpec}`
  const cached = importResolutionCache.get(cacheKey)
  if (cached !== undefined) {
    return cached // null is a valid cached "not found" result
  }

  const extensions = ['', '.js', '.jsx', '.ts', '.tsx', '.py', '/index.js', '/index.ts', '/index.jsx', '.mjs', '.cjs']
  const normalizedSpec = normalizePath(importSpec)

  let result = null

  // 1. Resolve relative paths against the current file's directory
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

  // 2. Try fast suffix map lookup for absolute/module paths resolving into the project
  if (result === null) {
    for (const ext of extensions) {
        const cand = normalizedSpec + ext
        if (suffixMap.has(cand)) {
          result = suffixMap.get(cand)
          break
        }
    }
  }

  // Cache the result (including null for "not found")
  importResolutionCache.set(cacheKey, result)
  return result
}

function normalizePath(p) {
  return p.replace(/\\/g, '/').toLowerCase()
}

/**
 * Smart community detection: try native Louvain first, fallback to directory-based.
 * Louvain groups files by actual dependency coupling (reveals hidden architecture).
 * Directory-based is the safety net for repos with no/few edges.
 */
function detectCommunitiesSafe(graph) {
  // Only run Louvain if we have meaningful edges
  if (graph.edges.length > 2) {
    try {
      const start = performance.now()
      let result = detectCommunities(graph)
      const elapsed = performance.now() - start

      // Validate: Louvain should produce multiple communities, not just 1
      const uniqueComms = new Set(Object.values(result))
      if (uniqueComms.size > 1) {
        logger.debug(`[Louvain] Detected ${uniqueComms.size} communities in ${elapsed.toFixed(0)}ms`)
        // Merge tiny communities to keep district count manageable
        result = mergeTinyCommunities(result, graph, 80)
        return result
      }
    } catch (err) {
      logger.warn('[Louvain] Failed, using directory fallback:', err.message)
    }
  }

  // Fallback: group by directory path
  return assignCommunitiesByDirectory(graph)
}

/**
 * Fallback: assign communities by directory structure.
 */
function assignCommunitiesByDirectory(graph) {
  const communities = {}
  let communityCounter = 0
  const dirMap = new Map()

  graph.nodes.forEach((node) => {
    const dir = node.split('/').slice(0, -1).join('/') || 'root'
    if (!dirMap.has(dir)) {
      dirMap.set(dir, communityCounter++)
    }
    communities[node] = dirMap.get(dir)
  })

  return communities
}

/**
 * Merge tiny communities into their nearest neighbor to keep district count reasonable.
 * Without this, Louvain can produce thousands of 1-2 file communities for large repos,
 * causing spiral placement O(N²) blowup and rendering lag.
 *
 * Strategy:
 * 1. Communities with < MIN_SIZE files get merged into the community they share
 *    the most edges with (preserving dependency coupling).
 * 2. If still over maxCommunities, merge smallest communities into their
 *    most-connected neighbor until we're under the cap.
 */
function mergeTinyCommunities(communities, graph, maxCommunities = 80) {
  const MIN_SIZE = 3

  // Build community → [nodes] map
  const commNodes = new Map()
  for (const [node, comm] of Object.entries(communities)) {
    if (!commNodes.has(comm)) commNodes.set(comm, [])
    commNodes.get(comm).push(node)
  }

  // Build inter-community edge counts: commA → Map<commB, edgeCount>
  const interEdges = new Map()
  for (const edge of graph.edges) {
    const ca = communities[edge.source]
    const cb = communities[edge.target]
    if (ca === undefined || cb === undefined || ca === cb) continue
    if (!interEdges.has(ca)) interEdges.set(ca, new Map())
    if (!interEdges.has(cb)) interEdges.set(cb, new Map())
    interEdges.get(ca).set(cb, (interEdges.get(ca).get(cb) || 0) + 1)
    interEdges.get(cb).set(ca, (interEdges.get(cb).get(ca) || 0) + 1)
  }

  // Find best merge target for a community (most shared edges)
  function bestTarget(comm) {
    const neighbors = interEdges.get(comm)
    if (!neighbors || neighbors.size === 0) return null
    let best = null, bestCount = 0
    for (const [neighbor, count] of neighbors) {
      // Only merge into communities that still exist
      if (commNodes.has(neighbor) && count > bestCount) {
        bestCount = count
        best = neighbor
      }
    }
    return best
  }

  // Phase 1: merge communities smaller than MIN_SIZE
  for (const [comm, nodes] of Array.from(commNodes.entries())) {
    if (nodes.length >= MIN_SIZE) continue
    const target = bestTarget(comm)
    if (target === null) continue

    // Move all nodes to target community
    for (const node of nodes) {
      communities[node] = target
    }
    commNodes.get(target).push(...nodes)
    commNodes.delete(comm)
  }

  // Phase 2: if still too many, merge smallest into neighbors
  while (commNodes.size > maxCommunities) {
    // Find smallest community
    let smallestComm = null, smallestSize = Infinity
    for (const [comm, nodes] of commNodes) {
      if (nodes.length < smallestSize) {
        smallestSize = nodes.length
        smallestComm = comm
      }
    }
    if (smallestComm === null) break

    const target = bestTarget(smallestComm)
    if (target === null) break // No edges to merge along — stop

    const nodes = commNodes.get(smallestComm)
    for (const node of nodes) {
      communities[node] = target
    }
    commNodes.get(target).push(...nodes)
    commNodes.delete(smallestComm)
  }

  // Renumber sequentially
  const renumber = new Map()
  let idx = 0
  for (const comm of commNodes.keys()) {
    renumber.set(comm, idx++)
  }
  for (const node of Object.keys(communities)) {
    communities[node] = renumber.get(communities[node]) ?? 0
  }

  logger.debug(`[Merge] Reduced to ${commNodes.size} communities`)
  return communities
}

/**
 * Calculate per-file and aggregate metrics.
 */
function calculateMetrics(parsedFiles, graph) {
  const maxLines = Math.max(...parsedFiles.map(f => f.lines_of_code), 1)
  const maxComplexity = Math.max(...parsedFiles.map(f => f.complexity), 1)
  const totalComplexity = parsedFiles.reduce((s, f) => s + f.complexity, 0)

  // In-degree = how many files import this one (coupling)
  const inDegreeMap = new Map()
  graph.nodes.forEach((node) => {
    inDegreeMap.set(node, graph.inDegree(node))
  })
  const maxInDegree = Math.max(...inDegreeMap.values(), 1)

  return {
    maxLines,
    maxComplexity,
    maxInDegree,
    avgComplexity: totalComplexity / parsedFiles.length,
    inDegreeMap,
  }
}

/**
 * Generate buildings with positions and dimensions.
 *
 * Layout: Adaptive Spiral Treemap — World-Class City Architecture
 * - Districts sorted by size, largest at center
 * - Buildings use ACTUAL size for spacing (not MAX_WIDTH), creating dense realistic blocks
 * - Post-layout centering ensures city is always at (0,0,0)
 * - Tighter spiral with more angle samples for compact packing
 */
function generateBuildings(parsedFiles, communities, metrics) {
  // Group files by community
  const communityGroups = new Map()
  for (const file of parsedFiles) {
    const communityId = communities[file.file_path] ?? 0
    if (!communityGroups.has(communityId)) {
      communityGroups.set(communityId, [])
    }
    communityGroups.get(communityId).push(file)
  }

  // Sort districts by file count (largest first → placed in center of spiral)
  const sortedDistricts = Array.from(communityGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)

  // Pre-compute building dimensions for each file for adaptive layout
  const fileDims = new Map()
  for (const [, files] of sortedDistricts) {
    for (const file of files) {
      const linesNorm = file.lines_of_code / metrics.maxLines
      const complexityNorm = file.complexity / metrics.maxComplexity
      const width = MIN_BUILDING_WIDTH + (MAX_BUILDING_WIDTH - MIN_BUILDING_WIDTH) * Math.sqrt(linesNorm)
      const height = MIN_BUILDING_HEIGHT + (MAX_BUILDING_HEIGHT - MIN_BUILDING_HEIGHT) * complexityNorm
      fileDims.set(file.file_path, { width, height, depth: width })
    }
  }

  // For each district, compute adaptive footprint based on actual building sizes
  const districtFootprints = sortedDistricts.map(([communityId, files]) => {
    // Sort files within district: largest first for better packing (downtown feel)
    files.sort((a, b) => {
      const da = fileDims.get(a.file_path)
      const db = fileDims.get(b.file_path)
      return (db.width * db.height) - (da.width * da.height)
    })

    // Compute adaptive grid: use the MAX building width in this district + spacing
    // This guarantees no overlap — the largest building defines the cell
    const maxWidthInDistrict = Math.max(...files.map(f => fileDims.get(f.file_path).width))
    const cellSize = maxWidthInDistrict + BUILDING_SPACING
    const cols = Math.ceil(Math.sqrt(files.length))
    const rows = Math.ceil(files.length / cols)
    const footprintW = cols * cellSize + DISTRICT_PADDING * 2
    const footprintD = rows * cellSize + DISTRICT_PADDING * 2
    return { communityId, files, cols, rows, footprintW, footprintD, cellSize }
  })

  // Spiral placement: place districts in a clockwise spiral from center
  const districtPositions = spiralPlace(districtFootprints)

  const buildings = []

  for (let di = 0; di < districtFootprints.length; di++) {
    const { communityId, files, cols, cellSize } = districtFootprints[di]
    const { x: districtX, z: districtZ } = districtPositions[di]

    let row = 0
    let col = 0

    for (const file of files) {
      const dims = fileDims.get(file.file_path)
      const { width, height, depth } = dims
      const inDegree = metrics.inDegreeMap.get(file.file_path) || 0
      const inDegreeNorm = inDegree / metrics.maxInDegree
      const complexityNorm = file.complexity / metrics.maxComplexity

      // Position within district grid — center buildings in their cell
      const cellCenterX = districtX + DISTRICT_PADDING + col * cellSize + cellSize / 2
      const cellCenterZ = districtZ + DISTRICT_PADDING + row * cellSize + cellSize / 2

      // Extract directory (layer)
      const parts = file.file_path.split('/')
      const directory = parts.length > 1 ? parts.slice(0, -1).join('/') : 'root'
      const fileName = parts[parts.length - 1]

      buildings.push({
        id: file.file_path,
        name: fileName,
        path: file.file_path,
        file_path: file.file_path,
        language: file.language,
        author: null,
        lines_of_code: file.lines_of_code,
        complexity: file.complexity,
        in_degree: inDegree,
        functions: file.functions,
        classes: file.classes,
        imports: file.imports.map(i => typeof i === 'string' ? i : i.text),
        district_id: `district_${communityId}`,
        directory,
        position: { x: cellCenterX, y: 0, z: cellCenterZ },
        dimensions: { width, height, depth },
        color_metric: complexityNorm,
        coupling_score: inDegreeNorm,
        metrics: {
          size_bytes: file.lines_of_code * 40,
          loc: file.lines_of_code,
          complexity: file.complexity,
          churn: 0,
          commits: 0,
          age_days: 0,
          dependencies_in: inDegree,
          debt: complexityNorm > 0.7 ? complexityNorm : 0,
        },
      })

      col++
      if (col >= cols) {
        col = 0
        row++
      }
    }
  }

  // Post-layout centering — shift all buildings so the city center is at (0, 0, 0)
  if (buildings.length > 0) {
    let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
    for (const b of buildings) {
      minX = Math.min(minX, b.position.x - b.dimensions.width / 2)
      maxX = Math.max(maxX, b.position.x + b.dimensions.width / 2)
      minZ = Math.min(minZ, b.position.z - b.dimensions.depth / 2)
      maxZ = Math.max(maxZ, b.position.z + b.dimensions.depth / 2)
    }
    const offsetX = (minX + maxX) / 2
    const offsetZ = (minZ + maxZ) / 2
    for (const b of buildings) {
      b.position.x -= offsetX
      b.position.z -= offsetZ
    }
  }

  return buildings
}

/**
 * Spiral placement algorithm for districts.
 * Places rectangles in a clockwise spiral from the center, ensuring no overlaps.
 * Uses dense angle sampling and tighter step size for compact city layout.
 */
function spiralPlace(footprints) {
  if (footprints.length === 0) return []

  const positions = []
  const placed = [] // { x, z, w, d } already-placed rectangles

  // Place the first (largest) district at the origin
  const first = footprints[0]
  positions.push({ x: -first.footprintW / 2, z: -first.footprintD / 2 })
  placed.push({
    x: -first.footprintW / 2,
    z: -first.footprintD / 2,
    w: first.footprintW,
    d: first.footprintD
  })

  // For each subsequent district, try spiral positions until we find one that doesn't overlap
  for (let i = 1; i < footprints.length; i++) {
    const fp = footprints[i]
    let bestPos = null
    let bestDist = Infinity

    // Tighter step for more compact packing
    const step = Math.max(fp.cellSize || 8, BUILDING_SPACING + 2)
    const maxRadius = Math.max(500, Math.sqrt(footprints.length) * 120)

    for (let radius = step; radius < maxRadius; radius += step) {
      // Dense angle sampling — more angles per ring for tighter packing
      const numAngles = Math.max(16, Math.floor(radius / step) * 6)
      let foundOnRing = false

      for (let a = 0; a < numAngles; a++) {
        const angle = (a / numAngles) * Math.PI * 2
        const cx = Math.cos(angle) * radius - fp.footprintW / 2
        const cz = Math.sin(angle) * radius - fp.footprintD / 2

        // Check overlap against all placed rectangles with gap
        const gap = DISTRICT_PADDING
        let overlaps = false
        for (const p of placed) {
          if (
            cx < p.x + p.w + gap &&
            cx + fp.footprintW + gap > p.x &&
            cz < p.z + p.d + gap &&
            cz + fp.footprintD + gap > p.z
          ) {
            overlaps = true
            break
          }
        }

        if (!overlaps) {
          const dist = cx * cx + cz * cz
          if (dist < bestDist) {
            bestDist = dist
            bestPos = { x: cx, z: cz }
            foundOnRing = true
          }
        }
      }

      // If we found a position on this ring, use it (greedy for compactness)
      if (foundOnRing) break
    }

    // Fallback: place diagonally if spiral fails
    if (!bestPos) {
      bestPos = { x: i * 80, z: i * 80 }
    }

    positions.push(bestPos)
    placed.push({
      x: bestPos.x,
      z: bestPos.z,
      w: fp.footprintW,
      d: fp.footprintD
    })
  }

  return positions
}

/**
 * Generate districts from community groupings.
 */
function generateDistricts(buildings, communities) {
  const DISTRICT_COLORS = [
    '#FF6B6B', '#45B7D1', '#96CEB4', '#4ECDC4', '#DDA0DD',
    '#FFEAA7', '#74B9FF', '#A29BFE', '#FD79A8', '#55E6C1',
    '#F8B500', '#FC427B', '#6C5CE7', '#00CEC9', '#E17055',
  ]
  const districtMap = new Map()

  for (const b of buildings) {
    const key = b.district_id
    if (!districtMap.has(key)) {
      districtMap.set(key, {
        id: key,
        name: b.directory,
        buildings: [],
        bounds: { minX: Infinity, maxX: -Infinity, minZ: Infinity, maxZ: -Infinity },
      })
    }

    const d = districtMap.get(key)
    d.buildings.push(b.id)
    d.bounds.minX = Math.min(d.bounds.minX, b.position.x - b.dimensions.width / 2)
    d.bounds.maxX = Math.max(d.bounds.maxX, b.position.x + b.dimensions.width / 2)
    d.bounds.minZ = Math.min(d.bounds.minZ, b.position.z - b.dimensions.depth / 2)
    d.bounds.maxZ = Math.max(d.bounds.maxZ, b.position.z + b.dimensions.depth / 2)
  }

  let colorIdx = 0
  return Array.from(districtMap.values()).map(d => {
    const cx = (d.bounds.minX + d.bounds.maxX) / 2
    const cz = (d.bounds.minZ + d.bounds.maxZ) / 2
    const pad = 4
    return {
      id: d.id,
      name: d.name,
      color: DISTRICT_COLORS[colorIdx++ % DISTRICT_COLORS.length],
      center: { x: cx, y: cz },
      boundary: [
        { x: d.bounds.minX - pad, y: d.bounds.minZ - pad },
        { x: d.bounds.maxX + pad, y: d.bounds.minZ - pad },
        { x: d.bounds.maxX + pad, y: d.bounds.maxZ + pad },
        { x: d.bounds.minX - pad, y: d.bounds.maxZ + pad },
      ],
      building_count: d.buildings.length,
    }
  })
}

/**
 * Generate roads from dependency graph edges.
 */
function generateRoads(graph, buildings) {
  const buildingMap = new Map(buildings.map(b => [b.id, b]))
  const roads = []

  graph.edges.forEach((edge) => {
    const { source, target } = edge
    const from = buildingMap.get(source)
    const to = buildingMap.get(target)
    if (!from || !to) return

    roads.push({
      id: `${source}->${target}`,
      source,
      target,
      from_position: from.position,
      to_position: to.position,
    })
  })

  return roads
}

/**
 * Count files per language.
 */
function countLanguages(parsedFiles) {
  const counts = {}
  for (const f of parsedFiles) {
    counts[f.language] = (counts[f.language] || 0) + 1
  }
  return counts
}
