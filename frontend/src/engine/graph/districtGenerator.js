/**
 * districtGenerator.js — District boundaries, roads, and language counting.
 */

/**
 * Generate districts from community groupings.
 */
export function generateDistricts(buildings, communities) {
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
export function generateRoads(graph, buildings) {
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
export function countLanguages(parsedFiles) {
  const counts = {}
  for (const f of parsedFiles) {
    counts[f.language] = (counts[f.language] || 0) + 1
  }
  return counts
}
