import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * PulseWaves — Radial energy waves emanating from city center periodically.
 * Like a sonar/radar pulse expanding outward on the ground plane.
 * Single ring mesh with animated shader — 1 draw call.
 */
export default function PulseWaves() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()

    const cityRadius = useMemo(() => {
        if (!cityData?.buildings?.length) return 200
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(200, maxR * 1.2)
    }, [cityData])

    const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uRadius: { value: cityRadius },
        },
        vertexShader: /* glsl */`
            varying vec2 vUv;
            varying vec3 vWorldPos;
            void main() {
                vUv = uv;
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            uniform float uRadius;
            varying vec2 vUv;
            varying vec3 vWorldPos;

            void main() {
                float dist = length(vWorldPos.xz);
                float norm = dist / uRadius;

                // 3 staggered pulse rings
                float alpha = 0.0;
                for (int i = 0; i < 3; i++) {
                    float offset = float(i) * 2.5;
                    float t = mod(uTime * 0.4 + offset, 8.0) / 8.0;
                    float ring = smoothstep(t - 0.02, t, norm) * smoothstep(t + 0.02, t, norm);
                    float fade = 1.0 - t; // Fade as it expands
                    alpha += ring * fade * 0.6;
                }

                vec3 color = vec3(0.0, 0.8, 1.0);
                gl_FragColor = vec4(color * 2.0, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    }), [cityRadius])

    useFrame(({ clock }) => {
        if (meshRef.current) {
            shaderMaterial.uniforms.uTime.value = clock.getElapsedTime()
        }
    })

    if (!cityData?.buildings?.length) return null

    return (
        <mesh
            ref={meshRef}
            material={shaderMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.1, 0]}
        >
            <circleGeometry args={[cityRadius, 128]} />
        </mesh>
    )
}
