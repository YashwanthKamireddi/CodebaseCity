import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * 🚁 Autonomous Sentinel Drones (Feature 4 - Redesign)
 *
 * Simulates a security sweep of the metropolis.
 * Uses 4 synced InstancedMeshes (zero overhead) to build actual quadcopters:
 * 1. Body (Cylinder, flattened)
 * 2. Arm 1 (Diagonal Box)
 * 3. Arm 2 (Diagonal Box)
 * 4. Volumetric Scanning Cone
 */

const CONE_VERT = /* glsl */ `
varying vec2 vUv;
varying float vDepth;
void main() {
    vUv = uv;
    vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    vDepth = -mvPosition.z;
}
`

const CONE_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying float vDepth;

void main() {
    float scanline = sin(vUv.y * 50.0 - uTime * 15.0) * 0.5 + 0.5;
    float heightAlpha = 1.0 - vUv.y;
    heightAlpha = pow(heightAlpha, 2.0);
    float edgeAlpha = sin(vUv.x * 3.14159);

    vec3 color = vec3(0.0, 0.8, 1.0);
    float alpha = heightAlpha * edgeAlpha * (0.2 + scanline * 0.15);

    if (alpha <= 0.02) discard;
    gl_FragColor = vec4(color * 2.0, alpha);
}
`

export default function SentinelDrones() {
    const bodyMeshRef = useRef()
    const arm1MeshRef = useRef()
    const arm2MeshRef = useRef()
    const coneMeshRef = useRef()
    const cityData = useStore(s => s.cityData)

    const count = 50
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const dummyCone = useMemo(() => new THREE.Object3D(), [])
    const flightData = useRef([])

    useEffect(() => {
        if (!bodyMeshRef.current || !coneMeshRef.current) return

        const data = []
        const rMax = 400

        for (let i = 0; i < count; i++) {
            const angle = Math.random() * Math.PI * 2
            const radius = 20 + Math.random() * rMax
            // High altitude patrolling
            const y = 150 + Math.random() * 100

            const speed = (0.1 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1)

            data.push({
                angle,
                radius,
                baseY: y,
                speed,
                hoverPhase: Math.random() * Math.PI * 2,
                wobblePhase: Math.random() * Math.PI * 2
            })
        }

        flightData.current = data
    }, [cityData])

    // Body Material
    const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#1a1f2e',
        roughness: 0.3,
        metalness: 0.8,
        emissive: '#00f0ff',
        emissiveIntensity: 0.3
    }), [])

    const coneMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: CONE_VERT,
        fragmentShader: CONE_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame((state, delta) => {
        if (!bodyMeshRef.current || !coneMeshRef.current) return
        coneMaterial.uniforms.uTime.value = state.clock.elapsedTime

        const time = state.clock.elapsedTime
        const data = flightData.current

        for (let i = 0; i < count; i++) {
            const drone = data[i]

            drone.angle += drone.speed * delta

            const x = Math.cos(drone.angle) * drone.radius
            const z = Math.sin(drone.angle) * drone.radius
            const y = drone.baseY + Math.sin(time * 2.0 + drone.hoverPhase) * 5.0

            const nextAngle = drone.angle + 0.1 * Math.sign(drone.speed)
            const nx = Math.cos(nextAngle) * drone.radius
            const nz = Math.sin(nextAngle) * drone.radius

            // --- 1. Base Quadcopter Dummy ---
            dummy.position.set(x, y, z)
            dummy.lookAt(nx, y, nz) // Point forward

            // Wobble/Tilt
            dummy.rotateZ(Math.sin(time * 5.0 + drone.wobblePhase) * 0.15) // Bank
            dummy.rotateX(0.25 * Math.sign(drone.speed)) // Aggressive tilt forward into the flight

            dummy.updateMatrix()
            // Body is a cylinder standing up, we want it flat like a puck
            const puckMatrix = dummy.matrix.clone()

            bodyMeshRef.current.setMatrixAt(i, puckMatrix)

            // --- 2. X-Wings (Arms) ---
            dummy.rotateY(Math.PI / 4) // Rotate 45 deg
            dummy.updateMatrix()
            arm1MeshRef.current.setMatrixAt(i, dummy.matrix)

            dummy.rotateY(Math.PI / 2) // Rotate another 90 deg (135 total)
            dummy.updateMatrix()
            arm2MeshRef.current.setMatrixAt(i, dummy.matrix)

            // Undo rotations for the cone
            dummy.rotateY(- (3 * Math.PI) / 4)
            dummy.rotateX(-0.25 * Math.sign(drone.speed))

            // --- 3. Scanning Cone ---
            const coneHeight = (y - 0.5) * 1.5 // stretch visual
            dummyCone.position.set(x, y - (coneHeight / 2), z)
            dummyCone.rotation.set(0, 0, 0) // Always point straight down
            dummyCone.scale.set(1, coneHeight, 1)
            dummyCone.updateMatrix()
            coneMeshRef.current.setMatrixAt(i, dummyCone.matrix)
        }

        bodyMeshRef.current.instanceMatrix.needsUpdate = true
        arm1MeshRef.current.instanceMatrix.needsUpdate = true
        arm2MeshRef.current.instanceMatrix.needsUpdate = true
        coneMeshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <group>
            {/* Drone Component 1: Central Body Puck */}
            <instancedMesh ref={bodyMeshRef} args={[null, null, count]} raycast={() => null}>
                <cylinderGeometry args={[2, 2, 0.8, 8]} />
                <primitive object={bodyMaterial} attach="material" />
            </instancedMesh>

            {/* Drone Component 2: Arm Diagonal 1 */}
            <instancedMesh ref={arm1MeshRef} args={[null, null, count]} raycast={() => null}>
                <boxGeometry args={[8, 0.3, 0.6]} />
                <primitive object={bodyMaterial} attach="material" />
            </instancedMesh>

            {/* Drone Component 3: Arm Diagonal 2 */}
            <instancedMesh ref={arm2MeshRef} args={[null, null, count]} raycast={() => null}>
                <boxGeometry args={[8, 0.3, 0.6]} />
                <primitive object={bodyMaterial} attach="material" />
            </instancedMesh>

            {/* Scanning Cones */}
            <instancedMesh ref={coneMeshRef} args={[null, null, count]} raycast={() => null} frustumCulled={false}>
                <cylinderGeometry args={[0.01, 20.0, 1.0, 16, 1, true]} />
                <primitive object={coneMaterial} attach="material" />
            </instancedMesh>
        </group>
    )
}
