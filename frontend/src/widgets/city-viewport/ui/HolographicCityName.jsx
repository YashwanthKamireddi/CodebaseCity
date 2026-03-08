import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * HolographicCityName — Floating holographic repo name above the city.
 * Enhanced canvas with scanline effect and dual glow passes.
 * Single sprite, throttled to 30fps.
 */
export default function HolographicCityName() {
    const cityData = useStore(s => s.cityData)
    const spriteRef = useRef()
    const lastT = useRef(0)

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

        // Large soft glow pass
        ctx.shadowColor = '#0088ff'
        ctx.shadowBlur = 40
        ctx.fillStyle = 'rgba(0, 140, 255, 0.35)'
        ctx.fillText(displayName, 512, 125)

        // Medium glow pass
        ctx.shadowColor = '#00bbff'
        ctx.shadowBlur = 15
        ctx.fillStyle = 'rgba(0, 200, 255, 0.55)'
        ctx.fillText(displayName, 512, 125)

        // Crisp main text
        ctx.shadowBlur = 0
        ctx.fillStyle = 'rgba(255, 255, 255, 0.92)'
        ctx.fillText(displayName, 512, 125)

        // Scanlines overlay
        ctx.globalCompositeOperation = 'destination-out'
        for (let y = 0; y < 256; y += 4) {
            ctx.fillStyle = 'rgba(0,0,0,0.06)'
            ctx.fillRect(0, y, 1024, 1)
        }
        ctx.globalCompositeOperation = 'source-over'

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

    useFrame(({ clock }) => {
        if (!spriteRef.current) return
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return // 20fps
        lastT.current = t
        spriteRef.current.position.y = cityRadius * 0.7 + Math.sin(t * 0.25) * 4
        spriteRef.current.material.opacity = 0.75 + Math.sin(t * 0.6) * 0.08
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
                sizeAttenuation
            />
        </sprite>
    )
}
