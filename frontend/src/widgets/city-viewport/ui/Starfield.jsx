import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Starfield — Procedural animated star background replacing flat color.
 * Uses a massive particle system sphere surrounding the entire scene.
 * 1 draw call, 2000 points, virtually zero performance cost.
 */
export default function Starfield() {
    const pointsRef = useRef()

    const { positions, sizes, opacities } = useMemo(() => {
        const count = 2000
        const pos = new Float32Array(count * 3)
        const sz = new Float32Array(count)
        const op = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            // Random point on a sphere
            const theta = Math.random() * Math.PI * 2
            const phi = Math.acos(2 * Math.random() - 1)
            const r = 4000 + Math.random() * 1000

            pos[i * 3] = r * Math.sin(phi) * Math.cos(theta)
            pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) // Only upper hemisphere
            pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

            sz[i] = 1.0 + Math.random() * 3.0
            op[i] = 0.3 + Math.random() * 0.7
        }

        return { positions: pos, sizes: sz, opacities: op }
    }, [])

    const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: /* glsl */`
            attribute float aSize;
            attribute float aOpacity;
            varying float vOpacity;
            uniform float uTime;
            void main() {
                vOpacity = aOpacity;
                vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
                // Twinkle: modulate size
                float twinkle = sin(uTime * 1.5 + position.x * 0.01 + position.z * 0.01) * 0.5 + 0.5;
                gl_PointSize = aSize * (1.0 + twinkle * 0.5) * (300.0 / -mvPos.z);
                gl_Position = projectionMatrix * mvPos;
            }
        `,
        fragmentShader: /* glsl */`
            varying float vOpacity;
            void main() {
                // Circular point with soft edge
                float dist = length(gl_PointCoord - vec2(0.5));
                if (dist > 0.5) discard;
                float alpha = smoothstep(0.5, 0.1, dist) * vOpacity;
                // Slight blue-white color variation
                vec3 color = mix(vec3(0.8, 0.9, 1.0), vec3(1.0, 1.0, 1.0), vOpacity);
                gl_FragColor = vec4(color, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame(({ clock }) => {
        if (pointsRef.current) {
            shaderMaterial.uniforms.uTime.value = clock.getElapsedTime()
            // Slow rotation for subtle motion
            pointsRef.current.rotation.y = clock.getElapsedTime() * 0.003
        }
    })

    return (
        <points ref={pointsRef} material={shaderMaterial}>
            <bufferGeometry>
                <bufferAttribute
                    attach="attributes-position"
                    count={positions.length / 3}
                    array={positions}
                    itemSize={3}
                />
                <bufferAttribute
                    attach="attributes-aSize"
                    count={sizes.length}
                    array={sizes}
                    itemSize={1}
                />
                <bufferAttribute
                    attach="attributes-aOpacity"
                    count={opacities.length}
                    array={opacities}
                    itemSize={1}
                />
            </bufferGeometry>
        </points>
    )
}
