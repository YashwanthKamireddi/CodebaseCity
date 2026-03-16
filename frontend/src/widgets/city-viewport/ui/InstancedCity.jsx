import React, { useRef, useLayoutEffect, useMemo, useState, useCallback } from 'react'
import * as THREE from 'three'
import { useFrame, extend, useThree } from '@react-three/fiber'
import { useDrag } from '@use-gesture/react'
import useStore from '../../../store/useStore'
import { PulseMaterial } from '../shaders/PulseMaterial'
import { getBuildingColor } from '../../../utils/colorUtils'

// Reusable temp objects - avoid allocations in hot paths
const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()
const planeNormal = new THREE.Vector3(0, 1, 0)
const intersectPoint = new THREE.Vector3()

// Pre-allocated typed arrays for batch operations
let cachedMatrixArray = null
let cachedColorArray = null

/**
 * InstancedCity - High-Performance Building Renderer
 *
 * Features:
 * - GPU-instanced rendering for 10,000+ buildings
 * - Smooth spring-based animations
 * - Premium glass tower shader
 * - Interactive hover/selection states
 */
const InstancedCity = React.memo(function InstancedCity() {
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
    const { camera, raycaster, pointer, invalidate } = useThree()

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

    // Pre-compute stagger values once for O(1) lookup during animation
    const staggerData = useMemo(() => {
        if (count === 0) return null
        const distances = new Float32Array(count)
        const delays = new Float32Array(count)
        let maxDist = 0

        for (let i = 0; i < count; i++) {
            const b = buildings[i]
            const { x, z } = b.position
            const dist = Math.sqrt(x * x + z * z)
            distances[i] = dist
            if (dist > maxDist) maxDist = dist
        }

        // Pre-compute delay values (normalized)
        for (let i = 0; i < count; i++) {
            delays[i] = Math.min(distances[i] / 500, 0.3)
        }

        return { distances, delays, maxDist }
    }, [buildings, count])

    // Smooth time-based animation — drives shader pulse (throttled 30fps)
    const lastTimeUpdate = useRef(0)
    useFrame((state) => {
        if (!materialRef.current) return
        const t = state.clock.elapsedTime
        if (t - lastTimeUpdate.current < 0.033) return
        lastTimeUpdate.current = t
        materialRef.current.uniforms.uTime.value = t
    })

    const [hoveredInstanceId, setHoveredInstanceId] = useState(null)
    const prevHoveredRef = useRef(null)
    const prevSelectedRef = useRef(null)



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
        const duration = 600 // Fast 0.6s rise - no glitchy feeling
        let animationFrameId;

        const animateGrowth = (now) => {
            if (!meshRef.current) return; // Safety check if unmounted during animation

            const elapsed = now - startTime
            // Skip animation entirely for large datasets or when time traveling
            const isQuick = isAnimating || currentCommitIndex !== -1 || count > 200
            const progress = isQuick ? 1 : Math.min(elapsed / duration, 1)

            // Track max radius for bounding sphere
            let maxRadiusSq = 0

            // Batch process buildings using pre-computed stagger data
            for (let i = 0; i < count; i++) {
                const b = buildings[i]
                const { x, z } = b.position
                const width = b.dimensions?.width || 8
                const depth = b.dimensions?.depth || 8
                const targetHeight = (b.dimensions?.height || 8) * 3.0

                // Minimal stagger - buildings rise together smoothly
                const staggerDelay = isQuick ? 0 : Math.min((staggerData?.delays[i] ?? 0) * 0.3, 0.1)
                const staggeredProgress = Math.max(0, (progress - staggerDelay) / (1 - staggerDelay))
                // Smooth ease-out for professional feel
                const staggeredEase = isQuick ? 1 : 1 - Math.pow(1 - Math.min(staggeredProgress, 1), 2.5)

                const currentHeight = Math.max(0.5, targetHeight * staggeredEase)
                const y = currentHeight / 2

                tempObject.position.set(x, y, z)
                tempObject.scale.set(width, currentHeight, depth)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)

                const distSq = x * x + z * z
                if (distSq > maxRadiusSq) maxRadiusSq = distSq
            }

            meshRef.current.instanceMatrix.needsUpdate = true
            invalidate()

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
    // COLOR UPDATES - Split into full rebuild vs incremental hover/select
    // Full rebuild: colorMode, issueIndex, highlightedIssue, buildings change
    // Incremental: hover/select only re-color the 1-2 affected buildings
    // ═══════════════════════════════════════════════════════════════

    // Pre-compute issue paths set for O(1) lookup
    const highlightedPathsSet = useMemo(() => {
        if (!highlightedIssue?.paths) return null
        return new Set(highlightedIssue.paths)
    }, [highlightedIssue])

    // Helper to compute color for one building index
    const computeColor = useCallback((i, hovered, selected) => {
        const b = buildings[i]
        if (!b) return
        const showWarnings = colorMode === 'default' || colorMode === 'churn'
        const isSelected = selected === b.id
        const isHovered = hovered === i
        const isIssueHighlighted = highlightedPathsSet?.has(b.path) ?? false
        const isUnrelated = (highlightedIssue && !isIssueHighlighted) ||
            (!highlightedIssue && selected && !isSelected)

        return getBuildingColor(b, colorMode, {
            isSelected, isHovered,
            isUnrelated, highlightedIssue, isIssueHighlighted,
            isCircular: issueIndex.circularSet.has(b.id),
            isGodObject: issueIndex.godSet.has(b.id),
            showWarnings
        })
    }, [buildings, colorMode, highlightedIssue, highlightedPathsSet, issueIndex])

    // Full color rebuild when base visual state changes
    // Single-pass with color cache: ~30 unique hex values per mode are parsed once,
    // then written directly to the Float32Array — one GPU upload instead of 9 chunked ones.
    const colorRGBCache = useRef(new Map())
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return
        const mesh = meshRef.current

        // Ensure instanceColor buffer exists (Three.js lazy-creates it on first setColorAt)
        if (!mesh.instanceColor) {
            mesh.instanceColor = new THREE.InstancedBufferAttribute(new Float32Array(count * 3), 3)
        }

        const colorArray = mesh.instanceColor.array
        const rgbCache = colorRGBCache.current
        rgbCache.clear()

        for (let i = 0; i < count; i++) {
            const hex = computeColor(i, hoveredInstanceId, selectedBuildingId)
            if (!hex) continue
            let rgb = rgbCache.get(hex)
            if (!rgb) {
                tempColor.set(hex)
                rgb = [tempColor.r, tempColor.g, tempColor.b]
                rgbCache.set(hex, rgb)
            }
            const idx = i * 3
            colorArray[idx] = rgb[0]
            colorArray[idx + 1] = rgb[1]
            colorArray[idx + 2] = rgb[2]
        }

        mesh.instanceColor.needsUpdate = true
        invalidate()

        prevHoveredRef.current = hoveredInstanceId
        prevSelectedRef.current = selectedBuildingId
    }, [buildings, colorMode, highlightedIssue, highlightedPathsSet, count, issueIndex, computeColor])

    // Incremental hover/select update — only re-color the 1-4 dirty instances
    // EXCEPTION: when selection toggles (null ↔ non-null), ALL buildings must
    // recolor because the "isUnrelated" dimming flag applies to every building.
    // Single-pass with cache for toggle case — one GPU upload, no stutter.
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return
        const oldHover = prevHoveredRef.current
        const oldSelect = prevSelectedRef.current
        if (oldHover === hoveredInstanceId && oldSelect === selectedBuildingId) return

        // Detect selection toggle (null → selected OR selected → null)
        const selectionToggled = !oldSelect !== !selectedBuildingId

        if (selectionToggled) {
            // All buildings need recolor (isUnrelated flag flips for every building)
            // Use cached RGB parse — same as full rebuild path
            if (!meshRef.current.instanceColor) return
            const colorArray = meshRef.current.instanceColor.array
            const rgbCache = colorRGBCache.current
            rgbCache.clear()

            for (let i = 0; i < count; i++) {
                const hex = computeColor(i, hoveredInstanceId, selectedBuildingId)
                if (!hex) continue
                let rgb = rgbCache.get(hex)
                if (!rgb) {
                    tempColor.set(hex)
                    rgb = [tempColor.r, tempColor.g, tempColor.b]
                    rgbCache.set(hex, rgb)
                }
                const idx = i * 3
                colorArray[idx] = rgb[0]
                colorArray[idx + 1] = rgb[1]
                colorArray[idx + 2] = rgb[2]
            }

            meshRef.current.instanceColor.needsUpdate = true
            invalidate()
        } else {
            // Non-toggle: only 1-4 dirty instances (hover change or select swap)
            const dirty = new Set()
            if (oldHover !== null && oldHover !== undefined) dirty.add(oldHover)
            if (hoveredInstanceId !== null && hoveredInstanceId !== undefined) dirty.add(hoveredInstanceId)

            if (oldSelect !== selectedBuildingId) {
                for (let i = 0; i < count; i++) {
                    const bid = buildings[i]?.id
                    if (bid === oldSelect || bid === selectedBuildingId) dirty.add(i)
                }
            }

            for (const i of dirty) {
                if (i >= 0 && i < count) {
                    const hex = computeColor(i, hoveredInstanceId, selectedBuildingId)
                    if (hex) {
                        tempColor.set(hex)
                        meshRef.current.setColorAt(i, tempColor)
                    }
                }
            }

            if (dirty.size > 0 && meshRef.current.instanceColor) {
                meshRef.current.instanceColor.needsUpdate = true
                invalidate()
            }
        }

        prevHoveredRef.current = hoveredInstanceId
        prevSelectedRef.current = selectedBuildingId

    }, [hoveredInstanceId, selectedBuildingId, count, buildings, computeColor])


    // ═══════════════════════════════════════════════════════════════
    // EVENT HANDLERS — throttled & stable references
    // ═══════════════════════════════════════════════════════════════
    const lastPointerTime = useRef(0)
    const handlePointerMove = useCallback((e) => {
        e.stopPropagation()
        const now = performance.now()
        if (now - lastPointerTime.current < 32) return // ~30fps throttle for smooth response
        lastPointerTime.current = now
        if (e.instanceId !== undefined) {
            setHoveredInstanceId(e.instanceId)
            const b = useStore.getState().cityData?.buildings?.[e.instanceId]
            if (b) setHoveredBuilding(b)
            document.body.style.cursor = 'pointer'
        }
    }, [setHoveredBuilding])

    const handlePointerOut = useCallback(() => {
        setHoveredInstanceId(null)
        setHoveredBuilding(null)
        document.body.style.cursor = 'auto'
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
                transparent={false}
                depthWrite={true}
                vertexColors={true}
            />
        </instancedMesh>
    )
})

export default InstancedCity
