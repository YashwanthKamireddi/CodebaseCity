import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * 🛰️ High-Orbit Satellites (Feature 2)
 *
 * Simulates extreme deep-space traffic representing external NPM dependencies.
 * Uses a single InstancedMesh floating at massive altitudes. The objects
 * travel in sweeping orbital arcs around the city.
 */

const SATELLITE_VERT = /* glsl */ `
attribute float aPhase;
attribute float aSpeed;
attribute vec3 aOrbitAxis;
attribute float aRadius;

varying float vPhase;
varying vec3 vColor;

void main() {
    vPhase = aPhase;

    // Assign a blazing hot color based on speed (fast = white/cyan, slow = deep blue/magenta)
    vec3 fastColor = vec3(0.8, 0.95, 1.0);
    vec3 slowColor = vec3(0.2, 0.4, 1.0);
    vColor = mix(slowColor, fastColor, aSpeed);

    vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const SATELLITE_FRAG = /* glsl */ `
uniform float uTime;
varying float vPhase;
varying vec3 vColor;

void main() {
    // Intense pulsing
    float pulse = 0.5 + 0.5 * sin(uTime * 5.0 + vPhase * 6.28);
    // Overdrive the color for massive bloom
    vec3 finalColor = vColor * (2.0 + pulse * 5.0);

    // Simple spherical fade for the dots (so they don't look like sharp squares)
    vec2 c = gl_PointCoord - 0.5;
    float r = length(c);
    float alpha = exp(-r * r * 10.0);

    gl_FragColor = vec4(finalColor, 1.0); // Keep alpha 1.0, let bloom handle the glow
}
`

export default function OrbitalSatellites() {
    const meshRef = useRef()
    const dummy = useMemo(() => new THREE.Object3D(), [])
    const orbitData = useRef([])

    // Count is proportional to city size, max 200 satellites so it doesn't look cluttered
    const count = 150

    useEffect(() => {
        if (!meshRef.current) return

        const phases = new Float32Array(count)
        const speeds = new Float32Array(count)
        const axes = new Float32Array(count * 3)
        const radii = new Float32Array(count)

        const data = []

        for (let i = 0; i < count; i++) {
            // Random orbit radius (extreme far frustum)
            const radius = 1800 + Math.random() * 1200

            // Random orbital axis (some steep, some flat)
            const axis = new THREE.Vector3(
                Math.random() - 0.5,
                Math.random() + 0.5, // Bias towards horizontal orbits
                Math.random() - 0.5
            ).normalize()

            // Random initial angle
            const angle = Math.random() * Math.PI * 2

            // Speed of orbit
            const speed = 0.02 + Math.random() * 0.08

            radii[i] = radius
            axes[i * 3 + 0] = axis.x
            axes[i * 3 + 1] = axis.y
            axes[i * 3 + 2] = axis.z
            speeds[i] = speed
            phases[i] = Math.random()

            data.push({ radius, axis, angle, speed })
        }

        orbitData.current = data

        meshRef.current.geometry.setAttribute('aPhase', new THREE.InstancedBufferAttribute(phases, 1))
        meshRef.current.geometry.setAttribute('aSpeed', new THREE.InstancedBufferAttribute(speeds, 1))
        meshRef.current.geometry.setAttribute('aOrbitAxis', new THREE.InstancedBufferAttribute(axes, 3))
        meshRef.current.geometry.setAttribute('aRadius', new THREE.InstancedBufferAttribute(radii, 1))

    }, [count])

    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: SATELLITE_VERT,
        fragmentShader: SATELLITE_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame((state, delta) => {
        if (!meshRef.current) return
        material.uniforms.uTime.value = state.clock.elapsedTime

        const data = orbitData.current

        for (let i = 0; i < count; i++) {
            const sat = data[i]

            // Increment orbital angle
            sat.angle += sat.speed * delta

            // Calculate 3D position along its specific orbital axis
            // Start with a point on the equator
            let pos = new THREE.Vector3(Math.cos(sat.angle) * sat.radius, 0, Math.sin(sat.angle) * sat.radius)
            // Rotate it to match the custom orbital plane
            pos.applyAxisAngle(sat.axis, Math.PI / 4) // Adds some tilt variance

            dummy.position.copy(pos)

            // Stretching the scale in the direction of motion to create a "streak" or "tail" effect
            // We use lookAt to orient the dummy toward its next position
            const nextAngle = sat.angle + 0.01
            let nextPos = new THREE.Vector3(Math.cos(nextAngle) * sat.radius, 0, Math.sin(nextAngle) * sat.radius)
            nextPos.applyAxisAngle(sat.axis, Math.PI / 4)

            dummy.lookAt(nextPos)
            dummy.scale.set(4, 4, 30 + sat.speed * 200) // Huge Z-scale creates a laser streak

            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        }
        meshRef.current.instanceMatrix.needsUpdate = true
    })

    useEffect(() => () => material.dispose(), [material])

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false} raycast={() => null}>
            <boxGeometry args={[1, 1, 1]} />
            <primitive object={material} attach="material" />
        </instancedMesh>
    )
}
