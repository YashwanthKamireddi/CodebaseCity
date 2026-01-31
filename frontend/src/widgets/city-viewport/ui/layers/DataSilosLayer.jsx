import React, { useRef, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../../store/useStore'
import { getBuildingColor } from '../../../../utils/colorUtils'
import { HoloArchitectMaterial } from '../../shaders/HoloArchitectMaterial'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function DataSilosLayer({ buildings }) {
    const { selectBuilding, selectedBuilding, colorMode } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()

    // Animate Shader & Growth
    const uTimeRef = useRef(0)

    useFrame((state, delta) => {
        if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime

        // Growth Animation
        uTimeRef.current += delta
        const duration = 2.2 // Slightly slower for heavy silos
        const progress = Math.min(uTimeRef.current / duration, 1)
        const ease = 1 - Math.pow(1 - progress, 3)

        if (progress < 1 && meshRef.current && count > 0) {
            dataBuildings.forEach((b, i) => {
                const { x, z } = b.position
                const width = Math.max(b.dimensions?.width || 5, 5)
                const targetHeight = b.dimensions?.height || 10

                const currentHeight = targetHeight * ease
                const y = currentHeight / 2

                tempObject.position.set(x, y, z)
                // Scale X/Z represents diameter
                tempObject.scale.set(width / 2, Math.max(0.1, currentHeight), width / 2)
                tempObject.updateMatrix()
                meshRef.current.setMatrixAt(i, tempObject.matrix)
            })
            meshRef.current.instanceMatrix.needsUpdate = true
        }
    })

    // Filter for Data Types
    const dataBuildings = useMemo(() => {
        return buildings.filter(b => {
            const p = b.path.toLowerCase()
            return p.match(/(db|model|entity|schema|migration|store|redux|context|state)/)
        })
    }, [buildings])

    const count = dataBuildings.length

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        dataBuildings.forEach((b, i) => {
            const { x, z } = b.position
            const width = Math.max(b.dimensions?.width || 5, 5)
            const height = b.dimensions?.height || 10

            tempObject.position.set(x, height / 2, z)
            tempObject.scale.set(width / 2, height, width / 2)
            tempObject.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObject.matrix)

            const colorHex = getBuildingColor(b, colorMode, {
                isSelected: selectedBuilding?.id === b.id,
                isUnrelated: !!selectedBuilding && selectedBuilding?.id !== b.id,
                isHovered: false,
            })
            tempColor.set(colorHex)
            meshRef.current.setColorAt(i, tempColor)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true

    }, [dataBuildings, selectedBuilding, colorMode])

    if (count === 0) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, count]}
            onClick={(e) => {
                e.stopPropagation()
                if (e.instanceId !== undefined) selectBuilding(dataBuildings[e.instanceId])
            }}
        >
            <cylinderGeometry args={[1, 1, 1, 16]} />
            <holoArchitectMaterial
                ref={materialRef}
                transparent
                uBaseOpacity={0.8}
                uGridDensity={3.0} // Large plates for data
            />
        </instancedMesh>
    )
}
