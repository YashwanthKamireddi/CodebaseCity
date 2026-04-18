/**
 * graphEngine.js — Client-side dependency graph analysis (orchestrator)
 *
 * Delegates to focused modules:
 *   NativeGraph.js      — Graph data structure + LRU cache
 *   dependencyBuilder.js — Import resolution + edge creation
 *   communityMerger.js   — Louvain community detection + merging
 *   layoutEngine.js      — Building dimensions + spiral placement
 *   districtGenerator.js — District boundaries + roads
 */

import { buildDependencyGraph } from './dependencyBuilder.js'
import { detectCommunitiesSafe } from './communityMerger.js'
import { calculateMetrics, generateBuildings } from './layoutEngine.js'
import { generateDistricts, generateRoads, countLanguages } from './districtGenerator.js'

/**
 * Build the full city data from parsed files.
 */
export function buildCityData(parsedFiles, rootName) {
  const graph = buildDependencyGraph(parsedFiles)
  const communities = detectCommunitiesSafe(graph)
  const metrics = calculateMetrics(parsedFiles, graph)
  const buildings = generateBuildings(parsedFiles, communities, metrics)
  const districts = generateDistricts(buildings, communities)
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
      edges: graph.edges.map(e => ({ source: e.source, target: e.target })),
    },
  }
}
