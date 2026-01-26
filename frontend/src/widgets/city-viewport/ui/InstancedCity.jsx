import React, { useRef, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../store/useStore'
import { buildingVertexShader, buildingFragmentShader } from '../../../shaders/BuildingShader'
import { getBuildingColor } from '../../../utils/colorUtils'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function InstancedCity() {
    const {
        cityData, selectedBuilding, selectBuilding, hoveredBuilding, setHoveredBuilding,
        layoutMode, colorMode, graphNeighbors, highlightedIssue, cityMeshRef
    } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()

    // Expose Ref
    useLayoutEffect(() => {
        if (meshRef.current) cityMeshRef.current = meshRef.current
    })

    // Derived Data: Filter valid buildings
    const buildings = useMemo(() => cityData?.buildings || [], [cityData])
    const count = buildings.length

    // Animation Loop
    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
        }
    })

    // State for hover logic
    const [hoveredInstanceId, setHoveredInstanceId] = useState(null)

    // Physics / Layout Logic
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        // Reset to grid positions with Animation

        // IMMEDIATE FIX: Set Bounding Sphere large enough initially so first frame clicks work
        if (meshRef.current && meshRef.current.geometry) {
            if (!meshRef.current.geometry.boundingSphere) {
                meshRef.current.geometry.boundingSphere = new THREE.Sphere()
            }
            meshRef.current.geometry.boundingSphere.radius = 5000 // Huge default
            meshRef.current.geometry.boundingSphere.center.set(0, 0, 0)
        }

        // Digital Materialization Animation
        // Digital Materialization Animation
        const startTime = performance.now()
        const duration = 1600 // Slower, more majestic

        const animateGrowth = (now) => {
            const elapsed = now - startTime
            const progress = Math.min(elapsed / duration, 1)

            // "Digital Rise": Smooth exponential ease-out
            // Starts fast, lands soft. No bounce.
            const ease = 1 - Math.pow(1 - progress, 4)

            let maxRadiusSq = 0

            buildings.forEach((b, i) => {
                const { x, z } = b.position
                // Safety: Ensure dimensions exist
                const width = b.dimensions?.width || 10
                const depth = b.dimensions?.depth || 10
                const targetHeight = b.dimensions?.height || 10

                // Current height grows from near-zero
                const currentHeight = targetHeight * ease

                // Y-Rise: Bottom is fixed at 0.3 (Ground), grows UP.
                // This creates the effect of rising from the layout plane.
                const y = (currentHeight / 2) + 0.3

                tempObject.position.set(x, y, z)
                // Scale Y from 0 to 1
                tempObject.scale.set(width, Math.max(0.1, currentHeight), depth)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)

                // Track max radius for bounding sphere
                const distSq = x * x + z * z
                if (distSq > maxRadiusSq) maxRadiusSq = distSq
            })
            meshRef.current.instanceMatrix.needsUpdate = true

            // CRITICAL: Override Bounding Sphere for Raycasting
            // If we don't do this, Raycaster checks the default 1x1x1 sphere and fails everything.
            if (meshRef.current.geometry) {
                if (!meshRef.current.geometry.boundingSphere) {
                    meshRef.current.geometry.boundingSphere = new THREE.Sphere()
                }
                // Set radius to cover the furthest building + padding
                meshRef.current.geometry.boundingSphere.radius = Math.sqrt(maxRadiusSq) + 50
                meshRef.current.geometry.boundingSphere.center.set(0, 0, 0)
            }

            if (progress < 1) {
                requestAnimationFrame(animateGrowth)
            }
        }
        requestAnimationFrame(animateGrowth)

    }, [buildings, count]) // Run only when data changes

    // Update Colors (Selection/Highlight)
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        buildings.forEach((b, i) => {
            const isSelected = selectedBuilding?.id === b.id
            const isHovered = hoveredInstanceId === i

            // Graph States
            const isDependency = selectedBuilding && graphNeighbors.dependencies.includes(b.id)
            const isDependent = selectedBuilding && graphNeighbors.dependents.includes(b.id)
            const isIssueHighlighted = highlightedIssue && highlightedIssue.paths.includes(b.path)

            // Unrelated Logic
            const isUnrelated = (highlightedIssue && !isIssueHighlighted) ||
                (!highlightedIssue && selectedBuilding && !isSelected && !isDependency && !isDependent)

            // Get Color from Utility
            const colorHex = getBuildingColor(b, colorMode, {
                isSelected, isHovered, isDependency, isDependent,
                isUnrelated, highlightedIssue, isIssueHighlighted
            })

            tempColor.set(colorHex)
            meshRef.current.setColorAt(i, tempColor)
        })

        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
    }, [
        buildings, selectedBuilding, hoveredInstanceId, colorMode,
        graphNeighbors, highlightedIssue
    ])

    // Event Handlers
    const handlePointerMove = (e) => {
        e.stopPropagation()
        // Instance ID is strictly the index in the array
        if (e.instanceId !== undefined) {
            setHoveredInstanceId(e.instanceId)
            // Sync with Global Store (Optional, debounce this for perf)
            // setHoveredBuilding(buildings[e.instanceId])
        }
    }

    const handlePointerOut = () => {
        setHoveredInstanceId(null)
        setHoveredBuilding(null)
    }

    const handleClick = (e) => {
        e.stopPropagation()
        if (e.instanceId !== undefined) {
            selectBuilding(buildings[e.instanceId])
        }
    }

    if (count === 0) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, count]}
            frustumCulled={false} // CRITICAL: Fixes raycasting by bypassing bounding sphere check
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={(e) => {
                e.stopPropagation()
                console.log('Click on instance:', e.instanceId)
                if (e.instanceId !== undefined) {
                    selectBuilding(buildings[e.instanceId])
                }
            }}
        >
            <boxGeometry args={[1, 1, 1]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={buildingVertexShader}
                fragmentShader={buildingFragmentShader}
                uniforms={{
                    uTime: { value: 0 }
                }}
                transparent={false} // CRITICAL: Fixes Z-fighting/Flickering on overlapping buildings
                depthWrite={true}
                vertexColors={true}
            />
        </instancedMesh>
    )
}
