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
            {/* Main ground plane - Lowered to prevent Z-fighting */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.05, 0]} receiveShadow>
                <planeGeometry args={[size * 2, size * 2]} />
                <meshStandardMaterial
                    map={gridTexture}
                    roughness={0.9}
                    metalness={0.1}
                // Opaque to hide background
                />
            </mesh>

            {/* Rings removed as requested */}
        </group>
    )
}

export default Ground
