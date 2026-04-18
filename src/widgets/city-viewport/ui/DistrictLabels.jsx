import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * DistrictLabels — Floating holographic district name tags.
 * Each label gets its own CanvasTexture with dynamic width based on text length.
 * Enhanced for Universe mode — shows repo info (stars, language).
 */
const CITY_HEIGHT_SCALE = 3.0

function createLabelTexture(text, color, subtitle = null) {
    // Create temporary canvas to measure text
    const measureCanvas = document.createElement('canvas')
    const measureCtx = measureCanvas.getContext('2d')
    
    // Measure main text
    measureCtx.font = 'bold 36px "Inter", "Segoe UI", sans-serif'
    const mainTextWidth = measureCtx.measureText(text).width
    
    // Measure subtitle if present
    let subtitleWidth = 0
    if (subtitle) {
        measureCtx.font = '22px "Inter", "Segoe UI", sans-serif'
        subtitleWidth = measureCtx.measureText(subtitle).width
    }
    
    // Calculate canvas dimensions based on actual text width
    const padding = 60
    const contentWidth = Math.max(mainTextWidth, subtitleWidth) + padding
    const W = Math.min(1024, Math.max(256, Math.ceil(contentWidth / 64) * 64)) // Round to 64px increments
    const H = subtitle ? 160 : 128
    
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const boxWidth = Math.min(W - 24, contentWidth)
    const x = (W - boxWidth) / 2
    const borderColor = color || 'rgba(0, 180, 255, 0.7)'

    // Glass backdrop with stronger opacity
    const grad = ctx.createLinearGradient(x, 12, x + boxWidth, H - 12)
    grad.addColorStop(0, 'rgba(6, 12, 28, 0.92)')
    grad.addColorStop(1, 'rgba(4, 8, 22, 0.85)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(x, 12, boxWidth, H - 24, 10)
    ctx.fill()

    // Neon border — brighter
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.roundRect(x, 12, boxWidth, H - 24, 10)
    ctx.stroke()

    // Top highlight line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 10, 13)
    ctx.lineTo(x + boxWidth - 10, 13)
    ctx.stroke()

    // Main text with glow
    ctx.shadowColor = borderColor
    ctx.shadowBlur = 12
    ctx.font = 'bold 36px "Inter", "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
    const mainY = subtitle ? H / 2 - 16 : H / 2 + 1
    ctx.fillText(text, W / 2, mainY)
    ctx.shadowBlur = 4
    ctx.fillText(text, W / 2, mainY)
    ctx.shadowBlur = 0

    // Subtitle (repo info for universe mode)
    if (subtitle) {
        ctx.font = '22px "Inter", "Segoe UI", sans-serif'
        ctx.fillStyle = 'rgba(180, 200, 220, 0.85)'
        ctx.shadowColor = borderColor
        ctx.shadowBlur = 4
        ctx.fillText(subtitle, W / 2, H / 2 + 26)
        ctx.shadowBlur = 0
    }

    const tex = new THREE.CanvasTexture(canvas)
    tex.generateMipmaps = false
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.needsUpdate = true
    
    // Store aspect ratio for proper scaling
    tex.userData = { aspectRatio: W / H }
    return tex
}

const DistrictLabels = React.memo(function DistrictLabels() {
    const cityData = useStore(s => s.cityData)
    const isUniverse = cityData?.source === 'universe'

    const labels = useMemo(() => {
        if (!cityData?.districts?.length) return []

        const districtMaxH = {}
        if (cityData.buildings) {
            for (const b of cityData.buildings) {
                const did = b.district_id
                const h = (b.dimensions?.height || 8) * CITY_HEIGHT_SCALE
                if (!districtMaxH[did] || h > districtMaxH[did]) {
                    districtMaxH[did] = h
                }
            }
        }

        return cityData.districts
            .filter(d => d.building_count >= 1)
            .map(d => {
                let cx = 0, cz = 0
                if (d.boundary?.length) {
                    for (const pt of d.boundary) { cx += pt.x; cz += pt.y }
                    cx /= d.boundary.length
                    cz /= d.boundary.length
                } else if (d.center) {
                    cx = d.center.x; cz = d.center.z ?? d.center.y
                }
                const name = d.name || d.label || d.id
                const shortName = name.split('/').slice(-2).join('/')
                const maxH = districtMaxH[d.id] || 30
                const labelY = Math.max(60, maxH + 40)
                
                // Build subtitle for universe mode (repo info)
                let subtitle = null
                if (isUniverse && d.repoInfo) {
                    const parts = []
                    if (d.repoInfo.stars > 0) parts.push(`★ ${d.repoInfo.stars.toLocaleString()}`)
                    if (d.repoInfo.language) parts.push(d.repoInfo.language)
                    if (d.building_count) parts.push(`${d.building_count} files`)
                    subtitle = parts.join(' • ')
                }
                
                return { 
                    id: d.id, 
                    text: shortName, 
                    x: cx, 
                    z: cz, 
                    y: labelY, 
                    count: d.building_count, 
                    color: d.color,
                    subtitle,
                    isUniverse 
                }
            })
    }, [cityData, isUniverse])

    if (!labels.length) return null

    return (
        <group>
            {labels.map(label => (
                <LabelSprite key={label.id} label={label} />
            ))}
        </group>
    )
})

export default DistrictLabels

const LabelSprite = React.memo(function LabelSprite({ label }) {
    const texture = useMemo(
        () => createLabelTexture(label.text, label.color, label.subtitle),
        [label.text, label.color, label.subtitle]
    )

    useEffect(() => () => texture.dispose(), [texture])

    // Scale based on file count and text length
    const textLength = label.text.length + (label.subtitle?.length || 0) * 0.5
    const baseScale = label.isUniverse ? 50 : 30
    const maxScale = label.isUniverse ? 100 : 70
    
    // Scale increases with file count but also adjusts for text length
    const countScale = Math.max(baseScale, Math.min(maxScale, label.count * 0.6 + textLength * 0.8))
    
    // Use aspect ratio from texture for proper width/height
    const aspectRatio = texture.userData?.aspectRatio || 4
    const height = label.subtitle ? 18 : 12
    const width = height * aspectRatio

    return (
        <sprite position={[label.x, label.y + 5, label.z]} scale={[width * (countScale / 30), height * (countScale / 30), 1]}>
            <spriteMaterial
                map={texture}
                transparent
                opacity={0.95}
                depthWrite={false}
                depthTest={true}
                sizeAttenuation
            />
        </sprite>
    )
})
