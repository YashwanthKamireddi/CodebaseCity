import React, { useEffect } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'

export default function CameraController() {
    const { camera, controls } = useThree()
    const { cityData, cityMeshRef, layoutMode } = useStore()

    // Compute city bounding radius
    const cityRadius = React.useMemo(() => {
        if (!cityData?.buildings?.length) return 80
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(40, maxR * 0.7)
    }, [cityData])

    useEffect(() => {
        const handleFlyTo = (event) => {
            const { building } = event.detail
            if (!building) return

            let x, y, z

            // DYNAMIC TARGETING (Galaxy Mode)
            if (layoutMode === 'galaxy' && cityMeshRef.current && cityData?.buildings) {
                // Find index to get current physics position
                const index = cityData.buildings.findIndex(b => b.id === building.id)

                if (index !== -1) {
                    const mat = new THREE.Matrix4()
                    cityMeshRef.current.getMatrixAt(index, mat)
                    const pos = new THREE.Vector3().setFromMatrixPosition(mat)

                    // Check if matrix is valid (non-zero)
                    if (pos.lengthSq() > 0.1) {
                        x = pos.x
                        y = pos.y
                        z = pos.z
                    } else {
                        // Fallback to static pos if physics hasn't run
                        x = building.position.x
                        y = building.position.y
                        z = building.position.z
                    }
                } else {
                    x = building.position.x
                    y = building.position.y
                    z = building.position.z
                }
            } else {
                // STATIC TARGETING (City Mode)
                x = building.position.x
                z = building.position.z
                y = building.dimensions.height // Aim at top
            }

            // Calculate target position (offset from building)
            // Adjusted to frame both Building and Hologram (as requested)
            // Closer zoom (40-60 range) and aiming higher (at y, not y*0.6)
            const zoomDist = Math.max(40, y * 1.5)
            const targetPos = new THREE.Vector3(x + zoomDist, y + zoomDist, z + zoomDist)

            // Look at the TOP of the building (where hologram is)
            const lookAtPos = new THREE.Vector3(x, y, z)

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
    }, [camera, controls, layoutMode, cityData, cityMeshRef])

    // Auto-fit camera when city data changes (new analysis or demo load)
    useEffect(() => {
        if (!cityData?.buildings?.length || !controls) return

        // Delay slightly to let instances render
        const timer = setTimeout(() => {
            const fitDist = cityRadius * 1.2
            gsap.to(camera.position, {
                duration: 1.5,
                x: fitDist,
                y: cityRadius * 0.9,
                z: fitDist,
                ease: 'power2.inOut'
            })
            gsap.to(controls.target, {
                duration: 1.5,
                x: 0, y: 0, z: 0,
                ease: 'power2.inOut',
                onUpdate: () => controls.update()
            })
        }, 200)

        return () => clearTimeout(timer)
    }, [cityData, cityRadius, camera, controls])

    // Auto-fly to selected building logic
    const { selectedBuilding, cameraAction } = useStore()

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
            gsap.to(camera.position, {
                duration: 1.0,
                x: cityRadius * 1.2, y: cityRadius * 0.9, z: cityRadius * 1.2,
                ease: 'power2.inOut'
            })
            gsap.to(controls.target, {
                duration: 1.0,
                x: 0, y: 0, z: 0,
                ease: 'power2.inOut',
                onUpdate: () => controls.update()
            })
        } else if (type === 'CENTER') {
            gsap.to(controls.target, {
                duration: 1.0,
                x: 0, y: 0, z: 0,
                ease: 'power2.inOut',
                onUpdate: () => controls.update()
            })
        }

    }, [cameraAction, camera, controls])

    return null
}
