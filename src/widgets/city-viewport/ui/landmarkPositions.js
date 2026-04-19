/**
 * Shared landmark geometry calculations.
 *
 * EnergyCoreReactor (town hall), MothershipCore, LandmarkPanel,
 * and CameraController all need the EXACT same numbers. Putting them
 * in one module prevents the long-standing bug where the panel hovered
 * 50 units away from the actual landmark.
 *
 * Constants below are the source of truth — editing dimensions here
 * propagates to every consumer automatically.
 */

// Town hall (EnergyCoreReactor) tier thicknesses — must match the geometry
// constructed in EnergyCoreReactor.jsx.
export const TIER_HEIGHTS = { tier1: 6, tier2: 5, tier3: 4 }
export const TOWNHALL_BASE_TOP = TIER_HEIGHTS.tier1 + TIER_HEIGHTS.tier2 + TIER_HEIGHTS.tier3
export const TOWNHALL_CROWN_OFFSET = 8 // crown sphere center above tower top
export const TOWNHALL_CROWN_RADIUS = 6

/** Tower (spire) height — taller than 90th-percentile building. */
export function computeSpireHeight(buildings) {
    if (!buildings?.length) return 70
    const heights = buildings
        .map(b => (b.dimensions?.height || 8) * 3.0)
        .sort((a, b) => a - b)
    const p90 = heights[Math.floor(heights.length * 0.9)] || 50
    return Math.max(70, p90 * 1.5)
}

/** Y of the very top of the town hall (above crown sphere). */
export function townHallTopY(buildings) {
    return TOWNHALL_BASE_TOP + computeSpireHeight(buildings) + TOWNHALL_CROWN_OFFSET + TOWNHALL_CROWN_RADIUS
}

/** Y where the mothership saucer center sits. */
export function mothershipAltitude(buildings) {
    if (!buildings?.length) return 320
    let maxH = 0
    let maxR = 0
    for (const b of buildings) {
        const h = (b.dimensions?.height || 8) * 3.0
        if (h > maxH) maxH = h
        const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
        if (r > maxR) maxR = r
    }
    // Match HolographicCityName scaling — leave room for the floating name above town hall.
    const cityRadius = Math.max(200, maxR * 0.8)
    const scaleForName = Math.max(60, cityRadius * 0.4)
    const textHeight = scaleForName * 0.25
    const nameTop = townHallTopY(buildings) + 40 + textHeight
    return Math.max(280, maxH + 220, nameTop + 80)
}
