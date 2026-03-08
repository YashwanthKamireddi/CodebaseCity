import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * DistrictLabels — Floating holographic district name tags.
 * Glass-morphism canvas sprites. Fully static (0 useFrame).
 * Label height adapts to tallest building in each district.
 */
const CITY_HEIGHT_SCALE = 3.0

export default function DistrictLabels() {
    const cityData = useStore(s => s.cityData)

    const labels = useMemo(() => {
        if (!cityData?.districts?.length) return []
        const n = cityData.buildings?.length || 0
        const maxLabels = n > 15000 ? 8 : n > 5000 ? 15 : n > 2000 ? 22 : 40

        // Build a map of district_id → max building height
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
            .filter(d => d.building_count >= 2)
            .slice(0, maxLabels)
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
                // Position label above tallest building in this district + 10 units clearance
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
}

function LabelSprite({ label }) {
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext('2d')
        ctx.clearRect(0, 0, 512, 128)

        const textWidth = Math.min(460, label.text.length * 20 + 50)
        const x = (512 - textWidth) / 2

        // Glass backdrop with gradient
        const grad = ctx.createLinearGradient(x, 20, x + textWidth, 100)
        grad.addColorStop(0, 'rgba(8, 15, 30, 0.7)')
        grad.addColorStop(1, 'rgba(5, 10, 25, 0.55)')
        ctx.fillStyle = grad
        ctx.beginPath()
        ctx.roundRect(x, 22, textWidth, 76, 10)
        ctx.fill()

        // Neon border with district color
        const borderColor = label.color || 'rgba(0, 180, 255, 0.5)'
        ctx.strokeStyle = borderColor
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.roundRect(x, 22, textWidth, 76, 10)
        ctx.stroke()

        // Top highlight line
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.12)'
        ctx.lineWidth = 1
        ctx.beginPath()
        ctx.moveTo(x + 10, 23)
        ctx.lineTo(x + textWidth - 10, 23)
        ctx.stroke()

        // Text with subtle shadow
        ctx.shadowColor = borderColor
        ctx.shadowBlur = 8
        ctx.font = 'bold 30px "Inter", "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.9)'
        ctx.fillText(label.text, 256, 58)
        ctx.shadowBlur = 0

        const tex = new THREE.CanvasTexture(canvas)
        tex.needsUpdate = true
        return tex
    }, [label])

    const scale = Math.max(18, Math.min(45, label.count * 0.7))

    return (
        <sprite position={[label.x, label.y, label.z]} scale={[scale, scale * 0.25, 1]}>
            <spriteMaterial
                map={texture}
                transparent
                opacity={0.75}
                depthWrite={false}
                depthTest={false}
                sizeAttenuation
            />
        </sprite>
    )
}
