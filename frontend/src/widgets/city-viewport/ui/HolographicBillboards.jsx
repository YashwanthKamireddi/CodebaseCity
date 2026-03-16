import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * HolographicBillboards — Neo-Tokyo corporate data screens on largest buildings.
 *
 * Attaches glowing CRT-style billboard planes to the 5 largest buildings.
 * Pure GLSL math generates fake kanji/binary data blocks with zero texture lookups.
 * Colors are overdriven (*4.0) to feed the Bloom postprocessing pass.
 * 1 useFrame shared across all billboard materials — throttled to 30fps.
 */

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;
void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    gl_Position = projectionMatrix * viewMatrix * modelMatrix * vec4(position, 1.0);
}
`

const BILLBOARD_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;

float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

float fakeText(vec2 uv) {
    vec2 grid = floor(uv * vec2(20.0, 40.0));
    float h = hash(grid + floor(uTime * 2.0));
    float subHash = hash(grid * 4.0 + floor(uTime * 4.0));
    float mask = step(0.4, h);
    return mask * step(0.5, subHash);
}

void main() {
    vec2 uv = vUv;

    // CRT scanlines
    float scanline = sin(uv.y * 300.0 - uTime * 10.0) * 0.04;

    // Chromatic glitch
    float glitchTrigger = step(0.95, sin(uTime * 5.0 + uv.y * 20.0));
    float glitchOffset  = glitchTrigger * 0.05 * sin(uTime * 50.0);

    float r = fakeText(vec2(uv.x + glitchOffset, uv.y));
    float g = fakeText(uv);
    float b = fakeText(vec2(uv.x - glitchOffset, uv.y));

    vec3 textCol = vec3(r, g, b) * uColor;

    float edge    = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x) *
                    smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);
    float banding = sin(uv.y * 10.0 + uTime * 2.0) * 0.1 + 0.9;

    vec3 finalColor = textCol * banding + scanline;
    float alpha = max(max(r, g), b) * edge * 0.8;

    if (alpha <= 0.02) discard;

    // Overdrive for Bloom
    gl_FragColor = vec4(finalColor * 4.0, alpha);
}
`

const _planeGeo = new THREE.PlaneGeometry(1, 1)

function HolographicScreen({ x, y, z, width, height, color, registerMaterial }) {
    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime:  { value: 0 },
            uColor: { value: new THREE.Color(color) },
        },
        vertexShader:   BILLBOARD_VERT,
        fragmentShader: BILLBOARD_FRAG,
        transparent: true,
        depthWrite:  false,
        blending:    THREE.AdditiveBlending,
        side:        THREE.DoubleSide,
    }), [color])

    useEffect(() => {
        registerMaterial(material)
        return () => material.dispose()
    }, [material, registerMaterial])

    return (
        <mesh
            geometry={_planeGeo}
            material={material}
            position={[x, y, z]}
            scale={[width, height, 1]}
            raycast={() => null}
        />
    )
}

export default React.memo(function HolographicBillboards() {
    const buildings     = useStore(s => s.cityData?.buildings)
    const materialsRef  = useRef([])
    const lastT         = useRef(0)

    const targetBuildings = useMemo(() => {
        if (!buildings?.length) return []
        return [...buildings]
            .sort((a, b) => {
                const vA = (a.dimensions?.width || 1) * (a.dimensions?.height || 1) * (a.dimensions?.depth || 1)
                const vB = (b.dimensions?.width || 1) * (b.dimensions?.height || 1) * (b.dimensions?.depth || 1)
                return vB - vA
            })
            .slice(0, 5)
    }, [buildings])

    useEffect(() => { materialsRef.current = [] }, [targetBuildings])

    const registerMaterial = useMemo(() => (mat) => {
        if (mat && !materialsRef.current.includes(mat)) {
            materialsRef.current.push(mat)
        }
    }, [])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        for (const m of materialsRef.current) {
            if (m) m.uniforms.uTime.value = t
        }
    })

    if (!targetBuildings.length) return null

    const colors = ['#00f0ff', '#ff0055', '#ffaa00', '#00ffaa', '#ff00ff']

    return (
        <group>
            {targetBuildings.map((b, i) => {
                const w  = b.dimensions?.width  || 8
                const d  = b.dimensions?.depth  || 8
                const h  = (b.dimensions?.height || 8) * 3.0
                const bW = Math.max(w * 1.5, 30)
                const bH = Math.max(h * 0.6, 40)
                return (
                    <HolographicScreen
                        key={b.id || i}
                        x={b.position.x}
                        y={h * 0.5}
                        z={(b.position.z || 0) + d / 2 + 2.0}
                        width={bW}
                        height={bH}
                        color={colors[i % colors.length]}
                        registerMaterial={registerMaterial}
                    />
                )
            })}
        </group>
    )
})
