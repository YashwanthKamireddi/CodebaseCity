import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyShieldDome — Translucent hexagonal force field surrounding the city.
 * Wakanda/Avengers-style protective dome with animated hex pattern.
 * Ultra-optimized: single icosahedron + custom shader, 1 draw call.
 */
export default function EnergyShieldDome() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()

    const radius = useMemo(() => {
        if (!cityData?.buildings?.length) return 200
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(200, maxR * 1.3)
    }, [cityData])

    const shaderMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uRadius: { value: radius },
        },
        vertexShader: /* glsl */`
            varying vec3 vWorldPos;
            varying vec3 vNormal;
            varying float vFresnel;
            void main() {
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                vNormal = normalize(normalMatrix * normal);
                vec3 viewDir = normalize(cameraPosition - vWorldPos);
                vFresnel = 1.0 - abs(dot(viewDir, vNormal));
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            uniform float uRadius;
            varying vec3 vWorldPos;
            varying vec3 vNormal;
            varying float vFresnel;

            // Hex grid function
            vec4 hexGrid(vec2 p) {
                vec2 q = vec2(p.x * 2.0 * 0.5773503, p.y + p.x * 0.5773503);
                vec2 pi = floor(q);
                vec2 pf = fract(q);
                float v = mod(pi.x + pi.y, 3.0);
                float ca = step(1.0, v);
                float cb = step(2.0, v);
                vec2 ma = step(pf.xy, pf.yx);
                float e = dot(ma, 1.0 - pf.yx + ca * (pf.x + pf.y - 1.0) + cb * (pf.yx - 2.0 * pf.xy));
                return vec4(pi + ca - cb * ma, e, length(pf - 0.5));
            }

            void main() {
                // Hex pattern using spherical UV mapped from world position
                float lat = asin(clamp(vWorldPos.y / uRadius, -1.0, 1.0));
                float lon = atan(vWorldPos.z, vWorldPos.x);
                vec2 hexUV = vec2(lon * 6.0, lat * 12.0);
                vec4 hex = hexGrid(hexUV);

                // Edge intensity of hex cells
                float edge = smoothstep(0.0, 0.15, hex.z) * (1.0 - smoothstep(0.15, 0.25, hex.z));

                // Pulse wave traveling upward
                float pulse = sin(vWorldPos.y * 0.02 - uTime * 0.8) * 0.5 + 0.5;

                // Fresnel — stronger at edges (realistic shield look)
                float fresnel = pow(vFresnel, 3.0);

                // Color: cyan base with blue accent
                vec3 color = mix(
                    vec3(0.0, 0.6, 1.0),
                    vec3(0.0, 1.0, 0.9),
                    fresnel
                );

                // Combine: hex edges + fresnel glow + pulse
                float alpha = edge * 0.3 + fresnel * 0.12 + pulse * edge * 0.15;

                // Fade at bottom (dome sits on ground)
                float groundFade = smoothstep(-0.1, 0.2, vWorldPos.y / uRadius);
                alpha *= groundFade;

                gl_FragColor = vec4(color * 2.0, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [radius])

    useFrame(({ clock }) => {
        if (meshRef.current) {
            shaderMaterial.uniforms.uTime.value = clock.getElapsedTime()
        }
    })

    if (!cityData?.buildings?.length) return null

    return (
        <mesh ref={meshRef} material={shaderMaterial}>
            <icosahedronGeometry args={[radius, 5]} />
        </mesh>
    )
}
