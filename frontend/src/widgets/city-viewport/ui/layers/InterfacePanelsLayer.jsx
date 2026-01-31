import React, { useRef, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../../store/useStore'
import { getBuildingColor } from '../../../../utils/colorUtils'
import { HoloArchitectMaterial } from '../../shaders/HoloArchitectMaterial'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function InterfacePanelsLayer({ buildings }) {
    const { selectBuilding, selectedBuilding, colorMode } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()

    // Animate Shader
    useFrame((state) => {
        if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    })

    // Filter for UI Types
    const uiBuildings = useMemo(() => {
        return buildings.filter(b => {
            const p = b.path.toLowerCase()
            return p.match(/(component|page|view|ui|layout|style|css|scss|less)/)
        })
    }, [buildings])

    const count = uiBuildings.length

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        uiBuildings.forEach((b, i) => {
            const { x, z } = b.position
            const width = Math.max(b.dimensions?.width || 5, 8)
            const height = b.dimensions?.height || 10

            // UI Panels Float slightly off ground and are thin
            tempObject.position.set(x, height / 2 + 2, z)
            tempObject.scale.set(width, height, 2)
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

    }, [uiBuildings, selectedBuilding, colorMode])

    if (count === 0) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, count]}
            onClick={(e) => {
                e.stopPropagation()
                if (e.instanceId !== undefined) selectBuilding(uiBuildings[e.instanceId])
            }}
        >
            <boxGeometry args={[1, 1, 1]} />
            <holoArchitectMaterial
                ref={materialRef}
                transparent
                uBaseOpacity={0.5} // Transparent Glass
                uGridDensity={8.0} // High density = Pixels
            />
        </instancedMesh>
    )
}
