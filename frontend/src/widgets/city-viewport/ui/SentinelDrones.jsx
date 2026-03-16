import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * SentinelDrones — 30 autonomous quadcopters sweeping the city.
 *
 * Simulates a security sweep at 150-250 unit altitude.
 * 4 synced InstancedMeshes: body + two arms + scanning cone.
 * Each drone banks, tilts forward, and hovers with subtle wobble.
 * Cone shader is deliberately overdriven for Bloom glow.
 * Throttled to 30fps.
 */

const CONE_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`

const CONE_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;

void main() {
    float scanline   = sin(vUv.y * 50.0 - uTime * 15.0) * 0.5 + 0.5;
    float heightAlpha = pow(1.0 - vUv.y, 2.0);
    float edgeAlpha   = sin(vUv.x * 3.14159);

    vec3  color = vec3(0.0, 0.8, 1.0);
    float alpha = heightAlpha * edgeAlpha * (0.2 + scanline * 0.15);

    if (alpha <= 0.02) discard;
    gl_FragColor = vec4(color * 2.5, alpha);
}
`

const COUNT = 30

export default React.memo(function SentinelDrones() {
    const bodyMeshRef = useRef()
    const arm1MeshRef = useRef()
    const arm2MeshRef = useRef()
    const coneMeshRef = useRef()
    const cityData    = useStore(s => s.cityData)

    const dummy     = useMemo(() => new THREE.Object3D(), [])
    const dummyCone = useMemo(() => new THREE.Object3D(), [])
    const flightData = useRef([])
    const lastDroneUpdate = useRef(0)

    // Initialise flight paths when city changes
    useEffect(() => {
        if (!bodyMeshRef.current || !coneMeshRef.current) return

        const data = []
        const rMax = 400

        for (let i = 0; i < COUNT; i++) {
            data.push({
                angle:       Math.random() * Math.PI * 2,
                radius:      20 + Math.random() * rMax,
                baseY:       150 + Math.random() * 100,
                speed:       (0.1 + Math.random() * 0.3) * (Math.random() > 0.5 ? 1 : -1),
                hoverPhase:  Math.random() * Math.PI * 2,
                wobblePhase: Math.random() * Math.PI * 2,
            })
        }
        flightData.current = data
    }, [cityData])

    const bodyMaterial = useMemo(() => new THREE.MeshStandardMaterial({
        color:            '#1a1f2e',
        roughness:        0.3,
        metalness:        0.8,
        emissive:         '#00f0ff',
        emissiveIntensity: 0.35,
        toneMapped:       false,
    }), [])

    const coneMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms:       { uTime: { value: 0 } },
        vertexShader:   CONE_VERT,
        fragmentShader: CONE_FRAG,
        transparent:    true,
        depthWrite:     false,
        side:           THREE.DoubleSide,
        blending:       THREE.AdditiveBlending,
    }), [])

    useEffect(() => () => {
        bodyMaterial.dispose()
        coneMaterial.dispose()
    }, [bodyMaterial, coneMaterial])

    useFrame((state, delta) => {
        if (!bodyMeshRef.current || !coneMeshRef.current) return
        const data = flightData.current
        if (!data.length) return
        const t = state.clock.elapsedTime
        if (t - lastDroneUpdate.current < 0.033) return
        lastDroneUpdate.current = t

        coneMaterial.uniforms.uTime.value = t

        const count = data.length
        for (let i = 0; i < count; i++) {
            const d = data[i]
            d.angle += d.speed * delta

            const x  = Math.cos(d.angle) * d.radius
            const z  = Math.sin(d.angle) * d.radius
            const y  = d.baseY + Math.sin(t * 2.0 + d.hoverPhase) * 5.0

            const nx = Math.cos(d.angle + 0.1 * Math.sign(d.speed)) * d.radius
            const nz = Math.sin(d.angle + 0.1 * Math.sign(d.speed)) * d.radius

            // Body
            dummy.position.set(x, y, z)
            dummy.lookAt(nx, y, nz)
            dummy.rotateZ(Math.sin(t * 5.0 + d.wobblePhase) * 0.15)
            dummy.rotateX(0.25 * Math.sign(d.speed))
            dummy.updateMatrix()
            bodyMeshRef.current.setMatrixAt(i, dummy.matrix)

            // Arms (body rotated 45° and 135°)
            dummy.rotateY(Math.PI / 4)
            dummy.updateMatrix()
            arm1MeshRef.current.setMatrixAt(i, dummy.matrix)

            dummy.rotateY(Math.PI / 2)
            dummy.updateMatrix()
            arm2MeshRef.current.setMatrixAt(i, dummy.matrix)

            // Scanning cone below body
            dummyCone.position.set(x, y - 15, z)
            dummyCone.scale.set(8, 30, 8)
            dummyCone.updateMatrix()
            coneMeshRef.current.setMatrixAt(i, dummyCone.matrix)
        }

        bodyMeshRef.current.instanceMatrix.needsUpdate = true
        arm1MeshRef.current.instanceMatrix.needsUpdate  = true
        arm2MeshRef.current.instanceMatrix.needsUpdate  = true
        coneMeshRef.current.instanceMatrix.needsUpdate  = true
    })

    if (!cityData?.buildings?.length) return null

    return (
        <group>
            {/* Body */}
            <instancedMesh ref={bodyMeshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
                <cylinderGeometry args={[3, 3, 1.2, 6]} />
                <primitive object={bodyMaterial} attach="material" />
            </instancedMesh>

            {/* Arm 1 */}
            <instancedMesh ref={arm1MeshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
                <boxGeometry args={[8, 0.6, 1.2]} />
                <primitive object={bodyMaterial} attach="material" />
            </instancedMesh>

            {/* Arm 2 */}
            <instancedMesh ref={arm2MeshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
                <boxGeometry args={[8, 0.6, 1.2]} />
                <primitive object={bodyMaterial} attach="material" />
            </instancedMesh>

            {/* Scanning cone */}
            <instancedMesh ref={coneMeshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
                <coneGeometry args={[1, 1, 8, 1, true]} />
                <primitive object={coneMaterial} attach="material" />
            </instancedMesh>
        </group>
    )
})
