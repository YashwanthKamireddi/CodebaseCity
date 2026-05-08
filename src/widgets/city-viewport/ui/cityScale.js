/**
 * cityScale — single source of truth for the rendering-space scale
 * factor applied to building dimensions.
 *
 * Historically, every consumer (InstancedCity, CameraController,
 * LandmarkPositions, HologramPanel, UfoAvatar, EnergyShieldDome,
 * RoofVariants, HolographicCityName) hardcoded `* 3.0`. That made
 * any geometry change require coordinated edits to 13 files and was
 * the proximate cause of the "buildings look like 900-unit-tall lines"
 * regression.
 *
 * As of the v2 revamp, `buildingTypes.dimsFor()` produces final world-
 * space dimensions directly. HEIGHT_SCALE stays in place as a single
 * post-multiplier so future tuning can happen in one file. Default is
 * 1.0 — no extra scaling.
 */

export const HEIGHT_SCALE = 1.0
export const WIDTH_SCALE = 1.0
export const DEPTH_SCALE = 1.0

/**
 * Compute the visual height of a building given its dimensions.
 * Use this everywhere instead of `(b.dimensions?.height || 8) * 3.0`.
 */
export function buildingHeight(b) {
    return (b?.dimensions?.height || 8) * HEIGHT_SCALE
}

export function buildingWidth(b) {
    return (b?.dimensions?.width || 8) * WIDTH_SCALE
}

export function buildingDepth(b) {
    return (b?.dimensions?.depth || 8) * DEPTH_SCALE
}
