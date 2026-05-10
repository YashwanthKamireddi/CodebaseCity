import React, { useEffect, useRef, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'
import { townHallTopY, mothershipAltitude } from './landmarkPositions'
import { HEIGHT_SCALE } from './cityScale'

// Module-level animation state — mutated by effects, consumed by useFrame
const _anim = {
    active: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    duration: 1.0,
    startTime: 0,
}

/**
 * Cinematic ease — accelerates fast, decelerates slowly. Used for all
 * camera flights so they feel like a confident pull instead of a sluggish
 * lerp. Equivalent to Apple's "easeOutQuart".
 */
function easeOutQuart(t) {
    return 1 - Math.pow(1 - t, 4)
}

export default React.memo(function CameraController() {
    const { camera, controls, invalidate, clock } = useThree()
    const cityData = useStore(s => s.cityData)
    const cityMeshRef = useStore(s => s.cityMeshRef)

    // Compute actual bounding box of city — center + half-extents
    const cityBounds = React.useMemo(() => {
        if (!cityData?.buildings?.length) return { cx: 0, cz: 0, radius: 120, maxHeight: 40 }
        let minX = Infinity, maxX = -Infinity
        let minZ = Infinity, maxZ = -Infinity
        let maxH = 0
        for (const b of cityData.buildings) {
            const x = b.position.x
            const z = b.position.z || 0
            const w = (b.dimensions?.width || 8) / 2
            const d = (b.dimensions?.depth || 8) / 2
            const h = (b.dimensions?.height || 8) * HEIGHT_SCALE
            if (x - w < minX) minX = x - w
            if (x + w > maxX) maxX = x + w
            if (z - d < minZ) minZ = z - d
            if (z + d > maxZ) maxZ = z + d
            if (h > maxH) maxH = h
        }
        const cx = (minX + maxX) / 2
        const cz = (minZ + maxZ) / 2
        const extentX = (maxX - minX) / 2
        const extentZ = (maxZ - minZ) / 2
        const radius = Math.max(60, Math.sqrt(extentX ** 2 + extentZ ** 2))
        return { cx, cz, radius, maxHeight: maxH }
    }, [cityData])

    const { cx, cz, radius: cityRadius, maxHeight } = cityBounds

    /** Start a smooth camera animation — cancels any in-flight animation */
    const animateTo = useCallback((targetPos, lookAtPos, duration) => {
        _anim.startPos.copy(camera.position)
        _anim.endPos.copy(targetPos)
        _anim.startTarget.copy(controls?.target || new THREE.Vector3())
        _anim.endTarget.copy(lookAtPos)
        _anim.duration = duration
        _anim.startTime = clock.elapsedTime
        _anim.active = true
    }, [camera, controls, clock])


    // useFrame drives all camera animations — replaces GSAP
    useFrame(() => {
        if (!_anim.active || !controls) return

        const elapsed = clock.elapsedTime - _anim.startTime
        const raw = Math.min(1, elapsed / _anim.duration)
        const t = easeOutQuart(raw)

        camera.position.lerpVectors(_anim.startPos, _anim.endPos, t)
        controls.target.lerpVectors(_anim.startTarget, _anim.endTarget, t)
        controls.update()
        invalidate()

        if (raw >= 1) _anim.active = false
    })


    useEffect(() => {
        const handleFlyTo = (event) => {
            const { building } = event.detail
            if (!building) return

            const x = building.position.x
            const z = building.position.z
            const rawHeight = building.dimensions?.height || 8
            const buildingHeight = rawHeight * HEIGHT_SCALE
            const bWidth = building.dimensions?.width || 8
            const bDepth = building.dimensions?.depth || 8
            const footprintSize = Math.max(bWidth, bDepth)

            // Tight cinematic framing — user reports prior pass was
            // still too zoomed out. Pulled in further: 60–210 (was
            // 90–280). Camera looks at upper-third of the building +
            // info-card composition. Works for any building size:
            // small repo's tiny townhouses don't get a giant 90-unit
            // pullback; mega-towers don't get clipped by the cap.
            const roofY = buildingHeight
            const panelY = roofY + 28
            const frameCenterY = roofY * 0.55 + panelY * 0.45

            const zoomDist = Math.min(
                210,
                Math.max(
                    60,
                    footprintSize * 2.6,   // ~1.3 building-widths of margin
                    buildingHeight * 0.72,
                )
            )

            const camAngle = Math.PI / 4
            const elevationFactor = 0.55

            const targetPos = new THREE.Vector3(
                x + Math.cos(camAngle) * zoomDist,
                frameCenterY + zoomDist * elevationFactor,
                z + Math.sin(camAngle) * zoomDist
            )
            const lookAtPos = new THREE.Vector3(x, frameCenterY, z)

            // Smooth transitions from any starting angle / distance:
            //   short hops (200u): ~0.85 s
            //   medium (1000u):    ~1.7 s
            //   cross-city (2500u+): ~2.6 s ceiling
            // Both ends of the range feel cinematic instead of either
            // snapping (too short) or dragging (too long).
            const travelDist = camera.position.distanceTo(targetPos)
            const flyDuration = Math.min(2.6, Math.max(0.85, 0.6 + travelDist / 950))

            animateTo(targetPos, lookAtPos, flyDuration)
        }

        window.addEventListener('flyToBuilding', handleFlyTo)
        return () => window.removeEventListener('flyToBuilding', handleFlyTo)
    }, [camera, controls, animateTo])

    // Fly to a district when its plate is clicked. Frames the entire
    // district (radius + small margin) at a 45° aerial angle.
    useEffect(() => {
        const handleFlyToDistrict = (event) => {
            const { cx: dcx, cz: dcz, radius: dr } = event.detail || {}
            if (dcx == null || dcz == null) return

            const fovHalfTan = Math.tan((camera.fov * Math.PI / 180) / 2)
            const aspect = camera.aspect || 1.78
            // Distance such that the district radius fits inside ~70% of
            // the visible width — leaves margin for surrounding context.
            const fitDist = Math.max(120, dr / (fovHalfTan * aspect * 0.7))
            const camY = fitDist * 0.55

            const ang = Math.PI / 4
            animateTo(
                new THREE.Vector3(
                    dcx + Math.cos(ang) * fitDist,
                    camY,
                    dcz + Math.sin(ang) * fitDist,
                ),
                new THREE.Vector3(dcx, 0, dcz),
                1.2,
            )
        }
        window.addEventListener('flyToDistrict', handleFlyToDistrict)
        return () => window.removeEventListener('flyToDistrict', handleFlyToDistrict)
    }, [camera, animateTo])

    // Auto-fit camera when city data changes (new analysis or demo load).
    // The user wants the *whole city + the city-name hologram floating
    // above* visible in the establishing shot — like a movie's opening.
    useEffect(() => {
        if (!cityData?.buildings?.length || !controls) return

        const timer = setTimeout(() => {
            // Compute the full vertical span we need to fit:
            //   ground (y=0) → mothership altitude → hologram label above.
            // mothershipAltitude is roughly maxHeight + 340; the city-name
            // hologram sits ~80 above that. We approximate without
            // importing landmarkPositions to avoid circular concerns.
            const verticalSpan = Math.max(maxHeight * 1.4 + 460, 600)
            const lookCenterY = verticalSpan * 0.42  // look slightly below middle

            // Distance such that the vertical span fits inside ~70% of
            // the camera FOV (leaves 30% margin top + bottom). For the
            // default 50° FOV, half-vertical-tan = 0.466.
            const fovHalfTan = Math.tan((camera.fov * Math.PI / 180) / 2)
            const distForVertical = (verticalSpan * 0.5) / (fovHalfTan * 0.7)

            // Distance such that the city's horizontal extent (2 *
            // cityRadius) fits in ~80% of the visible width. Aspect
            // ratio approximated at 1.78 for typical wide screens.
            const aspect = camera.aspect || 1.78
            const distForHorizontal = cityRadius / (fovHalfTan * aspect * 0.8)

            const fitDist = Math.max(distForVertical, distForHorizontal)
            const camY = lookCenterY + fitDist * 0.55   // 55% elevation = cinematic

            animateTo(
                new THREE.Vector3(cx + fitDist * 0.71, camY, cz + fitDist * 0.71),
                new THREE.Vector3(cx, lookCenterY, cz),
                2.4   // longer = more cinematic
            )

            // Dynamically scale far plane and maxDistance
            const neededFar = Math.max(8000, fitDist * 6)
            camera.far = neededFar
            camera.updateProjectionMatrix()
            if (controls.maxDistance < neededFar * 0.5) {
                controls.maxDistance = neededFar * 0.5
            }
        }, 200)

        return () => clearTimeout(timer)
    }, [cityData, cityRadius, cx, cz, maxHeight, camera, controls, animateTo])

    // Auto-fly to selected building logic
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const selectedLandmark = useStore(s => s.selectedLandmark)
    const cameraAction = useStore(s => s.cameraAction)

    useEffect(() => {
        if (!selectedBuilding) return
        const event = new CustomEvent('flyToBuilding', { detail: { building: selectedBuilding } })
        window.dispatchEvent(event)
    }, [selectedBuilding])

    // Fly to landmark (reactor / mothership)
    useEffect(() => {
        if (!selectedLandmark || !controls) return

        let targetPos, lookAtPos

        if (selectedLandmark === 'reactor') {
            // Town-hall flight: hero shot of the crown sphere. Pulled
            // tighter still — was 1.6× crown height, now 1.15× so the
            // town hall fills more of the frame. Look at the crown
            // directly so the user reads "this is the centerpiece".
            const crownY = townHallTopY(cityData?.buildings)
            const frameCenterY = crownY * 0.92
            const zoomDist = Math.max(140, crownY * 1.15)
            const angle = Math.PI / 4
            const elevationFactor = 0.40
            lookAtPos = new THREE.Vector3(0, frameCenterY, 0)
            targetPos = new THREE.Vector3(
                Math.cos(angle) * zoomDist,
                frameCenterY + zoomDist * elevationFactor,
                Math.sin(angle) * zoomDist
            )
        } else if (selectedLandmark === 'mothership') {
            // Mothership: closer too — was 320 units, now scales with
            // altitude so big repos with a higher mothership still get
            // a recognizable framing.
            const alt = mothershipAltitude(cityData?.buildings)
            const dist = Math.max(220, alt * 0.55)
            const angle = Math.PI / 4
            const viewCenterY = alt - 10
            lookAtPos = new THREE.Vector3(0, viewCenterY, 0)
            targetPos = new THREE.Vector3(
                Math.cos(angle) * dist,
                alt - 60,
                Math.sin(angle) * dist
            )
        }

        if (targetPos && lookAtPos) {
            const travelDist = camera.position.distanceTo(targetPos)
            const flyDuration = Math.min(2.4, Math.max(0.85, 0.7 + travelDist / 850))
            animateTo(targetPos, lookAtPos, flyDuration)
        }
    }, [selectedLandmark, camera, controls, animateTo, cityData])

    // Manual Camera Actions (HUD)
    useEffect(() => {
        if (!cameraAction || !controls) return

        logger.debug('[CameraController] Action:', cameraAction)

        const { type } = cameraAction
        const currentPos = camera.position.clone()
        const currentTarget = controls.target.clone()
        const direction = new THREE.Vector3().subVectors(currentTarget, currentPos).normalize()
        const distance = currentPos.distanceTo(currentTarget)

        if (type === 'ZOOM_IN') {
            // Larger step (0.4 instead of 0.3) so a single click moves
            // meaningfully on huge cities. Distance-clamped so we don't
            // shove the camera through the ground on tiny ones.
            const step = Math.max(40, distance * 0.4)
            const newPos = currentPos.clone().add(direction.clone().multiplyScalar(step))
            animateTo(newPos, currentTarget.clone(), 0.45)
        } else if (type === 'ZOOM_OUT') {
            const step = Math.max(40, distance * 0.4)
            const newPos = currentPos.clone().sub(direction.clone().multiplyScalar(step))
            animateTo(newPos, currentTarget.clone(), 0.45)
        } else if (type === 'FIT' || type === 'RESET') {
            // Use the same FOV-based fit as the initial auto-fit so
            // RESET works correctly for any repo size.
            const fovHalfTan = Math.tan((camera.fov * Math.PI / 180) / 2)
            const aspect = camera.aspect || 1.78
            const verticalSpan = Math.max(maxHeight * 1.4 + 460, 600)
            const lookCenterY = verticalSpan * 0.42
            const distForVertical = (verticalSpan * 0.5) / (fovHalfTan * 0.7)
            const distForHorizontal = cityRadius / (fovHalfTan * aspect * 0.8)
            const fitDist = Math.max(distForVertical, distForHorizontal)
            const camY = lookCenterY + fitDist * 0.55
            animateTo(
                new THREE.Vector3(cx + fitDist * 0.71, camY, cz + fitDist * 0.71),
                new THREE.Vector3(cx, lookCenterY, cz),
                1.6
            )
        } else if (type === 'CENTER') {
            animateTo(currentPos.clone(), new THREE.Vector3(cx, 0, cz), 0.8)
        }

    }, [cameraAction, camera, controls, animateTo, cx, cz, cityRadius, maxHeight])

    return null
})
