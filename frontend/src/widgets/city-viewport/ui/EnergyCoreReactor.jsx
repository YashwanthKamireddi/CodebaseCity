import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyCoreReactor — Central pulsating energy source at city heart.
 * Nested torus gyroscope + core sphere + energy beam.
 * Skipped entirely on low-end. Reduced geometry detail for perf.
 * Throttled to 30fps.
 */
export default function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const groupRef = useRef()
    const ring1Ref = useRef()
    const ring2Ref = useRef()
    const ring3Ref = useRef()
    const coreRef = useRef()
    const lastT = useRef(0)

    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

    const beamMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            void main() {
                vUv = uv;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            varying vec2 vUv;
            void main() {
                float distFromCenter = abs(vUv.x - 0.5) * 2.0;
                float edgeFade = smoothstep(1.0, 0.25, distFromCenter);
                float flow = sin(vUv.y * 25.0 - uTime * 2.5) * 0.5 + 0.5;
                float flow2 = sin(vUv.y * 40.0 + uTime * 1.8) * 0.5 + 0.5;
                float pulse = sin(uTime * 1.8) * 0.25 + 0.75;
                vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.8), flow);
                color += vec3(0.1, 0.0, 0.3) * flow2 * 0.3;
                float alpha = edgeFade * (0.12 + flow * 0.08 + flow2 * 0.04) * pulse;
                gl_FragColor = vec4(color * 2.2, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.3
        if (ring2Ref.current) ring2Ref.current.rotation.x = t * -0.2
        if (ring3Ref.current) {
            ring3Ref.current.rotation.y = t * 0.15
            ring3Ref.current.rotation.z = t * 0.1
        }
        if (coreRef.current) {
            coreRef.current.scale.setScalar(1.0 + Math.sin(t * 2.0) * 0.12)
        }
        beamMaterial.uniforms.uTime.value = t
    })

    if (!cityData?.buildings?.length || isLowEnd) return null

    return (
        <group ref={groupRef} position={[0, 0.5, 0]}>
            {/* Core sphere — reduced segments */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[4, 20, 20]} />
                <meshStandardMaterial
                    color="#00ddff"
                    emissive="#0088ff"
                    emissiveIntensity={3.5}
                    toneMapped={false}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Inner ring */}
            <mesh ref={ring1Ref}>
                <torusGeometry args={[8, 0.4, 12, 36]} />
                <meshStandardMaterial
                    color="#00bbff"
                    emissive="#0077ff"
                    emissiveIntensity={1.8}
                    metalness={0.9}
                    roughness={0.1}
                    toneMapped={false}
                />
            </mesh>

            {/* Middle ring */}
            <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[13, 0.3, 12, 36]} />
                <meshStandardMaterial
                    color="#0099dd"
                    emissive="#004499"
                    emissiveIntensity={1.2}
                    metalness={0.8}
                    roughness={0.2}
                    toneMapped={false}
                />
            </mesh>

            {/* Outer ring */}
            <mesh ref={ring3Ref} rotation={[Math.PI / 6, Math.PI / 4, 0]}>
                <torusGeometry args={[18, 0.25, 8, 28]} />
                <meshStandardMaterial
                    color="#5577bb"
                    emissive="#003366"
                    emissiveIntensity={0.7}
                    metalness={0.7}
                    roughness={0.3}
                    toneMapped={false}
                />
            </mesh>

            {/* Upward energy beam */}
            <mesh material={beamMaterial} position={[0, 60, 0]}>
                <cylinderGeometry args={[2, 5, 120, 12, 1, true]} />
            </mesh>

            {/* Ground glow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <circleGeometry args={[25, 32]} />
                <meshBasicMaterial
                    color="#0088ff"
                    transparent
                    opacity={0.15}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            <pointLight
                color="#00bbff"
                intensity={2.5}
                distance={80}
                decay={2}
                position={[0, 10, 0]}
            />
        </group>
    )
}
