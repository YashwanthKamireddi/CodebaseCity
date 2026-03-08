import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * MothershipCore — Massive hovering saucer with rotating ring + tractor beam.
 *
 * Perf budget: 6 draw calls, ~3200 verts, 2 shared materials, 20fps useFrame.
 * - Disc hull (flattened sphere) — dark metallic body
 * - Bridge dome on top — glowing core
 * - Outer rotating ring (torus)
 * - Inner accent ring (torus)
 * - Tractor beam (cylinder, transparent, tapers down)
 * - Beam ground glow (flat ring on y=0.2)
 */

const HULL_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vNormal;
varying vec2 vUv;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

const HULL_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec3 vNormal;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    vec3 base = vec3(0.04, 0.06, 0.10);
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(smoothstep(0.35, 1.0, rim), 2.0);
    base += vec3(0.08, 0.18, 0.35) * rim;
    // Horizontal panel lines
    float panel = step(0.92, fract(vUv.y * 20.0));
    base += vec3(0.0, 0.4, 0.8) * panel * 0.5;
    // Subtle vertical seams
    float seam = step(0.96, fract(vUv.x * 12.0));
    base += vec3(0.0, 0.25, 0.5) * seam * 0.3;
    gl_FragColor = vec4(base, 1.0);
}
`

const BEAM_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

const BEAM_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    // Fade: strong at top (ship), fading toward ground
    float fadeY = pow(1.0 - vUv.y, 1.5);
    // Radial fade from center
    float dist = abs(vUv.x - 0.5) * 2.0;
    float radial = 1.0 - smoothstep(0.0, 1.0, dist);
    // Scrolling energy lines
    float scroll = fract(vUv.y * 8.0 - uTime * 0.6);
    float lines = smoothstep(0.4, 0.5, scroll) * smoothstep(0.6, 0.5, scroll);
    float alpha = fadeY * radial * (0.12 + lines * 0.08);
    vec3 col = mix(vec3(0.0, 0.5, 0.9), vec3(0.0, 0.8, 1.0), radial);
    gl_FragColor = vec4(col, alpha);
}
`

export default function MothershipCore() {
    const ringOuter = useRef()
    const ringInner = useRef()
    const lastT = useRef(0)

    const altitude = 400

    const hullMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: HULL_VERT,
        fragmentShader: HULL_FRAG,
    }), [])

    const beamMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: BEAM_VERT,
        fragmentShader: BEAM_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), [])

    const bridgeMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#004488',
        emissive: '#003366',
        emissiveIntensity: 0.6,
        metalness: 0.9,
        roughness: 0.2,
    }), [])

    const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00aadd',
        emissive: '#005577',
        emissiveIntensity: 0.5,
        metalness: 0.8,
        roughness: 0.3,
    }), [])

    // Beam cylinder geometry — tapers from radius 18 (ship) to 35 (ground)
    const beamGeo = useMemo(() => {
        const geo = new THREE.CylinderGeometry(35, 18, altitude, 16, 8, true)
        return geo
    }, [altitude])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        hullMat.uniforms.uTime.value = t
        beamMat.uniforms.uTime.value = t
        if (ringOuter.current) ringOuter.current.rotation.y = t * 0.06
        if (ringInner.current) ringInner.current.rotation.y = t * -0.1
    })

    return (
        <group>
            {/* Ship body at altitude */}
            <group position={[0, altitude, 0]}>
                {/* Main disc hull — flattened sphere */}
                <mesh scale={[1, 0.18, 1]}>
                    <sphereGeometry args={[50, 24, 16]} />
                    <primitive object={hullMat} attach="material" />
                </mesh>

                {/* Bridge dome on top */}
                <mesh position={[0, 8, 0]}>
                    <sphereGeometry args={[14, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <primitive object={bridgeMat} attach="material" />
                </mesh>

                {/* Outer rotating ring */}
                <mesh ref={ringOuter}>
                    <torusGeometry args={[58, 3, 8, 36]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>

                {/* Inner accent ring */}
                <mesh ref={ringInner} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[38, 1.5, 6, 28]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>
            </group>

            {/* Tractor beam — transparent cylinder from ship to ground */}
            <mesh position={[0, altitude / 2, 0]} geometry={beamGeo}>
                <primitive object={beamMat} attach="material" />
            </mesh>

            {/* Ground glow ring under beam */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
                <ringGeometry args={[8, 40, 32]} />
                <meshBasicMaterial
                    color="#004466"
                    transparent
                    opacity={0.15}
                    depthWrite={false}
                />
            </mesh>
        </group>
    )
}
