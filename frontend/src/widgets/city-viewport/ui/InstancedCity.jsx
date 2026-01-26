import React, { useRef, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, extend } from '@react-three/fiber'
import useStore from '../../../store/useStore'
import { PulseMaterial } from '../shaders/PulseMaterial' // Import the new material
import { getBuildingColor } from '../../../utils/colorUtils'

// Register material (already done in file, but safe)
// extend({ PulseMaterial })

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function InstancedCity() {
    const {
        cityData, selectedBuilding, selectBuilding, hoveredBuilding, setHoveredBuilding,
        layoutMode, colorMode, graphNeighbors, highlightedIssue, cityMeshRef,
        isAnimating, // Sync with timeline playback
        currentCommitIndex // Sync with timeline scrubbing (Robust Fix)
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
            // Skip animation if we are time-travelling (Gource Mode)
            // Fix: Check BOTH isAnimating AND currentCommitIndex to handle scrubbing/stepping
            const isQuick = isAnimating || currentCommitIndex !== -1
            const progress = isQuick ? 1 : Math.min(elapsed / duration, 1)

            // "Digital Rise": Smooth exponential ease-out
            const ease = isQuick ? 1 : 1 - Math.pow(1 - progress, 4)

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
            if (meshRef.current.geometry) {
                if (!meshRef.current.geometry.boundingSphere) {
                    meshRef.current.geometry.boundingSphere = new THREE.Sphere()
                }
                meshRef.current.geometry.boundingSphere.radius = Math.sqrt(maxRadiusSq) + 50
                meshRef.current.geometry.boundingSphere.center.set(0, 0, 0)
            }

            if (progress < 1 && !isQuick) {
                requestAnimationFrame(animateGrowth)
            }
        }
        requestAnimationFrame(animateGrowth)

    }, [buildings, count]) // We don't need 'isAnimating' in deps, it's used as a flag inside effect

    // Update Colors (Selection/Highlight)
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        buildings.forEach((b, i) => {
            const isSelected = selectedBuilding?.id === b.id
            const isHovered = hoveredInstanceId === i

            // Graph States
            const isDependency = selectedBuilding && graphNeighbors.dependencies.includes(b.id)
            const isDependent = selectedBuilding && graphNeighbors.dependents.includes(b.id)

            // INTELLIGENCE LAYERS:
            // 1. Highlight Issues (Cycles/God Objects) from Metadata
            const issues = cityData?.metadata?.issues || {}
            const isCircular = issues.circular_dependencies?.flat().includes(b.id)
            const isGodObject = issues.god_objects?.includes(b.id)

            // If we are in "Default" mode, we show these critical warnings
            const showWarnings = colorMode === 'default' || colorMode === 'churn'

            // Priority: Explicit Issue > Selected > Dependency > ...
            // But we pass flags to getBuildingColor to handle priority

            const isIssueHighlighted = highlightedIssue && highlightedIssue.paths.includes(b.path)

            // Unrelated Logic (Focus Mode)
            const isUnrelated = (highlightedIssue && !isIssueHighlighted) ||
                (!highlightedIssue && selectedBuilding && !isSelected && !isDependency && !isDependent)

            // Get Color from Utility
            const colorHex = getBuildingColor(b, colorMode, {
                isSelected, isHovered, isDependency, isDependent,
                isUnrelated, highlightedIssue, isIssueHighlighted,
                isCircular, isGodObject, showWarnings
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


    // Data Attribute Logic: Create buffers
    const churnAttribute = useMemo(() => {
        if (count === 0) return null
        const array = new Float32Array(count)
        buildings.forEach((b, i) => {
            array[i] = b.metrics?.churn || 0
        })
        return new THREE.InstancedBufferAttribute(array, 1) // 1 float per instance
    }, [buildings, count])


    if (count === 0) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, count]}
            frustumCulled={false}
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={(e) => {
                e.stopPropagation()
                if (e.instanceId !== undefined) {
                    selectBuilding(buildings[e.instanceId])
                }
            }}
        >
            <boxGeometry args={[1, 1, 1]}>
                {churnAttribute && (
                    <instancedBufferAttribute
                        attach="attributes-aChurn" // Attach to geometry.attributes.aChurn
                        args={[churnAttribute.array, 1]}
                    />
                )}
            </boxGeometry>

            {/* The Living Material */}
            <pulseMaterial
                ref={materialRef}
                transparent={false}
                depthWrite={true}
                vertexColors={true} // Vital for instanceColor support
            />
        </instancedMesh>
    )
}
