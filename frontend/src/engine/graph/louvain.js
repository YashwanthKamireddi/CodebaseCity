/**
 * louvain.js — Native Louvain Community Detection
 *
 * A zero-dependency, browser-safe implementation of the Louvain method
 * for community detection in graphs. This replaces the `graphology-communities-louvain`
 * npm package that crashed the Vite Web Worker bundler due to CJS/ESM conflicts.
 *
 * Algorithm: Blondel et al., "Fast unfolding of communities in large networks" (2008)
 *
 * Complexity: O(N·log(N)) amortized — fast enough for 10,000+ file repos in-browser.
 */

/**
 * Run Louvain community detection on a NativeGraph instance.
 *
 * @param {NativeGraph} graph - The dependency graph
 * @param {number} maxIterations - Safety limit to prevent infinite loops
 * @returns {Object} Map of nodeId → communityId
 */
export function detectCommunities(graph, maxIterations = 20) {
  const nodes = graph.nodes
  const edges = graph.edges

  if (nodes.length === 0) return {}
  if (edges.length === 0) {
    // No edges: every file is its own community
    const result = {}
    nodes.forEach((n, i) => { result[n] = i })
    return result
  }

  // Build adjacency structure for fast neighbor lookups
  // Treat graph as undirected for community detection
  const adj = new Map() // nodeId → Map<neighborId, weight>
  const degree = new Map() // nodeId → total weight

  for (const node of nodes) {
    adj.set(node, new Map())
    degree.set(node, 0)
  }

  for (const edge of edges) {
    const { source, target } = edge
    if (!adj.has(source) || !adj.has(target)) continue

    // Undirected: add both directions
    const w = 1 // uniform edge weight
    adj.get(source).set(target, (adj.get(source).get(target) || 0) + w)
    adj.get(target).set(source, (adj.get(target).get(source) || 0) + w)
    degree.set(source, degree.get(source) + w)
    degree.set(target, degree.get(target) + w)
  }

  // Total weight of all edges (sum of all degrees / 2 for undirected)
  let m = 0
  for (const d of degree.values()) m += d
  m /= 2

  if (m === 0) {
    // No weighted edges: fallback to individual communities
    const result = {}
    nodes.forEach((n, i) => { result[n] = i })
    return result
  }

  // Initialize: each node is its own community
  const community = new Map()
  nodes.forEach((n, i) => community.set(n, i))

  // Phase 1: Local modularity optimization (greedy node moves)
  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false

    for (const node of nodes) {
      const currentComm = community.get(node)
      const ki = degree.get(node)
      const neighbors = adj.get(node)

      if (!neighbors || neighbors.size === 0) continue

      // Calculate weights to each neighboring community
      const commWeights = new Map() // communityId → sum of edge weights to that community
      for (const [neighbor, weight] of neighbors) {
        const neighborComm = community.get(neighbor)
        commWeights.set(neighborComm, (commWeights.get(neighborComm) || 0) + weight)
      }

      // Calculate ΔQ for removing node from current community
      const sigmaTotCurrent = getSigmaTot(currentComm, community, degree)
      const kiIn = commWeights.get(currentComm) || 0

      let bestComm = currentComm
      let bestDelta = 0

      for (const [candidateComm, kiInCandidate] of commWeights) {
        if (candidateComm === currentComm) continue

        const sigmaTotCandidate = getSigmaTot(candidateComm, community, degree)

        // Modularity gain formula (Louvain paper, Eq. 1)
        const deltaQ =
          (kiInCandidate / m) -
          (sigmaTotCandidate * ki) / (2 * m * m) -
          (-(kiIn / m) + ((sigmaTotCurrent - ki) * ki) / (2 * m * m))

        if (deltaQ > bestDelta) {
          bestDelta = deltaQ
          bestComm = candidateComm
        }
      }

      if (bestComm !== currentComm) {
        community.set(node, bestComm)
        moved = true
      }
    }

    // Converged: no nodes moved this iteration
    if (!moved) break
  }

  // Renumber communities to be sequential 0, 1, 2, ...
  const uniqueComms = new Set(community.values())
  const renumber = new Map()
  let idx = 0
  for (const c of uniqueComms) {
    renumber.set(c, idx++)
  }

  const result = {}
  for (const [node, comm] of community) {
    result[node] = renumber.get(comm)
  }

  return result
}

/**
 * Calculate Σtot for a community (sum of degrees of all nodes in the community).
 * This is used in the modularity gain formula.
 */
function getSigmaTot(commId, community, degree) {
  let total = 0
  for (const [node, comm] of community) {
    if (comm === commId) {
      total += degree.get(node) || 0
    }
  }
  return total
}
