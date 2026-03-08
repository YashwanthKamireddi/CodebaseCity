import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * CommTowers — Tall antenna spires on the most-imported (highest in-degree) buildings.
 * Signal pulse rings radiate from the tip, visualizing communication hubs.
 * Instanced antennas (1 draw call) + instanced rings (1 draw call).
 */
export default function CommTowers() {
    const cityData = useStore(s => s.cityData)
    const antennaRef = useRef()
    const ringRef = useRef()

    const hubBuildings = useMemo(() => {
        if (!cityData?.buildings?.length) return []
        return [...cityData.buildings]
            .filter(b => (b.in_degree || 0) > 0)
            .sort((a, b) => (b.in_degree || 0) - (a.in_degree || 0))
            .slice(0, 12) // Top 12 communication hubs
    }, [cityData])

    const count = hubBuildings.length

    // Set up antenna instance matrices
    React.useEffect(() => {
        if (!antennaRef.current || !count) return
        const tempObj = new THREE.Object3D()
        hubBuildings.forEach((b, i) => {
            const h = (b.dimensions?.height || 8) * 3.0
            const antennaH = Math.min(h * 0.4, 40)
            tempObj.position.set(b.position.x, h + antennaH / 2, b.position.z || 0)
            tempObj.scale.set(0.3, antennaH, 0.3)
            tempObj.updateMatrix()
            antennaRef.current.setMatrixAt(i, tempObj.matrix)
        })
        antennaRef.current.instanceMatrix.needsUpdate = true
    }, [hubBuildings, count])

    // Animate signal rings
    useFrame(({ clock }) => {
        if (!ringRef.current || !count) return
        const t = clock.getElapsedTime()
        const tempObj = new THREE.Object3D()

        hubBuildings.forEach((b, i) => {
            const h = (b.dimensions?.height || 8) * 3.0
            const antennaH = Math.min(h * 0.4, 40)
            const tipY = h + antennaH

            // Expanding ring animation
            const cycle = (t * 0.8 + i * 0.5) % 3.0
            const scale = 2 + cycle * 8
            const opacity = Math.max(0, 1.0 - cycle / 3.0)

            tempObj.position.set(b.position.x, tipY, b.position.z || 0)
            tempObj.rotation.set(-Math.PI / 2, 0, 0)
            tempObj.scale.set(scale, scale, 1)
            tempObj.updateMatrix()
            ringRef.current.setMatrixAt(i, tempObj.matrix)
        })
        ringRef.current.instanceMatrix.needsUpdate = true

        // Fade rings
        if (ringRef.current.material) {
            ringRef.current.material.opacity = 0.25 + Math.sin(t * 2) * 0.1
        }
    })

    if (!count) return null

    return (
        <group>
            {/* Antenna spires */}
            <instancedMesh ref={antennaRef} args={[undefined, undefined, count]} frustumCulled={false}>
                <cylinderGeometry args={[0.5, 1, 1, 6]} />
                <meshStandardMaterial
                    color="#88ccff"
                    emissive="#0066ff"
                    emissiveIntensity={0.5}
                    metalness={0.8}
                    roughness={0.2}
                />
            </instancedMesh>

            {/* Signal rings */}
            <instancedMesh ref={ringRef} args={[undefined, undefined, count]} frustumCulled={false}>
                <ringGeometry args={[0.8, 1.0, 32]} />
                <meshBasicMaterial
                    color="#00ccff"
                    transparent
                    opacity={0.3}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                    side={THREE.DoubleSide}
                />
            </instancedMesh>
        </group>
    )
}
