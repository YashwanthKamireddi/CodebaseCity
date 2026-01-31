import { shaderMaterial } from '@react-three/drei'
import { extend } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * PulseMaterial - World-Class Building Shader
 *
 * Premium "Glass Tower" aesthetic inspired by:
 * - Blade Runner 2049 / Cyberpunk 2077 cityscapes
 * - Apple Park / One World Trade Center architecture
 * - Linear.app / Vercel design language
 *
 * Features:
 * 1. Glass curtain wall with realistic reflections
 * 2. Dynamic window lighting with warm interior glow
 * 3. Neon edge highlighting for cyberpunk feel
 * 4. Ambient occlusion and fog
 * 5. Data-driven hotspot visualization
 * 6. Smooth anti-aliased rendering
 */

const PulseMaterial = shaderMaterial(
  {
    uTime: 0,
    uBaseColor: new THREE.Color('#1a1a2e'),
    uAccentColor: new THREE.Color('#00d9ff'),
    uWindowLit: 0.55,
    uGlassReflectivity: 0.3,
  },
  // Vertex Shader - Enhanced with smooth normals
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

      // Extract scale from instance matrix
      vScale = vec3(
        length(instanceMatrix[0].xyz),
        length(instanceMatrix[1].xyz),
        length(instanceMatrix[2].xyz)
      );

      vHeight = vScale.y;

      vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
      vWorldPosition = worldPos.xyz;

      // View direction for fresnel
      vViewDir = normalize(cameraPosition - worldPos.xyz);

      gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
  `,
  // Fragment Shader - Premium glass tower aesthetic
  `
    uniform float uTime;
    uniform vec3 uAccentColor;
    uniform float uWindowLit;
    uniform float uGlassReflectivity;

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

    // High-quality noise for variation
    float hash(vec2 p) {
      vec3 p3 = fract(vec3(p.xyx) * 0.1031);
      p3 += dot(p3, p3.yzx + 33.33);
      return fract((p3.x + p3.y) * p3.z);
    }

    float noise(vec2 p) {
      vec2 i = floor(p);
      vec2 f = fract(p);
      f = f * f * (3.0 - 2.0 * f); // Smoothstep

      float a = hash(i);
      float b = hash(i + vec2(1.0, 0.0));
      float c = hash(i + vec2(0.0, 1.0));
      float d = hash(i + vec2(1.0, 1.0));

      return mix(mix(a, b, f.x), mix(c, d, f.x), f.y);
    }

    // Smooth window mask with anti-aliasing
    float windowMask(vec2 uv, float gap) {
      vec2 f = fract(uv);
      vec2 df = fwidth(uv);

      float xMask = smoothstep(gap - df.x, gap + df.x, f.x) *
                    (1.0 - smoothstep(1.0 - gap - df.x, 1.0 - gap + df.x, f.x));
      float yMask = smoothstep(gap * 0.6 - df.y, gap * 0.6 + df.y, f.y) *
                    (1.0 - smoothstep(1.0 - gap * 0.4 - df.y, 1.0 - gap * 0.4 + df.y, f.y));

      return xMask * yMask;
    }

    void main() {
      // Base building color - dark glass
      vec3 baseGlass = vec3(0.08, 0.10, 0.14);
      vec3 finalColor = baseGlass;

      // Fresnel effect for glass reflection
      float fresnel = 1.0 - max(dot(vNormal, vViewDir), 0.0);
      fresnel = pow(fresnel, 3.0);

      // Sky reflection color (gradient based on normal)
      vec3 skyReflect = mix(
        vec3(0.02, 0.04, 0.08),  // Dark horizon
        vec3(0.15, 0.25, 0.45),  // Blue sky
        max(0.0, vNormal.y * 0.5 + 0.5)
      );

      bool isSide = abs(vNormal.y) < 0.5;
      bool isTop = vNormal.y > 0.5;

      if (isSide) {
        // Calculate window UV based on face direction
        vec2 windowUV;
        if (abs(vNormal.x) > 0.5) {
          windowUV = vec2(vLocalPosition.z * vScale.z, vLocalPosition.y * vScale.y);
        } else {
          windowUV = vec2(vLocalPosition.x * vScale.x, vLocalPosition.y * vScale.y);
        }

        // Window grid parameters - premium proportions
        float windowW = 2.8;
        float windowH = 3.5;
        float gap = 0.22;

        vec2 windowCell = windowUV / vec2(windowW, windowH);
        vec2 cellId = floor(windowCell);

        // Anti-aliased window mask
        float window = windowMask(windowCell, gap);

        // Per-window random state
        float windowSeed = hash(cellId + floor(vWorldPosition.xz * 0.005));

        // Window lighting logic
        float isLit = step(1.0 - uWindowLit, windowSeed);

        // Time-based flickering for some windows (TV/activity)
        float flickerSpeed = 2.0 + windowSeed * 4.0;
        float flicker = sin(uTime * flickerSpeed + windowSeed * 50.0) * 0.5 + 0.5;
        float hasFlicker = step(0.88, windowSeed);
        isLit = mix(isLit, isLit * (0.6 + flicker * 0.4), hasFlicker);

        // Window color palette - warm interior vs cool glass
        vec3 litColor = mix(
          vec3(1.0, 0.92, 0.75),   // Warm white
          vec3(1.0, 0.85, 0.6),     // Warmer yellow
          windowSeed
        );

        // Add color variety (some offices have colored lighting)
        float hasColor = step(0.92, windowSeed);
        vec3 accentLit = mix(
          vec3(0.4, 0.8, 1.0),     // Cyan
          vec3(1.0, 0.5, 0.7),     // Pink
          hash(cellId * 2.0)
        );
        litColor = mix(litColor, accentLit, hasColor * 0.6);

        // Dark window - reflective glass
        vec3 darkWindow = baseGlass * 0.6 + skyReflect * uGlassReflectivity * fresnel;

        // Frame color - darker than glass
        vec3 frameColor = vColor * 0.4 + vec3(0.02, 0.03, 0.05);

        // Compose final window color
        vec3 windowColor = mix(darkWindow, litColor * 0.9, isLit);
        finalColor = mix(frameColor, windowColor, window);

        // Add emission glow to lit windows
        float emission = window * isLit * 0.35;
        finalColor += litColor * emission;

        // Subtle vertical gradient (darker at bottom)
        float heightGrad = smoothstep(0.0, 0.5, (vLocalPosition.y + 0.5));
        finalColor *= 0.85 + heightGrad * 0.15;

      } else if (isTop) {
        // Roof - dark with subtle tech patterns
        vec2 roofUV = vWorldPosition.xz * 0.15;
        float roofPattern = step(0.96, fract(roofUV.x)) + step(0.96, fract(roofUV.y));

        // Helipad / tech installations on tall buildings
        float centerDist = length(vLocalPosition.xz);
        float helipad = smoothstep(0.35, 0.25, centerDist) * step(30.0, vHeight);

        finalColor = vColor * 0.5;
        finalColor += vec3(0.02, 0.04, 0.06) * roofPattern;
        finalColor += uAccentColor * helipad * 0.15;

        // Antenna light on very tall buildings
        float antenna = smoothstep(0.08, 0.0, centerDist) * step(50.0, vHeight);
        float antennaBlink = sin(uTime * 3.0) * 0.5 + 0.5;
        finalColor += vec3(1.0, 0.2, 0.2) * antenna * antennaBlink * 0.8;
      } else {
        // Bottom - very dark
        finalColor = vColor * 0.25;
      }

      // EDGE GLOW - Neon architectural highlights
      float edge = pow(fresnel, 2.5);
      vec3 edgeColor = mix(uAccentColor, vColor, 0.3);
      finalColor += edgeColor * edge * 0.2;

      // HOTSPOT PULSE - For high-churn files
      if (vChurn > 2.0) {
        float pulseSpeed = 1.5 + vChurn * 0.1;
        float pulse = sin(uTime * pulseSpeed) * 0.5 + 0.5;
        float intensity = min(vChurn, 12.0) / 25.0;
        vec3 hotColor = vec3(1.0, 0.35, 0.15);
        finalColor += hotColor * pulse * intensity;

        // Edge glow intensifies for hotspots
        finalColor += hotColor * edge * intensity * 0.5;
      }

      // AMBIENT OCCLUSION - Darken base of buildings
      float ao = smoothstep(0.0, 20.0, vWorldPosition.y);
      finalColor *= 0.65 + ao * 0.35;

      // HEIGHT-BASED BRIGHTNESS - Taller = more prominent
      float heightBoost = smoothstep(10.0, 80.0, vHeight) * 0.15;
      finalColor *= 1.0 + heightBoost;

      // ATMOSPHERIC FOG - Depth and mood
      float fogDist = length(vWorldPosition.xz);
      float fogFactor = smoothstep(100.0, 500.0, fogDist);
      vec3 fogColor = vec3(0.04, 0.05, 0.08);
      finalColor = mix(finalColor, fogColor, fogFactor * 0.6);

      // Final tone mapping for HDR-like feel
      finalColor = finalColor / (finalColor + vec3(1.0)) * 1.1;

      gl_FragColor = vec4(finalColor, 1.0);
    }
  `
)

// Register for use with React Three Fiber
extend({ PulseMaterial })

export { PulseMaterial }
