import { useRef, useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { Sparkles } from "@react-three/drei"
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

// Module-level reusable math objects — zero per-frame allocations.
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _moveDir = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _desiredCamPos = new THREE.Vector3()
const _nextPos = new THREE.Vector3()
const _initDir = new THREE.Vector3()

// Spatial hash grid — collision drops from O(N) to O(cells_near_UFO).
const CELL_SIZE = 120
const CELL_STRIDE = 100000

function buildSpatialGrid(buildings) {
    const grid = new Map()
    for (let i = 0; i < buildings.length; i++) {
        const b = buildings[i]
        const cx = Math.floor(b.position.x / CELL_SIZE)
        const cz = Math.floor((b.position.z || 0) / CELL_SIZE)
        const key = cx * CELL_STRIDE + cz
        let cell = grid.get(key)
        if (!cell) { cell = []; grid.set(key, cell) }
        cell.push(b)
    }
    return grid
}

/**
 * Ufo — optimized cinematic saucer.
 * - Single point light (was 11).
 * - MeshStandardMaterial only (no transmission/clearcoat).
 * - Low-segment geometry tuned for 60fps.
 */
function Ufo({ velocity }) {
    const mainRef = useRef()
    const ringRef = useRef()
    const thrustRef = useRef()

    useFrame((state) => {
        const t = state.clock.elapsedTime
        const m = mainRef.current
        const speed = velocity ? velocity.length() : 0
        if (m) {
            // Subtler hover — full banking comes from the parent vehicleGroupRef
            m.position.y = Math.sin(t * 1.8) * 0.15
            m.rotation.y = t * 0.35
        }
        if (ringRef.current) ringRef.current.rotation.z = t * 1.4
        if (thrustRef.current) {
            // Thrust throbs faster and brighter at speed — feels like a real engine
            const throbSpeed = 6.0 + speed * 0.015
            const throbBase = 0.45 + Math.min(speed * 0.001, 0.35)
            thrustRef.current.material.opacity = throbBase + Math.sin(t * throbSpeed) * 0.15
        }
    })

    return (
        <group ref={mainRef}>
            {/* Main saucer hull — subtle emissive so it reads in warm/magenta scene lighting */}
            <mesh scale={[1, 0.22, 1]}>
                <sphereGeometry args={[3, 24, 12]} />
                <meshStandardMaterial
                    color="#2a2a45"
                    emissive="#1a1a3a"
                    emissiveIntensity={0.6}
                    metalness={0.9}
                    roughness={0.28}
                />
            </mesh>

            {/* Bright neon outer rim */}
            <mesh>
                <torusGeometry args={[3.02, 0.07, 8, 48]} />
                <meshBasicMaterial color="#00ffcc" toneMapped={false} />
            </mesh>

            {/* Rotating accent ring */}
            <mesh ref={ringRef} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2.5, 0.04, 8, 48]} />
                <meshBasicMaterial color="#ff00cc" toneMapped={false} />
            </mesh>

            {/* Second stationary accent band for detail */}
            <mesh position={[0, 0.05, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[2.8, 0.02, 8, 48]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>

            {/* Glass cockpit dome — emissive reads clearly in sunset scene */}
            <mesh position={[0, 0.4, 0]}>
                <sphereGeometry args={[1.15, 20, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial
                    color="#66ddff"
                    emissive="#00aaff"
                    emissiveIntensity={0.9}
                    metalness={0.5}
                    roughness={0.1}
                    transparent
                    opacity={0.7}
                />
            </mesh>

            {/* Inner cockpit core glow (visible through dome) */}
            <mesh position={[0, 0.3, 0]}>
                <sphereGeometry args={[0.5, 12, 10]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>

            {/* Underside thruster cone */}
            <mesh ref={thrustRef} position={[0, -1.0, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[1.3, 2.2, 20, 1, true]} />
                <meshBasicMaterial
                    color="#00ffcc"
                    transparent
                    opacity={0.5}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    toneMapped={false}
                />
            </mesh>

            {/* Main illuminating light below */}
            <pointLight position={[0, -1.2, 0]} color="#00ffcc" intensity={4.5} distance={90} />
            {/* Top fill light so the hull doesn't read black against the sunset sky */}
            <pointLight position={[0, 1.5, 0]} color="#88ccff" intensity={1.2} distance={25} />
        </group>
    )
}

export default function UfoAvatar() {
    const ufoMode = useStore(s => s.ufoMode)
    const cityData = useStore(s => s.cityData)

    const groupRef = useRef()
    const vehicleGroupRef = useRef()
    const { camera, controls, invalidate } = useThree()
    const velocity = useRef(new THREE.Vector3())

    const speedMult = Math.max(1.0, Math.min(4.0, (cityData?.buildings?.length || 100) / 500))
    const acceleration = 280.0 * Math.pow(speedMult, 1.2)
    const drag = 0.90
    const maxSpeed = 420.0 * speedMult
    const initialized = useRef(false)

    // Build spatial grid once per cityData change — never per frame.
    const spatialGrid = useMemo(() => {
        if (!cityData?.buildings?.length) return null
        return buildSpatialGrid(cityData.buildings)
    }, [cityData])

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
        if (!groupRef.current || !vehicleGroupRef.current) return

        if (!initialized.current && camera.position.lengthSq() > 0 && controls) {
            camera.getWorldDirection(_initDir)
            _initDir.y = 0
            if (_initDir.lengthSq() > 0) _initDir.normalize()
            groupRef.current.position.copy(camera.position).addScaledVector(_initDir, 60)
            if (groupRef.current.position.y > 20) groupRef.current.position.y -= 10
            controls.target.copy(groupRef.current.position)
            controls.update()
            initialized.current = true
            invalidate()
        }

        const dt = Math.min(delta, 0.1)

        camera.getWorldDirection(_forward)
        _forward.y = 0
        if (_forward.lengthSq() > 0) _forward.normalize()

        _right.crossVectors(_forward, _up).normalize()

        _moveDir.set(0, 0, 0)
        if (KEYS.w) _moveDir.add(_forward)
        if (KEYS.s) _moveDir.sub(_forward)
        if (KEYS.a) _moveDir.sub(_right)
        if (KEYS.d) _moveDir.add(_right)
        if (KEYS.space) _moveDir.y += 1.0
        if (KEYS.shift) _moveDir.y -= 1.0

        const moving = _moveDir.lengthSq() > 0
        if (moving) {
            _moveDir.normalize()
            invalidate()
        } else if (velocity.current.lengthSq() > 0.1) {
            invalidate()
        }

        velocity.current.addScaledVector(_moveDir, acceleration * dt)
        velocity.current.multiplyScalar(drag)
        if (velocity.current.length() > maxSpeed) velocity.current.setLength(maxSpeed)

        _nextPos.copy(groupRef.current.position).addScaledVector(velocity.current, dt * 8)

        let collisionX = false, collisionZ = false, collisionY = false, roofHeight = 0

        // Spatial grid collision — only scan cells overlapping search radius.
        if (spatialGrid) {
            const checkRadius = 60 * speedMult
            const vehicleRadius = 8
            const minCx = Math.floor((_nextPos.x - checkRadius) / CELL_SIZE)
            const maxCx = Math.floor((_nextPos.x + checkRadius) / CELL_SIZE)
            const minCz = Math.floor((_nextPos.z - checkRadius) / CELL_SIZE)
            const maxCz = Math.floor((_nextPos.z + checkRadius) / CELL_SIZE)
            const currX = groupRef.current.position.x
            const currZ = groupRef.current.position.z

            for (let cx = minCx; cx <= maxCx; cx++) {
                for (let cz = minCz; cz <= maxCz; cz++) {
                    const cell = spatialGrid.get(cx * CELL_STRIDE + cz)
                    if (!cell) continue
                    for (let k = 0; k < cell.length; k++) {
                        const b = cell[k]
                        const w = (b.dimensions?.width || 8) / 2
                        const d = (b.dimensions?.depth || 8) / 2
                        const h = (b.dimensions?.height || 8) * 3.0
                        const bx = b.position.x
                        const bz = b.position.z || 0

                        const nextDiffX = Math.abs(bx - _nextPos.x)
                        const nextDiffZ = Math.abs(bz - _nextPos.z)
                        const currDiffX = Math.abs(bx - currX)
                        const currDiffZ = Math.abs(bz - currZ)
                        const insideXNext = nextDiffX < w + vehicleRadius
                        const insideZNext = nextDiffZ < d + vehicleRadius
                        const insideXCurr = currDiffX < w + vehicleRadius
                        const insideZCurr = currDiffZ < d + vehicleRadius

                        if (_nextPos.y < h + 8 && insideXNext && insideZCurr) collisionX = true
                        if (_nextPos.y < h + 8 && insideZNext && insideXCurr) collisionZ = true
                        if (_nextPos.y < h + 8 && insideXNext && insideZNext) {
                            if (groupRef.current.position.y >= h + 8) {
                                collisionY = true
                                if (h + 8 > roofHeight) roofHeight = h + 8
                            }
                        }
                    }
                }
            }
        }

        if (collisionX) { _nextPos.x = groupRef.current.position.x; velocity.current.x *= 0.5 }
        if (collisionZ) { _nextPos.z = groupRef.current.position.z; velocity.current.z *= 0.5 }
        if (collisionY) {
            _nextPos.y = roofHeight
            velocity.current.y *= -0.2
            if (velocity.current.y < 0) velocity.current.y = 0
            if (KEYS.shift) velocity.current.y = 0
        }

        groupRef.current.position.copy(_nextPos)
        if (groupRef.current.position.y < 4) groupRef.current.position.y = 4
        if (groupRef.current.position.y > 1500) groupRef.current.position.y = 1500

        if (controls && (velocity.current.lengthSq() > 5.0 || !collisionX || !collisionZ)) {
            controls.target.lerp(groupRef.current.position, dt * 8.0)
            const motionZoom = velocity.current.lengthSq() * 0.0003
            const camDist = 100 + (speedMult - 1) * 30 + motionZoom
            const camHeight = 50 + (speedMult - 1) * 20 + Math.abs(velocity.current.y * 0.08)
            _desiredCamPos.set(
                groupRef.current.position.x - _forward.x * camDist,
                groupRef.current.position.y + camHeight,
                groupRef.current.position.z - _forward.z * camDist
            )
            camera.position.lerp(_desiredCamPos, dt * 3.5)
            controls.update()
        }

        // More pronounced bank + pitch — feels like a real hover-vehicle, clamped so it never over-rotates
        const MAX_TILT = 0.42
        const bankAngleX = THREE.MathUtils.clamp(velocity.current.z * 0.026, -MAX_TILT, MAX_TILT)
        const bankAngleZ = THREE.MathUtils.clamp(-velocity.current.x * 0.032, -MAX_TILT, MAX_TILT)
        const yawAngle = Math.atan2(-velocity.current.x, -velocity.current.z)

        vehicleGroupRef.current.rotation.x = THREE.MathUtils.lerp(vehicleGroupRef.current.rotation.x, bankAngleX, dt * 6)
        vehicleGroupRef.current.rotation.z = THREE.MathUtils.lerp(vehicleGroupRef.current.rotation.z, bankAngleZ, dt * 6)
        if (velocity.current.lengthSq() > 100) {
            vehicleGroupRef.current.rotation.y = THREE.MathUtils.lerp(vehicleGroupRef.current.rotation.y, yawAngle, dt * 3.5)
        }
    })

    const maxCityHeight = useMemo(() => {
        if (!cityData?.buildings?.length) return 80
        let maxH = 0
        for (const b of cityData.buildings) {
            const h = (b.dimensions?.height || 8) * 3.0
            if (h > maxH) maxH = h
        }
        return maxH
    }, [cityData])

    const defaultSafeY = maxCityHeight + 40

    return (
        <group ref={groupRef} position={[0, defaultSafeY, 0]}>
            <Sparkles count={40} scale={[14, 6, 22]} position={[0, 0, -8]} size={3.5} speed={1.8} opacity={0.6} color="#00ffcc" />
            <group ref={vehicleGroupRef} scale={[1.5, 1.5, 1.5]}>
                <Ufo velocity={velocity.current} />
            </group>
        </group>
    )
}
