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

            // Cinematic framing: pull back enough to keep the building IN
            // CONTEXT — surrounding city visible, not just one tower
            // filling the screen. Distance scales with both footprint
            // (wide buildings need more) and height (tall ones too).
            const roofY = buildingHeight
            const panelY = roofY + 28
            // Look at the upper third of the building+card composition.
            const frameCenterY = roofY * 0.55 + panelY * 0.45

            // Distance scales with the LARGER of two needs:
            //   - footprint:  width × 4   (give 2× building widths of margin)
            //   - height:     height × 1.1 (so tall towers don't fill screen)
            // Floored at 140 (never absurdly close) and capped at 520 (never
            // so far the panel becomes unreadable).
            const zoomDist = Math.min(
                520,
                Math.max(
                    140,
                    footprintSize * 4,
                    buildingHeight * 1.1
                )
            )

            const camAngle = Math.PI / 4
            // Higher angle = more aerial = more city context visible behind
            // the selected building. 0.42 → 0.55.
            const elevationFactor = 0.55

            const targetPos = new THREE.Vector3(
                x + Math.cos(camAngle) * zoomDist,
                frameCenterY + zoomDist * elevationFactor,
                z + Math.sin(camAngle) * zoomDist
            )
            const lookAtPos = new THREE.Vector3(x, frameCenterY, z)

            // Snappier flights — 0.7–1.6 s → 0.55–1.2 s. Combined with the
            // outQuart easing, this gives a confident, decisive pull instead
            // of a sluggish lerp.
            const travelDist = camera.position.distanceTo(targetPos)
            const flyDuration = Math.min(1.2, Math.max(0.55, travelDist / 600))

            animateTo(targetPos, lookAtPos, flyDuration)
        }

        window.addEventListener('flyToBuilding', handleFlyTo)
        return () => window.removeEventListener('flyToBuilding', handleFlyTo)
    }, [camera, controls, animateTo])

    // Auto-fit camera when city data changes (new analysis or demo load)
    useEffect(() => {
        if (!cityData?.buildings?.length || !controls) return

        const timer = setTimeout(() => {
            // For large repos, cap the viewing distance so buildings remain clearly visible
            // Instead of showing the entire city from orbit, start near the buildings
            const isLargeCity = cityRadius > 300
            const fitDist = isLargeCity
                ? Math.min(cityRadius * 1.5, 1200)   // Back way out
                : Math.max(cityRadius * 1.2, 200)      // Small/medium: view whole city clearly

            const camY = isLargeCity
                ? Math.min(maxHeight * 1.8 + cityRadius * 0.6, 900)      // Push height up significantly
                : Math.max(cityRadius * 1.0, maxHeight * 1.2, 160) // Higher baseline

            animateTo(
                new THREE.Vector3(cx + fitDist, camY, cz + fitDist),
                new THREE.Vector3(cx, 0, cz),
                1.8
            )

            // Dynamically scale far plane and maxDistance
            const neededFar = Math.max(5000, cityRadius * 6)
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
            // Town-hall flight: frame the crown sphere with city in view.
            // Pulled tighter than before — was zooming so far back that the
            // town hall looked tiny and the camera "felt stuck".
            const crownY = townHallTopY(cityData?.buildings)
            const frameCenterY = crownY * 0.85           // look slightly below the crown
            const zoomDist = Math.max(180, crownY * 1.6)  // closer than before
            const angle = Math.PI / 4
            const elevationFactor = 0.45
            lookAtPos = new THREE.Vector3(0, frameCenterY, 0)
            targetPos = new THREE.Vector3(
                Math.cos(angle) * zoomDist,
                frameCenterY + zoomDist * elevationFactor,
                Math.sin(angle) * zoomDist
            )
        } else if (selectedLandmark === 'mothership') {
            // Mothership flight: orbit the saucer, look up at it. Was
            // landing camera ABOVE the ship looking down at the city,
            // which felt detached. Now camera sits below and to the side
            // looking up at the mothership belly + city horizon.
            const alt = mothershipAltitude(cityData?.buildings)
            const dist = 320
            const angle = Math.PI / 4
            const viewCenterY = alt - 10                  // look at the underside
            lookAtPos = new THREE.Vector3(0, viewCenterY, 0)
            targetPos = new THREE.Vector3(
                Math.cos(angle) * dist,
                alt - 80,                                  // 80 below the ship
                Math.sin(angle) * dist
            )
        }

        if (targetPos && lookAtPos) {
            const travelDist = camera.position.distanceTo(targetPos)
            const flyDuration = Math.min(1.4, Math.max(0.7, travelDist / 500))
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
            const newPos = currentPos.clone().add(direction.clone().multiplyScalar(distance * 0.3))
            animateTo(newPos, currentTarget.clone(), 0.45)
        } else if (type === 'ZOOM_OUT') {
            const newPos = currentPos.clone().sub(direction.clone().multiplyScalar(distance * 0.3))
            animateTo(newPos, currentTarget.clone(), 0.45)
        } else if (type === 'FIT' || type === 'RESET') {
            const fitDist = cityRadius * 0.55
            const camY = Math.max(cityRadius * 0.30, maxHeight * 0.9)
            animateTo(
                new THREE.Vector3(cx + fitDist, camY, cz + fitDist),
                new THREE.Vector3(cx, 0, cz),
                1.2
            )
        } else if (type === 'CENTER') {
            animateTo(currentPos.clone(), new THREE.Vector3(cx, 0, cz), 0.8)
        }

    }, [cameraAction, camera, controls, animateTo, cx, cz, cityRadius, maxHeight])

    return null
})
