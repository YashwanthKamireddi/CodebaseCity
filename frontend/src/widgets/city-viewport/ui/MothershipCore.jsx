import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * MothershipCore - Orbiting gyroscope station above the city.
 *
 * Perf budget: 4 draw calls, ~2800 verts, 1 shared material, 20fps throttled useFrame.
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
    vec3 base = vec3(0.06, 0.08, 0.12);
    float rim = 1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0);
    rim = pow(smoothstep(0.4, 1.0, rim), 2.0);
    base += vec3(0.1, 0.2, 0.35) * rim;
    float trimLine = step(0.94, fract(vUv.y * 16.0));
    float pulse = 0.85 + 0.15 * sin(uTime * 1.2 + vUv.x * 8.0);
    base += vec3(0.0, 0.55, 0.9) * trimLine * pulse;
    gl_FragColor = vec4(base, 1.0);
}
`

export default function MothershipCore() {
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()
    const lastT = useRef(0)

    const altitude = 500

    const hullMat = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: HULL_VERT,
        fragmentShader: HULL_FRAG,
    }), [])

    const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.0, 0.3, 0.6),
    }), [])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        hullMat.uniforms.uTime.value = t
        if (ring1.current) ring1.current.rotation.y = t * 0.08
        if (ring2.current) ring2.current.rotation.x = t * -0.12
        if (ring3.current) {
            ring3.current.rotation.y = t * 0.18
            ring3.current.rotation.z = Math.sin(t * 0.3) * 0.15
        }
    })

    return (
        <group position={[0, altitude, 0]}>
            <mesh>
                <sphereGeometry args={[12, 16, 16]} />
                <primitive object={coreMat} attach="material" />
            </mesh>
            <mesh ref={ring1}>
                <torusGeometry args={[28, 2.5, 8, 32]} />
                <primitive object={hullMat} attach="material" />
            </mesh>
            <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[44, 2, 8, 32]} />
                <primitive object={hullMat} attach="material" />
            </mesh>
            <mesh ref={ring3} rotation={[Math.PI / 6, Math.PI / 4, 0]}>
                <torusGeometry args={[62, 1.5, 8, 32]} />
                <primitive object={hullMat} attach="material" />
            </mesh>
        </group>
    )
}
