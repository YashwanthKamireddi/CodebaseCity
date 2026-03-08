import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * SkyBridges — Glowing horizontal connector tubes between highly-coupled buildings.
 * Visualizes the strongest dependency relationships as physical sky-level bridges.
 * Uses instanced cylinder meshes for performance.
 */
export default function SkyBridges() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()

    const bridges = useMemo(() => {
        if (!cityData?.roads?.length || !cityData?.buildings?.length) return []
        const buildingMap = new Map()
        for (const b of cityData.buildings) {
            buildingMap.set(b.id, b)
        }

        // Find the strongest connections (avoid bridges for same-district)
        const validRoads = cityData.roads
            .filter(r => {
                const from = buildingMap.get(r.source)
                const to = buildingMap.get(r.target)
                if (!from || !to) return false
                // Only bridge across districts
                if (from.district_id === to.district_id) return false
                // Only if both buildings have some height
                const hFrom = (from.dimensions?.height || 0) * 3.0
                const hTo = (to.dimensions?.height || 0) * 3.0
                return hFrom > 15 && hTo > 15
            })
            .slice(0, 25) // Cap at 25 bridges for perf

        return validRoads.map(r => {
            const from = buildingMap.get(r.source)
            const to = buildingMap.get(r.target)
            const hFrom = (from.dimensions?.height || 8) * 3.0
            const hTo = (to.dimensions?.height || 8) * 3.0
            // Bridge at 70% height of the shorter building
            const bridgeY = Math.min(hFrom, hTo) * 0.7
            return {
                from: new THREE.Vector3(from.position.x, bridgeY, from.position.z || 0),
                to: new THREE.Vector3(to.position.x, bridgeY, to.position.z || 0),
            }
        })
    }, [cityData])

    const count = bridges.length

    React.useEffect(() => {
        if (!meshRef.current || !count) return
        const tempObj = new THREE.Object3D()
        bridges.forEach((bridge, i) => {
            const mid = new THREE.Vector3().lerpVectors(bridge.from, bridge.to, 0.5)
            const dir = new THREE.Vector3().subVectors(bridge.to, bridge.from)
            const length = dir.length()

            tempObj.position.copy(mid)
            tempObj.scale.set(0.4, length, 0.4)
            // Orient cylinder along the bridge direction
            tempObj.lookAt(bridge.to)
            tempObj.rotateX(Math.PI / 2)
            tempObj.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObj.matrix)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
    }, [bridges, count])

    useFrame(({ clock }) => {
        if (meshRef.current && meshRef.current.material) {
            const t = clock.getElapsedTime()
            meshRef.current.material.emissiveIntensity = 0.3 + Math.sin(t * 1.5) * 0.15
        }
    })

    if (!count) return null

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshStandardMaterial
                color="#1a3a5a"
                emissive="#00aaff"
                emissiveIntensity={0.4}
                transparent
                opacity={0.5}
                metalness={0.9}
                roughness={0.1}
                depthWrite={false}
            />
        </instancedMesh>
    )
}
