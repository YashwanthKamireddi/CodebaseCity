import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * PulseMaterial - Neon Wireframe "Deep Dive" Edition
 *
 * Translucent, glowing architectural grid matching the concept image.
 * Uses additive blending and high emissive multipliers for intense bloom.
 */

const PulseMaterial = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#1a1a2e'),
  },
  // ════════════════════════════════════════════════════════════════════
  // VERTEX SHADER
  // ════════════════════════════════════════════════════════════════════
  `
    attribute float aChurn;
    attribute float aOpacityOverride;

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vLocalNormal;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vHeight;
    varying float vOpacityOverride;

    void main() {
      vUv = uv;
      vPosition = position;
      vLocalPosition = position;
      vLocalNormal = normal;
      vNormal = normalize(normalMatrix * normal);
      vColor = instanceColor;
      vChurn = aChurn;
      vOpacityOverride = aOpacityOverride;

      // Extract scale from instance matrix for architectural proportions
      vScale = vec3(
        length(instanceMatrix[0].xyz),
        length(instanceMatrix[1].xyz),
        length(instanceMatrix[2].xyz)
      );

      vHeight = vScale.y;

      vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;

      // View direction for physically accurate effects (optional here)
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // ════════════════════════════════════════════════════════════════════
  // FRAGMENT SHADER - Neon Wireframe
  // ════════════════════════════════════════════════════════════════════
  `
    uniform float uTime;

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vLocalNormal;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vHeight;
    varying float vOpacityOverride;

    void main() {
      bool isSide = abs(vLocalNormal.y) < 0.5;
      bool isTop = vLocalNormal.y > 0.5;

      // Face UV and Scale mapping
      vec2 faceUV;
      vec2 faceScale;
      if (abs(vLocalNormal.x) > 0.5) {
        faceUV = vLocalPosition.zy;
        faceScale = vScale.zy;
      } else if (abs(vLocalNormal.z) > 0.5) {
        faceUV = vLocalPosition.xy;
        faceScale = vScale.xy;
      } else {
        faceUV = vLocalPosition.xz;
        faceScale = vScale.xz;
      }

      // Distance from center of face in world units
      vec2 distFromCenter = abs(faceUV) * faceScale;
      vec2 distFromOuter = (faceScale * 0.5) - distFromCenter;

      // ── Edge Highlight (Neon border) ──
      float edgeThickness = 0.15;
      float edgeX = smoothstep(edgeThickness + 0.05, edgeThickness - 0.05, distFromOuter.x);
      float edgeY = smoothstep(edgeThickness + 0.05, edgeThickness - 0.05, distFromOuter.y);
      float outerEdge = max(edgeX, edgeY);

      // ── Inner Sub-Grid lines ──
      float gridSpacingY = 4.0;
      float gridSpacingX = 4.0;
      vec2 gridUV = (faceUV + 0.5) * faceScale;
      vec2 gridFract = fract(vec2(gridUV.x / gridSpacingX, gridUV.y / gridSpacingY));

      float lineThickness = 0.05;
      float gridXLines = step(1.0 - lineThickness, gridFract.x) + step(gridFract.x, lineThickness);
      float gridYLines = step(1.0 - lineThickness, gridFract.y) + step(gridFract.y, lineThickness);
      float innerGrid = min(gridXLines + gridYLines, 1.0);

      // ── Base Colors ──
      vec3 neonColor = vColor;

      // Glass core - extremely dark, almost invisible to let background through
      vec3 finalColor = vec3(0.005, 0.008, 0.012);

      if (isSide) {
          // Add grid and edges
          finalColor = mix(finalColor, neonColor * 0.35, innerGrid);
          finalColor = mix(finalColor, neonColor * 0.9, outerEdge);

          // Add a holographic vertical gradient
          float heightGrad = (vLocalPosition.y + 0.5);
          finalColor += neonColor * 0.05 * heightGrad;

          // ── Sweeping Scanner Effect ──
          float sweep = fract(vWorldPosition.y * 0.03 - uTime * 0.5);
          float scanner = smoothstep(0.95, 1.0, sweep) * (1.0 - smoothstep(0.99, 1.0, sweep));
          float scannerGlow = smoothstep(0.8, 1.0, sweep) * 0.2;
          finalColor += neonColor * (scanner + scannerGlow) * 0.5;

      } else if (isTop) {
          // Roof edge
          finalColor = mix(finalColor, neonColor * 0.9, outerEdge);

          // Roof inner grid
          float roofGridSpacing = 3.0;
          vec2 roofGridFract = fract(vec2(gridUV.x / roofGridSpacing, gridUV.y / roofGridSpacing));
          float rLineThickness = 0.08;
          float rGridLines = step(1.0 - rLineThickness, roofGridFract.x) + step(roofGridFract.x, rLineThickness) +
                             step(1.0 - rLineThickness, roofGridFract.y) + step(roofGridFract.y, rLineThickness);
          rGridLines = min(rGridLines, 1.0);
          finalColor = mix(finalColor, neonColor * 0.3, rGridLines * (1.0 - outerEdge));

          // Central Data Core / Antenna pulse
          float centerDist = length(faceUV);
          float beacon = smoothstep(0.15, 0.0, centerDist);
          float pulse = sin(uTime * 4.0 + vWorldPosition.x) * 0.5 + 0.5;
          finalColor += neonColor * beacon * pulse * 0.8;

      } else {
          // Bottom face
          finalColor = vec3(0.0);
      }

      // ── Live Telemetry Flamegraph ──
      if (vChurn > 0.2) {
          float heightHeat = smoothstep(-0.2, 0.5, vLocalPosition.y);
          float intensity = vChurn * heightHeat;

          vec3 flameColor = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.9, 0.7), intensity);

          float flicker = sin(uTime * 12.0 + vWorldPosition.x * 2.0) * 0.15 + 0.85;

          finalColor = mix(finalColor, flameColor, intensity * 0.3);
          finalColor += flameColor * intensity * flicker * 0.8;

          if (isTop) {
              finalColor += vec3(1.0, 0.95, 0.8) * vChurn * 1.0 * flicker;
          }
      }

      // Final opacity
      float finalOpacity = vOpacityOverride > 0.0 ? vOpacityOverride : 0.95;

      gl_FragColor = vec4(finalColor, finalOpacity);
    }
  `
)

extend({ PulseMaterial })

export { PulseMaterial }
