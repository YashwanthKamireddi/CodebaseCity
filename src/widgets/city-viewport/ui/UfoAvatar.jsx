import React, { useRef, useEffect, useMemo } from "react"
import { useFrame, useThree, extend } from "@react-three/fiber"
import * as THREE from "three"
import { Sparkles } from "@react-three/drei"
import { shaderMaterial } from "@react-three/drei"
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

/**
 * HoloShieldMaterial - Futuristic energy shield effect
 */
const HoloShieldMaterial = shaderMaterial(
    { uTime: 0, uColor: new THREE.Color("#00ffff"), uOpacity: 0.5 },
    /* vertex */ `
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
            vNormal = normalize(normalMatrix * normal);
            vPosition = position;
            vUv = uv;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    /* fragment */ `
        uniform float uTime;
        uniform vec3 uColor;
        uniform float uOpacity;
        varying vec3 vNormal;
        varying vec3 vPosition;
        varying vec2 vUv;
        void main() {
            float fresnel = pow(1.0 - abs(dot(vNormal, vec3(0.0, 0.0, 1.0))), 2.5);
            float scanLine = sin(vPosition.y * 40.0 + uTime * 8.0) * 0.5 + 0.5;
            float hexGrid = sin(vPosition.x * 20.0) * sin(vPosition.z * 20.0);
            hexGrid = smoothstep(0.8, 1.0, hexGrid) * 0.3;
            float alpha = fresnel * uOpacity + hexGrid + scanLine * 0.05;
            vec3 color = uColor * (1.0 + fresnel * 0.5);
            gl_FragColor = vec4(color, alpha * 0.6);
        }
    `
)
extend({ HoloShieldMaterial })

/**
 * EngineThrustMaterial - Glowing engine exhaust effect
 */
const EngineThrustMaterial = shaderMaterial(
    { uTime: 0, uIntensity: 1.0 },
    /* vertex */ `
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            vUv = uv;
            vPosition = position;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
        }
    `,
    /* fragment */ `
        uniform float uTime;
        uniform float uIntensity;
        varying vec2 vUv;
        varying vec3 vPosition;
        void main() {
            float dist = length(vUv - vec2(0.5));
            float core = smoothstep(0.5, 0.0, dist);
            float flicker = sin(uTime * 30.0 + vPosition.x * 10.0) * 0.15 + 0.85;
            float pulse = sin(uTime * 5.0) * 0.1 + 0.9;
            vec3 innerColor = vec3(1.0, 1.0, 1.0);
            vec3 midColor = vec3(1.0, 0.0, 1.0); // Magenta
            vec3 outerColor = vec3(1.0, 0.1, 0.5); // Neon Pink
            vec3 color = mix(outerColor, midColor, smoothstep(0.5, 0.2, dist));
            color = mix(color, innerColor, smoothstep(0.2, 0.0, dist));
            float alpha = core * flicker * pulse * uIntensity;
            gl_FragColor = vec4(color * 2.0, alpha);
        }
    `
)
extend({ EngineThrustMaterial })

/**
 * FuturisticSpeeder - Sleek cyberpunk exploration vehicle
 * Replaces the ball with a proper futuristic speeder bike/hover vehicle
/**
 * Minimalist Future Drone
 * Ultra-clean, sleek metallic toroid floating around a pure glass/energy orb.
 * Fits the AAA 2026 CodebaseCity minimalistic aesthetic perfectly.
 */
function MinimalistDrone({ velocity, time }) {
    const mainRef = useRef()
    const coreRef = useRef()
    
    const speed = velocity ? velocity.length() : 0

    useFrame((state) => {
        const t = state.clock.elapsedTime
        if (mainRef.current) {
            // Spin the drone itself slowly based on time and speed
            mainRef.current.rotation.y = t * 2.0 // Fast spin for stability
            
            // Subtle hover dynamics
            mainRef.current.position.y = Math.sin(t * 3.0) * 0.2
            
            // Bank into turns based on velocity
            const bankAngleX = velocity.z * 0.015
            const bankAngleZ = -velocity.x * 0.015
            mainRef.current.rotation.x = THREE.MathUtils.lerp(mainRef.current.rotation.x, bankAngleX, 0.1)
            mainRef.current.rotation.z = THREE.MathUtils.lerp(mainRef.current.rotation.z, bankAngleZ, 0.1)
        }
        
        if (coreRef.current) {
            // Unlink core spin from hull for complex mechanical feel
            coreRef.current.rotation.x = t * 1.5
            coreRef.current.rotation.z = t * 2.1
            coreRef.current.rotation.y = t * -1.0
        }
    })

    return (
        <group ref={mainRef}>
            {/* The Core Orb (Pure glass/energy fusion) */}
            <mesh ref={coreRef} position={[0, 0, 0]}>
                <sphereGeometry args={[0.7, 32, 32]} />
                <meshPhysicalMaterial 
                    color="#ffffff"
                    emissive="#00ccff"
                    emissiveIntensity={0.6}
                    transmission={0.9}
                    clearcoat={1.0}
                    roughness={0}
                    metalness={0.1}
                    ior={1.6}
                />
                
                {/* Inner plasma core */}
                <mesh>
                    <sphereGeometry args={[0.3, 16, 16]} />
                    <meshBasicMaterial color="#ffffff" />
                </mesh>
            </mesh>
            <pointLight distance={40} intensity={4} color="#00ccff" />

            {/* The sleek minimalistic metallic Toroid Hull */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.4, 0.12, 32, 128]} />
                <meshPhysicalMaterial 
                    color="#020203"
                    metalness={1.0}
                    roughness={0.05}
                    clearcoat={1.0}
                    envMapIntensity={2.0}
                />
            </mesh>
            
            {/* Inner glowing magnetic accelerator ring */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.25, 0.02, 16, 128]} />
                <meshBasicMaterial color="#00ffcc" />
            </mesh>
            
            {/* Outer edge neon slit light */}
            <mesh position={[0, 0, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <torusGeometry args={[1.52, 0.01, 16, 128]} />
                <meshBasicMaterial color="#ff00cc" />
            </mesh>
            
            {/* 3 ultra-clean sleek stabilization fins/prongs pointing inwards */}
            {[0, 1, 2].map(i => {
                const angle = (i * Math.PI * 2) / 3
                return (
                    <group key={i} rotation={[0, angle, 0]}>
                        <mesh position={[1.0, 0, 0]}>
                            <boxGeometry args={[0.6, 0.04, 0.08]} />
                            <meshPhysicalMaterial color="#050505" metalness={1.0} roughness={0.0} />
                        </mesh>
                        <mesh position={[0.7, 0, 0]}>
                            <sphereGeometry args={[0.06, 16, 16]} />
                            <meshBasicMaterial color="#ff00ff" />
                        </mesh>
                    </group>
                )
            })}
        </group>
    )
}

/**
 * Classic Cyberpunk UFO - Gorgeous glass dome, metal saucer, and neon thrusters.
 */
function ClassicUfo({ velocity, time }) {
    const mainRef = useRef()
    const engineRef = useRef()

    const speed = velocity ? velocity.length() : 0
    const thrustIntensity = Math.min(1.0, speed / 200) * 0.8 + 0.2

    useFrame((state) => {
        const t = state.clock.elapsedTime
        
        if (engineRef.current) {
            engineRef.current.uniforms.uTime.value = t
            engineRef.current.uniforms.uIntensity.value = thrustIntensity
        }

        if (mainRef.current) {
            mainRef.current.position.y = Math.sin(t * 2.0) * 0.5
            mainRef.current.rotation.y = t * 0.5 // Slow majestic spin
        }
    })

    return (
        <group ref={mainRef}>
            {/* The Glass Dome */}
            <mesh position={[0, 0.5, 0]}>
                <sphereGeometry args={[1.2, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <meshPhysicalMaterial 
                    color="#00ffff" 
                    transmission={0.9} 
                    roughness={0} 
                    metalness={0.1} 
                    clearcoat={1.0} 
                    thickness={1.0} 
                    ior={1.5}
                />
            </mesh>

            {/* Inner Holographic Dashboard / Engine Core inside the glass */}
            <mesh position={[0, 0.2, 0]}>
                <cylinderGeometry args={[0.4, 0.8, 0.5, 16]} />
                <meshBasicMaterial color="#ff00ff" wireframe />
            </mesh>
            <pointLight position={[0, 0.5, 0]} color="#00ffff" intensity={2} distance={10} />

            {/* Main Saucer Hull */}
            <mesh position={[0, 0, 0]} scale={[1, 0.22, 1]}>
                <sphereGeometry args={[3, 32, 16]} />
                <meshPhysicalMaterial 
                    color="#1a1a2e" 
                    emissive="#0a0a15"
                    metalness={0.95} 
                    roughness={0.2} 
                    clearcoat={1.0} 
                />
            </mesh>

            {/* Neon Rim Light Ring */}
            <mesh position={[0, 0, 0]}>
                <torusGeometry args={[3.04, 0.04, 16, 64]} />
                <meshBasicMaterial color="#00ffcc" />
            </mesh>
            
            {/* Bottom Thruster Housing */}
            <mesh position={[0, -0.5, 0]}>
                <cylinderGeometry args={[1.5, 1.0, 0.8, 32]} />
                <meshPhysicalMaterial color="#050510" metalness={0.9} roughness={0.4} />
            </mesh>
            
            {/* Core Energy Down-Beam */}
            <mesh position={[0, -0.95, 0]} rotation={[Math.PI / 2, 0, 0]}>
                <circleGeometry args={[1.2, 32]} />
                <engineThrustMaterial ref={engineRef} transparent side={THREE.DoubleSide} depthWrite={false} />
            </mesh>
            <pointLight position={[0, -2, 0]} color="#00ffcc" intensity={5} distance={40} />
            
            {/* Nav Lights orbiting the rim */}
            {Array.from({length: 8}).map((_, i) => {
                const angle = (i / 8) * Math.PI * 2
                const x = Math.cos(angle) * 2.8
                const z = Math.sin(angle) * 2.8
                return (
                    <group key={i} position={[x, -0.15, z]}>
                        <mesh>
                            <sphereGeometry args={[0.08, 8, 8]} />
                            <meshBasicMaterial color={i % 2 === 0 ? "#ff00ff" : "#00ffff"} />
                        </mesh>
                        <pointLight color={i % 2 === 0 ? "#ff00ff" : "#00ffff"} intensity={1.5} distance={5} />
                    </group>
                )
            })}
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
    const targetRotation = useRef(new THREE.Euler())

    // Speed tuned for stunning motion
    const speedMult = Math.max(1.0, Math.min(4.0, (cityData?.buildings?.length || 100) / 500))
    const acceleration = 280.0 * Math.pow(speedMult, 1.2)
    const drag = 0.90
    const maxSpeed = 420.0 * speedMult
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
        if (!groupRef.current || !vehicleGroupRef.current) return

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
            const vehicleRadius = 8
            for (const b of cityData.buildings) {
                const w = (b.dimensions?.width || 8) / 2
                const d = (b.dimensions?.depth || 8) / 2
                const h = (b.dimensions?.height || 8) * 3.0
                const bx = b.position.x
                const bz = b.position.z || 0

                if (Math.abs(bx - nextPos.x) > checkRadius || Math.abs(bz - nextPos.z) > checkRadius) continue

                const nextDiffX = Math.abs(bx - nextPos.x), nextDiffZ = Math.abs(bz - nextPos.z)
                const currDiffX = Math.abs(bx - groupRef.current.position.x), currDiffZ = Math.abs(bz - groupRef.current.position.z)
                const isInsideXNext = nextDiffX < w + vehicleRadius, isInsideZNext = nextDiffZ < d + vehicleRadius
                const isInsideXCurr = currDiffX < w + vehicleRadius, isInsideZCurr = currDiffZ < d + vehicleRadius

                if (nextPos.y < h + 8 && isInsideXNext && isInsideZCurr) collisionX = true
                if (nextPos.y < h + 8 && isInsideZNext && isInsideXCurr) collisionZ = true
                if (nextPos.y < h + 8 && isInsideXNext && isInsideZNext) {
                    if (groupRef.current.position.y >= h + 8) {
                        collisionY = true
                        if (h + 8 > roofHeight) roofHeight = h + 8
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
        if (groupRef.current.position.y < 4) groupRef.current.position.y = 4
        if (groupRef.current.position.y > 1500) groupRef.current.position.y = 1500

        if (controls && (velocity.current.lengthSq() > 5.0 || !collisionX || !collisionZ)) {
            controls.target.lerp(groupRef.current.position, dt * 8.0)
            const motionZoom = velocity.current.lengthSq() * 0.0003
            const camDist = 100 + (speedMult - 1) * 30 + motionZoom
            const camHeight = 50 + (speedMult - 1) * 20 + Math.abs(velocity.current.y * 0.08)
            const desiredCamPos = groupRef.current.position.clone().add(
                new THREE.Vector3(-forward.x * camDist, camHeight, -forward.z * camDist)
            )
            camera.position.lerp(desiredCamPos, dt * 3.5)
            controls.update()
        }

        // Banking and pitch based on velocity - more responsive for speeder feel
        const bankAngleX = velocity.current.z * 0.018  // Pitch forward/back
        const bankAngleZ = -velocity.current.x * 0.022 // Roll left/right
        const yawAngle = Math.atan2(-velocity.current.x, -velocity.current.z)
        
        // Smooth rotation interpolation
        vehicleGroupRef.current.rotation.x = THREE.MathUtils.lerp(
            vehicleGroupRef.current.rotation.x, bankAngleX, dt * 5
        )
        vehicleGroupRef.current.rotation.z = THREE.MathUtils.lerp(
            vehicleGroupRef.current.rotation.z, bankAngleZ, dt * 5
        )
        
        // Yaw to face movement direction when moving
        if (velocity.current.lengthSq() > 100) {
            vehicleGroupRef.current.rotation.y = THREE.MathUtils.lerp(
                vehicleGroupRef.current.rotation.y, yawAngle, dt * 3
            )
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

    if (!ufoMode) return (
        <group ref={groupRef} position={[0, defaultSafeY, 0]}>
            {/* Ambient vehicle lighting for static display mode */}
            <pointLight distance={200} intensity={4.0} color="#00ffcc" position={[0, -3, 0]} />
            <pointLight distance={100} intensity={2.0} color="#ff00cc" position={[0, 3, 0]} />
            
            <Sparkles count={60} scale={[15, 8, 25]} position={[0, 0, -8]} size={4} speed={2} opacity={0.7} color="#00ffcc" />
            <group ref={vehicleGroupRef} scale={[1.5, 1.5, 1.5]}>
                <ClassicUfo velocity={velocity.current} />
            </group>
        </group>
    )

    return (
        <group ref={groupRef} position={[0, defaultSafeY, 0]}>
            {/* Ambient vehicle lighting */}
            <pointLight distance={200} intensity={4.0} color="#00ffcc" position={[0, -3, 0]} />
            <pointLight distance={100} intensity={2.0} color="#ff00cc" position={[0, 3, 0]} />
            
            {/* Engine trail sparkles */}
            <Sparkles 
                count={60} 
                scale={[15, 8, 25]} 
                position={[0, 0, -8]}
                size={4} 
                speed={2} 
                opacity={0.7} 
                color="#00ffcc" 
            />
            
            <group ref={vehicleGroupRef} scale={[1.5, 1.5, 1.5]}>
                <MinimalistDrone velocity={velocity.current} />
            </group>
        </group>
    )
}
