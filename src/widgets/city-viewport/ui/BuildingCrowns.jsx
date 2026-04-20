import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

function getCrownType(building) {
  const name = building.name?.toLowerCase() || ''
  if (/^(main|index|app)\.(js|jsx|ts|tsx)$/.test(name)) return 'entry'
  if ((building.metrics?.churn || 0) > 10) return 'hot'
  if ((building.metrics?.complexity || 0) > 30) return 'complex'
  return null
}

// Simple beacon for entry points
function EntryBeacons({ buildings }) {
  const entries = useMemo(() => 
    buildings.filter(b => getCrownType(b) === 'entry'), [buildings])
  
  if (entries.length === 0) return null
  
  return (
    <group>
      {entries.map((b, i) => {
        const y = (b.dimensions?.height || 10) * 3 + 5
        return (
          <group key={i} position={[b.position.x, y, b.position.z]}>
            {/* Light beam */}
            <mesh>
              <cylinderGeometry args={[0.3, 0.8, 15, 8]} />
              <meshBasicMaterial color="#ffd700" transparent opacity={0.3} />
            </mesh>
            {/* Diamond top */}
            <mesh position={[0, 10, 0]}>
              <octahedronGeometry args={[1.5]} />
              <meshBasicMaterial color="#ffaa00" />
            </mesh>
            <pointLight color="#ffd700" intensity={2} distance={30} />
          </group>
        )
      })}
    </group>
  )
}

// Pulsing ring for hot files
function HotFileRings({ buildings }) {
  const ringRef = useRef()
  const hots = useMemo(() => 
    buildings.filter(b => getCrownType(b) === 'hot'), [buildings])
  
  // Throttle to ~20fps — the pulse reads identically at half rate
  // and saves per-frame work on scenes with many hot buildings.
  const lastT = useRef(0)
  useFrame((state) => {
    if (!ringRef.current) return
    const t = state.clock.elapsedTime
    if (t - lastT.current < 0.05) return
    lastT.current = t
    const scale = 1 + Math.sin(t * 4) * 0.2
    ringRef.current.children.forEach(child => {
      child.scale.setScalar(scale)
    })
  })
  
  if (hots.length === 0) return null
  
  return (
    <group ref={ringRef}>
      {hots.map((b, i) => {
        const y = (b.dimensions?.height || 10) * 3 + 2
        const size = (b.dimensions?.width || 8) * 0.6
        return (
          <mesh key={i} position={[b.position.x, y, b.position.z]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[size, size + 0.5, 32]} />
            <meshBasicMaterial color="#ff3333" transparent opacity={0.7} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

// Orange halo for complex files
function ComplexHalos({ buildings }) {
  const complex = useMemo(() => 
    buildings.filter(b => getCrownType(b) === 'complex' && getCrownType(b) !== 'hot'), [buildings])
  
  if (complex.length === 0) return null
  
  return (
    <group>
      {complex.map((b, i) => {
        const y = (b.dimensions?.height || 10) * 3 + 1
        const size = (b.dimensions?.width || 8) * 0.5
        return (
          <mesh key={i} position={[b.position.x, y, b.position.z]} rotation={[-Math.PI/2, 0, 0]}>
            <ringGeometry args={[size, size + 0.4, 32]} />
            <meshBasicMaterial color="#ff9900" transparent opacity={0.5} side={THREE.DoubleSide} />
          </mesh>
        )
      })}
    </group>
  )
}

const BuildingCrowns = React.memo(function BuildingCrowns() {
  const buildings = useStore(s => s.cityData?.buildings || [])
  
  if (buildings.length === 0) return null
  
  return (
    <group>
      <EntryBeacons buildings={buildings} />
      <HotFileRings buildings={buildings} />
      <ComplexHalos buildings={buildings} />
    </group>
  )
})

export default BuildingCrowns
