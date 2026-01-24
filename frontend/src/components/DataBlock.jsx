import React, { useRef, useMemo, useState } from 'react'
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
    const { selectBuilding, selectedBuilding, setHoveredBuilding, graphNeighbors, highlightedIssue } = useStore()

    const isSelected = selectedBuilding?.id === data.id
    const isDependency = selectedBuilding && graphNeighbors.dependencies.includes(data.id)
    const isDependent = selectedBuilding && graphNeighbors.dependents.includes(data.id)

    // Issue Highlighting Logic
    const isIssueHighlighted = highlightedIssue && highlightedIssue.paths.includes(data.path)

    // Unrelated if Issue Mode covers everything NOT IN issue
    // If HighlightMode is ACTIVE, everything else is UNRELATED
    const isUnrelated = (highlightedIssue && !isIssueHighlighted) ||
        (!highlightedIssue && selectedBuilding && !isSelected && !isDependency && !isDependent)

    const { width, height, depth } = data.dimensions
    const { layoutMode } = useStore() // Get global layout mode

    // Compute Position based on Layout Mode
    const position = useMemo(() => {
        const { x, z } = data.position

        if (layoutMode === 'galaxy') {
            // Galaxy Warp: Spiral Transformation
            const r = Math.sqrt(x * x + z * z)
            const theta = Math.atan2(z, x) + r * 0.1 // Twist factor

            // 3D Sphere/Bowl Effect
            const spiralX = r * Math.cos(theta)
            const spiralZ = r * Math.sin(theta)
            const spiralY = Math.sin(r * 0.05) * 10 // Elevation waves

            return [spiralX, spiralY, spiralZ]
        }

        // Default City Grid
        return [x, 0, z]
    }, [data.position, layoutMode])

    const [x, y, z] = position

    // Dynamic coloring based on relationship
    const baseColor = useMemo(() => {
        if (highlightedIssue) {
            if (isIssueHighlighted) return '#ef4444' // Red For Issues
            return '#1e293b' // Dimmed
        }

        if (isSelected) return '#facc15' // Gold (Selected)
        if (isDependency) return '#4ade80' // Green (Dependency - Upstream)
        if (isDependent) return '#f87171' // Red (Dependent - Downstream Impact)

        // --- Color Modes ---
        if (colorMode === 'layer') {
            const l = data.layer || 'other'
            if (l === 'ui') return '#3b82f6' // Blue
            if (l === 'service') return '#8b5cf6' // Violet
            if (l === 'data') return '#06b6d4' // Cyan
            if (l === 'util') return '#22c55e' // Green
            return '#64748b' // Slate
        }

        if (colorMode === 'churn') {
            // Hotspots are red, stable is blue
            if (data.is_hotspot) return '#ef4444'
            const churn = data.metrics?.churn || 0
            if (churn > 5) return '#f97316' // Orange
            if (churn > 2) return '#fbbf24' // Yellow
            return '#3b82f6' // Blue
        }

        if (colorMode === 'language') {
            const ext = data.path.split('.').pop()
            if (['ts', 'tsx'].includes(ext)) return '#3178c6'
            if (['js', 'jsx'].includes(ext)) return '#f7df1e'
            if (ext === 'py') return '#3572a5'
            if (ext === 'css') return '#563d7c'
            if (ext === 'html') return '#e34c26'
            return '#64748b'
        }

        if (isUnrelated) return '#1e293b' // Dark Slate (Unrelated - Dimmed)

        // Default: Height-based spectrum
        const h = Math.max(20, 260 - Math.min(240, height * 8))
        return `hsl(${h}, 90%, 60%)`
    }, [height, isSelected, isDependency, isDependent, isUnrelated, highlightedIssue, isIssueHighlighted, colorMode, data.layer, data.metrics, data.path, data.is_hotspot])

    // Opacity logic
    const opacity = isUnrelated ? 0.1 : 0.9
    const emissiveIntensity = (highlightedIssue && isIssueHighlighted) ? 1.0 : (isSelected ? 0.8 : (isDependency || isDependent) ? 0.5 : 0.1)

    // Animation state
    const revealTime = useMemo(() => {
        // Stagger based on distance from origin (x, z)
        const dist = Math.sqrt(x * x + z * z)
        return dist * 0.02 // 20ms per unit of distance
    }, [x, z])

    const [grown, setGrown] = useState(false)
    const mountTimeRef = useRef(null)

    // Reset animation if data changes (e.g. re-analysis)
    React.useEffect(() => {
        setGrown(false)
        mountTimeRef.current = null
    }, [data])

    // Animation for growth + hotspots
    useFrame((state) => {
        if (meshRef.current) {
            // Capture mount time on first frame
            if (mountTimeRef.current === null) {
                mountTimeRef.current = state.clock.elapsedTime
            }

            // Calculate time elapsed SINCE this building was created
            const time = state.clock.elapsedTime - mountTimeRef.current

            // 1. Growth Animation (Intro)
            if (!grown) {
                if (time > revealTime) {
                    const currentScale = meshRef.current.scale.y

                    if (currentScale < 1) {
                        // Smooth Lerp
                        meshRef.current.scale.y += (1 - currentScale) * 0.08

                        // Grow from bottom constraints
                        meshRef.current.position.y = (height * meshRef.current.scale.y) / 2 + 0.3

                        // Snap to finish when close
                        if (Math.abs(1 - currentScale) < 0.01) {
                            setGrown(true)
                            meshRef.current.scale.y = 1
                            meshRef.current.position.y = height / 2 + 0.3
                        }
                    } else {
                        setGrown(true)
                    }
                } else {
                    // Waiting for wave - hidden or tiny
                    meshRef.current.scale.y = 0.01
                    meshRef.current.position.y = 0.3
                    meshRef.current.visible = true
                }
            }

            // 2. Pulse Animation (Continuous)
            if (grown && (data.is_hotspot || isDependency || isDependent)) {
                // Use global time for sync pulsing
                const globalTime = state.clock.elapsedTime
                const pulse = (Math.sin(globalTime * 3) + 1) * 0.5
                meshRef.current.material.emissiveIntensity = (data.is_hotspot || isSelected)
                    ? 0.5 + pulse * 0.5
                    : 0.2 + pulse * 0.4
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
        <group position={[x, y, z]}>
            {/* Foundation - darker base */}
            <mesh position={[0, 0.15, 0]} receiveShadow>
                <boxGeometry args={[width * 1.1, 0.3, depth * 1.1]} />
                <meshPhysicalMaterial
                    color={foundationColor}
                    roughness={0.8}
                    metalness={0.2}
                    transparent
                    opacity={opacity}
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
                    emissiveIntensity={emissiveIntensity}
                    transparent
                    opacity={opacity}
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
