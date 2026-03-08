import React, { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'

export default function CameraController() {
    const { camera, controls } = useThree()
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

    useEffect(() => {
        const handleFlyTo = (event) => {
            const { building } = event.detail
            if (!building) return

            // STATIC TARGETING
            const x = building.position.x
            const z = building.position.z
            const rawHeight = building.dimensions.height || 8
            const buildingHeight = rawHeight * 3.0
            const bWidth = building.dimensions.width || 8
            const bDepth = building.dimensions.depth || 8

            // Frame the top of the building
            const roofY = buildingHeight
            // Use width/depth for distance scaling, ignore height so tall buildings don't push us away
            const footprintSize = Math.max(bWidth, bDepth)

            // Calculate comfortable distance proportional to building footprint
            const zoomDist = Math.max(45, footprintSize * 2.5)
            const camAngle = Math.PI / 4 // 45-degree angle

            // Position camera slightly above the roof and away from the center
            const targetPos = new THREE.Vector3(
                x + Math.cos(camAngle) * zoomDist,
                roofY + 25, // hover 25 units above the roof line
                z + Math.sin(camAngle) * zoomDist
            )

            // Look exactly at the glowing anchor dot on the roof
            const lookAtPos = new THREE.Vector3(x, roofY, z)

            // Animate Camera Position
            gsap.to(camera.position, {
                duration: 1.5,
                x: targetPos.x,
                y: targetPos.y,
                z: targetPos.z,
                ease: "power2.inOut",
                onUpdate: () => {
                    // Controls update handled by lookAt tween if needed
                }
            })

            // Animate Controls Target (LookAt)
            if (controls) {
                gsap.to(controls.target, {
                    duration: 1.5,
                    x: lookAtPos.x,
                    y: lookAtPos.y,
                    z: lookAtPos.z,
                    ease: "power2.inOut",
                    onUpdate: () => controls.update()
                })
            }
        }

        window.addEventListener('flyToBuilding', handleFlyTo)
        return () => window.removeEventListener('flyToBuilding', handleFlyTo)
    }, [camera, controls, cityData, cityMeshRef])

    // Auto-fit camera when city data changes (new analysis or demo load)
    useEffect(() => {
        if (!cityData?.buildings?.length || !controls) return

        // Delay slightly to let instances render
        const timer = setTimeout(() => {
            // Camera distance: enough to see the full city from a 45° angle
            const fitDist = cityRadius * 1.4
            // Elevation: high enough to see over the tallest buildings + perspective
            const camY = Math.max(cityRadius * 0.8, maxHeight * 1.5)
            gsap.to(camera.position, {
                duration: 1.5,
                x: cx + fitDist,
                y: camY,
                z: cz + fitDist,
                ease: 'power2.inOut'
            })
            // Target actual city center, not (0,0,0)
            gsap.to(controls.target, {
                duration: 1.5,
                x: cx, y: 0, z: cz,
                ease: 'power2.inOut',
                onUpdate: () => controls.update()
            })
            // Dynamically scale far plane and maxDistance
            const neededFar = Math.max(5000, cityRadius * 6)
            camera.far = neededFar
            camera.updateProjectionMatrix()
            if (controls.maxDistance < neededFar * 0.5) {
                controls.maxDistance = neededFar * 0.5
            }
        }, 200)

        return () => clearTimeout(timer)
    }, [cityData, cityRadius, cx, cz, maxHeight, camera, controls])

    // Auto-fly to selected building logic
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const cameraAction = useStore(s => s.cameraAction)

    useEffect(() => {
        if (!selectedBuilding) return
        const event = new CustomEvent('flyToBuilding', { detail: { building: selectedBuilding } })
        window.dispatchEvent(event)
    }, [selectedBuilding])

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
            const newPos = currentPos.add(direction.multiplyScalar(distance * 0.3))
            gsap.to(camera.position, {
                duration: 0.5,
                x: newPos.x, y: newPos.y, z: newPos.z,
                ease: 'power2.out'
            })
        } else if (type === 'ZOOM_OUT') {
            const newPos = currentPos.sub(direction.multiplyScalar(distance * 0.3))
            gsap.to(camera.position, {
                duration: 0.5,
                x: newPos.x, y: newPos.y, z: newPos.z,
                ease: 'power2.out'
            })
        } else if (type === 'FIT' || type === 'RESET') {
            const fitDist = cityRadius * 1.4
            const camY = Math.max(cityRadius * 0.8, maxHeight * 1.5)
            gsap.to(camera.position, {
                duration: 1.0,
                x: cx + fitDist, y: camY, z: cz + fitDist,
                ease: 'power2.inOut'
            })
            gsap.to(controls.target, {
                duration: 1.0,
                x: cx, y: 0, z: cz,
                ease: 'power2.inOut',
                onUpdate: () => controls.update()
            })
        } else if (type === 'CENTER') {
            gsap.to(controls.target, {
                duration: 1.0,
                x: cx, y: 0, z: cz,
                ease: 'power2.inOut',
                onUpdate: () => controls.update()
            })
        }

    }, [cameraAction, camera, controls])

    return null
}
