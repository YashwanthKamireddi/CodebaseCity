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
    uTime: 0, uGenesisTime: 1.0,
    uBaseColor: new THREE.Color('#1a1a2e'),
  },
  // ═══════════════════════ VERTEX SHADER ═══════════════════════
  `
    #include <common>
    #include <logdepthbuf_pars_vertex>

    uniform float uGenesisTime;
    attribute float aChurn; attribute float aGenesisStart;
    // (aOpacityOverride removed — unused in fragment shader)

    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vLocalNormal;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vFresnel; varying float vGenesisProgress;

    void main() {
      vLocalPosition = position;
      vLocalNormal = normal;
      vNormal = normalize(normalMatrix * normal);
      vColor = instanceColor;
      float t = clamp((uGenesisTime - aGenesisStart) * 10.0, 0.0, 1.0);
      float progress = 1.0 - exp(-10.0 * t) * cos(t * 10.0);
      progress = mix(0.0, progress, step(0.001, t));
      progress = mix(progress, 1.0, step(0.999, t));
      vec3 animatedPosition = position;
      animatedPosition.y = (position.y + 0.5) * progress - 0.5;
      vGenesisProgress = t;
      vChurn = aChurn;

      vScale = vec3(
        length(instanceMatrix[0].xyz),
        length(instanceMatrix[1].xyz),
        length(instanceMatrix[2].xyz)
      );

      vec4 worldPos = modelMatrix * instanceMatrix * vec4(animatedPosition, 1.0);
      vWorldPosition = worldPos.xyz;
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      // Fresnel computed per-vertex — identical on box geometry, ~10x cheaper
      vFresnel = pow(1.0 - max(dot(vNormal, vViewDir), 0.0), 3.0);

      gl_Position = projectionMatrix * viewMatrix * worldPos;

      #include <logdepthbuf_vertex>
    }
  `,
  // ═══════════════════════ FRAGMENT SHADER ═══════════════════════
  `
    #include <common>
    #include <logdepthbuf_pars_fragment>

    uniform float uTime;
    uniform float uGenesisTime;

    varying vec3 vWorldPosition;
    varying vec3 vLocalPosition;
    varying vec3 vLocalNormal;
    varying vec3 vNormal;
    varying vec3 vViewDir;
    varying vec3 vColor;
    varying float vChurn;
    varying vec3 vScale;
    varying float vFresnel; varying float vGenesisProgress;

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

      // Edge highlight — clean architectural line
      float edgeThickness = 0.12;
      float edgeX = smoothstep(edgeThickness + 0.05, edgeThickness - 0.02, distFromOuter.x);
      float edgeY = smoothstep(edgeThickness + 0.05, edgeThickness - 0.02, distFromOuter.y);
      float outerEdge = max(edgeX, edgeY);

      // Procedural windows — larger, cleaner grid for readability at all zooms
      float wFreq = 0.28; // Larger windows, fewer per face
      float windowGridX = fract(vWorldPosition.x * wFreq);
      float windowGridY = fract(vWorldPosition.y * wFreq);
      float windowGridZ = fract(vWorldPosition.z * wFreq);

      // Window panes: smoothstep for clean antialiased rectangles
      float windows = 0.0;
      if (abs(vLocalNormal.x) > 0.5) {
          windows = smoothstep(0.10, 0.16, windowGridZ) * smoothstep(0.90, 0.84, windowGridZ)
                  * smoothstep(0.15, 0.22, windowGridY) * smoothstep(0.88, 0.80, windowGridY);
      } else if (abs(vLocalNormal.z) > 0.5) {
          windows = smoothstep(0.10, 0.16, windowGridX) * smoothstep(0.90, 0.84, windowGridX)
                  * smoothstep(0.15, 0.22, windowGridY) * smoothstep(0.88, 0.80, windowGridY);
      }

      // Randomize lit windows — 60% lit for night-city feel
      vec3 posFloor = floor(vWorldPosition.xyz * wFreq);
      float randomWindow = fract(sin(dot(posFloor, vec3(12.9898, 78.233, 37.719))) * 43758.5453);
      windows *= step(0.4, randomWindow);

      // Window warmth variation — some windows warmer, some cooler
      float warmth = fract(sin(dot(posFloor.xy, vec2(45.233, 97.113))) * 12345.6789);

      // Color palette — deep walls for maximum contrast with glowing windows
      vec3 buildingColor = vColor;
      vec3 darkFace = buildingColor * 0.12;
      vec3 edgeColor = buildingColor * 1.5;
      // Windows have warm white-blue glow tinted by building color
      vec3 windowColor = mix(
          vec3(1.0, 0.92, 0.75),  // Warm white
          vec3(0.7, 0.85, 1.0),   // Cool blue-white
          warmth
      ) * 0.7 + buildingColor * 0.4;

      // Directional lighting — high contrast for depth
      vec3 lightDir = normalize(vec3(0.5, 0.8, 0.3));
      float NdotL = max(dot(vNormal, lightDir), 0.0);
      float lighting = 0.30 + 0.70 * NdotL;

      // Fresnel rim light — from vertex shader
      float fresnel = vFresnel;

      vec3 finalColor = darkFace * lighting;

      if (isSide) {
          // Lit windows — emissive glow against dark facades
          finalColor = mix(finalColor, windowColor, windows * (1.0 - outerEdge));
          // Edge glow — bright structural highlight
          finalColor = mix(finalColor, edgeColor, outerEdge * 0.8);
          // Height gradient — slightly brighter toward top
          float heightGrad = (vLocalPosition.y + 0.5);
          finalColor += buildingColor * 0.04 * heightGrad;
          // Fresnel rim glow — neon edge light
          finalColor += edgeColor * fresnel * 0.15;
          // Ground-level ambient occlusion
          float ao = smoothstep(-0.5, 0.0, vLocalPosition.y);
          finalColor *= mix(0.70, 1.0, ao);

      } else if (isTop) {
          finalColor = darkFace * (lighting + 0.1);
          // Roof edge
          finalColor = mix(finalColor, edgeColor * 0.7, outerEdge);
          // Fresnel on roof
          finalColor += edgeColor * fresnel * 0.06;

          // Roof grid — refined
          float roofGridSpacing = 3.0;
          vec2 roofGridFract = fract(vec2(faceUV.x * faceScale.x / roofGridSpacing, faceUV.y * faceScale.y / roofGridSpacing));
          float rLineThickness = 0.06;
          float rGridLines = step(1.0 - rLineThickness, roofGridFract.x) + step(roofGridFract.x, rLineThickness) +
                             step(1.0 - rLineThickness, roofGridFract.y) + step(roofGridFract.y, rLineThickness);
          rGridLines = min(rGridLines, 1.0);
          finalColor = mix(finalColor, buildingColor * 0.3, rGridLines * (1.0 - outerEdge));
      } else {
          // Bottom face
          finalColor = vec3(0.02, 0.02, 0.03);
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

      float flash = smoothstep(1.0, 0.9, vGenesisProgress) * smoothstep(0.0, 0.2, vGenesisProgress); finalColor += vec3(0.0, 1.0, 0.8) * flash * 2.0; if (vGenesisProgress < 0.01 && uGenesisTime < 0.99) discard; gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

extend({ PulseMaterial })

export { PulseMaterial }
