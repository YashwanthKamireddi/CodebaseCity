import React, { useRef, useLayoutEffect, useMemo, useState, useCallback } from 'react'
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
    // Granular selectors — only re-render when specific state changes
    const cityData = useStore(s => s.cityData)
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const selectBuilding = useStore(s => s.selectBuilding)
    const setHoveredBuilding = useStore(s => s.setHoveredBuilding)
    const colorMode = useStore(s => s.colorMode)
    const highlightedIssue = useStore(s => s.highlightedIssue)
    const cityMeshRef = useStore(s => s.cityMeshRef)
    const isAnimating = useStore(s => s.isAnimating)
    const currentCommitIndex = useStore(s => s.currentCommitIndex)
    const refactoringModeActive = useStore(s => s.refactoringModeActive)
    const applyRefactoringDrift = useStore(s => s.applyRefactoringDrift)
    const refactoringDrifts = useStore(s => s.refactoringDrifts)
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
    const visibleRef = useRef(null) // Uint8Array bitfield — 1=visible, 0=culled

    // ═══════════════════════════════════════════════════════════════
    // BUILDING ANIMATION - Smooth "Digital Rise" effect
    // ═══════════════════════════════════════════════════════════════
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        // Reset visibility bitfield when buildings change
        visibleRef.current = new Uint8Array(count).fill(1)

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
                const targetHeight = (b.dimensions?.height || 8) * 3.0 // 3x height for dramatic skyline

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

                // Update bounding sphere for custom culling (reuse existing or create once)
                const localRadius = Math.max(width, Math.max(currentHeight, depth)) / 2
                if (!boundingSpheresRef.current[i]) {
                    boundingSpheresRef.current[i] = new THREE.Sphere(new THREE.Vector3(x, y, z), localRadius + 2.0)
                } else {
                    boundingSpheresRef.current[i].center.set(x, y, z)
                    boundingSpheresRef.current[i].radius = localRadius + 2.0
                }

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

    // Pre-compute issue sets once for O(1) lookup instead of O(n)
    const issueIndex = useMemo(() => {
        const issues = cityData?.metadata?.issues || {}
        const circularSet = new Set(issues.circular_dependencies?.flat() || [])
        const godSet = new Set(issues.god_objects || [])
        return { circularSet, godSet }
    }, [cityData?.metadata?.issues])

    const selectedBuildingId = selectedBuilding?.id

    // ═══════════════════════════════════════════════════════════════
    // COLOR UPDATES - Real-time interaction feedback (colors ONLY)
    // ═══════════════════════════════════════════════════════════════
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        const showWarnings = colorMode === 'default' || colorMode === 'churn'

        for (let i = 0; i < count; i++) {
            const b = buildings[i]
            const isSelected = selectedBuildingId === b.id
            const isHovered = hoveredInstanceId === i

            const isIssueHighlighted = highlightedIssue && highlightedIssue.paths.includes(b.path)

            const isUnrelated = (highlightedIssue && !isIssueHighlighted) ||
                (!highlightedIssue && selectedBuildingId && !isSelected && colorMode === 'default')

            const colorHex = getBuildingColor(b, colorMode, {
                isSelected, isHovered,
                isUnrelated, highlightedIssue, isIssueHighlighted,
                isCircular: issueIndex.circularSet.has(b.id),
                isGodObject: issueIndex.godSet.has(b.id),
                showWarnings
            })

            tempColor.set(colorHex)
            meshRef.current.setColorAt(i, tempColor)
        }

        if (meshRef.current.instanceColor) {
            meshRef.current.instanceColor.needsUpdate = true
        }
    }, [
        buildings, selectedBuildingId, hoveredInstanceId, colorMode,
        highlightedIssue, count, issueIndex
    ])

    // ═══════════════════════════════════════════════════════════════
    // FRUSTUM CULLING — Zero-Allocation Production Engine
    // Uses a visibility bitfield to avoid decomposing matrices each frame.
    // Runs every 3rd frame to save CPU.
    // ═══════════════════════════════════════════════════════════════
    const cullFrameCounter = useRef(0)

    useFrame(() => {
        if (!meshRef.current || count === 0 || boundingSpheresRef.current.length === 0) return

        // Only cull every 3rd frame — buildings don't pop in/out that fast
        cullFrameCounter.current++
        if (cullFrameCounter.current % 3 !== 0) return

        // Lazily initialize visibility array
        if (!visibleRef.current || visibleRef.current.length !== count) {
            visibleRef.current = new Uint8Array(count).fill(1)
        }

        // Update Frustum from current camera
        projScreenMatrixRef.current.multiplyMatrices(camera.projectionMatrix, camera.matrixWorldInverse)
        frustumRef.current.setFromProjectionMatrix(projScreenMatrixRef.current)

        let dirty = false
        const vis = visibleRef.current

        for (let i = 0; i < count; i++) {
            const sphere = boundingSpheresRef.current[i]
            if (!sphere) continue

            const shouldBeVisible = frustumRef.current.intersectsSphere(sphere)
            const wasVisible = vis[i] === 1

            if (shouldBeVisible && !wasVisible) {
                // RESTORE: Building re-entered view
                const b = buildings[i]
                const width = b.dimensions?.width || 8
                const depth = b.dimensions?.depth || 8
                const height = (b.dimensions?.height || 8) * 3.0
                tempObject.position.set(b.position.x, height / 2, b.position.z)
                tempObject.scale.set(width, height, depth)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)
                vis[i] = 1
                dirty = true
            } else if (!shouldBeVisible && wasVisible) {
                // HIDE: Building left view — zero-scale it
                const b = buildings[i]
                tempObject.position.set(b.position.x, 0, b.position.z)
                tempObject.scale.set(0, 0, 0)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)
                vis[i] = 0
                dirty = true
            }
        }

        // Single GPU upload per frame
        if (dirty) {
            meshRef.current.instanceMatrix.needsUpdate = true
        }
    })

    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLERS — throttled & stable references
    // ═══════════════════════════════════════════════════════════════
    const lastPointerTime = useRef(0)
    const handlePointerMove = useCallback((e) => {
        e.stopPropagation()
        const now = performance.now()
        if (now - lastPointerTime.current < 50) return
        lastPointerTime.current = now
        if (e.instanceId !== undefined) {
            setHoveredInstanceId(e.instanceId)
            const b = useStore.getState().cityData?.buildings?.[e.instanceId]
            if (b) setHoveredBuilding(b)
        }
    }, [setHoveredBuilding])

    const handlePointerOut = useCallback(() => {
        setHoveredInstanceId(null)
        setHoveredBuilding(null)
    }, [setHoveredBuilding])

    const handleClick = useCallback((e) => {
        e.stopPropagation()
        if (dragActive) return
        if (e.instanceId !== undefined) {
            const b = useStore.getState().cityData?.buildings?.[e.instanceId]
            if (b) {
                const screenY = e.nativeEvent?.clientY ?? null
                selectBuilding(b, screenY)
            }
        }
    }, [dragActive, selectBuilding])

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
            const height = (b.dimensions?.height || 8) * 3.0
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
                const height = (b.dimensions?.height || 8) * 3.0

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

    // Opacity: uniform value for all buildings (saves per-instance attribute allocation)
    // PulseMaterial fragment shader defaults to 0.95 when aOpacityOverride is 0

    if (count === 0) return null

    return (
        <instancedMesh
            key={count}
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
                        attach="attributes-aChurn"
                        args={[churnAttribute.array, 1]}
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
