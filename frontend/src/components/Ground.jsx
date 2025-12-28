import React, { useMemo } from 'react'
import * as THREE from 'three'

function Ground({ size = 400 }) {
    // Create grid texture
    const gridTexture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')

        // Dark background
        ctx.fillStyle = '#0a0a0f'
        ctx.fillRect(0, 0, 512, 512)

        // Grid lines
        ctx.strokeStyle = '#1a1a24'
        ctx.lineWidth = 1

        const gridSize = 32
        for (let i = 0; i <= 512; i += gridSize) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, 512)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(512, i)
            ctx.stroke()
        }

        // Major grid lines
        ctx.strokeStyle = '#252530'
        ctx.lineWidth = 2
        for (let i = 0; i <= 512; i += gridSize * 4) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, 512)
            ctx.stroke()

            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(512, i)
            ctx.stroke()
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(size / 50, size / 50)

        return texture
    }, [size])

    return (
        <group>
            {/* Main ground plane */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]} receiveShadow>
                <planeGeometry args={[size, size]} />
                <meshStandardMaterial
                    map={gridTexture}
                    roughness={0.9}
                    metalness={0.1}
                    transparent
                    opacity={0.9}
                />
            </mesh>

            {/* Glow ring around city center */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.01, 0]}>
                <ringGeometry args={[80, 85, 64]} />
                <meshBasicMaterial color="#00d4ff" transparent opacity={0.1} side={THREE.DoubleSide} />
            </mesh>

            {/* Outer boundary indicator */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]}>
                <ringGeometry args={[size / 2 - 5, size / 2, 64]} />
                <meshBasicMaterial color="#1a1a24" transparent opacity={0.5} side={THREE.DoubleSide} />
            </mesh>
        </group>
    )
}

export default Ground
