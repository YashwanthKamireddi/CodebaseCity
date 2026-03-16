import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * OrbitalSatellites — 80 high-orbit streaks representing external npm dependencies.
 *
 * Each satellite travels a unique orbital arc at altitude 1 800–3 000 units.
 * Colors are overdriven to feed Bloom. Throttled to 30fps.
 * Single InstancedMesh + ShaderMaterial — 1 draw call.
 */

const SATELLITE_VERT = /* glsl */ `
attribute float aPhase;
attribute float aSpeed;
uniform float uTime;
varying vec3 vColor;

void main() {
    // Hot colour based on orbital speed
    vec3 fast = vec3(0.8, 0.95, 1.0);
    vec3 slow = vec3(0.2, 0.40, 1.0);
    vColor = mix(slow, fast, aSpeed);

    gl_Position = projectionMatrix * viewMatrix * modelMatrix * instanceMatrix * vec4(position, 1.0);
}
`

const SATELLITE_FRAG = /* glsl */ `
uniform float uTime;
varying vec3 vColor;

void main() {
    // Overdrive intensity — Bloom handles the halo
    gl_FragColor = vec4(vColor * 3.5, 1.0);
}
`

const COUNT = 80

export default React.memo(function OrbitalSatellites() {
    const meshRef       = useRef()
    const dummy         = useMemo(() => new THREE.Object3D(), [])
    const orbitData     = useRef([])
    const lastUpdateRef = useRef(0)

    // Shared temp vectors — no per-frame allocation
    const _pos     = useMemo(() => new THREE.Vector3(), [])
    const _nextPos = useMemo(() => new THREE.Vector3(), [])

    useEffect(() => {
        if (!meshRef.current) return

        const phases = new Float32Array(COUNT)
        const speeds = new Float32Array(COUNT)
        const axes   = new Float32Array(COUNT * 3)
        const radii  = new Float32Array(COUNT)
        const data   = []

        for (let i = 0; i < COUNT; i++) {
            const radius = 1800 + Math.random() * 1200
            const axis   = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() + 0.5,
                Math.random() - 0.5,
            ).normalize()
            const angle = Math.random() * Math.PI * 2
            const speed = 0.02 + Math.random() * 0.08

            radii[i]          = radius
            axes[i * 3]       = axis.x
            axes[i * 3 + 1]   = axis.y
            axes[i * 3 + 2]   = axis.z
            speeds[i]         = speed
            phases[i]         = Math.random()

            data.push({ radius, axis, angle, speed })
        }

        orbitData.current = data

        meshRef.current.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
        meshRef.current.geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds,  1))
        meshRef.current.geometry.setAttribute('aOrbitAxis', new THREE.InstancedBufferAttribute(axes, 3))
        meshRef.current.geometry.setAttribute('aRadius', new THREE.InstancedBufferAttribute(radii,  1))
    }, [])

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader:   SATELLITE_VERT,
        fragmentShader: SATELLITE_FRAG,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
    }), [])

    useEffect(() => () => material.dispose(), [material])

    useFrame((state, delta) => {
        if (!meshRef.current) return
        const t = state.clock.elapsedTime
        if (t - lastUpdateRef.current < 0.033) return
        lastUpdateRef.current = t

        material.uniforms.uTime.value = t
        const data = orbitData.current
        if (data.length < COUNT) return

        for (let i = 0; i < COUNT; i++) {
            const sat = data[i]
            sat.angle += sat.speed * delta

            _pos.set(Math.cos(sat.angle) * sat.radius, 0, Math.sin(sat.angle) * sat.radius)
            _pos.applyAxisAngle(sat.axis, Math.PI / 4)

            dummy.position.copy(_pos)

            const nextAngle = sat.angle + 0.01
            _nextPos.set(Math.cos(nextAngle) * sat.radius, 0, Math.sin(nextAngle) * sat.radius)
            _nextPos.applyAxisAngle(sat.axis, Math.PI / 4)

            dummy.lookAt(_nextPos)
            dummy.scale.set(4, 4, 30 + sat.speed * 200)
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        }

        meshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, COUNT]} frustumCulled={false}>
            <sphereGeometry args={[1.5, 6, 6]} />
            <primitive object={material} attach="material" />
        </instancedMesh>
    )
})
