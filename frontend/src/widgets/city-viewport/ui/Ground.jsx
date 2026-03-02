import React, { useMemo } from 'react'
import * as THREE from 'three'

/**
 * Ground - Elevated Dark City Floor
 *
 * Design: Dark blue-gray surface with subtle blue-tinted structural grid.
 * Inspired by Cyberpunk 2077 / Star Citizen ground planes.
 * NOT pure black — visible but understated.
 */
function Ground({ size = 2000 }) {
    const gridTexture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 2048
        canvas.height = 2048
        const ctx = canvas.getContext('2d')

        // Base: pure deep void
        ctx.fillStyle = '#050a10'
        ctx.fillRect(0, 0, 2048, 2048)

        const blockSize = 128

        // Minor grid - faint cyan lines
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.03)'
        ctx.lineWidth = 1

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

        // Crosshairs at intersections - bright cyan
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.4)'
        ctx.lineWidth = 2
        const crossSize = 4

        for (let x = 0; x <= 2048; x += blockSize) {
            for (let y = 0; y <= 2048; y += blockSize) {
                // Glow behind crosshair
                const glow = ctx.createRadialGradient(x, y, 0, x, y, 10)
                glow.addColorStop(0, 'rgba(255, 255, 255, 0.15)')
                glow.addColorStop(1, 'rgba(255, 255, 255, 0)')
                ctx.fillStyle = glow
                ctx.beginPath()
                ctx.arc(x, y, 10, 0, Math.PI * 2)
                ctx.fill()

                // Draw +
                ctx.beginPath()
                ctx.moveTo(x - crossSize, y)
                ctx.lineTo(x + crossSize, y)
                ctx.stroke()
                ctx.beginPath()
                ctx.moveTo(x, y - crossSize)
                ctx.lineTo(x, y + crossSize)
                ctx.stroke()
            }
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(size / 300, size / 300) // Much sparser grid
        texture.anisotropy = 16
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter

        return texture
    }, [size])

    return (
        <group>
            {/* Main ground circular plane (removes sharp square corners) */}
            <mesh
                rotation={[-Math.PI / 2, 0, 0]}
                position={[0, -0.15, 0]}
                receiveShadow
            >
                <circleGeometry args={[size / 2, 128]} />
                <meshStandardMaterial
                    map={gridTexture}
                    roughness={0.92}
                    metalness={0.08}
                    envMapIntensity={0.05}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </mesh>
        </group>
    )
}

export default Ground
