import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * AuroraBorealis — Animated northern lights in the sky above the city.
 * Uses ribbon geometry with animated vertex shader for flowing curtain effect.
 * 1 draw call, purely decorative atmospheric element.
 */
export default function AuroraBorealis() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()

    const cityRadius = useMemo(() => {
        if (!cityData?.buildings?.length) return 200
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(200, maxR * 0.8)
    }, [cityData])

    const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
        },
        vertexShader: /* glsl */`
            uniform float uTime;
            varying vec2 vUv;
            varying float vHeight;
            void main() {
                vUv = uv;
                vec3 pos = position;
                // Wave displacement
                float wave1 = sin(pos.x * 0.005 + uTime * 0.3) * 25.0;
                float wave2 = sin(pos.x * 0.01 + uTime * 0.5 + 1.5) * 15.0;
                float wave3 = cos(pos.x * 0.003 - uTime * 0.2) * 10.0;
                pos.y += wave1 + wave2;
                pos.z += wave3;
                vHeight = uv.y;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            varying vec2 vUv;
            varying float vHeight;
            void main() {
                // Horizontal variation
                float x = vUv.x;
                float noise = sin(x * 12.0 + uTime * 0.4) * 0.5 + 0.5;
                noise *= sin(x * 5.0 - uTime * 0.2) * 0.5 + 0.5;

                // Color gradient: green → cyan → purple
                vec3 col1 = vec3(0.0, 1.0, 0.5);   // Green
                vec3 col2 = vec3(0.0, 0.8, 1.0);    // Cyan
                vec3 col3 = vec3(0.6, 0.0, 1.0);    // Purple
                float t = x + sin(uTime * 0.15) * 0.3;
                vec3 color = mix(col1, col2, smoothstep(0.0, 0.5, t));
                color = mix(color, col3, smoothstep(0.5, 1.0, t));

                // Vertical fade — bright at center, transparent at top/bottom
                float vFade = smoothstep(0.0, 0.35, vHeight) * smoothstep(1.0, 0.65, vHeight);

                // Combine
                float alpha = noise * vFade * 0.12;
                gl_FragColor = vec4(color * 1.5, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [])

    useFrame(({ clock }) => {
        if (meshRef.current) {
            shaderMaterial.uniforms.uTime.value = clock.getElapsedTime()
        }
    })

    // Generate ribbon geometry — wide curtain in the sky
    const geometry = useMemo(() => {
        const width = cityRadius * 4
        const height = cityRadius * 0.8
        const segsX = 80
        const segsY = 12
        return new THREE.PlaneGeometry(width, height, segsX, segsY)
    }, [cityRadius])

    return (
        <mesh
            ref={meshRef}
            geometry={geometry}
            material={shaderMaterial}
            position={[0, cityRadius * 1.5 + 200, -cityRadius * 0.6]}
            rotation={[-0.2, 0, 0]}
        />
    )
}
