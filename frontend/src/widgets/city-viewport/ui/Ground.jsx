import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'

/**
 * Ground - Premium Cyberpunk City Floor
 *
 * Inspired by:
 * - Blade Runner 2049 / Ghost in the Shell cityscapes
 * - TRON Legacy grid aesthetics
 * - Modern architecture floor plans
 */
function Ground({ size = 2000 }) {
    const meshRef = useRef()
    const glowMeshRef = useRef()
    const pulseRef = useRef(0)

    // Animate subtle pulse
    useFrame((state) => {
        pulseRef.current = Math.sin(state.clock.elapsedTime * 0.5) * 0.5 + 0.5
        if (glowMeshRef.current) {
            glowMeshRef.current.material.opacity = 0.4 + pulseRef.current * 0.2
        }
    })

    // Premium city grid texture
    const gridTexture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 2048
        canvas.height = 2048
        const ctx = canvas.getContext('2d')

        // Deep space background with radial gradient
        const bgGradient = ctx.createRadialGradient(1024, 1024, 0, 1024, 1024, 1024)
        bgGradient.addColorStop(0, '#0a0d12')      // Dark center
        bgGradient.addColorStop(0.3, '#080a0f')   // Slightly lighter
        bgGradient.addColorStop(0.7, '#050709')   // Darker edges
        bgGradient.addColorStop(1, '#020304')     // Near black edge
        ctx.fillStyle = bgGradient
        ctx.fillRect(0, 0, 2048, 2048)

        // City block grid - major streets
        const blockSize = 256 // Large city blocks
        ctx.strokeStyle = 'rgba(30, 80, 140, 0.12)'
        ctx.lineWidth = 3

        for (let i = 0; i <= 2048; i += blockSize) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, 2048)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(2048, i)
            ctx.stroke()
        }

        // Secondary streets - smaller grid
        const streetSize = 64
        ctx.strokeStyle = 'rgba(40, 100, 160, 0.06)'
        ctx.lineWidth = 1

        for (let i = 0; i <= 2048; i += streetSize) {
            if (i % blockSize === 0) continue // Skip major streets
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, 2048)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(2048, i)
            ctx.stroke()
        }

        // Fine detail grid - building plots
        ctx.strokeStyle = 'rgba(60, 130, 180, 0.03)'
        ctx.lineWidth = 0.5
        ctx.setLineDash([4, 8])

        for (let i = 0; i <= 2048; i += 16) {
            if (i % streetSize === 0) continue
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, 2048)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(2048, i)
            ctx.stroke()
        }
        ctx.setLineDash([])

        // Intersection highlights - glowing nodes
        ctx.fillStyle = 'rgba(0, 180, 255, 0.08)'
        for (let x = 0; x <= 2048; x += blockSize) {
            for (let y = 0; y <= 2048; y += blockSize) {
                // Main intersection glow
                const gradient = ctx.createRadialGradient(x, y, 0, x, y, 20)
                gradient.addColorStop(0, 'rgba(0, 200, 255, 0.15)')
                gradient.addColorStop(0.5, 'rgba(0, 150, 220, 0.06)')
                gradient.addColorStop(1, 'rgba(0, 100, 180, 0)')
                ctx.fillStyle = gradient
                ctx.fillRect(x - 20, y - 20, 40, 40)
            }
        }

        // Secondary intersection dots
        ctx.fillStyle = 'rgba(80, 160, 220, 0.1)'
        for (let x = 0; x <= 2048; x += streetSize) {
            for (let y = 0; y <= 2048; y += streetSize) {
                if (x % blockSize === 0 && y % blockSize === 0) continue
                ctx.beginPath()
                ctx.arc(x, y, 2, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        // Add noise texture for organic feel
        const imageData = ctx.getImageData(0, 0, 2048, 2048)
        const data = imageData.data
        for (let i = 0; i < data.length; i += 4) {
            const noise = (Math.random() - 0.5) * 8
            data[i] = Math.max(0, Math.min(255, data[i] + noise))
            data[i + 1] = Math.max(0, Math.min(255, data[i + 1] + noise))
            data[i + 2] = Math.max(0, Math.min(255, data[i + 2] + noise))
        }
        ctx.putImageData(imageData, 0, 0)

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(size / 120, size / 120)
        texture.anisotropy = 16
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter

        return texture
    }, [size])

    // Center city glow - heart of the metropolis
    const centerGlow = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 1024
        const ctx = canvas.getContext('2d')

        // Multi-layered glow effect
        const gradient = ctx.createRadialGradient(512, 512, 0, 512, 512, 512)
        gradient.addColorStop(0, 'rgba(0, 200, 255, 0.25)')     // Bright cyan center
        gradient.addColorStop(0.15, 'rgba(0, 150, 220, 0.15)')  // Cyan
        gradient.addColorStop(0.35, 'rgba(30, 100, 180, 0.08)') // Blue
        gradient.addColorStop(0.6, 'rgba(20, 60, 120, 0.03)')   // Dark blue
        gradient.addColorStop(1, 'rgba(0, 0, 0, 0)')            // Transparent

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 1024, 1024)

        // Add concentric rings
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.1)'
        ctx.lineWidth = 1
        for (let r = 100; r < 500; r += 80) {
            ctx.beginPath()
            ctx.arc(512, 512, r, 0, Math.PI * 2)
            ctx.stroke()
        }

        const texture = new THREE.CanvasTexture(canvas)
        return texture
    }, [])

    // Outer ring gradient for depth
    const ringGradient = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')

        const gradient = ctx.createRadialGradient(256, 256, 100, 256, 256, 256)
        gradient.addColorStop(0, 'rgba(0, 0, 0, 0)')
        gradient.addColorStop(0.5, 'rgba(0, 80, 140, 0.03)')
        gradient.addColorStop(1, 'rgba(0, 40, 80, 0.08)')

        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 512, 512)

        const texture = new THREE.CanvasTexture(canvas)
        return texture
    }, [])

    return (
        <group>
            {/* Main ground plane */}
            <mesh
                ref={meshRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.15, 0]}
                receiveShadow
            >
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial
                    map={gridTexture}
                    roughness={0.95}
                    metalness={0.05}
                    envMapIntensity={0.1}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </mesh>

            {/* City center glow */}
            <mesh
                ref={glowMeshRef}
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.1, 0]}
            >
                <planeGeometry args={[500, 500]} />
                <meshBasicMaterial
                    map={centerGlow}
                    transparent
                    opacity={0.5}
                    depthWrite={false}
                    blending={THREE.AdditiveBlending}
                />
            </mesh>

            {/* Outer atmosphere ring */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.12, 0]}
            >
                <ringGeometry args={[200, 600, 128]} />
                <meshBasicMaterial
                    map={ringGradient}
                    transparent
                    opacity={0.3}
                    side={THREE.DoubleSide}
                    depthWrite={false}
                />
            </mesh>

            {/* Horizon fade - makes city feel infinite */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.2, 0]}
            >
                <ringGeometry args={[500, size * 0.6, 64]} />
                <meshBasicMaterial
                    color="#020406"
                    transparent
                    opacity={0.9}
                    side={THREE.DoubleSide}
                />
            </mesh>
        </group>
    )
}

export default Ground
