import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * HolographicCityName — Floating repo name above the city.
 *
 * Perf budget: 1 draw call (single sprite), 0 useFrame (fully static).
 * Height auto-adjusts above tallest building to prevent overlap.
 */
export default React.memo(function HolographicCityName() {
    const cityData = useStore(s => s.cityData)

    const { cityRadius, maxBuildingTop, hallTop } = useMemo(() => {
        if (!cityData?.buildings?.length) return { cityRadius: 200, maxBuildingTop: 80, hallTop: 74 }
        let maxR = 0
        let maxH = 0
        const heights = []
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
            const h = (b.dimensions?.height || 8) * 3.0
            if (h > maxH) maxH = h
            heights.push(h)
        }
        heights.sort((a, b) => a - b)
        const p90 = heights[Math.floor(heights.length * 0.9)] || 50
        const spireHeight = Math.max(60, p90 * 1.4)
        return {
            cityRadius: Math.max(200, maxR * 0.8),
            maxBuildingTop: maxH,
            hallTop: 8 + spireHeight + 6,
        }
    }, [cityData])

    const repoName = cityData?.name || ''

    const texture = useMemo(() => {
        if (!repoName) return null
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, 512, 128)

        const displayName = repoName.split('/').pop() || repoName
        ctx.font = 'bold 36px "Outfit", "Inter", "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'

        // Soft glow pass
        ctx.shadowColor = '#0088ff'
        ctx.shadowBlur = 15
        ctx.fillStyle = 'rgba(0, 140, 255, 0.4)'
        ctx.fillText(displayName, 256, 62)

        // Medium glow
        ctx.shadowColor = '#00bbff'
        ctx.shadowBlur = 6
        ctx.fillStyle = 'rgba(0, 200, 255, 0.6)'
        ctx.fillText(displayName, 256, 62)

        // Crisp main text
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
        ctx.fillText(displayName, 256, 62)

        // Underline accent
        const textW = ctx.measureText(displayName).width
        const grad = ctx.createLinearGradient(256 - textW / 2, 0, 256 + textW / 2, 0)
        grad.addColorStop(0, 'rgba(0, 200, 255, 0)')
        grad.addColorStop(0.3, 'rgba(0, 200, 255, 0.5)')
        grad.addColorStop(0.7, 'rgba(0, 200, 255, 0.5)')
        grad.addColorStop(1, 'rgba(0, 200, 255, 0)')
        ctx.strokeStyle = grad
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.moveTo(256 - textW / 2, 84)
        ctx.lineTo(256 + textW / 2, 84)
        ctx.stroke()

        const tex = new THREE.CanvasTexture(canvas)
        tex.generateMipmaps = false
        tex.minFilter = THREE.LinearFilter
        tex.magFilter = THREE.LinearFilter
        tex.needsUpdate = true
        return tex
    }, [repoName])

    useEffect(() => () => { if (texture) texture.dispose() }, [texture])

    if (!texture || !repoName) return null

    const scale = Math.max(60, cityRadius * 0.4)
    const textHeight = scale * 0.25

    // Position text squarely above the central Town Hall, guaranteeing daylight space.
    const titleY = Math.max(cityRadius * 0.52, maxBuildingTop + 55, hallTop + textHeight / 2 + 40)

    return (
        <sprite
            position={[0, titleY, 0]}
            scale={[scale, textHeight, 1]}
        >
            <spriteMaterial
                map={texture}
                transparent
                opacity={0.8}
                depthWrite={false}
                depthTest={true}
                sizeAttenuation
            />
        </sprite>
    )
})
