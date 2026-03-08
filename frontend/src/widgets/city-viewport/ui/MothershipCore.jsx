import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * 🛸 The "Mothership" Data Core (Refined Elegant Design)
 *
 * Placed at a 'goldilocks' altitude (600) so it frames the city beautifully
 * without blocking tall buildings. Uses smooth, interlocking torus geometries
 * instead of blocky shapes for a true AAA sci-fi feel.
 */

const BEAM_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldPosition;
void main() {
    vUv = uv;
    vec4 worldPosition = modelMatrix * vec4(position, 1.0);
    vWorldPosition = worldPosition.xyz;
    gl_Position = projectionMatrix * viewMatrix * worldPosition;
}
`

const BEAM_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vWorldPosition;

void main() {
    // Subtle, ethereal downward flow rather than aggressive scanlines
    float flow = fract(vUv.y * 3.0 - uTime * 0.5);
    float softPulse = smoothstep(0.4, 0.6, flow);

    // Core is solid, edges fade out softly (Gaussian curve approximation)
    float edgeAlpha = exp(-pow(vUv.x * 2.0 - 1.0, 2.0) * 4.0);

    // Fade out smoothly at the bottom and top
    float heightFade = smoothstep(0.0, 0.3, vUv.y) * smoothstep(1.0, 0.7, vUv.y);

    // Deep Cyan Color, less aggressive
    vec3 color = vec3(0.0, 0.6, 1.0) * (1.5 + softPulse * 1.0);
    float alpha = edgeAlpha * heightFade * 0.15 * (0.8 + softPulse * 0.2);

    if (alpha <= 0.01) discard;

    gl_FragColor = vec4(color, alpha);
}
`

const HULL_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vNormal;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const HULL_FRAG = /* glsl */ `
uniform float uTime;
varying vec2 vUv;
varying vec3 vNormal;

void main() {
    // Sleek dark metallic surface
    vec3 baseColor = vec3(0.08, 0.09, 0.12);

    // Smooth rim lighting for volume
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = smoothstep(0.5, 1.0, rim);
    baseColor += vec3(0.2, 0.3, 0.4) * rim;

    // Elegant, thin glowing trim lines
    float trimLine = step(0.95, fract(vUv.y * 20.0));
    float pulse = 0.8 + 0.2 * sin(uTime * 1.5 + vUv.x * 10.0);
    vec3 trimColor = vec3(0.0, 0.8, 1.0) * trimLine * pulse * 3.0;

    gl_FragColor = vec4(baseColor + trimColor, 1.0);
}
`

export default function MothershipCore() {
    const groupRef = useRef()
    const outerRingRef = useRef()
    const middleRingRef = useRef()
    const innerRingRef = useRef()
    const beamRef = useRef()

    // Goldilocks placement: High enough to clear towers, low enough to be imposing
    const altitude = 600;

    const beamMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
    }), [])

    const hullMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: HULL_VERT,
        fragmentShader: HULL_FRAG,
        wireframe: false,
    }), [])

    const coreMaterial = useMemo(() => new THREE.MeshBasicMaterial({
        color: new THREE.Color('#00ccff'),
    }), [])

    useFrame((state, delta) => {
        const time = state.clock.elapsedTime

        beamMaterial.uniforms.uTime.value = time
        hullMaterial.uniforms.uTime.value = time

        // Elegant, complex counter-rotations
        if (outerRingRef.current) outerRingRef.current.rotation.y += delta * 0.08
        if (middleRingRef.current) middleRingRef.current.rotation.y -= delta * 0.15
        if (innerRingRef.current) {
            innerRingRef.current.rotation.y += delta * 0.25
            innerRingRef.current.rotation.x = Math.sin(time * 0.5) * 0.1 // Subtle gimbal tilt
        }

        // Very slow, majestic bobbing
        if (groupRef.current) {
            groupRef.current.position.y = altitude + Math.sin(time * 0.2) * 15.0
        }
    })

    return (
        // Scale 0.5 to keep it massive but refined
        <group ref={groupRef} position={[0, altitude, 0]} scale={[0.5, 0.5, 0.5]}>

            {/* The Ethereal Tractor Beam */}
            <mesh ref={beamRef} position={[0, -altitude / 2, 0]}>
                <cylinderGeometry args={[15, 60, altitude, 32, 1, true]} />
                <primitive object={beamMaterial} attach="material" />
            </mesh>

            {/* Central Energy Core Sphere */}
            <mesh position={[0, -5, 0]}>
                <sphereGeometry args={[25, 32, 32]} />
                <primitive object={coreMaterial} attach="material" />
            </mesh>

            {/* Inner Gimbal Ring (Fastest) */}
            <mesh ref={innerRingRef} position={[0, 0, 0]}>
                <torusGeometry args={[50, 6, 16, 64]} />
                <primitive object={hullMaterial} attach="material" />
            </mesh>

            {/* Middle Structural Ring (Counter-rotating) */}
            <mesh ref={middleRingRef} position={[0, 0, 0]}>
                <cylinderGeometry args={[90, 80, 15, 64]} />
                <primitive object={hullMaterial} attach="material" />
            </mesh>

            {/* Massive Outer Halo Ring (Slowest) */}
            <mesh ref={outerRingRef} position={[0, 0, 0]}>
                <torusGeometry args={[130, 10, 32, 128]} />
                <primitive object={hullMaterial} attach="material" />

                {/* Refined Connectors instead of big blocky boxes */}
                {[...Array(6)].map((_, i) => {
                    const angle = (i / 6) * Math.PI * 2;
                    const r = 110;
                    return (
                        <mesh
                            key={i}
                            position={[Math.cos(angle) * r, 0, Math.sin(angle) * r]}
                            rotation={[Math.PI / 2, 0, -angle]}
                        >
                            <cylinderGeometry args={[3, 3, 40, 16]} />
                            <primitive object={hullMaterial} attach="material" />
                        </mesh>
                    )
                })}
            </mesh>

            {/* Top Communications Dome (Thinner, sleeker) */}
            <mesh position={[0, 10, 0]}>
                <sphereGeometry args={[80, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2]} />
                <primitive object={hullMaterial} attach="material" />

                {/* Thin Antenna Spire */}
                <mesh position={[0, 100, 0]}>
                    <cylinderGeometry args={[1, 5, 120, 16]} />
                    <primitive object={hullMaterial} attach="material" />
                </mesh>
            </mesh>

        </group>
    )
}
