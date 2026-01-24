
import React, { useRef, useLayoutEffect, useMemo, useState } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../store/useStore'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function InstancedCity({ buildings }) {
    const meshRef = useRef()
    const { selectBuilding, selectedBuilding, setHoveredBuilding, graphNeighbors } = useStore()

    // Create color palette cache
    const colors = useMemo(() => new Float32Array(buildings.length * 3), [buildings])

    // Updates the instance matrices and colors
    useLayoutEffect(() => {
        if (!meshRef.current || !buildings) return

        // Set positions and scales once
        buildings.forEach((data, i) => {
            const { width, height, depth } = data.dimensions
            const { x, z } = data.position

            tempObject.position.set(x, height / 2, z)
            tempObject.scale.set(width, height, depth)
            tempObject.updateMatrix()

            meshRef.current.setMatrixAt(i, tempObject.matrix)
        })

        meshRef.current.instanceMatrix.needsUpdate = true
    }, [buildings])

    // Handle Color Updates (Blast Radius) efficiently
    useLayoutEffect(() => {
        if (!meshRef.current || !buildings) return

        buildings.forEach((data, i) => {
            const isSelected = selectedBuilding?.id === data.id
            const isDependency = selectedBuilding && graphNeighbors.dependencies.includes(data.id)
            const isDependent = selectedBuilding && graphNeighbors.dependents.includes(data.id)
            const isUnrelated = selectedBuilding && !isSelected && !isDependency && !isDependent

            let color = '#475569' // Default slate

            if (isSelected) color = '#facc15' // Gold
            else if (isDependency) color = '#4ade80' // Green
            else if (isDependent) color = '#f87171' // Red
            else if (isUnrelated) color = '#1e293b' // Dark dimmed
            else {
                // Height-based gradient (heatmap)
                const h = Math.max(20, 260 - Math.min(240, data.dimensions.height * 8))
                color = `hsl(${h}, 90%, 60%)`
            }

            tempColor.set(color)
            meshRef.current.setColorAt(i, tempColor)
        })

        meshRef.current.instanceColor.needsUpdate = true
    }, [buildings, selectedBuilding, graphNeighbors])

    const handleClick = (e) => {
        e.stopPropagation()
        const instanceId = e.instanceId
        if (instanceId !== undefined && buildings[instanceId]) {
            selectBuilding(buildings[instanceId])
        }
    }

    const handlePointerOver = (e) => {
        e.stopPropagation()
        const instanceId = e.instanceId
        if (instanceId !== undefined && buildings[instanceId]) {
            setHoveredBuilding(buildings[instanceId])
            document.body.style.cursor = 'pointer'
        }
    }

    const handlePointerOut = () => {
        setHoveredBuilding(null)
        document.body.style.cursor = 'default'
    }

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, buildings.length]}
            onClick={handleClick}
            onPointerOver={handlePointerOver}
            onPointerOut={handlePointerOut}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshPhysicalMaterial
                roughness={0.2}
                metalness={0.8}
                clearcoat={1}
                clearcoatRoughness={0.1}
            />
        </instancedMesh>
    )
}
