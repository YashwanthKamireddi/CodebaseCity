import * as THREE from 'three'
import { extend } from '@react-three/fiber'
import { shaderMaterial } from '@react-three/drei'

// Uniforms driven by React state/frame
const HoloArchitectMaterial = shaderMaterial(
    {
        uTime: 0,
        uColor: new THREE.Color('#3b82f6'),
        uRimColor: new THREE.Color('#ffffff'),
        uBaseOpacity: 0.8,
        uScanSpeed: 1.0,
        uGridDensity: 10.0
    },
    // Vertex Shader
    `
    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vInstanceColor;

    void main() {
        vUv = uv;
        vNormal = normalize(normalMatrix * normal);

        #ifdef USE_INSTANCING_COLOR
            vInstanceColor = instanceColor;
        #else
            vInstanceColor = vec3(1.0);
        #endif

        vec4 mvPosition = modelViewMatrix * instanceMatrix * vec4(position, 1.0);
        vViewPosition = -mvPosition.xyz;
        gl_Position = projectionMatrix * mvPosition;
    }
    `,
    // Fragment Shader
    `
    uniform float uTime;
    uniform vec3 uColor;
    uniform vec3 uRimColor;
    uniform float uBaseOpacity;
    uniform float uScanSpeed;
    uniform float uGridDensity;

    varying vec2 vUv;
    varying vec3 vNormal;
    varying vec3 vViewPosition;
    varying vec3 vInstanceColor;

    void main() {
        // 1. Fresnel Edge Glow (Holographic feel)
        vec3 normal = normalize(vNormal);
        vec3 viewDir = normalize(vViewPosition);
        float fresnel = pow(1.0 - abs(dot(normal, viewDir)), 3.0);

        // 2. Procedural Grid (Windows/Structure)
        // Split UVs into grid cells
        vec2 gridUv = fract(vUv * uGridDensity);
        // Create lines at edges of cells
        float gridLine = step(0.9, gridUv.x) + step(0.9, gridUv.y);
        gridLine = clamp(gridLine, 0.0, 1.0);

        // 3. Moving Data Scanline
        float scanHeight = -uTime * uScanSpeed;
        float scan = smoothstep(0.45, 0.55, abs(fract(vUv.y * 3.0 + scanHeight) - 0.5));

        // Base Color from Instance
        vec3 baseColor = vInstanceColor;

        // Add brightness for grid lines
        vec3 finalColor = mix(baseColor, uRimColor, gridLine * 0.2);

        // Add Fresnel Rim
        finalColor += uRimColor * fresnel * 1.5;

        // Add Scan pulse (Subtle)
        finalColor += uRimColor * scan * 0.1;

        // Transparency: Edges are opaque, center is transparent-ish
        float alpha = uBaseOpacity + fresnel;

        gl_FragColor = vec4(finalColor, alpha);
    }
    `
)

extend({ HoloArchitectMaterial })

export { HoloArchitectMaterial }
