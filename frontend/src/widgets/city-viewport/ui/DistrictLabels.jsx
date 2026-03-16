import React, { useMemo, useEffect } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * DistrictLabels — Floating holographic district name tags.
 * Each label gets its own 256×64 CanvasTexture (~64KB each, ~2MB for 30 labels).
 */
const CITY_HEIGHT_SCALE = 3.0

function createLabelTexture(text, color) {
    const W = 512, H = 128
    const canvas = document.createElement('canvas')
    canvas.width = W
    canvas.height = H
    const ctx = canvas.getContext('2d')
    ctx.clearRect(0, 0, W, H)

    const textWidth = Math.min(W - 32, text.length * 24 + 60)
    const x = (W - textWidth) / 2
    const borderColor = color || 'rgba(0, 180, 255, 0.7)'

    // Glass backdrop with stronger opacity
    const grad = ctx.createLinearGradient(x, 12, x + textWidth, H - 12)
    grad.addColorStop(0, 'rgba(6, 12, 28, 0.92)')
    grad.addColorStop(1, 'rgba(4, 8, 22, 0.85)')
    ctx.fillStyle = grad
    ctx.beginPath()
    ctx.roundRect(x, 12, textWidth, H - 24, 10)
    ctx.fill()

    // Neon border — brighter
    ctx.strokeStyle = borderColor
    ctx.lineWidth = 2.5
    ctx.beginPath()
    ctx.roundRect(x, 12, textWidth, H - 24, 10)
    ctx.stroke()

    // Top highlight line
    ctx.strokeStyle = 'rgba(255, 255, 255, 0.2)'
    ctx.lineWidth = 1
    ctx.beginPath()
    ctx.moveTo(x + 10, 13)
    ctx.lineTo(x + textWidth - 10, 13)
    ctx.stroke()

    // Text with glow — larger, bolder, more visible
    ctx.shadowColor = borderColor
    ctx.shadowBlur = 12
    ctx.font = 'bold 36px "Inter", "Segoe UI", sans-serif'
    ctx.textAlign = 'center'
    ctx.textBaseline = 'middle'
    ctx.fillStyle = 'rgba(255, 255, 255, 0.98)'
    ctx.fillText(text, W / 2, H / 2 + 1)
    // Double-draw for stronger text presence
    ctx.shadowBlur = 4
    ctx.fillText(text, W / 2, H / 2 + 1)
    ctx.shadowBlur = 0

    const tex = new THREE.CanvasTexture(canvas)
    tex.generateMipmaps = false
    tex.minFilter = THREE.LinearFilter
    tex.magFilter = THREE.LinearFilter
    tex.needsUpdate = true
    return tex
}

const DistrictLabels = React.memo(function DistrictLabels() {
    const cityData = useStore(s => s.cityData)

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
                    cx = d.center.x; cz = d.center.y
                }
                const name = d.name || d.id
                const shortName = name.split('/').slice(-2).join('/')
                const maxH = districtMaxH[d.id] || 30
                const labelY = Math.max(20, maxH + 10)
                return { id: d.id, text: shortName, x: cx, z: cz, y: labelY, count: d.building_count, color: d.color }
            })
    }, [cityData])

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
        () => createLabelTexture(label.text, label.color),
        [label.text, label.color]
    )

    useEffect(() => () => texture.dispose(), [texture])

    const scale = Math.max(25, Math.min(55, label.count * 0.8))

    return (
        <sprite position={[label.x, label.y + 5, label.z]} scale={[scale, scale * 0.25, 1]}>
            <spriteMaterial
                map={texture}
                transparent
                opacity={0.95}
                depthWrite={false}
                depthTest={false}
                sizeAttenuation
            />
        </sprite>
    )
})
