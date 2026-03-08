import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * DistrictLabels — Floating holographic district name tags.
 * Glass-morphism canvas sprites. Dynamic cap scales with repo size.
 * Hover animation throttled to 30fps; skipped on low-end.
 */
export default function DistrictLabels() {
    const cityData = useStore(s => s.cityData)
    const groupRef = useRef()
    const lastT = useRef(0)

    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

    const labels = useMemo(() => {
        if (!cityData?.districts?.length) return []
        const n = cityData.buildings?.length || 0
        const maxLabels = n > 15000 ? 8 : n > 5000 ? 15 : n > 2000 ? 22 : 30
        return cityData.districts
            .filter(d => d.building_count >= 3)
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
                return { id: d.id, text: shortName, x: cx, z: cz, count: d.building_count, color: d.color }
            })
    }, [cityData])

    useFrame(({ clock }) => {
        if (!groupRef.current || isLowEnd) return
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return // 20fps for hover is plenty
        lastT.current = t
        const children = groupRef.current.children
        for (let i = 0; i < children.length; i++) {
            if (children[i].isSprite) {
                children[i].position.y = 30 + Math.sin(t * 0.4 + i * 0.8) * 2.5
            }
        }
    })

    if (!labels.length) return null

    return (
        <group ref={groupRef}>
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
        <sprite position={[label.x, 30, label.z]} scale={[scale, scale * 0.25, 1]}>
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
