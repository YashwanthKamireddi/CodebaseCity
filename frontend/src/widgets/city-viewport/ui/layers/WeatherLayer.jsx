import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../../store/useStore'

const SNOW_COUNT = 2000
const FIRE_PARTICLES = 500

export default function WeatherLayer() {
    const { cityData, showWeather } = useStore() // We will add showWeather
    const snowRef = useRef()
    const fireRef = useRef()

    // 1. Identify Areas
    const { frozenPositions, burningPositions, rottingPositions } = useMemo(() => {
        const frozen = []
        const burning = []
        const rotting = [] // Entropy Storms

        if (cityData?.buildings) {
            cityData.buildings.forEach(b => {
                const { x, z } = b.position
                let h = b.dimensions?.height || 10

                // Polyfill metrics if missing
                const complexity = b.metrics?.complexity || (h / 5)
                const churn = b.metrics?.churn || (Math.random() * 20)

                // Burning: High Churn (Active Hotspot)
                if (churn > 15) {
                    burning.push(new THREE.Vector3(x, h, z))
                }

                // Rotting: High Complexity BUT Low Churn (Entropy Risk)
                if (complexity > 15 && churn < 5) {
                    rotting.push(new THREE.Vector3(x, h + 20, z)) // Clouds hover above
                }

                // Frozen: Low Churn AND Low Complexity (Legacy/Stable)
                if (churn === 0 && complexity < 5) {
                    frozen.push(new THREE.Vector3(x, h / 2, z))
                }
            })
        }
        return { frozenPositions: frozen, burningPositions: burning, rottingPositions: rotting }
    }, [cityData])

    // 2. Generate Snow Geometry (Global Fall)
    const snowGeo = useMemo(() => {
        const geo = new THREE.BufferGeometry()
        const pos = new Float32Array(SNOW_COUNT * 3)
        const velocity = new Float32Array(SNOW_COUNT)

        for (let i = 0; i < SNOW_COUNT; i++) {
            pos[i * 3] = (Math.random() - 0.5) * 400
            pos[i * 3 + 1] = Math.random() * 200
            pos[i * 3 + 2] = (Math.random() - 0.5) * 400
            velocity[i] = 0.5 + Math.random() * 0.5
        }

        geo.setAttribute('position', new THREE.BufferAttribute(pos, 3))
        geo.setAttribute('velocity', new THREE.BufferAttribute(velocity, 1))
        return geo
    }, [])

    // 3. Generate Fire Particles (Localized)
    // For MVP, we will use simple instanced meshes rising from burning buildings

    useFrame((state, delta) => {
        if (!showWeather) return

        // Animate Snow
        if (snowRef.current) {
            const positions = snowRef.current.geometry.attributes.position.array
            const velocities = snowRef.current.geometry.attributes.velocity.array

            for (let i = 0; i < SNOW_COUNT; i++) {
                positions[i * 3 + 1] -= velocities[i] // Y axis down
                if (positions[i * 3 + 1] < 0) {
                    positions[i * 3 + 1] = 200 // Reset to top
                }
            }
            snowRef.current.geometry.attributes.position.needsUpdate = true
        }

        // Animate Fire (Material Uniform or manual position)
        // ... (Simplified for this file)
    })

    if (!showWeather) return null

    return (
        <group>
            {/* Snow System (Frozen/Debt Areas) */}
            <points ref={snowRef} geometry={snowGeo}>
                <pointsMaterial
                    color="#e0f2fe"
                    size={0.8}
                    transparent
                    opacity={0.6}
                />
            </points>

            {/* Simulated "Fire" Indicators (Red Glows) */}
            {burningPositions.map((pos, i) => (
                <pointLight
                    key={`fire-${i}`}
                    position={[pos.x, pos.y + 5, pos.z]}
                    color="#ef4444"
                    distance={20}
                    decay={2}
                    intensity={2}
                />
            ))}

            {/* Entropy Storms (Dark Clouds + Lightning) */}
            {rottingPositions.map((pos, i) => (
                <group key={`storm-${i}`} position={[pos.x, pos.y, pos.z]}>
                    {/* Cloud Mass */}
                    <mesh>
                        <dodecahedronGeometry args={[8, 0]} />
                        <meshStandardMaterial color="#334155" transparent opacity={0.8} roughness={0.9} />
                    </mesh>
                    {/* Random Lightning */}
                    <LightningFlash />
                </group>
            ))}
        </group>
    )
}

function LightningFlash() {
    const lightRef = useRef()
    useFrame((state) => {
        if (!lightRef.current) return
        // Random strobe effect
        if (Math.random() > 0.98) {
            lightRef.current.intensity = 10
            lightRef.current.position.x = (Math.random() - 0.5) * 10
        } else {
            lightRef.current.intensity = 0
        }
    })

    return <pointLight ref={lightRef} color="#a5f3fc" distance={50} decay={2} intensity={0} />
}
