import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * PulseMaterial - Solid Lit Buildings with Neon Accents
 *
 * Opaque, properly lit building shader with procedural windows and edge
 * highlights. Designed to work WITHOUT post-processing Bloom.
 * Uses logarithmic depth buffer for correct z-fighting at all distances.
 */

const PulseMaterial = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#1a1a2e'),
  },
  // ═══════════════════════ VERTEX SHADER ═══════════════════════
  `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    attribute float aChurn;
    attribute float aOpacityOverride;

    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vLocalNormal;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vOpacityOverride;

    void main() {
      vLocalPosition = position;
      vLocalNormal = normal;
      vNormal = normalize(normalMatrix * normal);
      vColor = instanceColor;
      vChurn = aChurn;
      vOpacityOverride = aOpacityOverride;

      vScale = vec3(
        length(instanceMatrix[0].xyz),
        length(instanceMatrix[1].xyz),
        length(instanceMatrix[2].xyz)
      );

      vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      gl_Position = projectionMatrix * viewMatrix * worldPos;

      #include <logdepthbuf_vertex>
    }
  `,
  // ═══════════════════════ FRAGMENT SHADER ═══════════════════════
  `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform float uTime;

    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vLocalNormal;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vOpacityOverride;

    void main() {
      #include <logdepthbuf_fragment>

      bool isSide = abs(vLocalNormal.y) < 0.5;
      bool isTop = vLocalNormal.y > 0.5;

      // Face UV mapping
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

      vec2 distFromCenter = abs(faceUV) * faceScale;
      vec2 distFromOuter = (faceScale * 0.5) - distFromCenter;

      // Edge highlight
      float edgeThickness = 0.12;
      float edgeX = smoothstep(edgeThickness + 0.05, edgeThickness - 0.05, distFromOuter.x);
      float edgeY = smoothstep(edgeThickness + 0.05, edgeThickness - 0.05, distFromOuter.y);
      float outerEdge = max(edgeX, edgeY);

      // Procedural windows
      float windowGridX = fract(vWorldPosition.x * 0.4);
      float windowGridY = fract(vWorldPosition.y * 0.4);
      float windowGridZ = fract(vWorldPosition.z * 0.4);

      float windows = 0.0;
      if (abs(vLocalNormal.x) > 0.5) {
          windows = step(0.15, windowGridZ) * step(0.15, windowGridY);
      } else if (abs(vLocalNormal.z) > 0.5) {
          windows = step(0.15, windowGridX) * step(0.15, windowGridY);
      }

      // Randomize lit windows — 70% lit for a lively city
      vec3 posFloor = floor(vWorldPosition.xyz * 0.4);
      float randomWindow = fract(sin(dot(posFloor, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      windows *= step(0.3, randomWindow);

      // Color palette
      vec3 buildingColor = vColor;
      vec3 darkFace = buildingColor * 0.35;
      vec3 edgeColor = buildingColor * 1.6;
      vec3 windowColor = buildingColor * 1.3 + vec3(0.18, 0.24, 0.30);

      // Two-light directional setup for better coverage
      vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
      vec3 lightDir2 = normalize(vec3(-0.4, 0.5, -0.6));
      float NdotL = max(dot(vNormal, lightDir), 0.0);
      float NdotL2 = max(dot(vNormal, lightDir2), 0.0);
      float lighting = 0.45 + 0.45 * NdotL + 0.15 * NdotL2;

      vec3 finalColor = darkFace * lighting;

      if (isSide) {
          // Lit windows
          finalColor = mix(finalColor, windowColor * lighting, windows * (1.0 - outerEdge));
          // Edge glow
          finalColor = mix(finalColor, edgeColor, outerEdge * 0.85);
          // Height gradient — brighter toward top
          float heightGrad = (vLocalPosition.y + 0.5);
          finalColor += buildingColor * 0.08 * heightGrad;
          // Ambient contribution so shadowed sides aren't pitch black
          finalColor += buildingColor * 0.06;

      } else if (isTop) {
          finalColor = darkFace * (lighting + 0.2);
          // Roof edge
          finalColor = mix(finalColor, edgeColor * 0.8, outerEdge);

          // Roof grid
          float roofGridSpacing = 3.0;
          vec2 roofGridFract = fract(vec2(faceUV.x * faceScale.x / roofGridSpacing, faceUV.y * faceScale.y / roofGridSpacing));
          float rLineThickness = 0.08;
          float rGridLines = step(1.0 - rLineThickness, roofGridFract.x) + step(roofGridFract.x, rLineThickness) +
                             step(1.0 - rLineThickness, roofGridFract.y) + step(roofGridFract.y, rLineThickness);
          rGridLines = min(rGridLines, 1.0);
          finalColor = mix(finalColor, buildingColor * 0.3, rGridLines * (1.0 - outerEdge));
      } else {
          // Bottom face
          finalColor = buildingColor * 0.12;
      }

      // Churn / flamegraph
      if (vChurn > 0.2) {
          float heightHeat = smoothstep(-0.2, 0.5, vLocalPosition.y);
          float intensity = vChurn * heightHeat;
          vec3 flameColor = mix(vec3(1.0, 0.2, 0.0), vec3(1.0, 0.9, 0.7), intensity);
          float flicker = sin(uTime * 12.0 + vWorldPosition.x * 2.0) * 0.15 + 0.85;
          finalColor = mix(finalColor, flameColor, intensity * 0.4);
          if (isTop) {
              finalColor += vec3(1.0, 0.95, 0.8) * vChurn * 0.5 * flicker;
          }
      }

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ PulseMaterial })

export { PulseMaterial }
