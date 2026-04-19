import React, { useEffect, useRef, useCallback } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'

// Module-level animation state — mutated by effects, consumed by useFrame.
// One reusable vec per role means zero allocations during camera flights.
const _anim = {
    active: false,
    startPos: new THREE.Vector3(),
    endPos: new THREE.Vector3(),
    startTarget: new THREE.Vector3(),
    endTarget: new THREE.Vector3(),
    duration: 1.0,
    startTime: 0,
    easeType: 'inOutCubic',
}

// Cinematic easings — used based on flight type for a more expressive feel.
const EASE = {
    // Slight settle at end — good for selections
    outExpo: (t) => (t === 1 ? 1 : 1 - Math.pow(2, -10 * t)),
    // Balanced in/out — good for long traversals
    inOutCubic: (t) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2),
    // Sharper in/out — good for short hops
    inOutQuart: (t) => (t < 0.5 ? 8 * t * t * t * t : 1 - Math.pow(-2 * t + 2, 4) / 2),
    // Accelerating only — good for zoom-out / reveal
    outQuart: (t) => 1 - Math.pow(1 - t, 4),
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
            const h = (b.dimensions?.height || 8) * 3.0
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
    const animateTo = useCallback((targetPos, lookAtPos, duration, easeType = 'inOutCubic') => {
        _anim.startPos.copy(camera.position)
        _anim.endPos.copy(targetPos)
        _anim.startTarget.copy(controls?.target || new THREE.Vector3())
        _anim.endTarget.copy(lookAtPos)
        _anim.duration = Math.max(0.18, duration)
        _anim.startTime = clock.elapsedTime
        _anim.easeType = easeType in EASE ? easeType : 'inOutCubic'
        _anim.active = true
    }, [camera, controls, clock])


    // useFrame drives all camera animations — easing is selectable per flight type
    useFrame(() => {
        if (!_anim.active || !controls) return

        const elapsed = clock.elapsedTime - _anim.startTime
        const raw = Math.min(1, elapsed / _anim.duration)
        const t = EASE[_anim.easeType](raw)

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
            const buildingHeight = rawHeight * 3.0
            const bWidth = building.dimensions?.width || 8
            const bDepth = building.dimensions?.depth || 8

            const roofY = buildingHeight
            const panelTopY = roofY + 30
            const frameCenterY = roofY * 0.6 + panelTopY * 0.4

            const totalVerticalExtent = panelTopY
            const footprintSize = Math.max(bWidth, bDepth)
            const zoomDist = Math.max(45, totalVerticalExtent * 0.6, footprintSize * 1.5)

            const camAngle = Math.PI / 4
            const elevationFactor = 0.55

            const targetPos = new THREE.Vector3(
                x + Math.cos(camAngle) * zoomDist,
                frameCenterY + zoomDist * elevationFactor,
                z + Math.sin(camAngle) * zoomDist
            )
            const lookAtPos = new THREE.Vector3(x, frameCenterY, z)

            // Duration weighted by BOTH distance and angle change — cinematic pacing
            const travelDist = camera.position.distanceTo(targetPos)
            const curTarget = controls?.target || new THREE.Vector3()
            const angleDist = curTarget.distanceTo(lookAtPos)
            const tripMag = travelDist + angleDist * 0.5
            const flyDuration = Math.min(1.8, Math.max(0.65, tripMag / 420))

            animateTo(targetPos, lookAtPos, flyDuration, 'outExpo')
        }

        window.addEventListener('flyToBuilding', handleFlyTo)
        return () => window.removeEventListener('flyToBuilding', handleFlyTo)
    }, [camera, controls, animateTo])

    // Auto-fit camera when city data changes (new analysis or demo load).
    // Uses FOV-aware framing so cities always fill the viewport correctly.
    useEffect(() => {
        if (!cityData?.buildings?.length || !controls) return

        const timer = setTimeout(() => {
            // FOV-aware framing: the distance at which a sphere of radius R
            // just fits the viewport with some padding.
            const fovRad = (camera.fov * Math.PI) / 180
            const halfFov = fovRad / 2
            const frameRadius = cityRadius * 1.15 // 15% padding
            const fovDist = frameRadius / Math.sin(halfFov)

            // Clamp so huge repos don't end up on a different planet
            const fitDist = Math.min(fovDist, Math.max(cityRadius * 1.8, 2200))
            const camY = Math.min(
                Math.max(maxHeight * 1.4, cityRadius * 0.55, 140),
                fitDist * 0.6
            )

            animateTo(
                new THREE.Vector3(cx + fitDist * 0.707, camY, cz + fitDist * 0.707),
                new THREE.Vector3(cx, 0, cz),
                1.6,
                'inOutCubic'
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
            let crownY = 74
            if (cityData?.buildings?.length) {
                const heights = cityData.buildings.map(b => (b.dimensions?.height || 8) * 3.0).sort((a, b) => a - b)
                const p90 = heights[Math.floor(heights.length * 0.9)] || 50
                const spireHeight = Math.max(60, p90 * 1.4)
                crownY = 8 + spireHeight + 6
            }
            const roofY = crownY
            const panelTopY = roofY + 30
            const frameCenterY = roofY * 0.6 + panelTopY * 0.4
            const zoomDist = Math.max(65, panelTopY * 0.85)
            const angle = Math.PI / 4
            const elevationFactor = 0.55
            lookAtPos = new THREE.Vector3(0, frameCenterY, 0)
            targetPos = new THREE.Vector3(
                Math.cos(angle) * zoomDist,
                frameCenterY + zoomDist * elevationFactor,
                Math.sin(angle) * zoomDist
            )
        } else if (selectedLandmark === 'mothership') {
            let alt = 300
            if (cityData?.buildings?.length) {
                let maxH = 0
                for (const b of cityData.buildings) {
                    const h = (b.dimensions?.height || 8) * 3.0
                    if (h > maxH) maxH = h
                }
                alt = Math.max(260, maxH + 200)
            }
            const dist = 200
            const angle = Math.PI / 4
            const viewCenterY = alt + 20
            lookAtPos = new THREE.Vector3(0, viewCenterY, 0)
            targetPos = new THREE.Vector3(
                Math.cos(angle) * dist,
                alt - 15,
                Math.sin(angle) * dist
            )
        }

        if (targetPos && lookAtPos) {
            const travelDist = camera.position.distanceTo(targetPos)
            const flyDuration = Math.min(1.9, Math.max(0.9, travelDist / 340))
            animateTo(targetPos, lookAtPos, flyDuration, 'outExpo')
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
            // Exponential zoom: each tap closes ~35% of remaining distance — fluid feel
            const newPos = currentPos.clone().add(direction.clone().multiplyScalar(distance * 0.35))
            animateTo(newPos, currentTarget.clone(), 0.38, 'outQuart')
        } else if (type === 'ZOOM_OUT') {
            const newPos = currentPos.clone().sub(direction.clone().multiplyScalar(distance * 0.45))
            animateTo(newPos, currentTarget.clone(), 0.45, 'outQuart')
        } else if (type === 'FIT' || type === 'RESET') {
            const fovRad = (camera.fov * Math.PI) / 180
            const fitDist = Math.min((cityRadius * 1.15) / Math.sin(fovRad / 2), cityRadius * 1.8)
            const camY = Math.max(cityRadius * 0.5, maxHeight * 1.2, 140)
            animateTo(
                new THREE.Vector3(cx + fitDist * 0.707, camY, cz + fitDist * 0.707),
                new THREE.Vector3(cx, 0, cz),
                1.1,
                'inOutCubic'
            )
        } else if (type === 'CENTER') {
            animateTo(currentPos.clone(), new THREE.Vector3(cx, 0, cz), 0.7, 'outExpo')
        }

    }, [cameraAction, camera, controls, animateTo, cx, cz, cityRadius, maxHeight])

    return null
})
