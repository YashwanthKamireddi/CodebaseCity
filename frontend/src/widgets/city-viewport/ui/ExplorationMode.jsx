/**
 * ExplorationMode.jsx
 *
 * First-person flight camera for exploring the 3D codebase city.
 * WASD movement, mouse-look via PointerLock, vertical with Space/Shift.
 * Toggle with the 'F' key or the FloatingDock button.
 */
import React, { useRef, useEffect, useCallback } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { PointerLockControls } from '@react-three/drei'
import * as THREE from 'three'

const SPEED = 0.8
const SPRINT_MULTIPLIER = 2.5

export default function ExplorationMode({ active, onExit }) {
    const controlsRef = useRef()
    const velocity = useRef(new THREE.Vector3())
    const keys = useRef({})
    const { camera } = useThree()

    // Track pressed keys
    const handleKeyDown = useCallback((e) => {
        keys.current[e.code] = true

        // Escape exits exploration mode
        if (e.code === 'Escape' && active) {
            onExit?.()
        }
    }, [active, onExit])

    const handleKeyUp = useCallback((e) => {
        keys.current[e.code] = false
    }, [])

    useEffect(() => {
        if (!active) return

        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)

        // Lock pointer when entering exploration mode
        if (controlsRef.current) {
            controlsRef.current.lock()
        }

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            keys.current = {}
        }
    }, [active, handleKeyDown, handleKeyUp])

    // Handle pointer lock exit
    useEffect(() => {
        const handleUnlock = () => {
            if (active) {
                onExit?.()
            }
        }

        if (controlsRef.current) {
            controlsRef.current.addEventListener('unlock', handleUnlock)
        }

        return () => {
            if (controlsRef.current) {
                controlsRef.current.removeEventListener('unlock', handleUnlock)
            }
        }
    }, [active, onExit])

    // Per-frame movement
    useFrame((_, delta) => {
        if (!active) return

        const speed = SPEED * (keys.current['ShiftLeft'] ? SPRINT_MULTIPLIER : 1)
        const moveVec = new THREE.Vector3()

        // Forward/backward (along camera direction, projected to XZ)
        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)

        const right = new THREE.Vector3()
        right.crossVectors(forward, camera.up).normalize()

        if (keys.current['KeyW']) moveVec.add(forward.clone().multiplyScalar(speed))
        if (keys.current['KeyS']) moveVec.add(forward.clone().multiplyScalar(-speed))
        if (keys.current['KeyA']) moveVec.add(right.clone().multiplyScalar(-speed))
        if (keys.current['KeyD']) moveVec.add(right.clone().multiplyScalar(speed))
        if (keys.current['Space']) moveVec.y += speed
        if (keys.current['ControlLeft'] || keys.current['KeyC']) moveVec.y -= speed

        // Smooth velocity lerp for buttery movement
        velocity.current.lerp(moveVec, 0.15)
        camera.position.add(velocity.current)

        // Clamp Y so you don't go underground
        if (camera.position.y < 1) camera.position.y = 1
    })

    if (!active) return null

    return (
        <PointerLockControls
            ref={controlsRef}
            makeDefault={active}
        />
    )
}
