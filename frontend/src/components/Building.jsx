import React, { useRef, useMemo, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../store/useStore'

// VSCode-like language colors
const LANGUAGE_COLORS = {
  python: '#3572A5',      // Python blue
  javascript: '#F7DF1E',  // JavaScript yellow
  typescript: '#3178C6',  // TypeScript blue
  java: '#B07219',        // Java orange
  go: '#00ADD8',          // Go cyan
  rust: '#DEA584',        // Rust orange
  cpp: '#F34B7D',         // C++ pink
  c: '#555555',           // C gray
  ruby: '#CC342D',        // Ruby red
  php: '#777BB4',         // PHP purple
  swift: '#FA7343',       // Swift orange
  kotlin: '#A97BFF',      // Kotlin purple
  scala: '#C22D40',       // Scala red
  csharp: '#178600',      // C# green
  html: '#E34C26',        // HTML orange
  css: '#563D7C',         // CSS purple
  json: '#292929',        // JSON dark
  yaml: '#CB171E',        // YAML red
  markdown: '#083FA1',    // Markdown blue
  shell: '#89E051',       // Shell green
  default: '#6B7280'      // Default gray
}

// Folder/district colors for ground
const DISTRICT_COLORS = {
  api: '#4da6ff',
  services: '#a855f7',
  data: '#22d3ee',
  utils: '#4ade80',
  auth: '#fbbf24',
  ui: '#f472b6',
  tests: '#2dd4bf',
  config: '#818cf8',
  default: '#6b7280'
}

const colorToRGB = (hex) => {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex)
  return result ? {
    r: parseInt(result[1], 16) / 255,
    g: parseInt(result[2], 16) / 255,
    b: parseInt(result[3], 16) / 255
  } : { r: 0.5, g: 0.5, b: 0.5 }
}

// Single Building component with language-based colors
function SingleBuilding({ data }) {
  const meshRef = useRef()
  const [hovered, setHovered] = useState(false)

  const { selectBuilding, selectedBuilding, setHoveredBuilding } = useStore()

  const isSelected = selectedBuilding?.id === data.id
  const { width, height, depth } = data.dimensions
  const { x, y, z } = data.position

  // Get color based on language (VSCode style)
  const baseColor = useMemo(() => {
    const lang = data.language?.toLowerCase() || 'default'
    return LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.default
  }, [data.language])

  useFrame((state) => {
    if (meshRef.current) {
      if (data.is_hotspot) {
        const pulse = Math.sin(state.clock.elapsedTime * 4) * 0.3 + 0.7
        meshRef.current.material.emissiveIntensity = pulse * 0.6
      } else if (isSelected) {
        meshRef.current.material.emissiveIntensity = 0.4
      } else if (hovered) {
        meshRef.current.material.emissiveIntensity = 0.25
      } else {
        meshRef.current.material.emissiveIntensity = 0.1
      }
    }
  })

  const buildingMaterial = useMemo(() => {
    const color = new THREE.Color(baseColor)
    if (data.decay_level > 0.5) {
      color.lerp(new THREE.Color('#5a6b5a'), data.decay_level * 0.3)
    }
    return {
      color,
      emissive: data.is_hotspot ? new THREE.Color('#ff6600') : color,
      emissiveIntensity: 0.1,
      roughness: 0.4,
      metalness: 0.3
    }
  }, [baseColor, data.decay_level, data.is_hotspot])

  return (
    <group position={[x, height / 2, z]}>
      <mesh
        ref={meshRef}
        castShadow
        receiveShadow
        onClick={(e) => {
          e.stopPropagation()
          selectBuilding(data)
        }}
        onPointerOver={(e) => {
          e.stopPropagation()
          setHovered(true)
          setHoveredBuilding(data)
          document.body.style.cursor = 'pointer'
        }}
        onPointerOut={() => {
          setHovered(false)
          setHoveredBuilding(null)
          document.body.style.cursor = 'default'
        }}
      >
        <boxGeometry args={[width, height, depth]} />
        <meshStandardMaterial {...buildingMaterial} />
      </mesh>

      {/* Rooftop */}
      <mesh position={[0, height / 2 + 0.2, 0]} castShadow>
        <boxGeometry args={[width + 0.3, 0.4, depth + 0.3]} />
        <meshStandardMaterial color="#f5f5f5" roughness={0.6} />
      </mesh>

      {/* Base */}
      <mesh position={[0, -height / 2 + 0.15, 0]} receiveShadow>
        <boxGeometry args={[width + 0.4, 0.3, depth + 0.4]} />
        <meshStandardMaterial color="#4a4a4a" roughness={0.9} />
      </mesh>

      {isSelected && (
        <mesh position={[0, -height / 2 + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(width, depth) * 0.7, Math.max(width, depth) * 0.9, 32]} />
          <meshBasicMaterial color="#ffffff" transparent opacity={0.9} side={THREE.DoubleSide} />
        </mesh>
      )}

      {data.is_hotspot && (
        <>
          <pointLight position={[0, height / 2 + 1, 0]} color="#ff6600" intensity={2} distance={15} decay={2} />
          <mesh position={[0, height / 2 + 1.5, 0]}>
            <coneGeometry args={[0.8, 2, 6]} />
            <meshBasicMaterial color="#ff4400" transparent opacity={0.7} />
          </mesh>
        </>
      )}
    </group>
  )
}

// Main export
export default function Building({ data }) {
  return <SingleBuilding data={data} />
}

// Instanced rendering for large datasets
export function InstancedBuildings({ buildings }) {
  const meshRef = useRef()

  const dummy = useMemo(() => new THREE.Object3D(), [])
  const colorArray = useMemo(() => new Float32Array(buildings.length * 3), [buildings.length])

  useMemo(() => {
    buildings.forEach((building, i) => {
      const { x, z } = building.position
      const { width, height, depth } = building.dimensions

      dummy.position.set(x, height / 2, z)
      dummy.scale.set(width, height, depth)
      dummy.updateMatrix()

      if (meshRef.current) {
        meshRef.current.setMatrixAt(i, dummy.matrix)
      }

      // Color by language
      const lang = building.language?.toLowerCase() || 'default'
      const hex = LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.default
      const color = colorToRGB(hex)
      colorArray[i * 3] = color.r
      colorArray[i * 3 + 1] = color.g
      colorArray[i * 3 + 2] = color.b
    })

    if (meshRef.current) {
      meshRef.current.instanceMatrix.needsUpdate = true
      meshRef.current.geometry.setAttribute(
        'color',
        new THREE.InstancedBufferAttribute(colorArray, 3)
      )
    }
  }, [buildings, dummy, colorArray])

  return (
    <instancedMesh
      ref={meshRef}
      args={[null, null, buildings.length]}
      castShadow
      receiveShadow
    >
      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial
        vertexColors
        roughness={0.4}
        metalness={0.3}
      />
    </instancedMesh>
  )
}

// Export colors for legend
export { LANGUAGE_COLORS, DISTRICT_COLORS }
