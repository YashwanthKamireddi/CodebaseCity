import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * DistrictLabels — Floating holographic directory/community name labels above each district.
 * Uses sprite-based canvas text rendering for crisp resolution-independent text.
 * Performance: one sprite per district (districts are capped at 80).
 */
export default function DistrictLabels() {
    const cityData = useStore(s => s.cityData)
    const groupRef = useRef()

    const labels = useMemo(() => {
        if (!cityData?.districts?.length) return []
        return cityData.districts
            .filter(d => d.building_count >= 3)
            .slice(0, 30) // Cap for performance
            .map(d => {
                // Compute center from boundary
                let cx = 0, cz = 0
                if (d.boundary?.length) {
                    for (const pt of d.boundary) {
                        cx += pt.x
                        cz += pt.y
                    }
                    cx /= d.boundary.length
                    cz /= d.boundary.length
                } else if (d.center) {
                    cx = d.center.x
                    cz = d.center.y
                }

                // Get a clean short name
                const name = d.name || d.id
                const shortName = name.split('/').slice(-2).join('/')

                return {
                    id: d.id,
                    text: shortName,
                    x: cx,
                    z: cz,
                    count: d.building_count,
                    color: d.color,
                }
            })
    }, [cityData])

    // Subtle hover animation
    useFrame(({ clock }) => {
        if (!groupRef.current) return
        const t = clock.getElapsedTime()
        groupRef.current.children.forEach((child, i) => {
            if (child.isSprite) {
                child.position.y = 30 + Math.sin(t * 0.5 + i * 0.7) * 3
            }
        })
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
    const spriteRef = useRef()

    const texture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 128
        const ctx = canvas.getContext('2d')

        // Transparent background
        ctx.clearRect(0, 0, 512, 128)

        // Subtle dark backdrop pill
        ctx.fillStyle = 'rgba(5, 10, 20, 0.6)'
        const textWidth = Math.min(460, label.text.length * 22 + 40)
        const x = (512 - textWidth) / 2
        ctx.beginPath()
        ctx.roundRect(x, 20, textWidth, 80, 12)
        ctx.fill()

        // Border glow
        ctx.strokeStyle = label.color || 'rgba(0, 200, 255, 0.4)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.roundRect(x, 20, textWidth, 80, 12)
        ctx.stroke()

        // Text
        ctx.font = 'bold 32px "Inter", "Segoe UI", sans-serif'
        ctx.textAlign = 'center'
        ctx.textBaseline = 'middle'
        ctx.fillStyle = 'rgba(255, 255, 255, 0.85)'
        ctx.fillText(label.text, 256, 60)

        const tex = new THREE.CanvasTexture(canvas)
        tex.needsUpdate = true
        return tex
    }, [label])

    const scale = Math.max(20, Math.min(50, label.count * 0.8))

    return (
        <sprite
            ref={spriteRef}
            position={[label.x, 30, label.z]}
            scale={[scale, scale * 0.25, 1]}
        >
            <spriteMaterial
                map={texture}
                transparent
                opacity={0.7}
                depthWrite={false}
                depthTest={false}
                sizeAttenuation={true}
            />
        </sprite>
    )
}
