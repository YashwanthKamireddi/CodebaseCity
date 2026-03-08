import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * HolographicCityName — Floating 3D holographic text of the repository name above the city.
 * Uses a high-res canvas sprite for crisp text at any distance.
 * Premium look with glow, scan line, and subtle animation.
 */
export default function HolographicCityName() {
    const cityData = useStore(s => s.cityData)
    const spriteRef = useRef()

    const cityRadius = useMemo(() => {
        if (!cityData?.buildings?.length) return 200
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(200, maxR * 0.8)
    }, [cityData])

    const repoName = cityData?.name || ''

    const texture = useMemo(() => {
        if (!repoName) return null
        const canvas = document.createElement('canvas')
        canvas.width = 1024
        canvas.height = 256
        const ctx = canvas.getContext('2d')

        ctx.clearRect(0, 0, 1024, 256)

        // Glow behind text
        ctx.shadowColor = '#00aaff'
        ctx.shadowBlur = 30
        ctx.shadowOffsetX = 0
        ctx.shadowOffsetY = 0

        // Main text
        const displayName = repoName.split('/').pop() || repoName
        ctx.font = 'bold 72px "Outfit", "Inter", "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Outer glow pass
        ctx.fillStyle = 'rgba(0, 170, 255, 0.5)'
        ctx.fillText(displayName, 512, 128)

        // Main text pass
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillText(displayName, 512, 128)

        // Subtle underline
        const textW = ctx.measureText(displayName).width
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(512 - textW / 2, 170)
        ctx.lineTo(512 + textW / 2, 170)
        ctx.stroke()

        const tex = new THREE.CanvasTexture(canvas)
        tex.needsUpdate = true
        return tex
    }, [repoName])

    useFrame(({ clock }) => {
        if (spriteRef.current) {
            const t = clock.getElapsedTime()
            spriteRef.current.position.y = cityRadius * 0.7 + Math.sin(t * 0.3) * 5
            spriteRef.current.material.opacity = 0.7 + Math.sin(t * 0.8) * 0.1
        }
    })

    if (!texture || !repoName) return null

    const scale = Math.max(60, cityRadius * 0.4)

    return (
        <sprite
            ref={spriteRef}
            position={[0, cityRadius * 0.7, 0]}
            scale={[scale, scale * 0.25, 1]}
        >
            <spriteMaterial
                map={texture}
                transparent
                opacity={0.8}
                depthWrite={false}
                depthTest={false}
                sizeAttenuation={true}
            />
        </sprite>
    )
}
