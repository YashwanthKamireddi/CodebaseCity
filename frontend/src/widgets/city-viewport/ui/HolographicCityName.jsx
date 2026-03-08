import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * HolographicCityName — Floating repo name above the city.
 *
 * Perf budget: 1 draw call (single sprite), 0 useFrame (fully static).
 */
export default function HolographicCityName() {
    const cityData = useStore(s => s.cityData)

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

        const displayName = repoName.split('/').pop() || repoName
        ctx.font = 'bold 72px "Outfit", "Inter", "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Soft glow pass
        ctx.shadowColor = '#0088ff'
        ctx.shadowBlur = 30
        ctx.fillStyle = 'rgba(0, 140, 255, 0.4)'
        ctx.fillText(displayName, 512, 125)

        // Medium glow
        ctx.shadowColor = '#00bbff'
        ctx.shadowBlur = 12
        ctx.fillStyle = 'rgba(0, 200, 255, 0.6)'
        ctx.fillText(displayName, 512, 125)

        // Crisp main text
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
        ctx.fillText(displayName, 512, 125)

        // Underline accent
        const textW = ctx.measureText(displayName).width
        const grad = ctx.createLinearGradient(512 - textW / 2, 0, 512 + textW / 2, 0)
        grad.addColorStop(0, 'rgba(0, 200, 255, 0)')
        grad.addColorStop(0.3, 'rgba(0, 200, 255, 0.5)')
        grad.addColorStop(0.7, 'rgba(0, 200, 255, 0.5)')
        grad.addColorStop(1, 'rgba(0, 200, 255, 0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.moveTo(512 - textW / 2, 168)
        ctx.lineTo(512 + textW / 2, 168)
        ctx.stroke()

        const tex = new THREE.CanvasTexture(canvas)
        tex.needsUpdate = true
        return tex
    }, [repoName])

    if (!texture || !repoName) return null

    const scale = Math.max(60, cityRadius * 0.4)

    return (
        <sprite
            position={[0, cityRadius * 0.7, 0]}
            scale={[scale, scale * 0.25, 1]}
        >
            <spriteMaterial
                map={texture}
                transparent
                opacity={0.8}
                depthWrite={false}
                depthTest={false}
                sizeAttenuation
            />
        </sprite>
    )
}
