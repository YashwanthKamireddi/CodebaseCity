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

    varying vec2 vUv;
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vHeight;

    void main() {
      vUv = uv;
      vPosition = position;
      vLocalPosition = position;
      vNormal = normalize(normalMatrix * normal);
      vColor = instanceColor;
      vChurn = aChurn;

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
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vHeight;

    void main() {
      bool isSide = abs(vNormal.y) < 0.5;
      bool isTop = vNormal.y > 0.5;

      // Face UV and Scale mapping
      vec2 faceUV;
      vec2 faceScale;
      if (abs(vNormal.x) > 0.5) {
        faceUV = vLocalPosition.zy;
        faceScale = vScale.zy;
      } else if (abs(vNormal.z) > 0.5) {
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
      // Make tall buildings have tighter vertical grids
      vec2 gridUV = (faceUV + 0.5) * faceScale;
      vec2 gridFract = fract(vec2(gridUV.x / gridSpacingX, gridUV.y / gridSpacingY));

      float lineThickness = 0.05;
      float gridXLines = step(1.0 - lineThickness, gridFract.x) + step(gridFract.x, lineThickness);
      float gridYLines = step(1.0 - lineThickness, gridFract.y) + step(gridFract.y, lineThickness);
      float innerGrid = min(gridXLines + gridYLines, 1.0);

      // ── Base Colors ──
      // Scale down neon brightness slightly since we're opaque now
      vec3 neonColor = vColor * 1.5;

      // Solid premium dark metal/glass core
      vec3 finalColor = vec3(0.03, 0.04, 0.05);

      if (isSide) {
          // Architectural floor lines (tight vertical spacing, no horizontal grid needed for a sleek tower look)
          float floorSpacing = 1.0;
          float floorY = fract(vLocalPosition.y / floorSpacing);
          float floorLines = step(0.95, floorY); // Crisp horizontal line for every "floor"

          finalColor = mix(finalColor, neonColor * 0.3, floorLines);

          // Add a subtle vertical shading to give the box depth
          float shadow = abs(vNormal.x) > 0.0 ? 0.8 : 1.0;
          finalColor *= shadow;

          // Strong crisp vertical edges
          finalColor = mix(finalColor, neonColor * 1.2, outerEdge);

          // Add a subtle height gradient
          float heightGrad = (vLocalPosition.y + 0.5) * 0.5;
          finalColor += neonColor * 0.05 * heightGrad;

          // ── Sweeping Scanner Effect ──
          float sweep = fract(vWorldPosition.y * 0.03 - uTime * 0.5);
          float scanner = smoothstep(0.95, 1.0, sweep) * (1.0 - smoothstep(0.99, 1.0, sweep));
          float scannerGlow = smoothstep(0.8, 1.0, sweep) * 0.1;
          finalColor += neonColor * (scanner + scannerGlow);

      } else if (isTop) {
          // Roof edge
          finalColor = mix(finalColor, neonColor * 1.2, outerEdge);

          // Roof inner grid - sharp structural cross-hatch
          float roofGridSpacing = 2.0;
          vec2 roofGridFract = fract(vec2(gridUV.x / roofGridSpacing, gridUV.y / roofGridSpacing));
          float rLineThickness = 0.05;
          float rGridLines = step(1.0 - rLineThickness, roofGridFract.x) + step(roofGridFract.x, rLineThickness) +
                             step(1.0 - rLineThickness, roofGridFract.y) + step(roofGridFract.y, rLineThickness);
          rGridLines = min(rGridLines, 1.0);
          finalColor = mix(finalColor, neonColor * 0.4, rGridLines * (1.0 - outerEdge));

          // Central Data Core / Antenna pulse
          float centerDist = length(faceUV);
          float beacon = smoothstep(0.15, 0.0, centerDist);
          float pulse = sin(uTime * 4.0 + vWorldPosition.x) * 0.5 + 0.5;
          finalColor += neonColor * beacon * pulse * 2.0;

      } else {
          // Bottom face
          finalColor = vec3(0.01, 0.01, 0.015);
      }

      // ── Hotspot Churn Highlight ──
      if (vChurn > 2.0) {
          float pulse = sin(uTime * 3.0) * 0.5 + 0.5;
          vec3 hotColor = vec3(1.0, 0.2, 0.4);

          // Flash the whole building strongly
          float intensity = min(vChurn, 10.0) / 10.0;
          finalColor += hotColor * pulse * intensity;
      }

      // With additive blending, the alpha channel controls how transparent it is
      // relative to the background when drawing. But in React Three Fiber AdditiveBlending,
      // you typically want premultiplied alpha or just raw color addition.
      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ PulseMaterial })

export { PulseMaterial }
