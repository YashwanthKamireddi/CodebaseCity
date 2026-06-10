/**
 * cityLayout — zoned, contiguous city layout engine.
 *
 * This is the single source of truth for WHERE districts sit. Both the
 * live analyzer (createCitySlice) and the demo generator
 * (scripts/generate-demo-city.mjs) call into it, so the demo can never
 * drift from the real layout again.
 *
 * Design rules (how real cities — and city-builder games — are zoned):
 *
 *   1. CONTIGUOUS, NOT ISLANDS. Districts tile edge-to-edge with only
 *      an avenue-width gap (32 wu) between them. The previous layout
 *      used a 140-unit gap, which read as floating squares on a void.
 *
 *   2. DOWNTOWN AT THE CENTER. Districts are weighted by total code
 *      mass (bytes). The heaviest districts — the ones that grow the
 *      tallest towers — are assigned to the most central grid cells.
 *      Light districts (docs, configs, scripts) become the outskirts.
 *      The skyline therefore peaks at the core and falls off toward
 *      the edges, exactly like a real metropolis.
 *
 *   3. NO DEAD CORE. The old layout pushed every district 180 units
 *      away from the origin to leave a hole for the mothership's
 *      tractor beam. The beam is gone; the hole read as a crater.
 *      Downtown now sits AT the origin.
 */

/** Avenue width between district plates (world units). */
export const DISTRICT_GAP = 32

/**
 * Compute the layout for a set of directory groups.
 *
 * @param {Record<string, Array<{size?: number}>>} mergedGroups
 *        dirName → files. Files only need a `size` field (bytes).
 * @returns {Array<{dir: string, cx: number, cz: number, cellSize: number}>}
 *        One entry per district, in DESCENDING weight order (heaviest
 *        first). cx/cz are world-space centre coordinates.
 */
export function layoutDistricts(mergedGroups) {
    const dirNames = Object.keys(mergedGroups)
    if (dirNames.length === 0) return []

    // ── Weight = total code mass. Heavier district → more central. ──
    const weighted = dirNames.map(dir => {
        const files = mergedGroups[dir]
        let bytes = 0
        for (const f of files) bytes += f.size || 100
        return { dir, bytes, count: files.length }
    })
    weighted.sort((a, b) => b.bytes - a.bytes)

    // ── Per-district cell size. Budget of 68 wu per building column
    //    fits the widest type (mall, 50 wu) plus a real gap. ──
    const cellSizeOf = (count) => {
        const gridSide = Math.ceil(Math.sqrt(count))
        return Math.max(150, gridSide * 68 + 36)
    }

    const n = dirNames.length
    const cols = Math.ceil(Math.sqrt(n))
    const rows = Math.ceil(n / cols)

    // ── Cells ordered centre-out (spiral-ish by euclidean distance) ──
    const cells = []
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            if (r * cols + c >= n) continue
            const dr = r - (rows - 1) / 2
            const dc = c - (cols - 1) / 2
            cells.push({ r, c, d: Math.hypot(dr, dc) })
        }
    }
    cells.sort((a, b) => a.d - b.d)

    // ── Assign: k-th heaviest district → k-th most central cell ──
    // cellDistrict[r][c] = index into `weighted`
    const cellDistrict = Array.from({ length: rows }, () => new Array(cols).fill(-1))
    cells.forEach((cell, k) => { cellDistrict[cell.r][cell.c] = k })

    // ── Row heights / column widths from the assigned districts ──
    const rowHeights = new Array(rows).fill(0)
    const colWidths = new Array(cols).fill(0)
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const k = cellDistrict[r][c]
            if (k < 0) continue
            const size = cellSizeOf(weighted[k].count)
            if (size > rowHeights[r]) rowHeights[r] = size
            if (size > colWidths[c]) colWidths[c] = size
        }
    }

    const totalW = colWidths.reduce((s, w) => s + w + DISTRICT_GAP, -DISTRICT_GAP)
    const totalH = rowHeights.reduce((s, h) => s + h + DISTRICT_GAP, -DISTRICT_GAP)

    const cumW = [0]
    for (let c = 0; c < cols; c++) cumW[c + 1] = cumW[c] + colWidths[c] + DISTRICT_GAP
    const cumH = [0]
    for (let r = 0; r < rows; r++) cumH[r + 1] = cumH[r] + rowHeights[r] + DISTRICT_GAP

    // ── Emit positions, heaviest district first ──
    const out = new Array(weighted.length)
    for (let r = 0; r < rows; r++) {
        for (let c = 0; c < cols; c++) {
            const k = cellDistrict[r][c]
            if (k < 0) continue
            const w = weighted[k]
            out[k] = {
                dir: w.dir,
                cx: -totalW / 2 + cumW[c] + colWidths[c] / 2,
                cz: -totalH / 2 + cumH[r] + rowHeights[r] / 2,
                cellSize: cellSizeOf(w.count),
            }
        }
    }
    return out
}
