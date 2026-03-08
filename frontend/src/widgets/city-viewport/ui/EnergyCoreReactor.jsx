import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyCoreReactor — Pulsating central energy source at the heart of the city.
 * Replaces the plain ground center with a dramatic power reactor.
 * Geometry: nested torus rings + central sphere + volumetric beam.
 */
export default function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const groupRef = useRef()
    const ring1Ref = useRef()
    const ring2Ref = useRef()
    const ring3Ref = useRef()
    const coreRef = useRef()

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
                float edgeFade = smoothstep(1.0, 0.3, distFromCenter);
                float flow = sin(vUv.y * 30.0 - uTime * 3.0) * 0.5 + 0.5;
                float pulse = sin(uTime * 2.0) * 0.3 + 0.7;
                vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.8), flow);
                float alpha = edgeFade * (0.15 + flow * 0.1) * pulse;
                gl_FragColor = vec4(color * 2.0, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (ring1Ref.current) ring1Ref.current.rotation.z = t * 0.3
        if (ring2Ref.current) ring2Ref.current.rotation.x = t * -0.2
        if (ring3Ref.current) {
            ring3Ref.current.rotation.y = t * 0.15
            ring3Ref.current.rotation.z = t * 0.1
        }
        if (coreRef.current) {
            const pulse = 1.0 + Math.sin(t * 2.0) * 0.15
            coreRef.current.scale.setScalar(pulse)
        }
        beamMaterial.uniforms.uTime.value = t
    })

    if (!cityData?.buildings?.length) return null

    return (
        <group ref={groupRef} position={[0, 0.5, 0]}>
            {/* Central energy core sphere */}
            <mesh ref={coreRef}>
                <sphereGeometry args={[4, 32, 32]} />
                <meshStandardMaterial
                    color="#00ddff"
                    emissive="#0088ff"
                    emissiveIntensity={3}
                    toneMapped={false}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Inner ring — fast spin */}
            <mesh ref={ring1Ref}>
                <torusGeometry args={[8, 0.4, 16, 64]} />
                <meshStandardMaterial
                    color="#00aaff"
                    emissive="#0066ff"
                    emissiveIntensity={1.5}
                    metalness={0.9}
                    roughness={0.1}
                    toneMapped={false}
                />
            </mesh>

            {/* Middle ring — counter spin */}
            <mesh ref={ring2Ref} rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[13, 0.3, 16, 64]} />
                <meshStandardMaterial
                    color="#0088dd"
                    emissive="#004488"
                    emissiveIntensity={1.0}
                    metalness={0.8}
                    roughness={0.2}
                    toneMapped={false}
                />
            </mesh>

            {/* Outer ring — slow gyroscope */}
            <mesh ref={ring3Ref} rotation={[Math.PI / 6, Math.PI / 4, 0]}>
                <torusGeometry args={[18, 0.25, 12, 64]} />
                <meshStandardMaterial
                    color="#4466aa"
                    emissive="#002244"
                    emissiveIntensity={0.6}
                    metalness={0.7}
                    roughness={0.3}
                    toneMapped={false}
                />
            </mesh>

            {/* Upward energy beam */}
            <mesh material={beamMaterial} position={[0, 60, 0]}>
                <cylinderGeometry args={[2, 6, 120, 16, 1, true]} />
            </mesh>

            {/* Ground glow */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.05, 0]}>
                <circleGeometry args={[25, 64]} />
                <meshBasicMaterial
                    color="#0088ff"
                    transparent
                    opacity={0.15}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Point light for local illumination */}
            <pointLight
                color="#00aaff"
                intensity={2}
                distance={80}
                decay={2}
                position={[0, 10, 0]}
            />
        </group>
    )
}
