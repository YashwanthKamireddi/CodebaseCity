import React, { useRef, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../store/useStore'
import { buildingVertexShader, buildingFragmentShader } from '../shaders/BuildingShader'
import { getBuildingColor } from '../utils/colorUtils'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function InstancedCity() {
    const {
        cityData, selectedBuilding, selectBuilding, hoveredBuilding, setHoveredBuilding,
        layoutMode, colorMode, graphNeighbors, highlightedIssue
    } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()

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

    // State to hold worker reference
    const workerRef = useRef(null)

    // Physics / Layout Logic
    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        // 1. Grid/City Mode (Static)
        if (useStore.getState().layoutMode !== 'galaxy') {
            if (workerRef.current) {
                workerRef.current.terminate()
                workerRef.current = null
            }

            // Reset to grid positions
            buildings.forEach((b, i) => {
                const { x, z } = b.position
                const y = (b.dimensions.height / 2) + 0.3
                tempObject.position.set(x, y, z)
                tempObject.scale.set(b.dimensions.width, b.dimensions.height, b.dimensions.depth)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)
            })
            meshRef.current.instanceMatrix.needsUpdate = true
            return
        }

        // 2. Galaxy Mode (Dynamic Physics)
        if (!workerRef.current) {
            // Create Worker
            workerRef.current = new Worker(new URL('../workers/physics.worker.js', import.meta.url), { type: 'module' })

            workerRef.current.onmessage = (e) => {
                if (e.data.type === 'tick') {
                    const positions = new Float32Array(e.data.positions)

                    // Update Matrices in O(N)
                    for (let i = 0; i < count; i++) {
                        // Read Current Scale (We shouldn't lose it)
                        const b = buildings[i]

                        const x = positions[i * 3]
                        const y = positions[i * 3 + 1]
                        const z = positions[i * 3 + 2]

                        tempObject.position.set(x, y, z)
                        tempObject.scale.set(b.dimensions.width, b.dimensions.height, b.dimensions.depth)
                        tempObject.updateMatrix()
                        meshRef.current.setMatrixAt(i, tempObject.matrix)
                    }

                    meshRef.current.instanceMatrix.needsUpdate = true
                }
            }

            // Extract Links (Assume API road data for now, or infer)
            const links = (cityData.roads || []).map(r => ({ source: r.source, target: r.target }))
            const nodes = buildings.map(b => ({ id: b.id, radius: Math.max(b.dimensions.width, b.dimensions.depth) }))

            workerRef.current.postMessage({
                type: 'start',
                nodes,
                links,
                config: { strength: -100, distance: 50 }
            })
        }

        return () => {
            if (workerRef.current) workerRef.current.terminate()
        }

    }, [buildings, count, layoutMode])

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
            onPointerMove={handlePointerMove}
            onPointerOut={handlePointerOut}
            onClick={handleClick}
        >
            <boxGeometry args={[1, 1, 1]} />
            <shaderMaterial
                ref={materialRef}
                vertexShader={buildingVertexShader}
                fragmentShader={buildingFragmentShader}
                uniforms={{
                    uTime: { value: 0 }
                }}
                transparent
                vertexColors={true} // Critical for vColor mapping
            />
        </instancedMesh>
    )
}
