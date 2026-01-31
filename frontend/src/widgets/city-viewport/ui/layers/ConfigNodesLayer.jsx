import React, { useRef, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../../store/useStore'
import { getBuildingColor } from '../../../../utils/colorUtils'
import { HoloArchitectMaterial } from '../../shaders/HoloArchitectMaterial'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function ConfigNodesLayer({ buildings }) {
    const { selectBuilding, selectedBuilding, colorMode } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()

    // Animate Shader & Rotation
    useFrame((state) => {
        const time = state.clock.elapsedTime
        if (materialRef.current) materialRef.current.uniforms.uTime.value = time
        if (meshRef.current) {
            // Slowly rotate the entire ring of satellites?
            // Individual rotation is expensive with InstanceMatrix updates in loop.
            // Let's just keep them static or do a shader wobble.
        }
    })

    // Filter for Config Types
    const configBuildings = useMemo(() => {
        return buildings.filter(b => {
            const p = b.path.toLowerCase()
            // Config / Infra files
            return p.match(/(config|setting|env|ignore|rc|json|yaml|yml|docker|build|deploy|makefile)/)
        })
    }, [buildings])

    const count = configBuildings.length

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        configBuildings.forEach((b, i) => {
            const { x, z } = b.position
            // Floating Satellites
            // Fixed size for consistency
            const size = 3
            const height = b.dimensions?.height || 10

            // Float high above the building height
            tempObject.position.set(x, height + 8, z)
            tempObject.scale.set(size, size, size)
            // Random rotation for variety
            tempObject.rotation.set(Math.random(), Math.random(), Math.random())

            tempObject.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObject.matrix)

            const colorHex = getBuildingColor(b, colorMode, {
                isSelected: selectedBuilding?.id === b.id,
                isHovered: false,
            })
            tempColor.set(colorHex)
            meshRef.current.setColorAt(i, tempColor)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true

    }, [configBuildings, selectedBuilding, colorMode])

    if (count === 0) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, count]}
            onClick={(e) => {
                e.stopPropagation()
                if (e.instanceId !== undefined) selectBuilding(configBuildings[e.instanceId])
            }}
        >
            <icosahedronGeometry args={[1, 0]} />
            <holoArchitectMaterial
                ref={materialRef}
                transparent
                uBaseOpacity={0.9}
                uGridDensity={1.0} // Simple shape
            />
        </instancedMesh>
    )
}
