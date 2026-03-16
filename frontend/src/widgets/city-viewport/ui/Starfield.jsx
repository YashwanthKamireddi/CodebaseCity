import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * Starfield — Deep-space backdrop for the city.
 *
 * 3 000 GPU-instanced star points occupying the upper hemisphere.
 * Each star has a unique phase so they twinkle independently.
 * Uses additive blending so bright stars bleed into postprocessing Bloom.
 *
 * Budget:  1 draw call, ~3 KB of attributes, 10fps update.
 */

const STAR_VERT = /* glsl */ `
attribute float aPhase;
attribute float aBrightness;
uniform float uTime;
varying float vTwinkle;
varying float vBrightness;

void main() {
    vBrightness = aBrightness;
    // Each star twinkles at its own rate and phase
    vTwinkle = 0.55 + 0.45 * sin(uTime * (1.2 + aBrightness * 1.8) + aPhase * 6.28318);

    vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * mvPos;

    // Bright stars are larger; scaled by twinkle for shimmer
    gl_PointSize = (0.8 + aBrightness * 3.5) * vTwinkle;
}
`

const STAR_FRAG = /* glsl */ `
varying float vTwinkle;
varying float vBrightness;

void main() {
    vec2 coord = gl_PointCoord - 0.5;
    float dist = length(coord);
    if (dist > 0.5) discard;

    // Soft circular glow falloff
    float alpha = pow(1.0 - dist * 2.0, 1.8);

    // Colour: cool blue-white for dim stars → warm ivory for bright ones
    vec3 cool = vec3(0.65, 0.75, 1.00);
    vec3 warm = vec3(1.00, 0.96, 0.80);
    vec3 color = mix(cool, warm, vBrightness * 0.7);

    // Over-drive intensity so bright stars feed Bloom
    color *= 1.0 + vBrightness * 2.0;

    gl_FragColor = vec4(color, alpha * vTwinkle * 0.85);
}
`

export default React.memo(function Starfield({ count = 3000 }) {
    const lastT = useRef(0)

    const { geometry, material } = useMemo(() => {
        const RADIUS = 9000

        const pos         = new Float32Array(count * 3)
        const phases      = new Float32Array(count)
        const brightnesses = new Float32Array(count)

        for (let i = 0; i < count; i++) {
            // Upper-hemisphere spherical distribution
            const theta  = Math.random() * Math.PI * 2
            const phi    = Math.acos(Math.random())               // 0 = north pole, PI/2 = equator
            const r      = RADIUS * (0.65 + Math.random() * 0.35)

            pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
            pos[i * 3 + 1] = Math.abs(r * Math.cos(phi)) + 300   // Always above city floor
            pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta)

            phases[i]       = Math.random() * Math.PI * 2
            // Power distribution: many dim stars, few brilliant ones
            brightnesses[i] = Math.pow(Math.random(), 2.2)
        }

        const geo = new THREE.BufferGeometry()
        geo.setAttribute('position',    new THREE.BufferAttribute(pos,          3))
        geo.setAttribute('aPhase',      new THREE.BufferAttribute(phases,       1))
        geo.setAttribute('aBrightness', new THREE.BufferAttribute(brightnesses, 1))

        const mat = new THREE.ShaderMaterial({
            uniforms: { uTime: { value: 0 } },
            vertexShader:   STAR_VERT,
            fragmentShader: STAR_FRAG,
            transparent: true,
            depthWrite:  false,
            blending:    THREE.AdditiveBlending,
        })

        return { geometry: geo, material: mat }
    }, [count])

    // Dispose on unmount
    React.useEffect(() => {
        return () => {
            geometry.dispose()
            material.dispose()
        }
    }, [geometry, material])

    // Throttle twinkle to 10 fps — stars don't need high-frequency updates
    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.1) return
        lastT.current = t
        material.uniforms.uTime.value = t
    })

    return <points geometry={geometry} material={material} />
})
