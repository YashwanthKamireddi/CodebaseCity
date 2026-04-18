import React, { useMemo, useRef, useEffect } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

const SHADOW_VERT = /* glsl */ `
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
}
`

const SHADOW_FRAG = /* glsl */ `
varying vec2 vUv;
void main() {
  float dist = length(vUv - vec2(0.5)) * 2.0;
  float shadow = smoothstep(1.0, 0.3, dist);
  shadow = pow(shadow, 1.5); // Soften falloff
  gl_FragColor = vec4(0.0, 0.0, 0.0, shadow * 0.4);
}
`

/**
 * BuildingShadows — Instanced soft shadow discs beneath each building.
 * Adds ambient occlusion / contact shadow effect for depth perception.
 */
export default function BuildingShadows() {
  const buildings = useStore(s => s.cityData?.buildings || [])
  const meshRef = useRef()

  const { geometry, count } = useMemo(() => {
    if (buildings.length === 0) return { geometry: null, count: 0 }

    // Create circular shadow plane geometry
    const geo = new THREE.CircleGeometry(1, 16)
    geo.rotateX(-Math.PI / 2)

    return { geometry: geo, count: buildings.length }
  }, [buildings.length])

  // Set instance matrices when buildings change
  useEffect(() => {
    if (!meshRef.current || buildings.length === 0) return

    const dummy = new THREE.Object3D()

    buildings.forEach((b, i) => {
      const x = b.position?.x || 0
      const z = b.position?.z || 0
      const width = b.dimensions?.width || 10
      const depth = b.dimensions?.depth || width

      dummy.position.set(x, 0.02, z) // Just above ground to avoid z-fighting
      dummy.scale.set(width * 0.8, 1, depth * 0.8) // Scale based on building footprint
      dummy.updateMatrix()

      meshRef.current.setMatrixAt(i, dummy.matrix)
    })

    meshRef.current.instanceMatrix.needsUpdate = true
  }, [buildings])

  if (!geometry || count === 0) return null

  return (
    <instancedMesh ref={meshRef} args={[geometry, null, count]} frustumCulled={false}>
      <shaderMaterial
        vertexShader={SHADOW_VERT}
        fragmentShader={SHADOW_FRAG}
        transparent
        depthWrite={false}
        blending={THREE.MultiplyBlending}
      />
    </instancedMesh>
  )
}
