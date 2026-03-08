import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * LandingPads — Illuminated circular pads on rooftops of the largest buildings.
 * Like helicopter/VTOL landing pads from sci-fi cities.
 * Instanced — 1 draw call total.
 */
export default function LandingPads() {
    const cityData = useStore(s => s.cityData)
    const meshRef = useRef()

    const padBuildings = useMemo(() => {
        if (!cityData?.buildings?.length) return []
        // Pick the top 15 largest by volume (width * height)
        return [...cityData.buildings]
            .sort((a, b) => {
                const volA = (a.dimensions?.width || 1) * (a.dimensions?.height || 1)
                const volB = (b.dimensions?.width || 1) * (b.dimensions?.height || 1)
                return volB - volA
            })
            .slice(0, 15)
    }, [cityData])

    const count = padBuildings.length

    // Generate pad texture
    const texture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 256
        canvas.height = 256
        const ctx = canvas.getContext('2d')
        const cx = 128, cy = 128

        ctx.clearRect(0, 0, 256, 256)

        // Outer ring
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.8)'
        ctx.lineWidth = 3
        ctx.beginPath()
        ctx.arc(cx, cy, 100, 0, Math.PI * 2)
        ctx.stroke()

        // Inner ring
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.5)'
        ctx.lineWidth = 2
        ctx.beginPath()
        ctx.arc(cx, cy, 60, 0, Math.PI * 2)
        ctx.stroke()

        // H symbol
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.9)'
        ctx.lineWidth = 6
        ctx.beginPath()
        ctx.moveTo(cx - 28, cy - 35)
        ctx.lineTo(cx - 28, cy + 35)
        ctx.moveTo(cx + 28, cy - 35)
        ctx.lineTo(cx + 28, cy + 35)
        ctx.moveTo(cx - 28, cy)
        ctx.lineTo(cx + 28, cy)
        ctx.stroke()

        // Corner markers
        const size = 15
        const offset = 85
        ctx.strokeStyle = 'rgba(0, 180, 255, 0.6)'
        ctx.lineWidth = 3
        const corners = [[-1, -1], [1, -1], [1, 1], [-1, 1]]
        corners.forEach(([sx, sy]) => {
            const px = cx + sx * offset
            const py = cy + sy * offset
            ctx.beginPath()
            ctx.moveTo(px, py - sy * size)
            ctx.lineTo(px, py)
            ctx.lineTo(px - sx * size, py)
            ctx.stroke()
        })

        // Glow center
        const glow = ctx.createRadialGradient(cx, cy, 0, cx, cy, 50)
        glow.addColorStop(0, 'rgba(0, 200, 255, 0.15)')
        glow.addColorStop(1, 'rgba(0, 200, 255, 0)')
        ctx.fillStyle = glow
        ctx.beginPath()
        ctx.arc(cx, cy, 50, 0, Math.PI * 2)
        ctx.fill()

        const tex = new THREE.CanvasTexture(canvas)
        tex.needsUpdate = true
        return tex
    }, [])

    // Set up instance matrices
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

    // Subtle pulse
    useFrame(({ clock }) => {
        if (meshRef.current) {
            meshRef.current.material.opacity = 0.5 + Math.sin(clock.getElapsedTime() * 1.5) * 0.15
        }
    })

    if (!count) return null

    return (
        <instancedMesh ref={meshRef} args={[undefined, undefined, count]} frustumCulled={false}>
            <planeGeometry args={[1, 1]} />
            <meshBasicMaterial
                map={texture}
                transparent
                opacity={0.6}
                depthWrite={false}
                blending={THREE.AdditiveBlending}
                side={THREE.DoubleSide}
            />
        </instancedMesh>
    )
}
