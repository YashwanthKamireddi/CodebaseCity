import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../store/useStore'
import BuildingLabel from './BuildingLabel'

// Realistic city colors by language
const LANGUAGE_COLORS = {
  python: '#4a7c9b',    // Steel blue
  javascript: '#c4a35a', // Warm yellow/tan
  typescript: '#5c7cba', // Slate blue
  java: '#8b6914',       // Brown/bronze
  go: '#5a9fa8',         // Teal
  rust: '#a86849',       // Rust/terracotta
  cpp: '#5a5a7a',        // Gray blue
  c: '#6a6a6a',          // Gray
  ruby: '#8b3a3a',       // Dark red brick
  php: '#6a5a8a',        // Purple gray
  default: '#6a6a6a'     // Gray
}

// Building tier based on size/complexity
function getBuildingTier(building) {
  const loc = building.metrics?.loc || 0
  const complexity = building.metrics?.complexity || 0
  if (loc > 500 || complexity > 20 || building.is_hotspot) return 4
  if (loc > 200 || complexity > 12) return 3
  if (loc > 80 || complexity > 6) return 2
  return 1
}

export default function Building({ data, isConnected }) {
  const meshRef = useRef()
  const { selectBuilding, selectedBuilding, setHoveredBuilding } = useStore()

  const isSelected = selectedBuilding?.id === data.id
  const tier = getBuildingTier(data)
  const { width, height, depth } = data.dimensions
  const { x, z } = data.position

  const baseColor = useMemo(() => {
    const lang = data.language?.toLowerCase() || 'default'
    return LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.default
  }, [data.language])

  useFrame((state) => {
    if (meshRef.current && (data.is_hotspot || isConnected)) {
      const pulse = Math.sin(state.clock.elapsedTime * 2) * 0.15 + 0.85
      if (meshRef.current.material) {
        meshRef.current.material.emissiveIntensity = isConnected ? pulse * 0.4 : pulse * 0.3
      }
    }
  })

  const handleClick = (e) => { e.stopPropagation(); selectBuilding(data) }
  const handleOver = (e) => { e.stopPropagation(); setHoveredBuilding(data); document.body.style.cursor = 'pointer' }
  const handleOut = () => { setHoveredBuilding(null); document.body.style.cursor = 'default' }

  return (
    <group position={[x, 0, z]}>
      {tier === 1 && <SmallShop w={width} h={height} d={depth} color={baseColor} ref={meshRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut} />}
      {tier === 2 && <Apartment w={width} h={height} d={depth} color={baseColor} ref={meshRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut} />}
      {tier === 3 && <OfficeTower w={width} h={height} d={depth} color={baseColor} ref={meshRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut} />}
      {tier === 4 && <Skyscraper w={width} h={height} d={depth} color={baseColor} isHotspot={data.is_hotspot} ref={meshRef} onClick={handleClick} onPointerOver={handleOver} onPointerOut={handleOut} />}

      {/* Selected - green ring */}
      {isSelected && (
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(width, depth) * 0.9, Math.max(width, depth) * 1.1, 32]} />
          <meshBasicMaterial color="#22c55e" transparent opacity={0.9} depthWrite={false} />
        </mesh>
      )}

      {/* Connected - blue ring */}
      {isConnected && !isSelected && (
        <mesh position={[0, 0.2, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <ringGeometry args={[Math.max(width, depth) * 0.8, Math.max(width, depth) * 1, 32]} />
          <meshBasicMaterial color="#3b82f6" transparent opacity={0.7} depthWrite={false} />
        </mesh>
      )}

      {/* Invisible click hitbox - covers entire building */}
      <mesh
        position={[0, height / 2, 0]}
        onClick={handleClick}
        onPointerOver={handleOver}
        onPointerOut={handleOut}
      >
        <boxGeometry args={[width * 1.5, height * 1.5, depth * 1.5]} />
        <meshBasicMaterial transparent opacity={0} />
      </mesh>

      {/* Building Label with pattern detection */}
      <BuildingLabel
        building={data}
        position={{ x: 0, z: 0 }}
        height={height}
      />
    </group>
  )
}

// Tier 1: Small Shop/Office - Brick building with awning
const SmallShop = React.forwardRef(({ w, h, d, color, onClick, onPointerOver, onPointerOut }, ref) => {
  const height = Math.max(3, h * 0.8)
  return (
    <group>
      {/* Foundation/sidewalk */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[w * 1.3, 0.2, d * 1.3]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.9} />
      </mesh>

      {/* Main building - brick style */}
      <mesh ref={ref} position={[0, height / 2 + 0.2, 0]} castShadow onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <boxGeometry args={[w, height, d]} />
        <meshStandardMaterial color="#8b4513" roughness={0.85} />
      </mesh>

      {/* Storefront window */}
      <mesh position={[0, 1.2, d / 2 + 0.01]}>
        <planeGeometry args={[w * 0.7, 1.5]} />
        <meshStandardMaterial color="#87ceeb" roughness={0.1} metalness={0.8} emissive="#fef3c7" emissiveIntensity={0.2} />
      </mesh>

      {/* Awning */}
      <mesh position={[0, 2.2, d / 2 + 0.3]} castShadow>
        <boxGeometry args={[w * 0.9, 0.1, 0.8]} />
        <meshStandardMaterial color={color} roughness={0.6} />
      </mesh>

      {/* Roof edge */}
      <mesh position={[0, height + 0.3, 0]} castShadow>
        <boxGeometry args={[w * 1.05, 0.3, d * 1.05]} />
        <meshStandardMaterial color="#6b7280" roughness={0.7} />
      </mesh>

      {/* Door */}
      <mesh position={[0, 0.9, d / 2 + 0.01]}>
        <planeGeometry args={[0.7, 1.6]} />
        <meshStandardMaterial color="#78350f" roughness={0.9} />
      </mesh>
    </group>
  )
})

// Tier 2: Apartment Building - Multiple floors with window grid
const Apartment = React.forwardRef(({ w, h, d, color, onClick, onPointerOver, onPointerOut }, ref) => {
  const height = Math.max(8, h * 1.2)
  const floors = Math.floor(height / 3)

  return (
    <group>
      {/* Foundation */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[w * 1.2, 0.3, d * 1.2]} />
        <meshStandardMaterial color="#6b7280" roughness={0.8} />
      </mesh>

      {/* Main building */}
      <mesh ref={ref} position={[0, height / 2 + 0.3, 0]} castShadow onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <boxGeometry args={[w * 1.1, height, d * 1.1]} />
        <meshStandardMaterial color="#d4c4a8" roughness={0.75} />
      </mesh>

      {/* Window rows */}
      {Array.from({ length: floors }).map((_, i) => (
        <group key={i}>
          {/* Front windows */}
          <mesh position={[-w * 0.25, 1.5 + i * 2.5, d * 0.55 + 0.01]}>
            <planeGeometry args={[0.8, 1.2]} />
            <meshStandardMaterial color="#1e3a5f" roughness={0.2} emissive="#fef3c7" emissiveIntensity={0.15} />
          </mesh>
          <mesh position={[w * 0.25, 1.5 + i * 2.5, d * 0.55 + 0.01]}>
            <planeGeometry args={[0.8, 1.2]} />
            <meshStandardMaterial color="#1e3a5f" roughness={0.2} emissive="#fef3c7" emissiveIntensity={0.15} />
          </mesh>
        </group>
      ))}

      {/* Roof */}
      <mesh position={[0, height + 0.5, 0]} castShadow>
        <boxGeometry args={[w * 1.15, 0.4, d * 1.15]} />
        <meshStandardMaterial color="#4b5563" roughness={0.6} />
      </mesh>

      {/* Color accent strip */}
      <mesh position={[0, height * 0.5, d * 0.56]}>
        <boxGeometry args={[w * 1.12, 0.3, 0.05]} />
        <meshStandardMaterial color={color} roughness={0.5} />
      </mesh>

      {/* Entrance */}
      <mesh position={[0, 1.3, d * 0.55 + 0.02]}>
        <planeGeometry args={[1.2, 2.4]} />
        <meshStandardMaterial color="#374151" roughness={0.3} />
      </mesh>
    </group>
  )
})

// Tier 3: Office Tower - Modern glass facade
const OfficeTower = React.forwardRef(({ w, h, d, color, onClick, onPointerOver, onPointerOut }, ref) => {
  const height = Math.max(15, h * 1.5)
  const floors = Math.floor(height / 3)

  return (
    <group>
      {/* Plaza base */}
      <mesh position={[0, 0.1, 0]} castShadow>
        <boxGeometry args={[w * 1.8, 0.2, d * 1.8]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.85} />
      </mesh>

      {/* Main tower */}
      <mesh ref={ref} position={[0, height / 2 + 0.2, 0]} castShadow onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <boxGeometry args={[w * 1.2, height, d * 1.2]} />
        <meshStandardMaterial color="#e5e7eb" roughness={0.3} metalness={0.4} />
      </mesh>

      {/* Glass curtain wall */}
      <mesh position={[0, height / 2 + 0.2, d * 0.61]}>
        <planeGeometry args={[w * 1.18, height - 1]} />
        <meshStandardMaterial color="#172554" roughness={0.1} metalness={0.9} emissive="#dbeafe" emissiveIntensity={0.1} />
      </mesh>

      {/* Floor lines */}
      {Array.from({ length: floors }).map((_, i) => (
        <mesh key={i} position={[0, 0.5 + i * (height / floors), 0]} castShadow>
          <boxGeometry args={[w * 1.25, 0.15, d * 1.25]} />
          <meshStandardMaterial color="#6b7280" roughness={0.6} />
        </mesh>
      ))}

      {/* Crown/top */}
      <mesh position={[0, height + 0.5, 0]} castShadow>
        <boxGeometry args={[w * 1.3, 0.8, d * 1.3]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>

      {/* Entrance canopy */}
      <mesh position={[0, 3, d * 0.8]}>
        <boxGeometry args={[w * 0.8, 0.15, 1]} />
        <meshStandardMaterial color="#374151" roughness={0.4} metalness={0.3} />
      </mesh>
    </group>
  )
})

// Tier 4: Skyscraper - Tall with spire and lit top
const Skyscraper = React.forwardRef(({ w, h, d, color, isHotspot, onClick, onPointerOver, onPointerOut }, ref) => {
  const height = Math.max(25, h * 2)

  return (
    <group>
      {/* Large plaza */}
      <mesh position={[0, 0.15, 0]} castShadow>
        <boxGeometry args={[w * 2.5, 0.3, d * 2.5]} />
        <meshStandardMaterial color="#9ca3af" roughness={0.85} />
      </mesh>

      {/* Base podium */}
      <mesh position={[0, 2.5, 0]} castShadow>
        <boxGeometry args={[w * 2, 5, d * 2]} />
        <meshStandardMaterial color="#6b7280" roughness={0.6} />
      </mesh>

      {/* Main tower */}
      <mesh ref={ref} position={[0, height / 2 + 5, 0]} castShadow onClick={onClick} onPointerOver={onPointerOver} onPointerOut={onPointerOut}>
        <boxGeometry args={[w * 1.3, height, d * 1.3]} />
        <meshStandardMaterial
          color="#cbd5e1"
          roughness={0.2}
          metalness={0.6}
          emissive={isHotspot ? "#fbbf24" : "#000"}
          emissiveIntensity={isHotspot ? 0.3 : 0}
        />
      </mesh>

      {/* Glass facade - all sides */}
      {[
        [0, height / 2 + 5, d * 0.66, 0],
        [0, height / 2 + 5, -d * 0.66, Math.PI],
        [w * 0.66, height / 2 + 5, 0, Math.PI / 2],
        [-w * 0.66, height / 2 + 5, 0, -Math.PI / 2]
      ].map(([px, py, pz, ry], i) => (
        <mesh key={i} position={[px, py, pz]} rotation={[0, ry, 0]}>
          <planeGeometry args={[w * 1.28, height - 2]} />
          <meshStandardMaterial color="#1e3a5f" roughness={0.1} metalness={0.9} emissive="#bfdbfe" emissiveIntensity={0.15} />
        </mesh>
      ))}

      {/* Setback top section */}
      <mesh position={[0, height + 7, 0]} castShadow>
        <boxGeometry args={[w * 0.8, 4, d * 0.8]} />
        <meshStandardMaterial color="#94a3b8" roughness={0.3} metalness={0.5} />
      </mesh>

      {/* Spire */}
      <mesh position={[0, height + 12, 0]} castShadow>
        <cylinderGeometry args={[0.3, 0.8, 6, 8]} />
        <meshStandardMaterial color="#64748b" roughness={0.2} metalness={0.8} />
      </mesh>

      {/* Antenna/beacon */}
      <mesh position={[0, height + 16, 0]}>
        <cylinderGeometry args={[0.1, 0.1, 3, 6]} />
        <meshStandardMaterial color="#374151" metalness={0.9} />
      </mesh>

      {/* Top beacon light */}
      <mesh position={[0, height + 17.5, 0]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={isHotspot ? "#ef4444" : "#ffffff"} />
      </mesh>

      {/* Color accent band */}
      <mesh position={[0, height * 0.7 + 5, 0]} castShadow>
        <boxGeometry args={[w * 1.35, 1, d * 1.35]} />
        <meshStandardMaterial color={color} roughness={0.4} />
      </mesh>
    </group>
  )
})

export { LANGUAGE_COLORS }
