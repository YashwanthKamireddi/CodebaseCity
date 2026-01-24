
import { useEffect } from 'react'
import { useThree, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import gsap from 'gsap'
import useStore from '../store/useStore'

export default function CameraController() {
    const { camera, controls } = useThree()

    useEffect(() => {
        const handleFlyTo = (event) => {
            const { building } = event.detail
            if (!building) return

            const { x, z } = building.position
            const y = building.dimensions.height

            // Calculate target position (offset from building)
            const targetPos = new THREE.Vector3(x + 20, y + 20, z + 20)
            const lookAtPos = new THREE.Vector3(x, y / 2, z)

            // Animate Camera Position
            gsap.to(camera.position, {
                duration: 1.5,
                x: targetPos.x,
                y: targetPos.y,
                z: targetPos.z,
                ease: "power2.inOut",
                onUpdate: () => {
                    // controls.update() // not needed if we manually update target
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
    }, [camera, controls])

    // Handle Global Camera Actions (UI Buttons)
    const { cameraAction } = useStore() // Get from store, not event listener

    useEffect(() => {
        if (!cameraAction) return

        console.log('[CameraController] Action received:', cameraAction)

        if (!controls) {
            console.warn('[CameraController] Controls not ready')
            return
        }

        const { type } = cameraAction
        const currentPos = camera.position.clone()
        const currentTarget = controls.target.clone()
        const direction = new THREE.Vector3().subVectors(currentTarget, currentPos).normalize()
        const distance = currentPos.distanceTo(currentTarget)

        if (type === 'ZOOM_IN') {
            // Move 30% closer
            const newPos = currentPos.add(direction.multiplyScalar(distance * 0.3))
            gsap.to(camera.position, {
                duration: 0.5,
                x: newPos.x, y: newPos.y, z: newPos.z,
                ease: 'power2.out'
            })
        } else if (type === 'ZOOM_OUT') {
            // Move 30% further
            const newPos = currentPos.sub(direction.multiplyScalar(distance * 0.3))
            gsap.to(camera.position, {
                duration: 0.5,
                x: newPos.x, y: newPos.y, z: newPos.z,
                ease: 'power2.out'
            })
        } else if (type === 'FIT' || type === 'RESET') {
            // Reset to default view
            gsap.to(camera.position, {
                duration: 1.0,
                x: 80, y: 50, z: 80,
                ease: 'power2.inOut'
            })
            gsap.to(controls.target, {
                duration: 1.0,
                x: 0, y: 0, z: 0,
                ease: 'power2.inOut',
                onUpdate: () => controls.update()
            })
        } else if (type === 'CENTER') {
            // Center to 0,0,0
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
