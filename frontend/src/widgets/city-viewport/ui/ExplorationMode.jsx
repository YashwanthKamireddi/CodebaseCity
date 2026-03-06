/**
 * ExplorationMode.jsx
 *
 * Third-person exploration with a cute robot character.
 * WASD movement on the ground plane, Space to jump/fly up,
 * mouse orbit around the character. No pointer lock needed.
 */
import React, { useRef, useEffect, useCallback, useMemo, useState } from 'react'
import { useFrame, useThree, invalidate } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const MOVE_SPEED = 0.6
const SPRINT_MULTIPLIER = 2.5
const CAMERA_LERP = 0.06
const CHARACTER_LERP = 0.12
const GROUND_Y = 0.6
const JUMP_FORCE = 0.4
const GRAVITY = 0.015
const BOB_SPEED = 8
const BOB_AMOUNT = 0.08

const ZOOM_SPEED = 0.03
const MIN_DISTANCE = 0
const MAX_DISTANCE = 35
const DEFAULT_FOV = 60
const SPRINT_FOV = 85
const FOV_LERP = 0.08

// Pre-allocated scratch vectors — NEVER allocate inside useFrame
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _moveDir = new THREE.Vector3()
const _horizMove = new THREE.Vector2()
const _camTarget = new THREE.Vector3()
const _lookOffset = new THREE.Vector3()
const _lookTarget = new THREE.Vector3()
const _headPos = new THREE.Vector3()
const COLLISION_CHECK_RADIUS_SQ = 50 * 50 // Only check buildings within 50 units

export default function ExplorationMode({ active, onExit }) {
    const { camera, gl } = useThree()
    const keys = useRef({})
    const characterPos = useRef(new THREE.Vector3(0, GROUND_Y, 0))
    const characterTargetPos = useRef(new THREE.Vector3(0, GROUND_Y, 0))
    const cameraAngle = useRef({ theta: Math.PI / 4, phi: Math.PI / 6 })
    const targetCameraDistance = useRef(12)
    const currentCameraDistance = useRef(12)
    const currentFov = useRef(DEFAULT_FOV)
    const isMouseDown = useRef(false)
    const lastMouse = useRef({ x: 0, y: 0 })
    const isMoving = useRef(false)
    const [nearbyBuilding, setNearbyBuilding] = useState(null)
    const nearbyBuildingRef = useRef(null)
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
            camera.fov = DEFAULT_FOV
            camera.updateProjectionMatrix()
        }
    }, [active, camera])

    const handleKeyDown = useCallback((e) => {
        if (!active) return
        keys.current[e.code] = true
        // Prevent Space from scrolling
        if (e.code === 'Space') e.preventDefault()
        if (e.code === 'Escape') onExit?.()
        // Open Code Viewer (Telemtry) if near a building
        if (e.code === 'KeyE' && nearbyBuildingRef.current && active) {
            const store = useStore.getState()
            store.selectBuilding(nearbyBuildingRef.current)
            store.setCodeViewerOpen(true)
        }
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
        const newDist = Math.max(MIN_DISTANCE, Math.min(MAX_DISTANCE, targetCameraDistance.current + e.deltaY * ZOOM_SPEED))
        targetCameraDistance.current = newDist
        // Instant zoom to satisfy "zoom need instant" request
        currentCameraDistance.current = newDist
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

    // Per-frame update — ZERO allocations inside this hot loop
    useFrame((state, delta) => {
        if (!active) return

        const speed = MOVE_SPEED * (keys.current['ShiftLeft'] || keys.current['ShiftRight'] ? SPRINT_MULTIPLIER : 1)

        // Movement direction relative to camera angle (Free Flight)
        const { theta, phi } = cameraAngle.current
        _forward.set(
            -Math.sin(theta) * Math.cos(phi),
            -Math.sin(phi),
            -Math.cos(theta) * Math.cos(phi)
        ).normalize()

        _right.set(
            Math.cos(theta),
            0,
            -Math.sin(theta)
        ).normalize()

        _moveDir.set(0, 0, 0)
        let moving = false

        // WASD - forward/back/left/right relative to look direction
        if (keys.current['KeyW'] || keys.current['ArrowUp']) { _moveDir.add(_forward); moving = true }
        if (keys.current['KeyS'] || keys.current['ArrowDown']) { _moveDir.sub(_forward); moving = true }
        if (keys.current['KeyA'] || keys.current['ArrowLeft']) { _moveDir.sub(_right); moving = true }
        if (keys.current['KeyD'] || keys.current['ArrowRight']) { _moveDir.add(_right); moving = true }

        // Absolute Up/Down Hover (Space to fly up, Control to fly down)
        if (keys.current['Space']) { _moveDir.y += 1; moving = true }
        if (keys.current['ControlLeft'] || keys.current['ControlRight'] || keys.current['KeyC']) { _moveDir.y -= 1; moving = true }

        if (moving) {
            _moveDir.normalize().multiplyScalar(speed)
            characterTargetPos.current.add(_moveDir)

            // Hard floor constraint
            if (characterTargetPos.current.y < GROUND_Y) {
                characterTargetPos.current.y = GROUND_Y
            }
        }

        // --- Collision & Proximity (with distance pre-filter) ---
        const cityData = useStore.getState().cityData
        let nearestDist = Infinity
        let nearestB = null
        const cx = characterTargetPos.current.x
        const cz = characterTargetPos.current.z

        if (cityData?.buildings) {
            for (let i = 0, len = cityData.buildings.length; i < len; i++) {
                const b = cityData.buildings[i]
                const dx = cx - b.position.x
                const dz = cz - b.position.z
                const distSq = dx * dx + dz * dz

                // Skip buildings too far away (saves 90%+ of AABB checks)
                if (distSq > COLLISION_CHECK_RADIUS_SQ) continue

                const w = (b.dimensions?.width || 2) / 2
                const d = (b.dimensions?.depth || 2) / 2

                // Hard Collision (AABB with buffer)
                if (
                    Math.abs(dx) < w + 2.0 &&
                    Math.abs(dz) < d + 2.0 &&
                    characterTargetPos.current.y <= (b.dimensions?.height || 0) + 2.0
                ) {
                    if (moving) {
                        characterTargetPos.current.sub(_moveDir)
                    }
                }

                // Proximity Detection (Terminal trigger)
                const checkRadius = Math.max(w, d) + 10
                if (distSq < checkRadius * checkRadius && distSq < nearestDist) {
                    nearestDist = distSq
                    nearestB = b
                }
            }
        }

        if (nearestB?.id !== nearbyBuildingRef.current?.id) {
            setNearbyBuilding(nearestB)
            nearbyBuildingRef.current = nearestB
        }

        // Smooth character position
        characterPos.current.lerp(characterTargetPos.current, CHARACTER_LERP)

        // Update character mesh
        if (meshRef.current) {
            meshRef.current.position.copy(characterPos.current)

            if (moving) {
                _horizMove.set(_moveDir.x, _moveDir.z)
                if (_horizMove.lengthSq() > 0.001) {
                    const targetRotation = Math.atan2(_horizMove.x, _horizMove.y)
                    let diff = targetRotation - meshRef.current.rotation.y
                    while (diff > Math.PI) diff -= Math.PI * 2
                    while (diff < -Math.PI) diff += Math.PI * 2
                    meshRef.current.rotation.y += diff * 0.12
                }
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

        // Update FOV — ONLY when it actually changes (guards updateProjectionMatrix)
        const isSprinting = moving && (keys.current['ShiftLeft'] || keys.current['ShiftRight'])
        const targetFov = isSprinting ? SPRINT_FOV : DEFAULT_FOV
        const fovDelta = Math.abs(currentFov.current - targetFov)
        if (fovDelta > 0.1) {
            currentFov.current += (targetFov - currentFov.current) * FOV_LERP
            camera.fov = currentFov.current
            camera.updateProjectionMatrix() // Only when FOV actually changed
        }

        // Interpolate camera distance
        currentCameraDistance.current += (targetCameraDistance.current - currentCameraDistance.current) * 0.1

        // Toggle first-person visibility
        const isFirstPerson = currentCameraDistance.current < 2.0
        if (meshRef.current) {
            meshRef.current.visible = !isFirstPerson
        }

        // Camera follow — reuse pre-allocated vectors
        const distance = currentCameraDistance.current

        if (isFirstPerson) {
            _headPos.copy(characterPos.current)
            _headPos.y += 1.8
            _camTarget.copy(_headPos)
        } else {
            _camTarget.set(
                characterPos.current.x + distance * Math.sin(theta) * Math.cos(phi),
                characterPos.current.y + (distance * 0.7) * Math.sin(phi) + 2.0,
                characterPos.current.z + distance * Math.cos(theta) * Math.cos(phi)
            )
        }

        camera.position.lerp(_camTarget, CAMERA_LERP)

        if (isFirstPerson) {
            _lookOffset.set(
                -Math.sin(theta) * Math.cos(phi),
                Math.sin(phi),
                -Math.cos(theta) * Math.cos(phi)
            )
            _lookTarget.copy(camera.position).add(_lookOffset)
            camera.lookAt(_lookTarget)
        } else {
            _lookTarget.copy(characterPos.current)
            _lookTarget.y += 1.5
            camera.lookAt(_lookTarget)
        }

        // ALWAYS invalidate when exploration is active (demand rendering)
        invalidate()
    })

    if (!active) return null

    return (
        <>
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

        </>
    )
}
