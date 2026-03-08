import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * SkyBridges — Glowing connector tubes between highly-coupled cross-district buildings.
 * Dynamic cap scales with repo size. Throttled glow at 30fps.
 * Skipped on low-end for massive repos. Instanced — 1 draw call.
 */
export default function SkyBridges() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()
    const lastT = useRef(0)

    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

    const bridges = useMemo(() => {
        if (!cityData?.roads?.length || !cityData?.buildings?.length) return []
        const n = cityData.buildings.length
        const maxBridges = n > 15000 ? 6 : n > 5000 ? 12 : n > 2000 ? 18 : 25

        const buildingMap = new Map()
        for (const b of cityData.buildings) buildingMap.set(b.id, b)

        const validRoads = cityData.roads
            .filter(r => {
                const from = buildingMap.get(r.source)
                const to = buildingMap.get(r.target)
                if (!from || !to) return false
                if (from.district_id === to.district_id) return false
                const hFrom = (from.dimensions?.height || 0) * 3.0
                const hTo = (to.dimensions?.height || 0) * 3.0
                return hFrom > 15 && hTo > 15
            })
            .slice(0, maxBridges)

        return validRoads.map(r => {
            const from = buildingMap.get(r.source)
            const to = buildingMap.get(r.target)
            const hFrom = (from.dimensions?.height || 8) * 3.0
            const hTo = (to.dimensions?.height || 8) * 3.0
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
            tempObj.scale.set(0.45, length, 0.45)
            tempObj.lookAt(bridge.to)
            tempObj.rotateX(Math.PI / 2)
            tempObj.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObj.matrix)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
    }, [bridges, count])

    useFrame(({ clock }) => {
        if (!meshRef.current?.material) return
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        meshRef.current.material.emissiveIntensity = 0.35 + Math.sin(t * 1.2) * 0.15
    })

    if (!count) return null
    if (isLowEnd && (cityData?.buildings?.length || 0) > 10000) return null

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <cylinderGeometry args={[1, 1, 1, 6]} />
            <meshStandardMaterial
                color="#1a3a6a"
                emissive="#00bbff"
                emissiveIntensity={0.45}
                transparent
                opacity={0.55}
                metalness={0.9}
                roughness={0.1}
                depthWrite={false}
                toneMapped={false}
            />
        </instancedMesh>
    )
}
