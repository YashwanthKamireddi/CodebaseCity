import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyShieldDome — Translucent hexagonal force field surrounding the city.
 * Dual-layer hex grid with energy crawl and impact ripple effects.
 * Single icosahedron + GLSL, 1 draw call. Throttled to 30fps.
 */
export default React.memo(function EnergyShieldDome() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()
    const lastT = useRef(0)

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
                float lat = asin(clamp(vWorldPos.y / uRadius, -1.0, 1.0));
                float lon = atan(vWorldPos.z, vWorldPos.x);

                // Dual-layer hex: large grid + fine detail
                vec2 hexUV1 = vec2(lon * 5.0, lat * 10.0);
                vec4 hex1 = hexGrid(hexUV1);
                vec2 hexUV2 = vec2(lon * 12.0, lat * 24.0);
                vec4 hex2 = hexGrid(hexUV2);

                float edge1 = smoothstep(0.0, 0.12, hex1.z) * (1.0 - smoothstep(0.12, 0.22, hex1.z));
                float edge2 = smoothstep(0.0, 0.1, hex2.z) * (1.0 - smoothstep(0.1, 0.18, hex2.z));

                // Dual pulse waves — upward + radial
                float pulse1 = sin(vWorldPos.y * 0.015 - uTime * 0.6) * 0.5 + 0.5;
                float radial = sin(length(vWorldPos.xz) * 0.02 - uTime * 1.2) * 0.5 + 0.5;

                // Energy crawl along hex edges
                float crawl = sin(hex1.x * 2.0 + hex1.y * 3.0 + uTime * 1.5) * 0.5 + 0.5;

                float fresnel = pow(vFresnel, 2.5);

                // Color: teal base → white-cyan at edges
                vec3 baseColor = vec3(0.0, 0.55, 0.95);
                vec3 edgeColor = vec3(0.3, 1.0, 0.95);
                vec3 color = mix(baseColor, edgeColor, fresnel);

                // Combine layers
                float alpha = edge1 * 0.25 + edge2 * 0.08
                    + fresnel * 0.1
                    + pulse1 * edge1 * 0.15
                    + radial * edge1 * 0.06
                    + crawl * edge1 * 0.08;

                float groundFade = smoothstep(-0.05, 0.25, vWorldPos.y / uRadius);
                alpha *= groundFade;

                gl_FragColor = vec4(color * 2.2, alpha);
            }
        `,
        transparent: true,
        side: THREE.DoubleSide,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
    }), [radius])

    useEffect(() => () => shaderMaterial.dispose(), [shaderMaterial])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        if (meshRef.current) shaderMaterial.uniforms.uTime.value = t
    })

    if (!cityData?.buildings?.length) return null

    // Detail 3 = 1280 tris (vs 5 = 10240) — looks identical at dome scale
    return (
        <mesh ref={meshRef} material={shaderMaterial}>
            <icosahedronGeometry args={[radius, 3]} />
        </mesh>
    )
})
