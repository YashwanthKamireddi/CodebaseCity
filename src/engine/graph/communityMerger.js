/**
 * communityMerger.js — Community detection with smart merging.
 *
 * Uses Louvain algorithm for dependency-based grouping, with directory
 * fallback for repos with few edges. Merges tiny communities to keep
 * district count manageable.
 */

import { detectCommunities } from './louvain.js'
import logger from '../../utils/logger.js'

/**
 * Try Louvain first, fallback to directory-based grouping.
 */
export function detectCommunitiesSafe(graph) {
  if (graph.edges.length > 2) {
    try {
      const start = performance.now()
      let result = detectCommunities(graph)
      const elapsed = performance.now() - start

      const uniqueComms = new Set(Object.values(result))
      if (uniqueComms.size > 1) {
        logger.debug(`[Louvain] Detected ${uniqueComms.size} communities in ${elapsed.toFixed(0)}ms`)
        result = mergeTinyCommunities(result, graph, 80)
        return result
      }
    } catch (err) {
      logger.warn('[Louvain] Failed, using directory fallback:', err.message)
    }
  }

  return assignCommunitiesByDirectory(graph)
}

/**
 * Fallback: group by first 2 directory segments.
 */
function assignCommunitiesByDirectory(graph) {
  const communities = {}
  let communityCounter = 0
  const dirMap = new Map()

  graph.nodes.forEach((node) => {
    const parts = node.split('/')
    const depth = Math.min(2, parts.length - 1)
    const dir = depth > 0 ? parts.slice(0, depth).join('/') : 'root'
    if (!dirMap.has(dir)) {
      dirMap.set(dir, communityCounter++)
    }
    communities[node] = dirMap.get(dir)
  })

  return communities
}

/**
 * Merge tiny communities into nearest neighbor by edge coupling.
 *
 * Phase 1: Merge communities < MIN_SIZE into most-connected neighbor.
 * Phase 2: If still over maxCommunities, merge smallest until under cap.
 */
function mergeTinyCommunities(communities, graph, maxCommunities = 80) {
  const MIN_SIZE = 3

  const commNodes = new Map()
  for (const [node, comm] of Object.entries(communities)) {
    if (!commNodes.has(comm)) commNodes.set(comm, [])
    commNodes.get(comm).push(node)
  }

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

  function bestTarget(comm) {
    const neighbors = interEdges.get(comm)
    if (!neighbors || neighbors.size === 0) return null
    let best = null, bestCount = 0
    for (const [neighbor, count] of neighbors) {
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

    for (const node of nodes) {
      communities[node] = target
    }
    commNodes.get(target).push(...nodes)
    commNodes.delete(comm)
  }

  // Phase 2: merge smallest until under cap
  while (commNodes.size > maxCommunities) {
    let smallestComm = null, smallestSize = Infinity
    for (const [comm, nodes] of commNodes) {
      if (nodes.length < smallestSize) {
        smallestSize = nodes.length
        smallestComm = comm
      }
    }
    if (smallestComm === null) break

    const target = bestTarget(smallestComm)
    if (target === null) break

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
