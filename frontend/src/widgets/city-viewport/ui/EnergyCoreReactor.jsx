import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyCoreReactor — Elevated energy nexus floating ABOVE all buildings.
 *
 * Design: A radiant reactor core hovering at the peak of the city, clearly
 * visible from all angles. Triple gyroscope rings orbit a bright central orb.
 * An energy column extends downward to the ground, anchoring it to the city.
 *
 * Perf: 7 draw calls, ~3k verts, 20fps throttled useFrame.
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
    // Intense emissive core — bright cyan/white center
    float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    fresnel = pow(fresnel, 2.5);

    // Pulsing glow
    float pulse = 0.85 + 0.15 * sin(uTime * 2.0);

    vec3 innerColor = vec3(0.7, 0.95, 1.0) * pulse;  // near-white hot center
    vec3 edgeColor = vec3(0.0, 0.5, 1.0);             // blue rim
    vec3 col = mix(innerColor, edgeColor, fresnel);

    // Surface energy crackling
    float crack = fract(sin(dot(floor(vUv * 16.0), vec2(12.9898, 78.233))) * 43758.5453);
    float crackLine = step(0.92, fract(vUv.y * 12.0 - uTime * 0.5));
    col += vec3(0.1, 0.3, 0.5) * crackLine * crack;

    gl_FragColor = vec4(col, 1.0);
}
`

const PILLAR_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
void main() {
    vUv = uv;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

const PILLAR_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    // Radial fade from center axis
    float dist = abs(vUv.x - 0.5) * 2.0;
    float radial = 1.0 - smoothstep(0.0, 1.0, dist);
    radial = pow(radial, 1.5);

    // Vertical: bright at top (reactor), fading to ground
    float fadeY = pow(1.0 - vUv.y, 2.0) * 0.6 + 0.4;

    // Scrolling energy particles rising upward
    float scroll1 = fract(vUv.y * 15.0 + uTime * 0.8);
    float lines1 = smoothstep(0.4, 0.5, scroll1) * smoothstep(0.6, 0.5, scroll1);

    float scroll2 = fract(vUv.y * 8.0 + uTime * 0.4 + 0.3);
    float lines2 = smoothstep(0.42, 0.5, scroll2) * smoothstep(0.58, 0.5, scroll2);

    float energy = lines1 * 0.5 + lines2 * 0.3;

    float alpha = radial * fadeY * (0.08 + energy * 0.15);
    vec3 col = mix(vec3(0.0, 0.4, 0.8), vec3(0.3, 0.8, 1.0), radial * fadeY);

    gl_FragColor = vec4(col, alpha);
}
`

export default function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()
    const lastT = useRef(0)

    // Compute height: reactor floats above the tallest building
    const reactorY = useMemo(() => {
        if (!cityData?.buildings?.length) return 60
        let maxH = 0
        for (const b of cityData.buildings) {
            const h = (b.dimensions?.height || b.metrics?.loc || 8) * 3.0
            if (h > maxH) maxH = h
        }
        return Math.max(60, maxH + 35)
    }, [cityData])

    const coreMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: CORE_VERT,
        fragmentShader: CORE_FRAG,
    }), [])

    const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00bbee',
        emissive: '#0088cc',
        emissiveIntensity: 0.8,
        metalness: 0.9,
        roughness: 0.1,
    }), [])

    const pillarMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: PILLAR_VERT,
        fragmentShader: PILLAR_FRAG,
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), [])

    const pillarGeo = useMemo(() => {
        // Pillar from ground (y=0) up to reactor — tapers wider at base
        return new THREE.CylinderGeometry(2, 5, reactorY, 12, 8, true)
    }, [reactorY])

    const glowMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#0066aa',
        transparent: true,
        opacity: 0.12,
        depthWrite: false,
        side: THREE.DoubleSide,
    }), [])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        coreMat.uniforms.uTime.value = t
        pillarMat.uniforms.uTime.value = t
        if (ring1.current) ring1.current.rotation.z = t * 0.3
        if (ring2.current) ring2.current.rotation.x = t * -0.22
        if (ring3.current) {
            ring3.current.rotation.y = t * 0.15
            ring3.current.rotation.z = t * 0.1
        }
    })

    if (!cityData?.buildings?.length) return null

    return (
        <group>
            {/* Reactor core — floating above all buildings */}
            <group position={[0, reactorY, 0]}>
                {/* Central glowing orb */}
                <mesh>
                    <sphereGeometry args={[8, 24, 18]} />
                    <primitive object={coreMat} attach="material" />
                </mesh>

                {/* Inner ring — fast spin */}
                <mesh ref={ring1}>
                    <torusGeometry args={[14, 1.0, 10, 32]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* Mid ring — tilted */}
                <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
                    <torusGeometry args={[20, 0.7, 10, 32]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* Outer ring — slow orbit */}
                <mesh ref={ring3} rotation={[Math.PI / 5, Math.PI / 3, 0]}>
                    <torusGeometry args={[27, 0.5, 8, 32]} />
                    <primitive object={ringMat} attach="material" />
                </mesh>

                {/* Glow sphere — soft halo around reactor */}
                <mesh>
                    <sphereGeometry args={[18, 16, 12]} />
                    <primitive object={glowMat} attach="material" />
                </mesh>
            </group>

            {/* Energy pillar — transparent column anchoring reactor to ground */}
            <mesh position={[0, reactorY / 2, 0]} geometry={pillarGeo}>
                <primitive object={pillarMat} attach="material" />
            </mesh>

            {/* Ground anchor glow ring */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.3, 0]}>
                <ringGeometry args={[2, 18, 32]} />
                <meshBasicMaterial color="#0077bb" transparent opacity={0.1} depthWrite={false} />
            </mesh>
        </group>
    )
}
