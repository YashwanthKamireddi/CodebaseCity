import React, { useRef, useState, useEffect } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * UfoAvatar.jsx — World Class 3D Game vehicle for exploring Code City.
 * Controls: WASD or Arrows to Move. SPACE to ascend, SHIFT to descend.
 *
 * Includes smooth vehicle banking, collision detection, and camera chasing.
 */

const KEYS = { w: false, a: false, s: false, d: false, space: false, shift: false }

window.addEventListener('keydown', (e) => {
    // Only capture if we are not typing in an input
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    // Check if UFO mode is enabled via the store snapshot
    const isUfo = useStore.getState().ufoMode
    if (!isUfo) return

    // Disable default behavior of WASD and Space if in UFO mode (prevents scrolling)
    const k = e.key.toLowerCase()
    if (k === 'w' || k === 'arrowup')     { KEYS.w = true; e.preventDefault() }
    if (k === 'a' || k === 'arrowleft')   { KEYS.a = true; e.preventDefault() }
    if (k === 's' || k === 'arrowdown')   { KEYS.s = true; e.preventDefault() }
    if (k === 'd' || k === 'arrowright')  { KEYS.d = true; e.preventDefault() }
    if (k === ' ')                        { KEYS.space = true; e.preventDefault() }
    if (k === 'shift')                    { KEYS.shift = true; e.preventDefault() }
})

window.addEventListener('keyup', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;

    const k = e.key.toLowerCase()
    if (k === 'w' || k === 'arrowup')     KEYS.w = false
    if (k === 'a' || k === 'arrowleft')   KEYS.a = false
    if (k === 's' || k === 'arrowdown')   KEYS.s = false
    if (k === 'd' || k === 'arrowright')  KEYS.d = false
    if (k === ' ')                        KEYS.space = false
    if (k === 'shift')                    KEYS.shift = false
})

export default function UfoAvatar() {
    const ufoMode = useStore(s => s.ufoMode)
    const cityData = useStore(s => s.cityData)

    const groupRef = useRef()
    const meshRef = useRef()
    const { camera, controls, invalidate } = useThree()

    // Physics & Movement State
    const velocity = useRef(new THREE.Vector3())

    // 100 buildings = 1x speed, 2000 buildings = 4x speed
    const speedMult = Math.max(1.0, Math.min(4.0, (cityData?.buildings?.length || 100) / 500))
    const acceleration = 180.0 * Math.pow(speedMult, 1.2)
    const drag = 0.92
    const maxSpeed = 350.0 * speedMult

    const initialized = useRef(false)

    // Reset initialization when UFO mode is toggled, so it teleports to camera anew
    useEffect(() => {
        if (ufoMode) {
            initialized.current = false
            // Drop focus from the floating dock button so Spacebar doesn't re-trigger clicks
            if (document.activeElement && document.activeElement.blur) {
                document.activeElement.blur()
            }
        } else {
            // Stop moving when mode disabled
            velocity.current.set(0, 0, 0)
            KEYS.w = KEYS.a = KEYS.s = KEYS.d = KEYS.space = KEYS.shift = false
        }
    }, [ufoMode])

    useFrame((state, delta) => {
        if (!ufoMode) return
        if (!groupRef.current || !meshRef.current) return

        // Teleport UFO right in front of the camera on load, so user immediately sees it
        if (!initialized.current && camera.position.lengthSq() > 0 && controls) {
            const dir = new THREE.Vector3()
            camera.getWorldDirection(dir)
            dir.y = 0
            if (dir.lengthSq() > 0) dir.normalize()

            groupRef.current.position.copy(camera.position).add(dir.multiplyScalar(60))
            // Only drop if we're high enough
            if (groupRef.current.position.y > 20) {
                groupRef.current.position.y -= 10
            }
            controls.target.copy(groupRef.current.position)
            controls.update()
            initialized.current = true
            invalidate()
        }

        const dt = Math.min(delta, 0.1)
        const t = state.clock.elapsedTime

        const forward = new THREE.Vector3()
        camera.getWorldDirection(forward)
        forward.y = 0
        if (forward.lengthSq() > 0) forward.normalize()

        const right = new THREE.Vector3()
        right.crossVectors(forward, new THREE.Vector3(0, 1, 0)).normalize()

        const moveDir = new THREE.Vector3()
        if (KEYS.w) moveDir.add(forward)
        if (KEYS.s) moveDir.sub(forward)
        if (KEYS.a) moveDir.sub(right)
        if (KEYS.d) moveDir.add(right)

        if (KEYS.space) moveDir.y += 1.0
        if (KEYS.shift) moveDir.y -= 1.0

        if (moveDir.lengthSq() > 0) {
            moveDir.normalize()
            invalidate() // Force 60 FPS while driving
        } else if (velocity.current.lengthSq() > 0.1) {
            invalidate() // Force 60 FPS while decelerating
        }

        velocity.current.add(moveDir.multiplyScalar(acceleration * dt))
        velocity.current.multiplyScalar(drag)

        if (velocity.current.length() > maxSpeed) {
            velocity.current.setLength(maxSpeed)
        }

        // --- Collision Detection logic ---
        const nextPos = groupRef.current.position.clone().addScaledVector(velocity.current, dt * 8)
        let collisionX = false
        let collisionZ = false
        let collisionY = false
        let roofHeight = 0

        if (cityData?.buildings?.length) {
            // Very simple AABB check against buildings
            const checkRadius = 60 * speedMult
            const ufoRadius = 12

            for (const b of cityData.buildings) {
                const w = (b.dimensions?.width || 8) / 2
                const d = (b.dimensions?.depth || 8) / 2
                const h = (b.dimensions?.height || 8) * 3.0

                const bx = b.position.x
                const bz = b.position.z || 0

                // Skip if not nearby (fast coarse bounding box check)
                if (Math.abs(bx - nextPos.x) > checkRadius || Math.abs(bz - nextPos.z) > checkRadius) continue

                const nextDiffX = Math.abs(bx - nextPos.x)
                const nextDiffZ = Math.abs(bz - nextPos.z)
                const currDiffX = Math.abs(bx - groupRef.current.position.x)
                const currDiffZ = Math.abs(bz - groupRef.current.position.z)

                const isInsideXNext = nextDiffX < w + ufoRadius
                const isInsideZNext = nextDiffZ < d + ufoRadius
                const isInsideXCurr = currDiffX < w + ufoRadius
                const isInsideZCurr = currDiffZ < d + ufoRadius

                // Horizontal collision X
                if (nextPos.y < h + 10 && isInsideXNext && isInsideZCurr) collisionX = true
                // Horizontal collision Z
                if (nextPos.y < h + 10 && isInsideZNext && isInsideXCurr) collisionZ = true

                // Vertical collision (top-down)
                if (nextPos.y < h + 10 && isInsideXNext && isInsideZNext) {
                    if (groupRef.current.position.y >= h + 10) {
                        collisionY = true
                        if (h + 10 > roofHeight) roofHeight = h + 10
                    }
                }
            }
        }

        // Halve velocity if dragging along a wall
        if (collisionX) {
            nextPos.x = groupRef.current.position.x
            velocity.current.x *= 0.5
        }
        if (collisionZ) {
            nextPos.z = groupRef.current.position.z
            velocity.current.z *= 0.5
        }
        if (collisionY) {
            nextPos.y = roofHeight
            velocity.current.y *= -0.2 // slight bounce
            if (velocity.current.y < 0) velocity.current.y = 0
            if (KEYS.shift) velocity.current.y = 0
        }

        groupRef.current.position.copy(nextPos)

        if (groupRef.current.position.y < 2) groupRef.current.position.y = 2
        // Make sure we never fly completely out of bounds into deep space
        if (groupRef.current.position.y > 1500) groupRef.current.position.y = 1500

        // If Drone is moving, naturally pan the camera target to chase it (3rd Person View)
        if (controls && (velocity.current.lengthSq() > 5.0 || !collisionX || !collisionZ)) {
            controls.target.lerp(groupRef.current.position, dt * 8.0)

            // Beautiful Cinema / Game Cam: slightly elevated, centered behind the drone
            const camDist = 140 + (speedMult - 1) * 40
            const camHeight = 80 + (speedMult - 1) * 30
            const desiredCamPos = groupRef.current.position.clone().add(
                new THREE.Vector3(-forward.x * camDist, camHeight, -forward.z * camDist)
            )
            camera.position.lerp(desiredCamPos, dt * 4.0)

            controls.update()
        }

        const bankAngleX = velocity.current.z * 0.015
        const bankAngleZ = -velocity.current.x * 0.015
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, bankAngleX, dt * 3)
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, bankAngleZ, dt * 3)

        // Hover bobbing
        meshRef.current.position.y = Math.sin(t * 4.0) * 1.5

        // Animate Rotors (blades spin super fast)
        if (meshRef.current.children) {
            meshRef.current.children.forEach(child => {
                if (child.name === 'rotorGroup') {
                    child.children.forEach(c => {
                        if (c.name === 'rotor-blade') {
                            c.rotation.z += 25.0 * Math.max(1.0, speedMult * 0.75) * dt
                        }
                    })
                }
            })
        }
    })

    if (!ufoMode) return null

    // Substantially increased scale so it's a prominent hero avatar!
    return (
        <group ref={groupRef} position={[0, 40, 0]} scale={[2.0, 2.0, 2.0]}>
            <pointLight distance={180} intensity={3.5} color="#3b82f6" position={[0, -2, 0]} />

            <group ref={meshRef}>
                {/* Central Body (Cyber Drone) */}
                <mesh position={[0, 0, 0]}>
                    <boxGeometry args={[4, 1.5, 6]} />
                    <meshStandardMaterial color="#1f2937" metalness={0.8} roughness={0.2} wireframe={false} />
                    <lineSegments>
                        <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(4, 1.5, 6)]} />
                        <lineBasicMaterial color="#3b82f6" attach="material" transparent opacity={0.6} />
                    </lineSegments>
                </mesh>

                {/* Glowing Core / Eye */}
                <mesh position={[0, 0.2, 3.01]}>
                    <planeGeometry args={[2.5, 0.4]} />
                    <meshBasicMaterial color="#3b82f6" />
                </mesh>

                {/* 4 Rotors + Arms */}
                {[
                    [-3.5, 3.5], [3.5, 3.5],
                    [-3.5, -3.5], [3.5, -3.5]
                ].map(([rx, rz], i) => (
                    <group key={i} name="rotorGroup" position={[rx, 0, rz]}>
                        {/* Arm */}
                        <mesh position={[-rx/2, 0, -rz/2]} rotation={[0, Math.atan2(rx, rz), 0]}>
                            <boxGeometry args={[0.5, 0.5, Math.sqrt(rx*rx + rz*rz)]} />
                            <meshStandardMaterial color="#374151" metalness={0.6} roughness={0.4} />
                        </mesh>

                        {/* Motor Pod */}
                        <mesh position={[0, 0.4, 0]}>
                            <cylinderGeometry args={[1.5, 1.2, 1.0, 16]} />
                            <meshStandardMaterial color="#111827" metalness={0.8} roughness={0.2} />
                            <lineSegments>
                                <edgesGeometry attach="geometry" args={[new THREE.CylinderGeometry(1.5, 1.2, 1.0, 16)]} />
                                <lineBasicMaterial color="#3b82f6" attach="material" transparent opacity={0.3} />
                            </lineSegments>
                        </mesh>

                        {/* Spinning Blades */}
                        <mesh name="rotor-blade" position={[0, 1.0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                            <circleGeometry args={[2.8, 32]} />
                            <meshBasicMaterial color="#93c5fd" transparent opacity={0.2} side={THREE.DoubleSide} />
                        </mesh>
                    </group>
                ))}
            </group>
        </group>
    )
}
