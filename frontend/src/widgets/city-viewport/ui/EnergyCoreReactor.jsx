import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyCoreReactor — Central pulsating gyroscope at city origin.
 *
 * Perf budget: 4 draw calls, ~1600 verts, 2 materials, 20fps throttled useFrame.
 * Removed: energy beam, ground glow, pointLight, transparent materials,
 * additive blending, emissiveIntensity > 1, toneMapped=false.
 */
export default function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()
    const core = useRef()
    const lastT = useRef(0)

    const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00aadd',
        emissive: '#004466',
        emissiveIntensity: 0.8,
        metalness: 0.85,
        roughness: 0.15,
    }), [])

    const coreMat = useMemo(() => new THREE.MeshBasicMaterial({
        color: new THREE.Color(0.0, 0.45, 0.8),
    }), [])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        if (ring1.current) ring1.current.rotation.z = t * 0.3
        if (ring2.current) ring2.current.rotation.x = t * -0.2
        if (ring3.current) {
            ring3.current.rotation.y = t * 0.15
            ring3.current.rotation.z = t * 0.1
        }
        if (core.current) {
            const s = 1.0 + Math.sin(t * 2.0) * 0.08
            core.current.scale.set(s, s, s)
        }
    })

    if (!cityData?.buildings?.length) return null

    return (
        <group position={[0, 0.5, 0]}>
            <mesh ref={core}>
                <sphereGeometry args={[4, 16, 16]} />
                <primitive object={coreMat} attach="material" />
            </mesh>
            <mesh ref={ring1}>
                <torusGeometry args={[8, 0.4, 8, 24]} />
                <primitive object={ringMat} attach="material" />
            </mesh>
            <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[13, 0.3, 8, 24]} />
                <primitive object={ringMat} attach="material" />
            </mesh>
            <mesh ref={ring3} rotation={[Math.PI / 6, Math.PI / 4, 0]}>
                <torusGeometry args={[18, 0.25, 8, 24]} />
                <primitive object={ringMat} attach="material" />
            </mesh>
        </group>
    )
}
