import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * LandingPads — Illuminated rooftop VTOL pads on the largest buildings.
 * Dynamic cap scales with repo size. Throttled pulse at 30fps.
 * Instanced — 1 draw call.
 */
export default function LandingPads() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()
    const lastT = useRef(0)

    const padBuildings = useMemo(() => {
        if (!cityData?.buildings?.length) return []
        const n = cityData.buildings.length
        const maxPads = n > 15000 ? 5 : n > 5000 ? 8 : n > 2000 ? 12 : 15
        return [...cityData.buildings]
            .sort((a, b) => {
                const volA = (a.dimensions?.width || 1) * (a.dimensions?.height || 1)
                const volB = (b.dimensions?.width || 1) * (b.dimensions?.height || 1)
                return volB - volA
            })
            .slice(0, maxPads)
    }, [cityData])

    const count = padBuildings.length

    const texture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')
        const cx = 128, cy = 128
        ctx.clearRect(0, 0, 256, 256)

        // Outer ring with glow
        ctx.shadowColor = 'rgba(0, 200, 255, 0.6)'
        ctx.shadowBlur = 12
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.85)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx, cy, 100, 0, Math.PI * 2)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Inner ring
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.4)'
        ctx.lineWidth = 1.5
        ctx.beginPath()
        ctx.arc(cx, cy, 60, 0, Math.PI * 2)
        ctx.stroke()

        // H symbol with glow
        ctx.shadowColor = 'rgba(0, 255, 255, 0.5)'
        ctx.shadowBlur = 6
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.95)'
        ctx.lineWidth = 5
        ctx.beginPath()
        ctx.moveTo(cx - 25, cy - 32)
        ctx.lineTo(cx - 25, cy + 32)
        ctx.moveTo(cx + 25, cy - 32)
        ctx.lineTo(cx + 25, cy + 32)
        ctx.moveTo(cx - 25, cy)
        ctx.lineTo(cx + 25, cy)
        ctx.stroke()
        ctx.shadowBlur = 0

        // Directional arrows (N/S/E/W markers)
        ctx.strokeStyle = 'rgba(0, 160, 255, 0.45)'
        ctx.lineWidth = 2
        const arrowD = 82
        ;[0, Math.PI / 2, Math.PI, Math.PI * 1.5].forEach(angle => {
            const ax = cx + Math.cos(angle) * arrowD
            const ay = cy + Math.sin(angle) * arrowD
            ctx.beginPath()
            ctx.arc(ax, ay, 4, 0, Math.PI * 2)
            ctx.stroke()
        })

        // Corner markers
        const size = 14, offset = 85
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.55)'
        ctx.lineWidth = 2.5
        ;[[-1, -1], [1, -1], [1, 1], [-1, 1]].forEach(([sx, sy]) => {
            const px = cx + sx * offset, py = cy + sy * offset
            ctx.beginPath()
            ctx.moveTo(px, py - sy * size)
            ctx.lineTo(px, py)
            ctx.lineTo(px - sx * size, py)
            ctx.stroke()
        })

        // Center glow
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 45)
        glow.addColorStop(0, 'rgba(0, 200, 255, 0.12)')
        glow.addColorStop(1, 'rgba(0, 200, 255, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(cx, cy, 45, 0, Math.PI * 2)
        ctx.fill()

        const tex = new THREE.CanvasTexture(canvas)
        tex.needsUpdate = true
        return tex
    }, [])

    React.useEffect(() => {
        if (!meshRef.current || !count) return
        const tempObj = new THREE.Object3D()
        padBuildings.forEach((b, i) => {
            const h = (b.dimensions?.height || 8) * 3.0
            const padSize = Math.max(b.dimensions?.width || 6, 6) * 0.6
            tempObj.position.set(b.position.x, h + 0.2, b.position.z || 0)
            tempObj.rotation.set(-Math.PI / 2, 0, 0)
            tempObj.scale.set(padSize, padSize, 1)
            tempObj.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObj.matrix)
        })
        meshRef.current.instanceMatrix.needsUpdate = true
    }, [padBuildings, count])

    useFrame(({ clock }) => {
        if (!meshRef.current) return
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.05) return // 20fps
        lastT.current = t
        meshRef.current.material.opacity = 0.5 + Math.sin(t * 1.2) * 0.12
    })

    if (!count) return null

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={0.55}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
            />
        </instancedMesh>
    )
}
