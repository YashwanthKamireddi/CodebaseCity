import React, { useRef, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame, extend, useThree } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import useStore from '../../../store/useStore'
import { PulseMaterial } from '../shaders/PulseMaterial'
import { getBuildingColor } from '../../../utils/colorUtils'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()
const planeNormal = new THREE.Vector3(0, 1, 0)
const intersectPoint = new THREE.Vector3()

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
        currentCommitIndex,
        activeIntelligencePanel,
        impactAnalysis,
        refactoringModeActive, applyRefactoringDrift, refactoringDrifts
    } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()
    const { camera, raycaster, pointer } = useThree()

    // Drag State
    const [draggedInstanceId, setDraggedInstanceId] = useState(null)
    const [dragActive, setDragActive] = useState(false)
    const dragPlane = useRef(new THREE.Plane(planeNormal, 0))

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

    // Visibility and Frustum Culling State
    const frustumRef = useRef(new THREE.Frustum())
    const projScreenMatrixRef = useRef(new THREE.Matrix4())
    const boundingSpheresRef = useRef([])

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
        let animationFrameId;

        const animateGrowth = (now) => {
            if (!meshRef.current) return; // Safety check if unmounted during animation

            const elapsed = now - startTime
            const isQuick = isAnimating || currentCommitIndex !== -1 || count > 500
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
                const y = currentHeight / 2 // Removed arbitrary + 0.2 hover offset

                tempObject.position.set(x, y, z)
                tempObject.scale.set(width, currentHeight, depth)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)

                // Store bounding sphere for custom culling
                const localRadius = Math.max(width, Math.max(currentHeight, depth)) / 2
                boundingSpheresRef.current[i] = new THREE.Sphere(new THREE.Vector3(x, y, z), localRadius + 2.0)

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
                animationFrameId = requestAnimationFrame(animateGrowth)
            }
        }
        animationFrameId = requestAnimationFrame(animateGrowth)

        return () => {
            if (animationFrameId) {
                cancelAnimationFrame(animationFrameId)
            }
        }
    }, [buildings, count, isAnimating, currentCommitIndex])

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
            const isCircular = issues.circular_dependencies?.flat()?.includes(b.id) || false
            const isGodObject = issues.god_objects?.includes(b.id) || false
            const showWarnings = colorMode === 'default' || colorMode === 'churn'

            const isIssueHighlighted = highlightedIssue && highlightedIssue.paths.includes(b.path)

            // Blast Radius logic
            let blastLevel = null
            if (activeIntelligencePanel === 'impact' && impactAnalysis) {
                if (impactAnalysis.file_id === b.id) blastLevel = 0
                else if (impactAnalysis.levels?.level_1?.find(f => f.id === b.id)) blastLevel = 1
                else if (impactAnalysis.levels?.level_2?.find(f => f.id === b.id)) blastLevel = 2
                else if (impactAnalysis.levels?.level_3?.find(f => f.id === b.id)) blastLevel = 3
            }

            // Focus mode dimming
            let isUnrelated = (highlightedIssue && !isIssueHighlighted) ||
                (!highlightedIssue && selectedBuilding && !isSelected && !isDependency && !isDependent)

            // Override dimming if we are in impact mode
            if (activeIntelligencePanel === 'impact') {
                isUnrelated = blastLevel === null
            }

            const colorHex = getBuildingColor(b, colorMode, {
                isSelected, isHovered, isDependency, isDependent,
                isUnrelated, highlightedIssue, isIssueHighlighted,
                isCircular, isGodObject, showWarnings,
                activeIntelligencePanel, blastLevel
            })

            tempColor.set(colorHex)
            meshRef.current.setColorAt(i, tempColor)

            // Structural transform calculations (size / vertical layout)
            const width = b.dimensions?.width || 8
            const depth = b.dimensions?.depth || 8
            const height = b.dimensions?.height || 8

            // Swamp Topography Logic
            // Files with extreme debt sink heavily into the ground (below y=0) into the foggy void.
            const debt = b.metrics?.debt || 0
            const swampOffset = (debt * debt) * -15.0 // Sink up to 15 units down

            tempObject.position.set(b.position.x, (height / 2) + swampOffset, b.position.z)
            tempObject.scale.set(width, height, depth)
            tempObject.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObject.matrix)
        })

        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true
        }
        if (meshRef.current.instanceMatrix) {
            meshRef.current.instanceMatrix.needsUpdate = true
        }
    }, [
        buildings, selectedBuilding, hoveredInstanceId, colorMode,
        graphNeighbors, highlightedIssue, activeIntelligencePanel, impactAnalysis
    ])

    // ═══════════════════════════════════════════════════════════════
    // FRUSTUM CULLING — Zero-Allocation Production Engine
    // Runs every 3rd frame to save CPU. Uses pre-allocated scratch
    // vectors to eliminate GC pressure entirely.
    // ═══════════════════════════════════════════════════════════════
    const cullFrameCounter = useRef(0)
    const cullScratchMatrix = useMemo(() => new THREE.Matrix4(), [])
    const cullScratchPos = useMemo(() => new THREE.Vector3(), [])
    const cullScratchScale = useMemo(() => new THREE.Vector3(), [])
    const cullScratchQuat = useMemo(() => new THREE.Quaternion(), [])

    useFrame(() => {
        if (!meshRef.current || count === 0 || boundingSpheresRef.current.length === 0) return

        // Only cull every 3rd frame — buildings don't pop in/out that fast
        cullFrameCounter.current++
        if (cullFrameCounter.current % 3 !== 0) return

        // Update Frustum from current camera
        projScreenMatrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        frustumRef.current.setFromProjectionMatrix(projScreenMatrixRef.current)

        let dirty = false

        for (let i = 0; i < count; i++) {
            const sphere = boundingSpheresRef.current[i]
            if (!sphere) continue

            // Read current matrix for this instance
            meshRef.current.getMatrixAt(i, cullScratchMatrix)
            cullScratchMatrix.decompose(cullScratchPos, cullScratchQuat, cullScratchScale)

            const isVisible = frustumRef.current.intersectsSphere(sphere)
            const isCurrentlyHidden = cullScratchScale.x === 0 && cullScratchScale.y === 0 && cullScratchScale.z === 0

            if (isVisible && isCurrentlyHidden) {
                // RESTORE: Building just re-entered the view — restore its real scale
                const b = buildings[i]
                const width = b.dimensions?.width || 8
                const depth = b.dimensions?.depth || 8
                const height = b.dimensions?.height || 8
                tempObject.position.copy(cullScratchPos)
                tempObject.scale.set(width, height, depth)
                tempObject.rotation.set(0, 0, 0)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)
                dirty = true
            } else if (!isVisible && !isCurrentlyHidden) {
                // HIDE: Building just left the view — zero-scale it
                tempObject.position.copy(cullScratchPos)
                tempObject.scale.set(0, 0, 0)
                tempObject.rotation.set(0, 0, 0)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)
                dirty = true
            }
            // If already visible and shown, or already hidden and culled — skip (no work needed)
        }

        // Single GPU upload per frame instead of N uploads inside the loop
        if (dirty) {
            meshRef.current.instanceMatrix.needsUpdate = true
        }
    })

    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLERS — throttled for performance
    // ═══════════════════════════════════════════════════════════════
    const lastPointerTime = useRef(0)
    const handlePointerMove = (e) => {
        e.stopPropagation()
        // Throttle: only update hover every 50ms to prevent raycast spam during orbit
        const now = performance.now()
        if (now - lastPointerTime.current < 50) return
        lastPointerTime.current = now
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
        // Do not select if we just finished a drag
        if (dragActive) return

        if (e.instanceId !== undefined) {
            selectBuilding(buildings[e.instanceId])
        }
    }

    // ═══════════════════════════════════════════════════════════════
    // DRAG-AND-DROP REFACTORING ENGINE
    // ═══════════════════════════════════════════════════════════════
    const bindDrag = useDrag(({ active, movement: [mx, my], first, last, event }) => {
        if (!refactoringModeActive) return

        if (first && event.instanceId !== undefined) {
            event.stopPropagation()
            document.body.style.cursor = 'grabbing'
            setDraggedInstanceId(event.instanceId)
            setDragActive(true)

            // Set the invisible drag plane to the height of the clicked building
            const b = buildings[event.instanceId]
            const height = b.dimensions?.height || 8
            dragPlane.current.constant = -(height / 2) // Three.js uses -d for plane equation
        }

        if (active && draggedInstanceId !== null) {
            // Unproject mouse coordinates to find intersection with the drag plane
            raycaster.setFromCamera(pointer, camera)
            raycaster.ray.intersectPlane(dragPlane.current, intersectPoint)

            if (intersectPoint) {
                // Update transformation matrix of ONLY the dragged building
                const b = buildings[draggedInstanceId]
                const width = b.dimensions?.width || 8
                const depth = b.dimensions?.depth || 8
                const height = b.dimensions?.height || 8

                tempObject.position.copy(intersectPoint)
                tempObject.scale.set(width, height, depth)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(draggedInstanceId, tempObject.matrix)
                meshRef.current.instanceMatrix.needsUpdate = true
            }
        }

        if (last && draggedInstanceId !== null) {
            document.body.style.cursor = 'auto'
            setDragActive(false)

            // Calculate which district we dropped it in
            raycaster.setFromCamera(pointer, camera)

            // NOTE: A robust implementation would raycast against the 'District' meshes here.
            // For now, we update the position visually, but we need the backend / district layout
            // bounds to definitively say "moved from District A to District B".

            // Snap back for now, or keep position if registered
            setDraggedInstanceId(null)

            // Trigger reactivity to snap back
            meshRef.current.instanceMatrix.needsUpdate = true
        }
    }, { filterTaps: true })

    // Telemetry Heat data for shader (Normalized Churn/Commits)
    const churnAttribute = useMemo(() => {
        if (count === 0) return null
        const array = new Float32Array(count)

        let maxCommits = 10 // Baseline
        buildings.forEach(b => {
            const commits = b.metrics?.commits || 0
            if (commits > maxCommits) maxCommits = commits
        })

        buildings.forEach((b, i) => {
            const commits = b.metrics?.commits || 0
            // Non-linear scaling to make hotspots stand out more rapidly
            const normalized = Math.pow(commits / maxCommits, 2.0)
            array[i] = normalized
        })
        return new THREE.InstancedBufferAttribute(array, 1)
    }, [buildings, count])

    // Opacity data
    const opacityAttribute = useMemo(() => {
        if (count === 0) return null
        const array = new Float32Array(count)
        buildings.forEach((b, i) => {
            array[i] = 0.95
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
            onClick={handleClick}
            {...(refactoringModeActive ? bindDrag() : {})}
        >
            <boxGeometry args={[1, 1, 1]}>
                {churnAttribute && (
                    <instancedBufferAttribute
                        attach="attributes-aChurn" // Attach to geometry.attributes.aChurn
                        args={[churnAttribute.array, 1]}
                    />
                )}
                {opacityAttribute && (
                    <instancedBufferAttribute
                        attach="attributes-aOpacityOverride"
                        args={[opacityAttribute.array, 1]}
                    />
                )}
            </boxGeometry>

            {/* The Living Material */}
            <pulseMaterial
                ref={materialRef}
                transparent={true}
                depthWrite={true}
                blending={THREE.NormalBlending}
                vertexColors={true} // Vital for instanceColor support
            />
        </instancedMesh>
    )
}
