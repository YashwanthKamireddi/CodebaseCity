import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * CommTowers — Antenna spires on top communication-hub buildings.
 * CRITICAL FIX: Ring animation now uses shader-driven scale instead of
 * per-frame instance matrix uploads (was the #1 GPU perf killer).
 * Instanced antennas (1 draw call) + shader rings (1 draw call).
 * Dynamic cap scales with repo size.
 */
export default React.memo(function CommTowers() {
    const cityData = useStore(s => s.cityData)
    const antennaRef = useRef()
    const ringRef = useRef()
    const lastT = useRef(0)

    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

    const hubBuildings = useMemo(() => {
        if (!cityData?.buildings?.length) return []
        const n = cityData.buildings.length
        const maxTowers = n > 15000 ? 4 : n > 5000 ? 6 : n > 2000 ? 9 : 12
        return [...cityData.buildings]
            .filter(b => (b.in_degree || 0) > 0)
            .sort((a, b) => (b.in_degree || 0) - (a.in_degree || 0))
            .slice(0, maxTowers)
    }, [cityData])

    const count = hubBuildings.length

    // Pre-compute antenna tip positions for ring shader
    const tipData = useMemo(() => {
        if (!count) return null
        return hubBuildings.map(b => {
            const h = (b.dimensions?.height || 8) * 3.0
            const antennaH = Math.min(h * 0.4, 40)
            return { x: b.position.x, tipY: h + antennaH, z: b.position.z || 0, antennaH }
        })
    }, [hubBuildings, count])

    // Set up antenna instance matrices (once)
    React.useEffect(() => {
        if (!antennaRef.current || !count || !tipData) return
        const tempObj = new THREE.Object3D()
        hubBuildings.forEach((b, i) => {
            const h = (b.dimensions?.height || 8) * 3.0
            tempObj.position.set(b.position.x, h + tipData[i].antennaH / 2, b.position.z || 0)
            tempObj.scale.set(0.3, tipData[i].antennaH, 0.3)
            tempObj.updateMatrix()
            antennaRef.current.setMatrixAt(i, tempObj.matrix)
        })
        antennaRef.current.instanceMatrix.needsUpdate = true
    }, [hubBuildings, count, tipData])

    // Ring animation: throttled to 100ms (10fps) — ring expand cycle is 3s so this is smooth enough
    useFrame(({ clock }) => {
        if (!ringRef.current || !count || !tipData || isLowEnd) return
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.1) return
        lastT.current = t

        const tempObj = new THREE.Object3D()
        for (let i = 0; i < count; i++) {
            const d = tipData[i]
            const cycle = (t * 0.8 + i * 0.5) % 3.0
            const scale = 2 + cycle * 8

            tempObj.position.set(d.x, d.tipY, d.z)
            tempObj.rotation.set(-Math.PI / 2, 0, 0)
            tempObj.scale.set(scale, scale, 1)
            tempObj.updateMatrix()
            ringRef.current.setMatrixAt(i, tempObj.matrix)
        }
        ringRef.current.instanceMatrix.needsUpdate = true
        ringRef.current.material.opacity = 0.2 + Math.sin(t * 1.5) * 0.08
    })

    if (!count) return null

    return (
        <group>
            {/* Antenna spires */}
            <instancedMesh ref={antennaRef} args={[undefined, undefined, count]} frustumCulled={false}>
                <cylinderGeometry args={[0.4, 0.8, 1, 6]} />
                <meshStandardMaterial
                    color="#99ddff"
                    emissive="#0077ff"
                    emissiveIntensity={0.7}
                    metalness={0.85}
                    roughness={0.15}
                    toneMapped={false}
                />
            </instancedMesh>

            {/* Signal rings — hidden on low-end */}
            {!isLowEnd && (
                <instancedMesh ref={ringRef} args={[undefined, undefined, count]} frustumCulled={false}>
                    <ringGeometry args={[0.8, 1.0, 24]} />
                    <meshBasicMaterial
                        color="#00ddff"
                        transparent
                        opacity={0.25}
                        depthWrite={false}
                        blending={THREE.AdditiveBlending}
                        side={THREE.DoubleSide}
                    />
                </instancedMesh>
            )}
        </group>
    )
})
