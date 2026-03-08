import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * PulseWaves — Radial sonar rings expanding from city center.
 * 5 staggered multi-color rings with fade. Skipped on low-end.
 * Single circle mesh + GLSL, 1 draw call. Throttled to 30fps.
 */
export default function PulseWaves() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()
    const lastT = useRef(0)

    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

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
            varying vec3 vWorldPos;
            void main() {
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            uniform float uRadius;
            varying vec3 vWorldPos;

            void main() {
                float dist = length(vWorldPos.xz);
                float norm = dist / uRadius;

                float alpha = 0.0;
                // 5 staggered rings with color shift
                for (int i = 0; i < 5; i++) {
                    float offset = float(i) * 1.6;
                    float t = mod(uTime * 0.35 + offset, 8.0) / 8.0;
                    float width = 0.015 + t * 0.01; // Thicken as they expand
                    float ring = smoothstep(t - width, t, norm) * smoothstep(t + width, t, norm);
                    float fade = (1.0 - t) * (1.0 - t); // Quadratic fade
                    alpha += ring * fade * 0.5;
                }

                // Color shifts from cyan center to blue at edge
                vec3 color = mix(vec3(0.0, 0.9, 1.0), vec3(0.2, 0.4, 1.0), norm);
                gl_FragColor = vec4(color * 2.2, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    }), [cityRadius])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        if (meshRef.current) shaderMaterial.uniforms.uTime.value = t
    })

    if (!cityData?.buildings?.length || isLowEnd) return null

    return (
        <mesh
            ref={meshRef}
            material={shaderMaterial}
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, 0.1, 0]}
        >
            <circleGeometry args={[cityRadius, 64]} />
        </mesh>
    )
}
