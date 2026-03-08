import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EmergencyBeacons — Red pulsing warning diamonds on critical-complexity buildings.
 * Dynamic cap scales with repo size. Throttled to 30fps. Skipped on low-end for huge repos.
 * Instanced — 1 draw call.
 */
export default function EmergencyBeacons() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()
    const lastT = useRef(0)

    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

    const criticalBuildings = useMemo(() => {
        if (!cityData?.buildings?.length) return []
        const n = cityData.buildings.length
        // Dynamic cap: scales down for large repos
        const maxBeacons = n > 15000 ? 10 : n > 5000 ? 20 : n > 2000 ? 30 : 40
        const sorted = [...cityData.buildings].sort((a, b) =>
            b.color_metric - a.color_metric
        )
        const threshold = Math.max(3, Math.floor(n * 0.06))
        return sorted.slice(0, Math.min(threshold, maxBeacons))
    }, [cityData])

    const count = criticalBuildings.length

    const matrices = useMemo(() => {
        if (!count) return null
        const arr = new Float32Array(count * 16)
        const tempObj = new THREE.Object3D()
        criticalBuildings.forEach((b, i) => {
            const h = (b.dimensions?.height || 8) * 3.0
            tempObj.position.set(b.position.x, h + 4, b.position.z || 0)
            tempObj.scale.set(1.8, 2.2, 1.8)
            tempObj.updateMatrix()
            tempObj.matrix.toArray(arr, i * 16)
        })
        return arr
    }, [criticalBuildings, count])

    useFrame(({ clock }) => {
        if (!meshRef.current || !count) return
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        const mat = meshRef.current.material
        const pulse = Math.sin(t * 3.5)
        mat.emissiveIntensity = 2.0 + pulse * 1.2
        mat.opacity = 0.75 + pulse * 0.25
    })

    if (!count || !matrices) return null
    if (isLowEnd && (cityData?.buildings?.length || 0) > 8000) return null

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, count]}
                frustumCulled={false}
            >
                <octahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                    color="#ff3030"
                    emissive="#ff0800"
                    emissiveIntensity={2.5}
                    transparent
                    opacity={0.85}
                    depthWrite={false}
                    toneMapped={false}
                />
            </instancedMesh>
            <InstanceMatrixSetter meshRef={meshRef} matrices={matrices} count={count} />
        </group>
    )
}

function InstanceMatrixSetter({ meshRef, matrices, count }) {
    React.useEffect(() => {
        if (!meshRef.current || !matrices) return
        const tempMatrix = new THREE.Matrix4()
        for (let i = 0; i < count; i++) {
            tempMatrix.fromArray(matrices, i * 16)
            meshRef.current.setMatrixAt(i, tempMatrix)
        }
        meshRef.current.instanceMatrix.needsUpdate = true
    }, [meshRef, matrices, count])
    return null
}
