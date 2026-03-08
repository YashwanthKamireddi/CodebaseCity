import React, { useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * 🪧 Holographic Neo-Tokyo Billboards (Feature 3)
 *
 * Attaches massive, glowing, glitchy CRT-style planes to the largest buildings
 * in the city to simulate cyber-corporate data advertisements.
 * Pure GLSL math generates fake kanji/binary data blocks with zero texture lookups.
 */

// ── GLSL SHADERS ──

const BILLBOARD_VERT = /* glsl */ `
varying vec2 vUv;
varying vec3 vWorldNormal;

void main() {
    vUv = uv;
    vWorldNormal = normalize((modelMatrix * vec4(normal, 0.0)).xyz);
    vec4 worldPos = modelMatrix * vec4(position, 1.0);
    gl_Position = projectionMatrix * viewMatrix * worldPos;
}
`

const BILLBOARD_FRAG = /* glsl */ `
uniform float uTime;
uniform vec3 uColor;
varying vec2 vUv;
varying vec3 vWorldNormal;

// Pseudo-random noise
float hash(vec2 p) {
    p = fract(p * vec2(123.34, 456.21));
    p += dot(p, p + 45.32);
    return fract(p.x * p.y);
}

// Generates blocky "fake text" or binary chunks
float fakeText(vec2 uv) {
    vec2 grid = floor(uv * vec2(20.0, 40.0));
    float h = hash(grid + floor(uTime * 2.0)); // Glitchy update speed

    // Create inner blocks so it looks like characters, not just static
    float subHash = hash(grid * 4.0 + floor(uTime * 4.0));

    // Only show "text" on some grid cells
    float mask = step(0.4, h);
    return mask * step(0.5, subHash);
}

void main() {
    // Holographic transparency
    vec2 uv = vUv;

    // Animate CRT scanlines moving downwards
    float scanline = sin(uv.y * 300.0 - uTime * 10.0) * 0.04;

    // Chromatic glitch offset
    float glitchTrigger = step(0.95, sin(uTime * 5.0 + uv.y * 20.0));
    float glitchOffset = glitchTrigger * 0.05 * sin(uTime * 50.0);

    // Sample fake text with glitch offsets for RGB
    float r = fakeText(vec2(uv.x + glitchOffset, uv.y));
    float g = fakeText(uv);
    float b = fakeText(vec2(uv.x - glitchOffset, uv.y));

    vec3 textCol = vec3(r, g, b) * uColor;

    // Viginette / Edge fade
    float edge = smoothstep(0.0, 0.1, uv.x) * smoothstep(1.0, 0.9, uv.x) *
                 smoothstep(0.0, 0.1, uv.y) * smoothstep(1.0, 0.9, uv.y);

    // Add horizontal banding
    float banding = sin(uv.y * 10.0 + uTime * 2.0) * 0.1 + 0.9;

    vec3 finalColor = textCol * banding + scanline;
    float alpha = max(max(r, g), b) * edge * 0.8;

    // Discard empty areas for performance
    if (alpha <= 0.02) discard;

    // Push into massive bloom
    gl_FragColor = vec4(finalColor * 4.0, alpha);
}
`

// Pre-compiled geometries
const planeGeometry = new THREE.PlaneGeometry(1, 1)

/**
 * Renders a single billboard attached to a building's face.
 */
function HolographicScreen({ x, y, z, width, height, rotationY, color }) {
    const material = useMemo(() => new THREE.ShaderMaterial({
        uniforms: {
            uTime: { value: 0 },
            uColor: { value: new THREE.Color(color) }
        },
        vertexShader: BILLBOARD_VERT,
        fragmentShader: BILLBOARD_FRAG,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide
    }), [color])

    useFrame((state) => {
        material.uniforms.uTime.value = state.clock.elapsedTime
    })

    return (
        <mesh
            geometry={planeGeometry}
            material={material}
            position={[x, y, z]}
            rotation={[0, rotationY, 0]}
            scale={[width, height, 1]}
            raycast={() => null}
        />
    )
}

export default function HolographicBillboards() {
    const buildings = useStore(s => s.cityData?.buildings)

    const targetBuildings = useMemo(() => {
        if (!buildings || buildings.length === 0) return []

        // Find the 5 "tallest/largest" buildings to attach massive billboards onto
        const sorted = [...buildings].sort((a, b) => {
            const volA = (a.dimensions?.width || 1) * (a.dimensions?.height || 1) * (a.dimensions?.depth || 1)
            const volB = (b.dimensions?.width || 1) * (b.dimensions?.height || 1) * (b.dimensions?.depth || 1)
            return volB - volA
        })

        return sorted.slice(0, 5)
    }, [buildings])

    if (targetBuildings.length === 0) return null

    // Corporate Cyberpunk Color Palette
    const colors = ['#00f0ff', '#ff0055', '#ffaa00', '#00ffaa', '#ff00ff']

    return (
        <group>
            {targetBuildings.map((b, i) => {
                const w = b.dimensions?.width || 8
                const d = b.dimensions?.depth || 8
                const h = (b.dimensions?.height || 8) * 3.0 // Model scale

                // Billboard size
                const bWidth = Math.max(w * 1.5, 30) // Stick out past the building
                const bHeight = Math.max(h * 0.6, 40)

                // Position it hovering halfway up the building, slightly offset on the Z face
                const px = b.position.x
                const py = h * 0.5
                const pz = b.position.z + (d / 2) + 2.0 // Push out off the face

                // Pick a color
                const color = colors[i % colors.length]

                return (
                    <HolographicScreen
                        key={b.id || i}
                        x={px}
                        y={py}
                        z={pz}
                        width={bWidth}
                        height={bHeight}
                        rotationY={0} // Facing forward (Z axis)
                        color={color}
                    />
                )
            })}
        </group>
    )
}
