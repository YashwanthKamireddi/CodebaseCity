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

    const titleAnchor = useMemo(() => {
        const buildings = cityData?.buildings || []
        if (!buildings.length) return { x: 140, z: -90 }

        // Find a spot on the outskirts to place the name so it doesn't overlap Mothership/Center
        const ringRadius = Math.max(cityRadius * 0.85, 140)
        let best = { x: ringRadius, z: 0, score: -Infinity }
        const candidates = 16

        for (let i = 0; i < candidates; i++) {
            const angle = (Math.PI * 2 * i) / candidates + Math.PI * 0.125
            const x = Math.cos(angle) * ringRadius
            const z = Math.sin(angle) * ringRadius

            let minDistSq = Infinity
            let crowdedCount = 0
            for (const b of buildings) {
                const dx = (b.position?.x || 0) - x
                const dz = (b.position?.z || 0) - z
                const distSq = dx * dx + dz * dz
                if (distSq < minDistSq) minDistSq = distSq
                if (distSq < 95 * 95) crowdedCount++
            }

            const radialBonus = Math.abs(x) * 0.08 + Math.abs(z) * 0.06
            const score = Math.sqrt(minDistSq) - crowdedCount * 12 + radialBonus
            if (score > best.score) best = { x, z, score }
        }

        return { x: best.x, z: best.z }
    }, [cityData, cityRadius])

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
    // Keep the title above buildings and clearly above the central Town Hall spire.
    const titleY = Math.max(cityRadius * 0.52, maxBuildingTop + 55, hallTop + 36)

    return (
        <sprite
            position={[titleAnchor.x, titleY, titleAnchor.z]}
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
})
