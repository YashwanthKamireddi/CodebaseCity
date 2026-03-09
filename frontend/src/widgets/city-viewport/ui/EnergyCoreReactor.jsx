import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyCoreReactor — Ground-level energy chamber at city origin.
 *
 * Design: A sunken reactor core embedded in the ground plane, like a power
 * plant at the heart of the city. Concentric containment rings surround a
 * bright core. An upward energy column rises from the chamber, feeding the
 * mothership's tractor beam above.
 *
 * Perf: 8 draw calls, ~3k verts, 20fps throttled useFrame.
 */

const CORE_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    vUv = uv;
    vNormal = normalize(normalMatrix * normal);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    vViewDir = normalize(cameraPosition - worldPos.xyz);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
    #include <logdepthbuf_vertex>
}
`

const CORE_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    fresnel = pow(fresnel, 2.0);

    float pulse = 0.85 + 0.15 * sin(uTime * 2.5);
    vec3 innerColor = vec3(0.8, 0.95, 1.0) * pulse;
    vec3 edgeColor = vec3(0.0, 0.5, 1.0);
    vec3 col = mix(innerColor, edgeColor, fresnel);

    // Energy crackling on surface
    float crack = fract(sin(dot(floor(vUv * 14.0), vec2(12.9898, 78.233))) * 43758.5453);
    float crackLine = step(0.93, fract(vUv.y * 10.0 - uTime * 0.6));
    col += vec3(0.15, 0.35, 0.55) * crackLine * crack;

    gl_FragColor = vec4(col, 1.0);
}
`

const COLUMN_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

const COLUMN_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    // Radial fade — bright core axis
    float dist = abs(vUv.x - 0.5) * 2.0;
    float radial = 1.0 - smoothstep(0.0, 1.0, dist);
    radial = pow(radial, 1.8);

    // Brighter at bottom (chamber), fading upward
    float fadeY = mix(0.7, 0.25, vUv.y);

    // Rising energy particles
    float s1 = fract(vUv.y * 18.0 + uTime * 1.0);
    float line1 = smoothstep(0.42, 0.5, s1) * smoothstep(0.58, 0.5, s1);
    float s2 = fract(vUv.y * 10.0 + uTime * 0.5 + 0.3);
    float line2 = smoothstep(0.44, 0.5, s2) * smoothstep(0.56, 0.5, s2);
    float energy = line1 * 0.45 + line2 * 0.3;

    float alpha = radial * fadeY * (0.1 + energy * 0.18);
    vec3 col = mix(vec3(0.0, 0.4, 0.85), vec3(0.4, 0.85, 1.0), radial * 0.6);

    gl_FragColor = vec4(col, alpha);
}
`

export default function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()
    const lastT = useRef(0)

    // Column height: rises above the tallest building so mothership can connect
    const columnHeight = useMemo(() => {
        if (!cityData?.buildings?.length) return 80
        let maxH = 0
        for (const b of cityData.buildings) {
            const h = (b.dimensions?.height || 8) * 3.0
            if (h > maxH) maxH = h
        }
        return Math.max(80, maxH + 50)
    }, [cityData])

    const coreMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: CORE_VERT,
        fragmentShader: CORE_FRAG,
    }), [])

    const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00ccee',
        emissive: '#0099cc',
        emissiveIntensity: 0.9,
        metalness: 0.9,
        roughness: 0.08,
    }), [])

    const chamberMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#0a1020',
        emissive: '#001830',
        emissiveIntensity: 0.3,
        metalness: 0.95,
        roughness: 0.15,
    }), [])

    const columnMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: COLUMN_VERT,
        fragmentShader: COLUMN_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), [])

    const columnGeo = useMemo(() => {
        return new THREE.CylinderGeometry(1.5, 4, columnHeight, 14, 10, true)
    }, [columnHeight])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        coreMat.uniforms.uTime.value = t
        columnMat.uniforms.uTime.value = t
        if (ring1.current) ring1.current.rotation.y = t * 0.35
        if (ring2.current) ring2.current.rotation.y = t * -0.25
        if (ring3.current) ring3.current.rotation.y = t * 0.15
    })

    if (!cityData?.buildings?.length) return null

    return (
        <group>
            {/* ── Ground-level chamber ── */}
            <group position={[0, 0.5, 0]}>
                {/* Core sphere — bright energy heart, half-sunken into ground */}
                <mesh position={[0, 3, 0]}>
                    <sphereGeometry args={[5, 22, 16]} />
                    <primitive object={coreMat} attach="material" />
                </mesh>

                {/* Inner containment ring — fast spin */}
                <mesh ref={ring1} position={[0, 3, 0]}>
                    <torusGeometry args={[9, 0.6, 8, 32]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* Mid containment ring — counter-rotate */}
                <mesh ref={ring2} position={[0, 3, 0]} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[13, 0.5, 8, 32]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* Outer containment ring — slow orbit */}
                <mesh ref={ring3} position={[0, 3, 0]} rotation={[Math.PI / 3, 0, 0]}>
                    <torusGeometry args={[18, 0.4, 8, 36]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* Chamber base platform — dark metallic disc */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.1, 0]}>
                    <ringGeometry args={[3, 25, 36]} />
                    <primitive object={chamberMat} attach="material" />
                </mesh>

                {/* Outer chamber ring — raised rim */}
                <mesh position={[0, 1.5, 0]}>
                    <torusGeometry args={[25, 1.2, 6, 36]} />
                    <primitive object={chamberMat} attach="material" />
                </mesh>

                {/* Ground glow disc — soft light pool */}
                <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.2, 0]}>
                    <circleGeometry args={[30, 32]} />
                    <meshBasicMaterial color="#003366" transparent opacity={0.08} depthWrite={false} />
                </mesh>
            </group>

            {/* ── Energy column — rises from chamber to feed mothership ── */}
            <mesh position={[0, columnHeight / 2 + 3, 0]} geometry={columnGeo}>
                <primitive object={columnMat} attach="material" />
            </mesh>
        </group>
    )
}
