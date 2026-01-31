import React, { useRef, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, extend } from '@react-three/fiber'
import useStore from '../../../store/useStore'
import { PulseMaterial } from '../shaders/PulseMaterial'
import { getBuildingColor } from '../../../utils/colorUtils'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

/**
 * InstancedCity - High-Performance Building Renderer
 *
 * Features:
 * - GPU-instanced rendering for 10,000+ buildings
 * - Smooth spring-based animations
 * - Premium glass tower shader
 * - Interactive hover/selection states
 */
export default function InstancedCity() {
    const {
        cityData, selectedBuilding, selectBuilding, hoveredBuilding, setHoveredBuilding,
        layoutMode, colorMode, graphNeighbors, highlightedIssue, cityMeshRef,
        isAnimating,
        currentCommitIndex
    } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()

    // Expose Ref
    useLayoutEffect(() => {
        if (meshRef.current) cityMeshRef.current = meshRef.current
    })

    // Derived Data
    const buildings = useMemo(() => cityData?.buildings || [], [cityData])
    const count = buildings.length

    // Smooth time-based animation
    useFrame((state) => {
        if (materialRef.current) {
            materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
        }
    })

    const [hoveredInstanceId, setHoveredInstanceId] = useState(null)

    // ═══════════════════════════════════════════════════════════════
    // BUILDING ANIMATION - Smooth "Digital Rise" effect
    // ═══════════════════════════════════════════════════════════════
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        // Initialize bounding sphere for raycasting
        if (meshRef.current.geometry) {
            if (!meshRef.current.geometry.boundingSphere) {
                meshRef.current.geometry.boundingSphere = new THREE.Sphere()
            }
            meshRef.current.geometry.boundingSphere.radius = 5000
            meshRef.current.geometry.boundingSphere.center.set(0, 0, 0)
        }

        const startTime = performance.now()
        const duration = 2000 // 2 seconds for smooth rise

        const animateGrowth = (now) => {
            const elapsed = now - startTime
            const isQuick = isAnimating || currentCommitIndex !== -1
            const progress = isQuick ? 1 : Math.min(elapsed / duration, 1)

            // Premium easing: exponential ease-out with slight bounce
            const ease = isQuick ? 1 : 1 - Math.pow(1 - progress, 4)

            // Add subtle stagger based on distance from center
            let maxRadiusSq = 0

            buildings.forEach((b, i) => {
                const { x, z } = b.position
                const width = b.dimensions?.width || 8
                const depth = b.dimensions?.depth || 8
                const targetHeight = b.dimensions?.height || 8

                // Distance-based stagger for wave effect
                const dist = Math.sqrt(x * x + z * z)
                const staggerDelay = isQuick ? 0 : Math.min(dist / 500, 0.3)
                const staggeredProgress = Math.max(0, (progress - staggerDelay) / (1 - staggerDelay))
                const staggeredEase = isQuick ? 1 : 1 - Math.pow(1 - Math.min(staggeredProgress, 1), 4)

                const currentHeight = Math.max(0.5, targetHeight * staggeredEase)
                const y = (currentHeight / 2) + 0.2

                tempObject.position.set(x, y, z)
                tempObject.scale.set(width, currentHeight, depth)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)

                const distSq = x * x + z * z
                if (distSq > maxRadiusSq) maxRadiusSq = distSq
            })

            meshRef.current.instanceMatrix.needsUpdate = true

            // Update bounding sphere
            if (meshRef.current.geometry) {
                meshRef.current.geometry.boundingSphere.radius = Math.sqrt(maxRadiusSq) + 100
                meshRef.current.geometry.boundingSphere.center.set(0, 0, 0)
            }

            if (progress < 1 && !isQuick) {
                requestAnimationFrame(animateGrowth)
            }
        }
        requestAnimationFrame(animateGrowth)

    }, [buildings, count])

    // ═══════════════════════════════════════════════════════════════
    // COLOR UPDATES - Real-time interaction feedback
    // ═══════════════════════════════════════════════════════════════
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        buildings.forEach((b, i) => {
            const isSelected = selectedBuilding?.id === b.id
            const isHovered = hoveredInstanceId === i

            // Graph relationships
            const isDependency = selectedBuilding && graphNeighbors.dependencies.includes(b.id)
            const isDependent = selectedBuilding && graphNeighbors.dependents.includes(b.id)

            // Code health issues
            const issues = cityData?.metadata?.issues || {}
            const isCircular = issues.circular_dependencies?.flat().includes(b.id)
            const isGodObject = issues.god_objects?.includes(b.id)
            const showWarnings = colorMode === 'default' || colorMode === 'churn'

            const isIssueHighlighted = highlightedIssue && highlightedIssue.paths.includes(b.path)

            // Focus mode dimming
            const isUnrelated = (highlightedIssue && !isIssueHighlighted) ||
                (!highlightedIssue && selectedBuilding && !isSelected && !isDependency && !isDependent)

            const colorHex = getBuildingColor(b, colorMode, {
                isSelected, isHovered, isDependency, isDependent,
                isUnrelated, highlightedIssue, isIssueHighlighted,
                isCircular, isGodObject, showWarnings
            })

            tempColor.set(colorHex)
            meshRef.current.setColorAt(i, tempColor)
        })

        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true
        }
    }, [
        buildings, selectedBuilding, hoveredInstanceId, colorMode,
        graphNeighbors, highlightedIssue
    ])

    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLERS
    // ═══════════════════════════════════════════════════════════════
    const handlePointerMove = (e) => {
        e.stopPropagation()
        if (e.instanceId !== undefined) {
            setHoveredInstanceId(e.instanceId)
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

    // Churn data for shader
    const churnAttribute = useMemo(() => {
        if (count === 0) return null
        const array = new Float32Array(count)
        buildings.forEach((b, i) => {
            array[i] = b.metrics?.churn || 0
        })
        return new THREE.InstancedBufferAttribute(array, 1)
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
