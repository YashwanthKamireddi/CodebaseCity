import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * EnergyCoreReactor — Central power core at city origin.
 *
 * Perf budget: 5 draw calls, ~2400 verts, 2 shared materials, 20fps useFrame.
 * - Core sphere (glowing emissive)
 * - 3 thick gyroscope rings (rotating)
 * - Energy pillar (vertical cylinder rising from core)
 */
export default function EnergyCoreReactor() {
    const cityData = useStore(s => s.cityData)
    const ring1 = useRef()
    const ring2 = useRef()
    const ring3 = useRef()
    const lastT = useRef(0)

    const ringMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#0088bb',
        emissive: '#005588',
        emissiveIntensity: 0.7,
        metalness: 0.85,
        roughness: 0.15,
    }), [])

    const coreMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#00ccff',
        emissive: '#0088cc',
        emissiveIntensity: 0.9,
        metalness: 0.6,
        roughness: 0.3,
    }), [])

    const pillarMat = useMemo(() => new THREE.MeshStandardMaterial({
        color: '#0066aa',
        emissive: '#004477',
        emissiveIntensity: 0.6,
        metalness: 0.7,
        roughness: 0.2,
        transparent: true,
        opacity: 0.5,
        depthWrite: false,
    }), [])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return
        lastT.current = t
        if (ring1.current) ring1.current.rotation.z = t * 0.25
        if (ring2.current) ring2.current.rotation.x = t * -0.18
        if (ring3.current) {
            ring3.current.rotation.y = t * 0.12
            ring3.current.rotation.z = t * 0.08
        }
    })

    if (!cityData?.buildings?.length) return null

    return (
        <group position={[0, 0.5, 0]}>
            {/* Central glowing core */}
            <mesh>
                <sphereGeometry args={[6, 20, 16]} />
                <primitive object={coreMat} attach="material" />
            </mesh>

            {/* Thick inner ring */}
            <mesh ref={ring1}>
                <torusGeometry args={[12, 1.2, 10, 28]} />
                <primitive object={ringMat} attach="material" />
            </mesh>

            {/* Mid ring */}
            <mesh ref={ring2} rotation={[Math.PI / 3, 0, 0]}>
                <torusGeometry args={[18, 0.9, 10, 28]} />
                <primitive object={ringMat} attach="material" />
            </mesh>

            {/* Outer ring */}
            <mesh ref={ring3} rotation={[Math.PI / 6, Math.PI / 4, 0]}>
                <torusGeometry args={[25, 0.7, 8, 28]} />
                <primitive object={ringMat} attach="material" />
            </mesh>

            {/* Energy pillar — vertical beam rising from core */}
            <mesh position={[0, 30, 0]}>
                <cylinderGeometry args={[1.5, 3, 60, 12, 1, true]} />
                <primitive object={pillarMat} attach="material" />
            </mesh>
        </group>
    )
}
