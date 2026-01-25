import * as THREE from 'three'

// Vertex Shader: Pass attributes to Fragment
export const buildingVertexShader = `
    varying vec3 vPosition;
    varying vec3 vWorldPosition;
    varying float vInstanceId; // Derived from instanceId/color hack or passed attribute

    // We get instanceColor automatically if vertexColors=true
    varying vec3 vColor;

    void main() {
        vColor = instanceColor;

        vec4 worldPos = modelMatrix * instanceMatrix * vec4(position, 1.0);
        vWorldPosition = worldPos.xyz;
        vPosition = position;

        gl_Position = projectionMatrix * viewMatrix * worldPos;
    }
`

// Fragment Shader: Cyberpunk Scanline & Glow
export const buildingFragmentShader = `
    varying vec3 vColor;
    varying vec3 vWorldPosition;
    varying vec3 vPosition;

    uniform float uTime;

    // Config
    const vec3 GLOW_COLOR = vec3(0.3, 0.6, 1.0); // Cyan Blue

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

        // 3. Pulse (Breathing)
        float pulse = (sin(uTime * 2.0) + 1.0) * 0.2;

        // Combine
        vec3 finalColor = vColor;

        // Add Grid
        finalColor = mix(finalColor, GLOW_COLOR, grid * 0.3);

        // Add Scanline (Additive)
        finalColor += GLOW_COLOR * scanline * 0.8;

        // Add Pulse to everything
        finalColor += vColor * pulse;

        // Fog logic (manual simple fog or rely on scene fog if standard material)
        // Since we are writing raw shader, we lose scene fog unless we include chunks.
        // For Alpha, simple linear fog:
        float fogDist = length(vWorldPosition.xz);
        float fogFactor = smoothstep(100.0, 400.0, fogDist);
        finalColor = mix(finalColor, vec3(0.05, 0.05, 0.07), fogFactor); // Fade to dark

        gl_FragColor = vec4(finalColor, 0.9); // Slightly transparent
    }
`
