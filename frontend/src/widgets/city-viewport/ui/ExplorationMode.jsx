/**
 * ExplorationMode.jsx
 *
 * Third-person exploration with a cute robot character.
 * WASD movement on the ground plane, Space to jump/fly up,
 * mouse orbit around the character. No pointer lock needed.
 */
import React, { useRef, useEffect, useCallback, useMemo } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'

const MOVE_SPEED = 0.6
const SPRINT_MULTIPLIER = 2.5
const CAMERA_DISTANCE = 12
const CAMERA_HEIGHT = 8
const CAMERA_LERP = 0.06
const CHARACTER_LERP = 0.12
const GROUND_Y = 0.6
const JUMP_FORCE = 0.4
const GRAVITY = 0.015
const BOB_SPEED = 8
const BOB_AMOUNT = 0.08

export default function ExplorationMode({ active, onExit }) {
    const { camera, gl } = useThree()
    const keys = useRef({})
    const characterPos = useRef(new THREE.Vector3(0, GROUND_Y, 0))
    const characterTargetPos = useRef(new THREE.Vector3(0, GROUND_Y, 0))
    const cameraAngle = useRef({ theta: Math.PI / 4, phi: Math.PI / 6 })
    const isMouseDown = useRef(false)
    const lastMouse = useRef({ x: 0, y: 0 })
    const velocityY = useRef(0)
    const isGrounded = useRef(true)
    const bobPhase = useRef(0)
    const isMoving = useRef(false)
    const meshRef = useRef()
    const eyeLeftRef = useRef()
    const eyeRightRef = useRef()
    const antennaRef = useRef()
    const initialized = useRef(false)

    // Initialize character position from current camera
    useEffect(() => {
        if (active && !initialized.current) {
            const pos = camera.position.clone()
            characterPos.current.set(pos.x, GROUND_Y, pos.z)
            characterTargetPos.current.copy(characterPos.current)
            // Set camera angle based on current camera direction
            const dir = new THREE.Vector3()
            camera.getWorldDirection(dir)
            cameraAngle.current.theta = Math.atan2(-dir.x, -dir.z)
            initialized.current = true
        }
        if (!active) {
            initialized.current = false
        }
    }, [active, camera])

    // Key handlers
    const handleKeyDown = useCallback((e) => {
        if (!active) return
        keys.current[e.code] = true
        // Prevent Space from scrolling
        if (e.code === 'Space') e.preventDefault()
        if (e.code === 'Escape') onExit?.()
    }, [active, onExit])

    const handleKeyUp = useCallback((e) => {
        keys.current[e.code] = false
    }, [])

    // Mouse handlers for camera orbit
    const handleMouseDown = useCallback((e) => {
        if (!active) return
        // Right-click or middle-click for orbit
        if (e.button === 2 || e.button === 1) {
            isMouseDown.current = true
            lastMouse.current = { x: e.clientX, y: e.clientY }
            e.preventDefault()
        }
    }, [active])

    const handleMouseMove = useCallback((e) => {
        if (!active || !isMouseDown.current) return
        const dx = e.clientX - lastMouse.current.x
        const dy = e.clientY - lastMouse.current.y
        lastMouse.current = { x: e.clientX, y: e.clientY }
        cameraAngle.current.theta -= dx * 0.005
        cameraAngle.current.phi = Math.max(0.05, Math.min(Math.PI / 2.5, cameraAngle.current.phi + dy * 0.005))
    }, [active])

    const handleMouseUp = useCallback(() => {
        isMouseDown.current = false
    }, [])

    const handleWheel = useCallback((e) => {
        if (!active) return
        // No-op for now (could adjust camera distance)
    }, [active])

    const handleContextMenu = useCallback((e) => {
        if (active) e.preventDefault()
    }, [active])

    useEffect(() => {
        if (!active) return

        const canvas = gl.domElement
        window.addEventListener('keydown', handleKeyDown)
        window.addEventListener('keyup', handleKeyUp)
        canvas.addEventListener('mousedown', handleMouseDown)
        window.addEventListener('mousemove', handleMouseMove)
        window.addEventListener('mouseup', handleMouseUp)
        canvas.addEventListener('wheel', handleWheel, { passive: true })
        canvas.addEventListener('contextmenu', handleContextMenu)

        return () => {
            window.removeEventListener('keydown', handleKeyDown)
            window.removeEventListener('keyup', handleKeyUp)
            canvas.removeEventListener('mousedown', handleMouseDown)
            window.removeEventListener('mousemove', handleMouseMove)
            window.removeEventListener('mouseup', handleMouseUp)
            canvas.removeEventListener('wheel', handleWheel)
            canvas.removeEventListener('contextmenu', handleContextMenu)
            keys.current = {}
        }
    }, [active, handleKeyDown, handleKeyUp, handleMouseDown, handleMouseMove, handleMouseUp, handleWheel, handleContextMenu, gl])

    // Per-frame update
    useFrame((state, delta) => {
        if (!active) return

        const speed = MOVE_SPEED * (keys.current['ShiftLeft'] || keys.current['ShiftRight'] ? SPRINT_MULTIPLIER : 1)

        // Movement direction relative to camera angle
        const forward = new THREE.Vector3(
            -Math.sin(cameraAngle.current.theta),
            0,
            -Math.cos(cameraAngle.current.theta)
        ).normalize()

        const right = new THREE.Vector3(
            Math.cos(cameraAngle.current.theta),
            0,
            -Math.sin(cameraAngle.current.theta)
        ).normalize()

        const moveDir = new THREE.Vector3()
        let moving = false

        if (keys.current['KeyW'] || keys.current['ArrowUp']) { moveDir.add(forward); moving = true }
        if (keys.current['KeyS'] || keys.current['ArrowDown']) { moveDir.sub(forward); moving = true }
        if (keys.current['KeyA'] || keys.current['ArrowLeft']) { moveDir.sub(right); moving = true }
        if (keys.current['KeyD'] || keys.current['ArrowRight']) { moveDir.add(right); moving = true }

        isMoving.current = moving

        if (moving) {
            moveDir.normalize().multiplyScalar(speed)
            characterTargetPos.current.x += moveDir.x
            characterTargetPos.current.z += moveDir.z
        }

        // Jump / fly up
        if (keys.current['Space'] && isGrounded.current) {
            velocityY.current = JUMP_FORCE
            isGrounded.current = false
        }

        // Gravity
        if (!isGrounded.current) {
            velocityY.current -= GRAVITY
            characterTargetPos.current.y += velocityY.current

            if (characterTargetPos.current.y <= GROUND_Y) {
                characterTargetPos.current.y = GROUND_Y
                velocityY.current = 0
                isGrounded.current = true
            }
        }

        // Smooth character position
        characterPos.current.lerp(characterTargetPos.current, CHARACTER_LERP)

        // Bobbing when moving
        if (moving && isGrounded.current) {
            bobPhase.current += delta * BOB_SPEED
            characterPos.current.y = GROUND_Y + Math.sin(bobPhase.current) * BOB_AMOUNT
        }

        // Update character mesh
        if (meshRef.current) {
            meshRef.current.position.copy(characterPos.current)

            // Rotate character to face movement direction
            if (moving) {
                const targetRotation = Math.atan2(moveDir.x, moveDir.z)
                const currentRotation = meshRef.current.rotation.y
                // Smooth rotation
                let diff = targetRotation - currentRotation
                while (diff > Math.PI) diff -= Math.PI * 2
                while (diff < -Math.PI) diff += Math.PI * 2
                meshRef.current.rotation.y += diff * 0.12
            }
        }

        // Animate eyes (blink)
        if (eyeLeftRef.current && eyeRightRef.current) {
            const blinkCycle = Math.sin(state.clock.elapsedTime * 0.5) > 0.97
            const scaleY = blinkCycle ? 0.1 : 1
            eyeLeftRef.current.scale.y = scaleY
            eyeRightRef.current.scale.y = scaleY
        }

        // Animate antenna
        if (antennaRef.current) {
            antennaRef.current.rotation.z = Math.sin(state.clock.elapsedTime * 2) * 0.15
            antennaRef.current.rotation.x = Math.cos(state.clock.elapsedTime * 1.5) * 0.1
        }

        // Camera follow (third-person)
        const { theta, phi } = cameraAngle.current
        const camTarget = new THREE.Vector3(
            characterPos.current.x + CAMERA_DISTANCE * Math.sin(theta) * Math.cos(phi),
            characterPos.current.y + CAMERA_HEIGHT * Math.sin(phi) + 3,
            characterPos.current.z + CAMERA_DISTANCE * Math.cos(theta) * Math.cos(phi)
        )

        camera.position.lerp(camTarget, CAMERA_LERP)
        const lookTarget = characterPos.current.clone()
        lookTarget.y += 1.5 // Look at character head
        camera.lookAt(lookTarget)
    })

    if (!active) return null

    return (
        <group ref={meshRef} position={[0, GROUND_Y, 0]}>
            {/* Body — rounded cube */}
            <mesh castShadow position={[0, 0.9, 0]}>
                <boxGeometry args={[0.8, 1.0, 0.6]} />
                <meshStandardMaterial
                    color="#e4e4e7"
                    metalness={0.3}
                    roughness={0.4}
                    emissive="#555"
                    emissiveIntensity={0.05}
                />
            </mesh>

            {/* Head */}
            <mesh castShadow position={[0, 1.8, 0]}>
                <boxGeometry args={[0.7, 0.6, 0.55]} />
                <meshStandardMaterial
                    color="#f4f4f5"
                    metalness={0.4}
                    roughness={0.3}
                />
            </mesh>

            {/* Visor / Face plate */}
            <mesh position={[0, 1.78, 0.28]}>
                <boxGeometry args={[0.55, 0.35, 0.02]} />
                <meshStandardMaterial
                    color="#18181b"
                    metalness={0.8}
                    roughness={0.1}
                />
            </mesh>

            {/* Left Eye */}
            <mesh ref={eyeLeftRef} position={[-0.12, 1.82, 0.3]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial
                    color="#22c55e"
                    emissive="#22c55e"
                    emissiveIntensity={2}
                />
            </mesh>

            {/* Right Eye */}
            <mesh ref={eyeRightRef} position={[0.12, 1.82, 0.3]}>
                <sphereGeometry args={[0.06, 8, 8]} />
                <meshStandardMaterial
                    color="#22c55e"
                    emissive="#22c55e"
                    emissiveIntensity={2}
                />
            </mesh>

            {/* Antenna */}
            <group ref={antennaRef} position={[0, 2.15, 0]}>
                <mesh>
                    <cylinderGeometry args={[0.02, 0.02, 0.3, 6]} />
                    <meshStandardMaterial color="#a1a1aa" metalness={0.6} roughness={0.3} />
                </mesh>
                <mesh position={[0, 0.2, 0]}>
                    <sphereGeometry args={[0.06, 8, 8]} />
                    <meshStandardMaterial
                        color="#ef4444"
                        emissive="#ef4444"
                        emissiveIntensity={1.5}
                    />
                </mesh>
            </group>

            {/* Left Arm */}
            <mesh castShadow position={[-0.55, 0.8, 0]}>
                <boxGeometry args={[0.18, 0.6, 0.18]} />
                <meshStandardMaterial color="#d4d4d8" metalness={0.3} roughness={0.4} />
            </mesh>

            {/* Right Arm */}
            <mesh castShadow position={[0.55, 0.8, 0]}>
                <boxGeometry args={[0.18, 0.6, 0.18]} />
                <meshStandardMaterial color="#d4d4d8" metalness={0.3} roughness={0.4} />
            </mesh>

            {/* Left Leg */}
            <mesh castShadow position={[-0.2, 0.2, 0]}>
                <boxGeometry args={[0.2, 0.4, 0.2]} />
                <meshStandardMaterial color="#71717a" metalness={0.3} roughness={0.5} />
            </mesh>

            {/* Right Leg */}
            <mesh castShadow position={[0.2, 0.2, 0]}>
                <boxGeometry args={[0.2, 0.4, 0.2]} />
                <meshStandardMaterial color="#71717a" metalness={0.3} roughness={0.5} />
            </mesh>

            {/* Glow ring under robot */}
            <mesh position={[0, 0.01, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[0.5, 0.7, 32]} />
                <meshBasicMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.15}
                />
            </mesh>

            {/* Point light on robot */}
            <pointLight
                position={[0, 2.5, 0]}
                intensity={0.5}
                distance={8}
                color="#ffffff"
            />
        </group>
    )
}
