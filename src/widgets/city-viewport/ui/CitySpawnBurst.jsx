import React, { useRef, useMemo, useEffect, useState } from 'react'
import * as THREE from 'three'
import { useFrame, useThree } from '@react-three/fiber'
import useStore from '../../../store/useStore'

/**
 * CitySpawnBurst — Dramatic particle explosion when city finishes loading.
 * Creates a radial energy wave + upward particle burst from the city center.
 */
export default React.memo(function CitySpawnBurst() {
    const groupRef = useRef()
    const particlesRef = useRef()
    const waveRef = useRef()
    const cityData = useStore(s => s.cityData)
    const loading = useStore(s => s.loading)
    const [active, setActive] = useState(false)
    const [burstTime, setBurstTime] = useState(0)
    const { invalidate } = useThree()
    
    // Track previous loading state to detect transition
    const prevLoadingRef = useRef(loading)
    
    useEffect(() => {
        // Trigger burst when loading transitions from true to false
        if (prevLoadingRef.current && !loading && cityData) {
            setActive(true)
            setBurstTime(0)
        }
        prevLoadingRef.current = loading
    }, [loading, cityData])

    const PARTICLE_COUNT = 500
    const BURST_DURATION = 2.5 // seconds
    
    // Calculate city center and size
    const cityBounds = useMemo(() => {
        if (!cityData?.buildings?.length) return { center: [0, 0, 0], radius: 100 }
        
        let minX = Infinity, maxX = -Infinity
        let minZ = Infinity, maxZ = -Infinity
        
        cityData.buildings.forEach(b => {
            if (b.position) {
                minX = Math.min(minX, b.position.x)
                maxX = Math.max(maxX, b.position.x)
                minZ = Math.min(minZ, b.position.z)
                maxZ = Math.max(maxZ, b.position.z)
            }
        })
        
        const centerX = (minX + maxX) / 2
        const centerZ = (minZ + maxZ) / 2
        const radius = Math.max(maxX - minX, maxZ - minZ) / 2 + 50
        
        return { center: [centerX, 0, centerZ], radius }
    }, [cityData])

    // Initialize particle data
    const { positions, velocities, lifetimes, colors } = useMemo(() => {
        const positions = new Float32Array(PARTICLE_COUNT * 3)
        const velocities = new Float32Array(PARTICLE_COUNT * 3)
        const lifetimes = new Float32Array(PARTICLE_COUNT)
        const colors = new Float32Array(PARTICLE_COUNT * 3)
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3
            // Initial positions at center
            positions[i3] = 0
            positions[i3 + 1] = 0
            positions[i3 + 2] = 0
            
            // Random outward velocities (spherical burst)
            const theta = Math.random() * Math.PI * 2
            const phi = Math.random() * Math.PI * 0.6 // Mostly upward
            const speed = 30 + Math.random() * 60
            
            velocities[i3] = Math.sin(phi) * Math.cos(theta) * speed
            velocities[i3 + 1] = Math.cos(phi) * speed + 20 // Bias upward
            velocities[i3 + 2] = Math.sin(phi) * Math.sin(theta) * speed
            
            // Random lifetime offset for staggered fadeout
            lifetimes[i] = Math.random() * 0.3
            
            // Gradient from cyan to purple
            const t = Math.random()
            colors[i3] = 0.2 + t * 0.5     // R
            colors[i3 + 1] = 0.6 + t * 0.2 // G
            colors[i3 + 2] = 1.0           // B
        }
        
        return { positions, velocities, lifetimes, colors }
    }, [])

    // Animation frame
    useFrame((state, delta) => {
        if (!active || !particlesRef.current || !waveRef.current) return
        
        const newTime = burstTime + delta
        setBurstTime(newTime)
        
        // Progress 0 to 1
        const progress = Math.min(newTime / BURST_DURATION, 1)
        
        // Update particles
        const posArray = particlesRef.current.geometry.attributes.position.array
        const colorArray = particlesRef.current.geometry.attributes.color.array
        
        for (let i = 0; i < PARTICLE_COUNT; i++) {
            const i3 = i * 3
            const particleProgress = Math.max(0, progress - lifetimes[i])
            
            if (particleProgress > 0 && particleProgress < 1) {
                // Apply velocity with gravity
                posArray[i3] = velocities[i3] * particleProgress * 2
                posArray[i3 + 1] = velocities[i3 + 1] * particleProgress * 2 - 50 * particleProgress * particleProgress
                posArray[i3 + 2] = velocities[i3 + 2] * particleProgress * 2
                
                // Fade out colors
                const fadeOut = 1 - Math.pow(particleProgress, 2)
                colorArray[i3] = colors[i3] * fadeOut
                colorArray[i3 + 1] = colors[i3 + 1] * fadeOut
                colorArray[i3 + 2] = colors[i3 + 2] * fadeOut
            } else {
                colorArray[i3] = 0
                colorArray[i3 + 1] = 0
                colorArray[i3 + 2] = 0
            }
        }
        
        particlesRef.current.geometry.attributes.position.needsUpdate = true
        particlesRef.current.geometry.attributes.color.needsUpdate = true
        
        // Update wave ring
        const waveProgress = Math.min(progress * 1.5, 1)
        const waveScale = waveProgress * cityBounds.radius * 2
        waveRef.current.scale.set(waveScale, waveScale, 1)
        waveRef.current.material.opacity = (1 - waveProgress) * 0.6
        
        // Force render
        invalidate()
        
        // Deactivate when done
        if (progress >= 1) {
            setActive(false)
        }
    })

    if (!active) return null

    return (
        <group ref={groupRef} position={cityBounds.center}>
            {/* Particle burst */}
            <points ref={particlesRef}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        args={[positions, 3]}
                    />
                    <bufferAttribute
                        attach="attributes-color"
                        args={[colors, 3]}
                    />
                </bufferGeometry>
                <pointsMaterial
                    size={2}
                    vertexColors
                    transparent
                    opacity={1}
                    sizeAttenuation
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </points>
            
            {/* Expanding ring wave */}
            <mesh ref={waveRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, 1, 0]}>
                <ringGeometry args={[0.9, 1, 64]} />
                <meshBasicMaterial
                    color="#63b3ed"
                    transparent
                    opacity={0.6}
                    side={THREE.DoubleSide}
                    blending={THREE.AdditiveBlending}
                    depthWrite={false}
                />
            </mesh>
        </group>
    )
})
