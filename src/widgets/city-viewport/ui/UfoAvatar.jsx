import { useRef, useEffect, useMemo } from "react"
import { useFrame, useThree } from "@react-three/fiber"
import * as THREE from "three"
import { Sparkles } from "@react-three/drei"
import useStore from "../../../store/useStore"

const KEYS = { w: false, a: false, s: false, d: false, space: false, shift: false }

window.addEventListener("keydown", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return
    const isUfo = useStore.getState().ufoMode
    if (!isUfo) return
    const k = e.key.toLowerCase()
    if (k === "w" || k === "arrowup")     { KEYS.w = true; e.preventDefault() }
    if (k === "a" || k === "arrowleft")   { KEYS.a = true; e.preventDefault() }
    if (k === "s" || k === "arrowdown")   { KEYS.s = true; e.preventDefault() }
    if (k === "d" || k === "arrowright")  { KEYS.d = true; e.preventDefault() }
    if (k === " ")                        { KEYS.space = true; e.preventDefault() }
    if (k === "shift")                    { KEYS.shift = true; e.preventDefault() }
})

window.addEventListener("keyup", (e) => {
    if (e.target.tagName === "INPUT" || e.target.tagName === "TEXTAREA") return
    const k = e.key.toLowerCase()
    if (k === "w" || k === "arrowup")     KEYS.w = false
    if (k === "a" || k === "arrowleft")   KEYS.a = false
    if (k === "s" || k === "arrowdown")   KEYS.s = false
    if (k === "d" || k === "arrowright")  KEYS.d = false
    if (k === " ")                        KEYS.space = false
    if (k === "shift")                    KEYS.shift = false
})

// Module-level reusable vectors — zero per-frame allocations
const _forward = new THREE.Vector3()
const _right = new THREE.Vector3()
const _moveDir = new THREE.Vector3()
const _up = new THREE.Vector3(0, 1, 0)
const _desiredCam = new THREE.Vector3()
const _nextPos = new THREE.Vector3()
const _initDir = new THREE.Vector3()

// Spatial grid so collision cost stays flat for huge cities
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
 * CodeProbe — classic game flying saucer.
 *
 * Readable silhouette from any distance:
 *   - Wide flat saucer hull (disc) — metallic dark with emissive panel lines
 *   - Transparent glass cockpit dome with bright white core inside
 *   - 8 classic "running lights" around the equator, alternating cyan/white
 *   - Under-disc tractor beam (additive cone)
 *   - Thin glowing rim torus — cyan edge highlight
 *   - 2 point lights (one below, one above) for illumination + self-glow
 *
 * Everything uses cheap materials. Rings counter-rotate for motion cue.
 */
function CodeProbe({ thrustMag }) {
    const shellRef = useRef()
    const coreRef = useRef()
    const beamRef = useRef()
    const lightsRef = useRef()

    useFrame((state) => {
        const t = state.clock.elapsedTime
        if (shellRef.current) {
            shellRef.current.position.y = Math.sin(t * 2.0) * 0.3
            shellRef.current.rotation.y = t * 0.35
        }
        if (coreRef.current) {
            const pulse = 1 + Math.sin(t * 5.5) * 0.1
            coreRef.current.scale.setScalar(pulse)
        }
        if (beamRef.current) {
            const boost = Math.min(1, thrustMag?.current || 0)
            beamRef.current.material.opacity = 0.4 + boost * 0.3 + Math.sin(t * 8) * 0.08
            beamRef.current.scale.y = 1 + boost * 0.8
        }
        // Running lights blink pattern
        if (lightsRef.current) {
            lightsRef.current.rotation.y = t * 0.6
        }
    })

    return (
        <group ref={shellRef}>
            {/* ── Main saucer hull — wide flat disc ── */}
            <mesh scale={[1, 0.24, 1]}>
                <sphereGeometry args={[3.2, 28, 14]} />
                <meshStandardMaterial
                    color="#1a2238"
                    metalness={0.9}
                    roughness={0.28}
                    emissive="#1e4a7a"
                    emissiveIntensity={0.45}
                />
            </mesh>

            {/* ── Sharp rim torus — bright cyan edge ── */}
            <mesh rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[3.2, 0.09, 8, 56]} />
                <meshBasicMaterial color="#00ffcc" toneMapped={false} />
            </mesh>

            {/* ── Cockpit dome — translucent glass ── */}
            <mesh position={[0, 0.55, 0]}>
                <sphereGeometry args={[1.35, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshStandardMaterial
                    color="#6bd4ff"
                    emissive="#2aa6ff"
                    emissiveIntensity={0.8}
                    metalness={0.4}
                    roughness={0.05}
                    transparent
                    opacity={0.5}
                />
            </mesh>

            {/* ── Bright white core inside dome — reads as the UFO's light source ── */}
            <mesh ref={coreRef} position={[0, 0.45, 0]}>
                <sphereGeometry args={[0.55, 16, 12]} />
                <meshBasicMaterial color="#ffffff" toneMapped={false} />
            </mesh>

            {/* ── 8 classic running lights around the equator (alternating cyan/white) ── */}
            <group ref={lightsRef}>
                {Array.from({ length: 8 }).map((_, i) => {
                    const a = (i / 8) * Math.PI * 2
                    const x = Math.cos(a) * 2.9
                    const z = Math.sin(a) * 2.9
                    const color = i % 2 === 0 ? '#ffffff' : '#00ffcc'
                    return (
                        <mesh key={i} position={[x, -0.1, z]}>
                            <sphereGeometry args={[0.14, 10, 8]} />
                            <meshBasicMaterial color={color} toneMapped={false} />
                        </mesh>
                    )
                })}
            </group>

            {/* ── Thin bottom disc for underside definition ── */}
            <mesh position={[0, -0.38, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <ringGeometry args={[1.1, 2.4, 32]} />
                <meshBasicMaterial
                    color="#00aaff"
                    transparent
                    opacity={0.35}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                    toneMapped={false}
                />
            </mesh>

            {/* ── Tractor beam (below) — expands with thrust ── */}
            <mesh ref={beamRef} position={[0, -1.9, 0]} rotation={[Math.PI, 0, 0]}>
                <coneGeometry args={[1.5, 2.6, 24, 1, true]} />
                <meshBasicMaterial
                    color="#00ffcc"
                    transparent
                    opacity={0.45}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    toneMapped={false}
                />
            </mesh>

            {/* ── Lights ── */}
            <pointLight position={[0, -2, 0]} color="#00ffcc" intensity={6} distance={140} />
            <pointLight position={[0, 1, 0]} color="#ffffff" intensity={2.2} distance={30} />
        </group>
    )
}

export default function UfoAvatar() {
    const ufoMode = useStore(s => s.ufoMode)
    const cityData = useStore(s => s.cityData)

    const groupRef = useRef()
    const vehicleRef = useRef()
    const thrustMag = useRef(0)
    const { camera, controls, invalidate } = useThree()
    const velocity = useRef(new THREE.Vector3())
    const initialized = useRef(false)

    // Speed scales with city size
    const speedMult = Math.max(1.0, Math.min(4.0, (cityData?.buildings?.length || 100) / 500))
    const acceleration = 260.0 * Math.pow(speedMult, 1.2)
    const drag = 0.90
    const maxSpeed = 400.0 * speedMult

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
        if (!groupRef.current || !vehicleRef.current) return

        if (!initialized.current && camera.position.lengthSq() > 0 && controls) {
            camera.getWorldDirection(_initDir)
            _initDir.y = 0
            if (_initDir.lengthSq() > 0) _initDir.normalize()
            groupRef.current.position.copy(camera.position).addScaledVector(_initDir, 60)
            if (groupRef.current.position.y > 20) groupRef.current.position.y -= 10
            if (groupRef.current.position.y < 10) groupRef.current.position.y = 10
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
        if (moving) { _moveDir.normalize(); invalidate() }
        else if (velocity.current.lengthSq() > 0.1) invalidate()

        velocity.current.addScaledVector(_moveDir, acceleration * dt)
        velocity.current.multiplyScalar(drag)
        if (velocity.current.length() > maxSpeed) velocity.current.setLength(maxSpeed)

        thrustMag.current = Math.min(1, velocity.current.length() / maxSpeed)

        _nextPos.copy(groupRef.current.position).addScaledVector(velocity.current, dt * 8)

        // Spatial-grid AABB collision — UFO is 5x visual scale so bump vehicle radius to match.
        let collisionX = false, collisionZ = false, collisionY = false, roofHeight = 0
        if (spatialGrid) {
            const radius = 120 * speedMult
            const vr = 28
            const minCx = Math.floor((_nextPos.x - radius) / CELL_SIZE)
            const maxCx = Math.floor((_nextPos.x + radius) / CELL_SIZE)
            const minCz = Math.floor((_nextPos.z - radius) / CELL_SIZE)
            const maxCz = Math.floor((_nextPos.z + radius) / CELL_SIZE)
            const cx = groupRef.current.position.x
            const cz = groupRef.current.position.z
            for (let ix = minCx; ix <= maxCx; ix++) {
                for (let iz = minCz; iz <= maxCz; iz++) {
                    const cell = spatialGrid.get(ix * CELL_STRIDE + iz)
                    if (!cell) continue
                    for (let k = 0; k < cell.length; k++) {
                        const b = cell[k]
                        const w = (b.dimensions?.width || 8) / 2
                        const d = (b.dimensions?.depth || 8) / 2
                        const h = (b.dimensions?.height || 8) * 3.0
                        const bx = b.position.x
                        const bz = b.position.z || 0
                        const nx = Math.abs(bx - _nextPos.x), nz = Math.abs(bz - _nextPos.z)
                        const oxCurr = Math.abs(bx - cx), ozCurr = Math.abs(bz - cz)
                        const inXNext = nx < w + vr, inZNext = nz < d + vr
                        const inXCurr = oxCurr < w + vr, inZCurr = ozCurr < d + vr
                        if (_nextPos.y < h + 8 && inXNext && inZCurr) collisionX = true
                        if (_nextPos.y < h + 8 && inZNext && inXCurr) collisionZ = true
                        if (_nextPos.y < h + 8 && inXNext && inZNext) {
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

        // Chase camera — pulled back further to frame the 5x-scale probe
        if (controls && (velocity.current.lengthSq() > 5 || !collisionX || !collisionZ)) {
            controls.target.lerp(groupRef.current.position, dt * 8)
            const motionZoom = velocity.current.lengthSq() * 0.0003
            const camDist = 260 + (speedMult - 1) * 50 + motionZoom
            const camHeight = 120 + (speedMult - 1) * 28 + Math.abs(velocity.current.y * 0.12)
            _desiredCam.set(
                groupRef.current.position.x - _forward.x * camDist,
                groupRef.current.position.y + camHeight,
                groupRef.current.position.z - _forward.z * camDist
            )
            camera.position.lerp(_desiredCam, dt * 3.5)
            controls.update()
        }

        // Bank + yaw
        const MAX_TILT = 0.4
        const bankX = THREE.MathUtils.clamp(velocity.current.z * 0.028, -MAX_TILT, MAX_TILT)
        const bankZ = THREE.MathUtils.clamp(-velocity.current.x * 0.034, -MAX_TILT, MAX_TILT)
        vehicleRef.current.rotation.x = THREE.MathUtils.lerp(vehicleRef.current.rotation.x, bankX, dt * 6)
        vehicleRef.current.rotation.z = THREE.MathUtils.lerp(vehicleRef.current.rotation.z, bankZ, dt * 6)
        if (velocity.current.lengthSq() > 100) {
            const yaw = Math.atan2(-velocity.current.x, -velocity.current.z)
            vehicleRef.current.rotation.y = THREE.MathUtils.lerp(vehicleRef.current.rotation.y, yaw, dt * 3.5)
        }
    })

    if (!ufoMode) return null

    return (
        <group ref={groupRef} position={[0, 40, 0]}>
            <Sparkles count={30} scale={[18, 8, 24]} position={[0, 0, -8]} size={5} speed={2} opacity={0.55} color="#00ffcc" />
            <group ref={vehicleRef} scale={[5.0, 5.0, 5.0]}>
                <CodeProbe thrustMag={thrustMag} />
            </group>
        </group>
    )
}
