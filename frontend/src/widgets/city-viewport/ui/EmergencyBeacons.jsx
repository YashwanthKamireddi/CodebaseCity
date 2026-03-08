import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EmergencyBeacons — Red pulsing warning lights on critical/high-complexity buildings.
 * Like emergency warning sirens on dangerous structures.
 * Instanced for maximum performance — 1 draw call.
 */
export default function EmergencyBeacons() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()
    const lightRef = useRef()

    const criticalBuildings = useMemo(() => {
        if (!cityData?.buildings?.length) return []
        // Find buildings in the top 8% complexity (critical/danger zone)
        const sorted = [...cityData.buildings].sort((a, b) =>
            b.color_metric - a.color_metric
        )
        const threshold = Math.max(3, Math.floor(sorted.length * 0.08))
        return sorted.slice(0, Math.min(threshold, 40)) // Cap at 40 for perf
    }, [cityData])

    const count = criticalBuildings.length

    // Pre-compute matrices
    const matrices = useMemo(() => {
        if (!count) return null
        const arr = new Float32Array(count * 16)
        const tempObj = new THREE.Object3D()
        criticalBuildings.forEach((b, i) => {
            const h = (b.dimensions?.height || 8) * 3.0
            tempObj.position.set(b.position.x, h + 3, b.position.z || 0)
            tempObj.scale.set(1.5, 1.5, 1.5)
            tempObj.updateMatrix()
            tempObj.matrix.toArray(arr, i * 16)
        })
        return arr
    }, [criticalBuildings, count])

    useFrame(({ clock }) => {
        if (!meshRef.current || !count) return
        const t = clock.getElapsedTime()
        // Pulse the beacon material
        const mat = meshRef.current.material
        mat.emissiveIntensity = 1.5 + Math.sin(t * 4.0) * 1.0
        mat.opacity = 0.7 + Math.sin(t * 4.0) * 0.3
    })

    if (!count || !matrices) return null

    return (
        <group>
            <instancedMesh
                ref={meshRef}
                args={[undefined, undefined, count]}
                frustumCulled={false}
            >
                <octahedronGeometry args={[1, 0]} />
                <meshStandardMaterial
                    color="#ff2020"
                    emissive="#ff0000"
                    emissiveIntensity={2}
                    transparent
                    opacity={0.8}
                    depthWrite={false}
                    toneMapped={false}
                />
                {matrices && (() => {
                    const ref = React.createRef()
                    return null
                })()}
            </instancedMesh>
            {/* Apply matrices after mount */}
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
