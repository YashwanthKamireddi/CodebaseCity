/**
 * layoutEngine.js — Building placement with adaptive spiral treemap.
 *
 * Handles dimension computation, spiral district placement, and
 * post-layout collision resolution (reactor exclusion zone, overlap pushing).
 */

// Layout constants matching backend's city_builder.py
// Chunky metropolitan scale — buildings feel like blocks, not poles.
export const BUILDING_SPACING = 22
export const DISTRICT_PADDING = 52
const MIN_BUILDING_WIDTH = 18
const MAX_BUILDING_WIDTH = 65
const MIN_BUILDING_HEIGHT = 9
const MAX_BUILDING_HEIGHT = 165

/**
 * Calculate per-file and aggregate metrics.
 */
export function calculateMetrics(parsedFiles, graph) {
  const maxLines = Math.max(...parsedFiles.map(f => f.lines_of_code), 1)
  const maxComplexity = Math.max(...parsedFiles.map(f => f.complexity), 1)
  const totalComplexity = parsedFiles.reduce((s, f) => s + f.complexity, 0)

  const inDegreeMap = new Map()
  graph.nodes.forEach((node) => {
    inDegreeMap.set(node, graph.inDegree(node))
  })
  const maxInDegree = Math.max(...inDegreeMap.values(), 1)

  return { maxLines, maxComplexity, maxInDegree,
    avgComplexity: totalComplexity / parsedFiles.length, inDegreeMap }
}

/**
 * Generate buildings with positions and dimensions.
 *
 * Layout: Adaptive Spiral Treemap — World-Class City Architecture
 * - Districts sorted by size, largest at center
 * - Buildings use ACTUAL size for spacing
 * - Post-layout centering ensures city is always at (0,0,0)
 */
export function generateBuildings(parsedFiles, communities, metrics) {
  const communityGroups = new Map()
  for (const file of parsedFiles) {
    const communityId = communities[file.file_path] ?? 0
    if (!communityGroups.has(communityId)) {
      communityGroups.set(communityId, [])
    }
    communityGroups.get(communityId).push(file)
  }

  const sortedDistricts = Array.from(communityGroups.entries())
    .sort((a, b) => b[1].length - a[1].length)

  // Pre-compute building dimensions (log-scale to prevent outlier crushing)
  const fileDims = new Map()
  const logMaxLines = Math.log2(metrics.maxLines + 1)
  const logMaxComplexity = Math.log2(metrics.maxComplexity + 1)
  for (const [, files] of sortedDistricts) {
    for (const file of files) {
      const linesNorm = Math.log2(file.lines_of_code + 1) / Math.max(logMaxLines, 1)
      const complexityNorm = Math.log2(file.complexity + 1) / Math.max(logMaxComplexity, 1)
      let width = MIN_BUILDING_WIDTH + (MAX_BUILDING_WIDTH - MIN_BUILDING_WIDTH) * linesNorm
      const height = MIN_BUILDING_HEIGHT + (MAX_BUILDING_HEIGHT - MIN_BUILDING_HEIGHT) * complexityNorm

      // Enforce minimum aspect ratio to prevent pole-like buildings.
      // Tightened from height/4 → height/2.8 so towers feel like chunky blocks.
      const minWidth = Math.max(MIN_BUILDING_WIDTH, height / 2.8)
      width = Math.max(width, minWidth)

      // Wider bases for very tall buildings (height > 40 maps to 3D height > 120).
      if (height > 40) {
        width = Math.max(width, height / 2.4)
      }

      // Add slight variation (±8%) for visual variety — less jitter so
      // buildings in the same size bucket still read as a coherent district.
      width *= 0.92 + Math.random() * 0.16

      fileDims.set(file.file_path, { width, height, depth: width })
    }
  }

  // Compute adaptive footprints per district
  const districtFootprints = sortedDistricts.map(([communityId, files]) => {
    files.sort((a, b) => {
      const da = fileDims.get(a.file_path)
      const db = fileDims.get(b.file_path)
      return (db.width * db.height) - (da.width * da.height)
    })

    const widths = files.map(f => fileDims.get(f.file_path).width)
    const avgWidth = widths.reduce((a, b) => a + b, 0) / widths.length
    const maxWidth = Math.max(...widths)
    const cellSize = Math.min(maxWidth, avgWidth * 1.25) + BUILDING_SPACING
    const cols = Math.max(1, Math.ceil(Math.sqrt(files.length)))
    const rows = Math.ceil(files.length / cols)
    const footprintW = cols * cellSize + DISTRICT_PADDING * 2
    const footprintD = rows * cellSize + DISTRICT_PADDING * 2
    return { communityId, files, cols, rows, footprintW, footprintD, cellSize }
  })

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

      const cellCenterX = districtX + DISTRICT_PADDING + col * cellSize + cellSize / 2
      const cellCenterZ = districtZ + DISTRICT_PADDING + row * cellSize + cellSize / 2

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

  // Post-layout collision resolution — spatial grid hashing for O(N) average
  const CELL_SIZE = BUILDING_SPACING * 4
  for (let pass = 0; pass < 3; pass++) {
    const grid = new Map()
    for (let i = 0; i < buildings.length; i++) {
      const a = buildings[i]
      const cx = Math.floor(a.position.x / CELL_SIZE)
      const cz = Math.floor(a.position.z / CELL_SIZE)
      const key = `${cx},${cz}`
      if (!grid.has(key)) grid.set(key, [])
      grid.get(key).push(i)
    }

    for (const [key, indices] of grid) {
      const [cx, cz] = key.split(',').map(Number)
      const neighbors = []
      for (let dx = -1; dx <= 1; dx++) {
        for (let dz = -1; dz <= 1; dz++) {
          const nk = `${cx + dx},${cz + dz}`
          if (grid.has(nk)) neighbors.push(...grid.get(nk))
        }
      }
      for (const i of indices) {
        const a = buildings[i]
        const ahw = a.dimensions.width / 2 + BUILDING_SPACING / 2
        const ahd = a.dimensions.depth / 2 + BUILDING_SPACING / 2
        for (const j of neighbors) {
          if (j <= i) continue
          const b = buildings[j]
          const bhw = b.dimensions.width / 2 + BUILDING_SPACING / 2
          const bhd = b.dimensions.depth / 2 + BUILDING_SPACING / 2

          const overlapX = (ahw + bhw) - Math.abs(a.position.x - b.position.x)
          const overlapZ = (ahd + bhd) - Math.abs(a.position.z - b.position.z)

          if (overlapX > 0 && overlapZ > 0) {
            if (overlapX < overlapZ) {
              const push = overlapX / 2 + 0.5
              if (a.position.x < b.position.x) {
                a.position.x -= push; b.position.x += push
              } else {
                a.position.x += push; b.position.x -= push
              }
            } else {
              const push = overlapZ / 2 + 0.5
              if (a.position.z < b.position.z) {
                a.position.z -= push; b.position.z += push
              } else {
                a.position.z += push; b.position.z -= push
              }
            }
          }
        }
      }
    }
  }

  return buildings
}

/**
 * Spiral placement for districts — clockwise from center, no overlaps.
 *
 * Uses edge-snapping (adjacent to placed districts) for tight layouts,
 * with spiral fallback and deterministic grid as final safety net.
 */
function spiralPlace(footprints) {
  if (footprints.length === 0) return []

  const positions = []
  const placed = []

  // Create an exclusion zone at the center for the Mothership / Reactor
  const CORE_DIAMETER = 80
  placed.push({ x: -CORE_DIAMETER / 2, z: -CORE_DIAMETER / 2, w: CORE_DIAMETER, d: CORE_DIAMETER })

  const avgFootprint = footprints.reduce((s, f) => s + (f.footprintW + f.footprintD) / 2, 0) / footprints.length
  const baseStep = Math.max(10, avgFootprint * 0.3)
  const totalArea = footprints.reduce((s, f) => s + f.footprintW * f.footprintD, 0)
  const maxRadius = Math.max(800, Math.sqrt(totalArea) * 3)
  const GAP = DISTRICT_PADDING + 36

  function overlapsAny(cx, cz, w, d) {
    for (const p of placed) {
      if (cx < p.x + p.w + GAP && cx + w + GAP > p.x &&
          cz < p.z + p.d + GAP && cz + d + GAP > p.z) return true
    }
    return false
  }

  for (let i = 0; i < footprints.length; i++) {
    const fp = footprints[i]
    let bestPos = null
    let bestDist = Infinity

    // Phase 1: Edge-snapping
    for (const p of placed) {
      const candidates = [
        { x: p.x + p.w + GAP, z: p.z },
        { x: p.x - fp.footprintW - GAP, z: p.z },
        { x: p.x, z: p.z + p.d + GAP },
        { x: p.x, z: p.z - fp.footprintD - GAP },
        { x: p.x + p.w + GAP, z: p.z + p.d - fp.footprintD },
        { x: p.x - fp.footprintW - GAP, z: p.z + p.d - fp.footprintD },
      ]
      for (const c of candidates) {
        if (!overlapsAny(c.x, c.z, fp.footprintW, fp.footprintD)) {
          const cx = c.x + fp.footprintW / 2
          const cz = c.z + fp.footprintD / 2
          const dist = cx * cx + cz * cz
          if (dist < bestDist) { bestDist = dist; bestPos = c }
        }
      }
    }

    // Phase 2: Spiral scan fallback
    if (!bestPos) {
      const step = baseStep
      for (let radius = step; radius < maxRadius; radius += step) {
        const numAngles = Math.max(12, Math.floor((2 * Math.PI * radius) / step))
        let foundOnRing = false
        for (let a = 0; a < numAngles; a++) {
          const angle = (a / numAngles) * Math.PI * 2
          const cx = Math.cos(angle) * radius - fp.footprintW / 2
          const cz = Math.sin(angle) * radius - fp.footprintD / 2
          if (!overlapsAny(cx, cz, fp.footprintW, fp.footprintD)) {
            const dist = cx * cx + cz * cz
            if (dist < bestDist) { bestDist = dist; bestPos = { x: cx, z: cz }; foundOnRing = true }
          }
        }
        if (foundOnRing) break
      }
    }

    // Phase 3: Deterministic grid fallback
    if (!bestPos) {
      const gridCols = Math.ceil(Math.sqrt(footprints.length))
      const gridRow = Math.floor(i / gridCols)
      const gridCol = i % gridCols
      bestPos = { x: gridCol * (avgFootprint + GAP), z: gridRow * (avgFootprint + GAP) }
    }

    positions.push(bestPos)
    placed.push({ x: bestPos.x, z: bestPos.z, w: fp.footprintW, d: fp.footprintD })
  }

  return positions
}
