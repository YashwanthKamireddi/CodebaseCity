import React, { useRef, useLayoutEffect, useMemo } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../../store/useStore'
import { getBuildingColor } from '../../../../utils/colorUtils'
import { HoloArchitectMaterial } from '../../shaders/HoloArchitectMaterial'

const tempObject = new THREE.Object3D()
const tempColor = new THREE.Color()

export default function LogicTowersLayer({ buildings }) {
    const { selectBuilding, selectedBuilding, colorMode, opsMode, opsData } = useStore()
    const meshRef = useRef()
    const materialRef = useRef()

    // Animate Shader
    useFrame((state) => {
        if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime
    })

    // Filter for Logic Types (Default fallback too)
    const logicBuildings = useMemo(() => {
        return buildings.filter(b => {
            const p = b.path.toLowerCase()
            const isData = p.match(/(db|model|entity|schema|migration|store|redux|context|state)/)
            const isUI = p.match(/(component|page|view|ui|layout|style|css|scss|less)/)
            return !isData && !isUI
        })
    }, [buildings])

    const count = logicBuildings.length

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        logicBuildings.forEach((b, i) => {
            const { x, z } = b.position
            let width = Math.max(b.dimensions?.width || 5, 5)
            let height = b.dimensions?.height || 10
            let colorHex = getBuildingColor(b, colorMode, {
                isSelected: selectedBuilding?.id === b.id,
                isUnrelated: !!selectedBuilding && selectedBuilding?.id !== b.id,
                isHovered: false,
            })

            // Fraction Zoom (Dollhouse): Hide the shell if selected
            if (selectedBuilding?.id === b.id) {
                width = 0
                height = 0
            }

            // --- Phase 5: Ops Overrides ---
            if (opsMode !== 'default' && opsData && opsData.has(b.id)) {
                const nav = opsData.get(b.id)

                if (opsMode === 'cost') {
                    // Height = Cost $$$
                    // Scale: Max cost $5000 -> Height 200
                    const costHeight = Math.max(10, (nav.cost / 5000) * 200)
                    height = costHeight

                    // Color = Gold Heatmap
                    if (nav.cost > 4000) colorHex = '#eab308' // Gold-500
                    else if (nav.cost > 2000) colorHex = '#facc15' // Yellow-400
                    else if (nav.cost > 500) colorHex = '#fde047' // Yellow-300
                    else colorHex = '#475569' // Slate-600 (Cheap)
                }

                if (opsMode === 'security') {
                    // Color = Vulnerability Status
                    if (nav.security.hasVulnerability) {
                        if (nav.security.severity === 'CRITICAL') colorHex = '#ef4444' // Red-500
                        else colorHex = '#f97316' // Orange-500

                        // Pulse Effect (via width)
                        width *= 1.2
                    } else {
                        colorHex = '#334155' // Slate-700 (Safe)
                    }
                }
            }
            // ------------------------------

            tempObject.position.set(x, height / 2, z)
            tempObject.scale.set(width, height, width)
            tempObject.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObject.matrix)

            tempColor.set(colorHex)
            meshRef.current.setColorAt(i, tempColor)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true

    }, [logicBuildings, selectedBuilding, colorMode, opsMode, opsData])

    if (count === 0) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, count]}
            onClick={(e) => {
                e.stopPropagation()
                if (e.instanceId !== undefined) selectBuilding(logicBuildings[e.instanceId])
            }}
        >
            <boxGeometry args={[1, 1, 1]} />
            <holoArchitectMaterial
                ref={materialRef}
                transparent
                uBaseOpacity={0.7}
                uGridDensity={5.0} // Dense grid for robust logic
            />
        </instancedMesh>
    )
}
