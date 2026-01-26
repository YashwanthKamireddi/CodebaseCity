import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * PulseMaterial
 * The "Living" Skin of Code City.
 *
 * Features:
 * 1. Instance Color Support (Base building color).
 * 2. Cyberpunk Grid (World-space UVs).
 * 3. Scanline Sweep (Global time effect).
 * 4. Churn Pulse (Data-driven breathing).
 */

const PulseMaterial = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#27272a'), // Fallback
    uGlowColor: new THREE.Color('#3b82f6'), // Cyan Blue for Grid/Scanline
  },
  // Vertex Shader
  `
    attribute float aChurn; // Custom per-instance attribute

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vColor;
    varying float vChurn;

    void main() {
      vUv = uv;
      vPosition = position;
      vColor = instanceColor; // Provided by InstancedMesh
      vChurn = aChurn;        // Pass to fragment

      vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment Shader
  `
    uniform float uTime;
    uniform vec3 uGlowColor;

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vColor;
    varying float vChurn;

    void main() {
      // 1. Base Structure (Grid Pattern)
      // Modulo on world position to create grid lines
      float gridX = step(0.95, fract(vWorldPosition.x * 0.2));
      float gridY = step(0.95, fract(vWorldPosition.y * 0.5));
      float gridZ = step(0.95, fract(vWorldPosition.z * 0.2));
      float grid = max(gridX, max(gridY, gridZ));

      // 2. Scanline Effect (Vertical Sweep)
      float scanHeight = mod(uTime * 15.0, 100.0);
      float scanWidth = 5.0;
      float dist = abs(vWorldPosition.y - scanHeight);
      float scanline = 1.0 - smoothstep(0.0, scanWidth, dist);

      // 3. Pulse (Breathing) - Data Driven!
      // Low churn (0) = Slow deep breath
      // High churn (20+) = Fast hyperventilating
      float speed = 1.0 + (vChurn * 0.2);
      float intensity = 0.1 + (min(vChurn, 20.0) / 40.0); // Cap at 0.6 extra intensity

      float breath = sin(uTime * speed * 2.0) * 0.5 + 0.5; // 0..1
      float pulse = breath * intensity;

      // Combine
      vec3 finalColor = vColor;

      // Add Grid
      finalColor = mix(finalColor, uGlowColor, grid * 0.3);

      // Add Scanline (Additive)
      finalColor += uGlowColor * scanline * 0.8;

      // Add Churn Pulse
      // We pulse with the *instance color* to keep it coherent,
      // or maybe white/hot for high churn?
      // Let's use the GLOW_COLOR for the pulse to make it look like energy.
      finalColor += uGlowColor * pulse;

      // Fog Logic (Simple Linear)
      float fogDist = length(vWorldPosition.xz);
      float fogFactor = smoothstep(100.0, 500.0, fogDist);
      finalColor = mix(finalColor, vec3(0.05, 0.05, 0.07), fogFactor);

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ PulseMaterial })

export { PulseMaterial }
