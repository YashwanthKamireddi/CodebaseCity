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
 *
 * Performance Optimizations:
 * - Early termination when modularity gain is negligible
 * - Random node shuffling to avoid local optima
 * - Cached sigma totals for O(1) community weight lookups
 * - Pre-allocated Maps to reduce GC pressure
 */

// Fisher-Yates shuffle for random node ordering (helps escape local optima)
function shuffleArray(array) {
  for (let i = array.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[array[i], array[j]] = [array[j], array[i]]
  }
  return array
}

/**
 * Run Louvain community detection on a NativeGraph instance.
 *
 * @param {NativeGraph} graph - The dependency graph
 * @param {number} maxIterations - Safety limit to prevent infinite loops
 * @returns {Object} Map of nodeId → communityId
 */
export function detectCommunities(graph, maxIterations) {
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
  // Cache σtot per community so we don't rescan all nodes each lookup (O(1) vs O(N))
  const sigmaTot = new Map()
  nodes.forEach((n, i) => {
    community.set(n, i)
    sigmaTot.set(i, degree.get(n) || 0)
  })

  // Pre-allocate commWeights map for reuse
  const commWeights = new Map()

  // Scale max iterations based on graph size — avoids excessive work on large repos
  if (maxIterations === undefined) {
    maxIterations = Math.min(20, Math.max(5, Math.ceil(Math.log2(nodes.length))))
  }

  // Early termination threshold - stop if modularity gain is negligible
  const MIN_IMPROVEMENT = 0.0001
  let totalMoved = 0

  // Create shuffled node order for better convergence
  const nodeOrder = shuffleArray([...nodes])

  // Phase 1: Local modularity optimization (greedy node moves)
  for (let iter = 0; iter < maxIterations; iter++) {
    let moved = false
    let iterMoved = 0

    for (const node of nodeOrder) {
      const currentComm = community.get(node)
      const ki = degree.get(node)
      const neighbors = adj.get(node)

      if (!neighbors || neighbors.size === 0) continue

      // Calculate weights to each neighboring community
      commWeights.clear()
      for (const [neighbor, weight] of neighbors) {
        const neighborComm = community.get(neighbor)
        commWeights.set(neighborComm, (commWeights.get(neighborComm) || 0) + weight)
      }

      // Calculate ΔQ for removing node from current community
      const stCurrent = sigmaTot.get(currentComm) || 0
      const kiIn = commWeights.get(currentComm) || 0

      let bestComm = currentComm
      let bestDelta = 0

      for (const [candidateComm, kiInCandidate] of commWeights) {
        if (candidateComm === currentComm) continue

        const stCandidate = sigmaTot.get(candidateComm) || 0

        // Modularity gain formula (Louvain paper, Eq. 1)
        const deltaQ =
          (kiInCandidate / m) -
          (stCandidate * ki) / (2 * m * m) -
          (-(kiIn / m) + ((stCurrent - ki) * ki) / (2 * m * m))

        if (deltaQ > bestDelta) {
          bestDelta = deltaQ
          bestComm = candidateComm
        }
      }

      if (bestComm !== currentComm && bestDelta > MIN_IMPROVEMENT) {
        // Update σtot cache: remove ki from old community, add to new
        sigmaTot.set(currentComm, (sigmaTot.get(currentComm) || 0) - ki)
        sigmaTot.set(bestComm, (sigmaTot.get(bestComm) || 0) + ki)
        community.set(node, bestComm)
        moved = true
        iterMoved++
      }
    }

    totalMoved += iterMoved

    // Converged: no nodes moved this iteration
    if (!moved) break

    // Early termination: if very few nodes moved, we're likely near optimal
    if (iter > 3 && iterMoved < nodes.length * 0.01) break
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
