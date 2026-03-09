import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * MothershipCore — Massive orbiting saucer that extracts energy from the reactor.
 *
 * Design: A dramatic mother-ship hovering high above the city with a vivid
 * tractor beam connecting down to the reactor core. The beam is bright,
 * volumetric-looking, and pulsing with energy flow.
 *
 * Perf: 8 draw calls, ~3.5k verts, 20fps throttled useFrame.
 */

const HULL_VERT = /* glsl */ `
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

const HULL_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec3 vNormal;
varying vec3 vViewDir;
varying vec2 vUv;
void main() {
    #include <logdepthbuf_fragment>
    // Dark metallic hull with strong rim lighting
    vec3 base = vec3(0.06, 0.08, 0.14);

    // Fresnel rim — blue glow on silhouette edges
    float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
    fresnel = pow(smoothstep(0.2, 1.0, fresnel), 2.5);
    base += vec3(0.05, 0.2, 0.5) * fresnel;

    // Hull panel lines — horizontal
    float panel = step(0.93, fract(vUv.y * 24.0));
    base += vec3(0.0, 0.35, 0.7) * panel * 0.4;

    // Vertical seam accents
    float seam = step(0.96, fract(vUv.x * 16.0));
    base += vec3(0.0, 0.2, 0.45) * seam * 0.25;

    // Running lights — subtle dots along equator
    float equator = smoothstep(0.48, 0.5, vUv.y) * smoothstep(0.52, 0.5, vUv.y);
    float lights = step(0.9, fract(vUv.x * 32.0 + uTime * 0.3));
    base += vec3(0.1, 0.6, 1.0) * equator * lights * 0.6;

    // Top vs bottom face shading
    float topFace = max(vNormal.y, 0.0);
    base += vec3(0.02, 0.04, 0.08) * topFace;

    gl_FragColor = vec4(base, 1.0);
}
`

const BEAM_VERT = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_vertex>
varying vec2 vUv;
varying float vHeight;
void main() {
    vUv = uv;
    vHeight = position.y;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
    #include <logdepthbuf_vertex>
}
`

const BEAM_FRAG = /* glsl */ `
#include <common>
#include <logdepthbuf_pars_fragment>
uniform float uTime;
varying vec2 vUv;
varying float vHeight;
void main() {
    #include <logdepthbuf_fragment>

    // Radial fade — bright core, soft edges
    float dist = abs(vUv.x - 0.5) * 2.0;
    float innerCore = 1.0 - smoothstep(0.0, 0.15, dist);
    float outerGlow = 1.0 - smoothstep(0.0, 1.0, dist);
    outerGlow = pow(outerGlow, 2.0);

    // Vertical fade — bright at both ends (ship + reactor), slight dip in middle
    float midFade = 1.0 - 0.3 * smoothstep(0.0, 0.5, abs(vUv.y - 0.5) * 2.0);

    // Multiple scrolling energy layers (downward toward reactor)
    float s1 = fract(vUv.y * 20.0 - uTime * 1.2);
    float line1 = smoothstep(0.42, 0.5, s1) * smoothstep(0.58, 0.5, s1);

    float s2 = fract(vUv.y * 12.0 - uTime * 0.7 + 0.5);
    float line2 = smoothstep(0.4, 0.5, s2) * smoothstep(0.6, 0.5, s2);

    float s3 = fract(vUv.y * 30.0 - uTime * 2.0 + 0.2);
    float line3 = smoothstep(0.44, 0.5, s3) * smoothstep(0.56, 0.5, s3);

    float energy = line1 * 0.4 + line2 * 0.3 + line3 * 0.2;

    // Swirling spiral effect
    float angle = vUv.y * 6.2832 * 3.0 + uTime * 0.5;
    float spiral = sin(angle + dist * 4.0) * 0.5 + 0.5;
    energy += spiral * innerCore * 0.15;

    // Combine
    float coreAlpha = innerCore * 0.25 * midFade;
    float glowAlpha = outerGlow * 0.08 * midFade;
    float energyAlpha = energy * outerGlow * 0.2;

    float alpha = coreAlpha + glowAlpha + energyAlpha;

    // Color: white-cyan center, blue edges
    vec3 coreColor = vec3(0.6, 0.9, 1.0);
    vec3 edgeColor = vec3(0.0, 0.35, 0.8);
    vec3 col = mix(edgeColor, coreColor, innerCore * 0.7 + energy * 0.3);

    // Pulse
    float pulse = 0.9 + 0.1 * sin(uTime * 3.0);
    alpha *= pulse;

    gl_FragColor = vec4(col, alpha);
}
`

export default function MothershipCore() {
    const cityData = useStore(s => s.cityData)
    const ringOuter = useRef()
    const ringInner = useRef()
    const ringMid = useRef()
    const lastT = useRef(0)

    // Compute altitude — well above tallest building
    const altitude = useMemo(() => {
        if (!cityData?.buildings?.length) return 300
        let maxH = 0
        for (const b of cityData.buildings) {
            const h = (b.dimensions?.height || 8) * 3.0
            if (h > maxH) maxH = h
        }
        return Math.max(260, maxH + 200)
    }, [cityData])

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

    const accentMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00bbee',
        emissive: '#0077aa',
        emissiveIntensity: 0.7,
        metalness: 0.9,
        roughness: 0.1,
    }), [])

    const bridgeMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#0066aa',
        emissive: '#004488',
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.15,
    }), [])

    // Beam connects ship belly to ground reactor chamber
    const beamGeo = useMemo(() => {
        return new THREE.CylinderGeometry(4, 22, altitude, 20, 12, true)
    }, [altitude])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        hullMat.uniforms.uTime.value = t
        beamMat.uniforms.uTime.value = t
        if (ringOuter.current) ringOuter.current.rotation.y = t * 0.05
        if (ringMid.current) ringMid.current.rotation.y = t * -0.08
        if (ringInner.current) ringInner.current.rotation.y = t * 0.12
    })

    return (
        <group>
            {/* ── Ship body at altitude ── */}
            <group position={[0, altitude, 0]}>
                {/* Main disc hull — thick saucer */}
                <mesh scale={[1, 0.22, 1]}>
                    <sphereGeometry args={[55, 28, 18]} />
                    <primitive object={hullMat} attach="material" />
                </mesh>

                {/* Bridge dome — top */}
                <mesh position={[0, 10, 0]}>
                    <sphereGeometry args={[16, 18, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <primitive object={bridgeMat} attach="material" />
                </mesh>

                {/* Ventral dome — bottom (beam emitter) */}
                <mesh position={[0, -10, 0]} rotation={[Math.PI, 0, 0]}>
                    <sphereGeometry args={[12, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2]} />
                    <primitive object={bridgeMat} attach="material" />
                </mesh>

                {/* Outer ring — slow majestic rotation */}
                <mesh ref={ringOuter}>
                    <torusGeometry args={[62, 2.5, 8, 40]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>

                {/* Mid ring — counter-rotation */}
                <mesh ref={ringMid} rotation={[0.15, 0, 0]}>
                    <torusGeometry args={[52, 1.5, 6, 36]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>

                {/* Inner accent ring — vertical orientation */}
                <mesh ref={ringInner} rotation={[Math.PI / 2, 0, 0]}>
                    <torusGeometry args={[35, 1.2, 6, 28]} />
                    <primitive object={accentMat} attach="material" />
                </mesh>
            </group>

            {/* ── Tractor beam — ship to ground chamber ── */}
            <mesh position={[0, altitude / 2, 0]} geometry={beamGeo}>
                <primitive object={beamMat} attach="material" />
            </mesh>

            {/* ── Ship underside glow — wide halo beneath hull ── */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, altitude - 12, 0]}>
                <ringGeometry args={[5, 45, 32]} />
                <meshBasicMaterial color="#004488" transparent opacity={0.08} depthWrite={false} />
            </mesh>
        </group>
    )
}
