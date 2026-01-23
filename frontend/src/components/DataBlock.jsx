import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import { Edges } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../store/useStore'

// Tech-focused color palette (Neon/Cyberpunk but clean)
// GitHub-standard language colors for instant recognition
// Uniform Professional Palette (Sleek Dark City)
const BUILDING_COLOR = '#475569' // Slate 600 - Main building body

// Get file extension from path (kept helper but unused for main color)
function getFileColor(filename) {
    return BUILDING_COLOR
}

export default function DataBlock({ data, isConnected }) {
    const meshRef = useRef()
    const { selectBuilding, selectedBuilding, setHoveredBuilding } = useStore()

    const isSelected = selectedBuilding?.id === data.id
    const { width, height, depth } = data.dimensions
    const { x, z } = data.position

    // Use language-based color
    // Color based on Size (Height/Complexity)
    // Cyberpunk/Compact City Spectrum
    const baseColor = useMemo(() => {
        // Map height to Cool -> Hot spectrum (Blue -> Purple -> Pink -> Orange)
        // Avoids Green/Yellow for a cleaner "sci-fi" look
        // Range: Hue 260 (Deep Blue) down to 10 (Red-Orange)
        // Multiplier helps distinguish small files
        const h = Math.max(20, 260 - Math.min(240, height * 8))
        return `hsl(${h}, 90%, 60%)`
    }, [height])

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

    // Darker shade for roof and foundation
    const roofColor = useMemo(() => {
        const c = new THREE.Color(baseColor)
        c.multiplyScalar(0.7)
        return c
    }, [baseColor])

    const foundationColor = useMemo(() => {
        const c = new THREE.Color(baseColor)
        c.multiplyScalar(0.5)
        return c
    }, [baseColor])

    return (
        <group position={[x, 0, z]}>
            {/* Foundation - darker base */}
            <mesh position={[0, 0.15, 0]} receiveShadow>
                <boxGeometry args={[width * 1.1, 0.3, depth * 1.1]} />
                <meshPhysicalMaterial
                    color={foundationColor}
                    roughness={0.8}
                    metalness={0.2}
                />
            </mesh>

            {/* Main Building Body */}
            <mesh
                ref={meshRef}
                position={[0, height / 2 + 0.3, 0]}
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

            {/* Roof - flat top cap */}
            <mesh position={[0, height + 0.31, 0]} castShadow>
                <boxGeometry args={[width * 0.9, 0.1, depth * 0.9]} />
                <meshPhysicalMaterial
                    color={roofColor}
                    roughness={0.5}
                    metalness={0.4}
                />
            </mesh>
            {/* Selection Box (Rectangular to match building) */}
            {isSelected && (
                <group position={[0, 0.2, 0]}>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[width * 1.5, depth * 1.5]} />
                        <meshBasicMaterial color="#60a5fa" transparent opacity={0.2} />
                    </mesh>
                    <mesh rotation={[-Math.PI / 2, 0, 0]}>
                        <planeGeometry args={[width * 1.5, depth * 1.5]} />
                        <Edges color="#eff6ff" scale={1.0} threshold={15} />
                        <meshBasicMaterial visible={false} />
                    </mesh>
                </group>
            )}


        </group >
    )
}
