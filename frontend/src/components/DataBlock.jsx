import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../store/useStore'

// Tech-focused color palette (Neon/Cyberpunk but clean)
const TYPE_COLORS = {
    api: '#3b82f6',      // Blue
    services: '#8b5cf6', // Purple
    data: '#06b6d4',     // Cyan
    utils: '#22c55e',    // Green
    auth: '#f59e0b',     // Amber
    ui: '#ec4899',       // Pink
    default: '#64748b'   // Slate
}

export default function DataBlock({ data, isConnected }) {
    const meshRef = useRef()
    const { selectBuilding, selectedBuilding, setHoveredBuilding } = useStore()

    const isSelected = selectedBuilding?.id === data.id
    const { width, height, depth } = data.dimensions
    const { x, z } = data.position

    // Determine color based on file type/folder
    const baseColor = useMemo(() => {
        // Simple heuristic for demo - usually you'd check extension or path
        const path = data.name.toLowerCase()
        if (path.includes('api')) return TYPE_COLORS.api
        if (path.includes('service')) return TYPE_COLORS.services
        if (path.includes('util')) return TYPE_COLORS.utils
        if (path.includes('ui') || path.includes('component')) return TYPE_COLORS.ui
        if (path.includes('auth')) return TYPE_COLORS.auth
        return TYPE_COLORS.default
    }, [data.name])

    // Animation for hotspots/connected nodes
    useFrame((state) => {
        if (meshRef.current) {
            // Subtle floating
            // meshRef.current.position.y = (height / 2) + Math.sin(state.clock.elapsedTime + x) * 0.5

            // Pulse if hotspot or connected
            if (data.is_hotspot || isConnected) {
                const time = state.clock.elapsedTime
                const pulse = (Math.sin(time * 3) + 1) * 0.5 // 0 to 1
                meshRef.current.material.emissiveIntensity = data.is_hotspot ? 0.5 + pulse * 0.5 : pulse * 0.3
            }
        }
    })

    const handleClick = (e) => {
        e.stopPropagation()
        selectBuilding(data)
    }

    const handlePointerOver = (e) => {
        e.stopPropagation()
        setHoveredBuilding(data)
        document.body.style.cursor = 'pointer'
    }

    const handlePointerOut = () => {
        setHoveredBuilding(null)
        document.body.style.cursor = 'default'
    }

    return (
        <group position={[x, height / 2, z]}>
            {/*
         DATA BLOCK MESH
         - Abstract representation of code volume
         - Glassy/Metallic look
      */}
            <mesh
                ref={meshRef}
                onClick={handleClick}
                onPointerOver={handlePointerOver}
                onPointerOut={handlePointerOut}
            >
                <boxGeometry args={[width, height, depth]} />
                <meshPhysicalMaterial
                    color={baseColor}
                    roughness={0.2}
                    metalness={0.8}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                    emissive={baseColor}
                    emissiveIntensity={isSelected ? 0.4 : 0.1}
                    transparent
                    opacity={0.9}
                />

                {/* Wireframe Edges - Tron look */}
                <Edges
                    threshold={15} // Display edges only when angle > 15 degrees
                    color={isSelected ? "#ffffff" : baseColor}
                    scale={1.01}
                />
            </mesh>

            {/* Selection Ring (Holographic) */}
            {isSelected && (
                <mesh position={[0, -height / 2 + 0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                    <ringGeometry args={[Math.max(width, depth) * 1.2, Math.max(width, depth) * 1.5, 32]} />
                    <meshBasicMaterial color="#ffffff" transparent opacity={0.5} side={THREE.DoubleSide} />
                </mesh>
            )}


        </group>
    )
}
