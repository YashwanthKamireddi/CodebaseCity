import React, { useRef, useState, useEffect } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { Trail, Sparkles } from "@react-three/drei"
import useStore from "../../../store/useStore"

const KEYS = { w: false, a: false, s: false, d: false, space: false, shift: false }

window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const isUfo = useStore.getState().ufoMode;
    if (!isUfo) return;

    const k = e.key.toLowerCase()
    if (k === "w" || k === "arrowup")     { KEYS.w = true; e.preventDefault() }
    if (k === "a" || k === "arrowleft")   { KEYS.a = true; e.preventDefault() }
    if (k === "s" || k === "arrowdown")   { KEYS.s = true; e.preventDefault() }
    if (k === "d" || k === "arrowright")  { KEYS.d = true; e.preventDefault() }
    if (k === " ")                        { KEYS.space = true; e.preventDefault() }
    if (k === "shift")                    { KEYS.shift = true; e.preventDefault() }
})

window.addEventListener("keyup", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return;
    const k = e.key.toLowerCase()
    if (k === "w" || k === "arrowup")     KEYS.w = false
    if (k === "a" || k === "arrowleft")   KEYS.a = false
    if (k === "s" || k === "arrowdown")   KEYS.s = false
    if (k === "d" || k === "arrowright")  KEYS.d = false
    if (k === " ")                        KEYS.space = false
    if (k === "shift")                    KEYS.shift = false
})

export default function UfoAvatar() {
    const ufoMode = useStore(s => s.ufoMode)
    const cityData = useStore(s => s.cityData)

    const groupRef = useRef()
    const meshRef = useRef()
    const { camera, controls, invalidate } = useThree()
    const velocity = useRef(new THREE.Vector3())

    // Speed tuned for stunning motion
    const speedMult = Math.max(1.0, Math.min(4.0, (cityData?.buildings?.length || 100) / 500))
    const acceleration = 240.0 * Math.pow(speedMult, 1.2)
    const drag = 0.88 // Smooth easing
    const maxSpeed = 380.0 * speedMult
    const initialized = useRef(false)

    useEffect(() => {
        if (ufoMode) {
            initialized.current = false
            if (document.activeElement && document.activeElement.blur) document.activeElement.blur()
        } else {
            velocity.current.set(0, 0, 0)
            KEYS.w = KEYS.a = KEYS.s = KEYS.d = KEYS.space = KEYS.shift = false
        }
    }, [ufoMode])

    useFrame((state, delta) => {
        if (!ufoMode) return
        if (!groupRef.current || !meshRef.current) return

        if (!initialized.current && camera.position.lengthSq() > 0 && controls) {
            const dir = new THREE.Vector3()
            camera.getWorldDirection(dir)
            dir.y = 0
            if (dir.lengthSq() > 0) dir.normalize()
            groupRef.current.position.copy(camera.position).add(dir.multiplyScalar(60))
            if (groupRef.current.position.y > 20) groupRef.current.position.y -= 10
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
            moveDir.normalize(); invalidate() 
        } else if (velocity.current.lengthSq() > 0.1) {
            invalidate() 
        }

        velocity.current.add(moveDir.multiplyScalar(acceleration * dt))
        velocity.current.multiplyScalar(drag)

        if (velocity.current.length() > maxSpeed) velocity.current.setLength(maxSpeed)

        const nextPos = groupRef.current.position.clone().addScaledVector(velocity.current, dt * 8)
        let collisionX = false, collisionZ = false, collisionY = false, roofHeight = 0

        if (cityData?.buildings?.length) {
            const checkRadius = 60 * speedMult
            const ufoRadius = 12
            for (const b of cityData.buildings) {
                const w = (b.dimensions?.width || 8) / 2
                const d = (b.dimensions?.depth || 8) / 2
                const h = (b.dimensions?.height || 8) * 3.0
                const bx = b.position.x
                const bz = b.position.z || 0

                if (Math.abs(bx - nextPos.x) > checkRadius || Math.abs(bz - nextPos.z) > checkRadius) continue

                const nextDiffX = Math.abs(bx - nextPos.x), nextDiffZ = Math.abs(bz - nextPos.z)
                const currDiffX = Math.abs(bx - groupRef.current.position.x), currDiffZ = Math.abs(bz - groupRef.current.position.z)
                const isInsideXNext = nextDiffX < w + ufoRadius, isInsideZNext = nextDiffZ < d + ufoRadius
                const isInsideXCurr = currDiffX < w + ufoRadius, isInsideZCurr = currDiffZ < d + ufoRadius

                if (nextPos.y < h + 10 && isInsideXNext && isInsideZCurr) collisionX = true
                if (nextPos.y < h + 10 && isInsideZNext && isInsideXCurr) collisionZ = true
                if (nextPos.y < h + 10 && isInsideXNext && isInsideZNext) {
                    if (groupRef.current.position.y >= h + 10) {
                        collisionY = true
                        if (h + 10 > roofHeight) roofHeight = h + 10
                    }
                }
            }
        }

        if (collisionX) { nextPos.x = groupRef.current.position.x; velocity.current.x *= 0.5 }
        if (collisionZ) { nextPos.z = groupRef.current.position.z; velocity.current.z *= 0.5 }
        if (collisionY) {
            nextPos.y = roofHeight
            velocity.current.y *= -0.2 
            if (velocity.current.y < 0) velocity.current.y = 0
            if (KEYS.shift) velocity.current.y = 0
        }

        groupRef.current.position.copy(nextPos)
        if (groupRef.current.position.y < 2) groupRef.current.position.y = 2
        if (groupRef.current.position.y > 1500) groupRef.current.position.y = 1500

        if (controls && (velocity.current.lengthSq() > 5.0 || !collisionX || !collisionZ)) {
            controls.target.lerp(groupRef.current.position, dt * 8.0)
            const motionZoom = velocity.current.lengthSq() * 0.0003
            const camDist = 140 + (speedMult - 1) * 40 + motionZoom
            const camHeight = 80 + (speedMult - 1) * 30 + Math.abs(velocity.current.y * 0.1)
            const desiredCamPos = groupRef.current.position.clone().add(
                new THREE.Vector3(-forward.x * camDist, camHeight, -forward.z * camDist)
            )
            camera.position.lerp(desiredCamPos, dt * 3.5)
            controls.update()
        }

        const bankAngleX = velocity.current.z * 0.025
        const bankAngleZ = -velocity.current.x * 0.025
        meshRef.current.rotation.x = THREE.MathUtils.lerp(meshRef.current.rotation.x, bankAngleX, dt * 4)
        meshRef.current.rotation.z = THREE.MathUtils.lerp(meshRef.current.rotation.z, bankAngleZ, dt * 4)

        meshRef.current.position.y = Math.sin(t * 3.0) * 1.5

        if (meshRef.current.children) {
            meshRef.current.children.forEach(child => {
                if (child.name === "ring-outer") {
                    child.rotation.x += dt * 4.0
                    child.rotation.y = Math.sin(t) * 0.2
                }
                if (child.name === "ring-inner") {
                    child.rotation.y -= dt * 6.0
                    child.rotation.z = Math.cos(t) * 0.3
                }
                if (child.name === "core") {
                    child.scale.setScalar(1.0 + Math.sin(t * 10) * 0.1)
                }
            })
        }
    })

    if (!ufoMode) return null

    return (
        <group ref={groupRef} position={[0, 40, 0]} scale={[1.8, 1.8, 1.8]}>
            <pointLight distance={300} intensity={5.0} color="#00ffcc" position={[0, -2, 0]} />
            <pointLight distance={150} intensity={3.5} color="#ff00cc" position={[0, 5, 0]} />
            <Sparkles count={40} scale={15} size={6} speed={0.4} opacity={0.6} color="#00ffcc" />

            <group ref={meshRef}>
                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[4.5, 32, 32]} />
                    <meshPhysicalMaterial 
                        color="#050814" 
                        transmission={0.95} 
                        opacity={1.0} 
                        metalness={0.9} 
                        roughness={0.05} 
                        ior={1.4} 
                        thickness={0.5} 
                        specularIntensity={1.0}
                        specularColor="#00ffcc"
                    />
                </mesh>

                <Trail width={5} color="#ff00cc" length={40} decay={1.5} local={false}>
                    <mesh name="core" position={[0, 0, 0]}>
                        <icosahedronGeometry args={[1.5, 2]} />
                        <meshBasicMaterial color="#ffffff" wireframe={false} />
                        <mesh>
                            <icosahedronGeometry args={[2.0, 1]} />
                            <meshBasicMaterial color="#00ffcc" transparent opacity={0.6} wireframe={true} />
                        </mesh>
                    </mesh>
                </Trail>

                <mesh name="ring-outer" rotation={[Math.PI / 4, 0, 0]}>
                    <torusGeometry args={[5.5, 0.15, 16, 64]} />
                    <meshBasicMaterial color="#00ffcc" transparent opacity={0.9} />
                </mesh>

                <mesh name="ring-inner" rotation={[0, Math.PI / 4, 0]}>
                    <torusGeometry args={[4.0, 0.1, 16, 64]} />
                    <meshBasicMaterial color="#ff00cc" transparent opacity={0.9} />
                </mesh>

                <mesh position={[0, 0, 0]}>
                    <sphereGeometry args={[4.8, 16, 16]} />
                    <meshBasicMaterial color="#3b82f6" wireframe={true} transparent opacity={0.1} />
                </mesh>
            </group>
        </group>
    )
}
