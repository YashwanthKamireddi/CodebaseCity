import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Ground — Cyberpunk city floor with glowing structural grid.
 *
 * Design: Deep void base with bright cyan grid lines, intersection nodes
 * with radial glow, and crosshair markers. Inspired by Tron/Cyberpunk 2077.
 * 1 draw call, 1 mesh, 1024×1024 canvas texture with mipmaps + anisotropy.
 */
function Ground() {
    const cityData = useStore(s => s.cityData)

    const size = useMemo(() => {
        if (!cityData?.buildings?.length) return 3000
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.max(Math.abs(b.position.x), Math.abs(b.position.z || 0))
            if (r > maxR) maxR = r
        }
        return Math.max(600, (maxR + 80) * 2)
    }, [cityData])

    const gridTexture = useMemo(() => {
        const res = 1024
        const canvas = document.createElement('canvas')
        canvas.width = res
        canvas.height = res
        const ctx = canvas.getContext('2d')

        // Deep void base with subtle gradient
        const bg = ctx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, res * 0.7)
        bg.addColorStop(0, '#020408')
        bg.addColorStop(1, '#010204')
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, res, res)

        const blockSize = 128 // 8×8 major grid cells
        const subDiv = 32    // 32×32 minor grid cells

        // Sub-grid — very faint minor lines for depth
        ctx.strokeStyle = 'rgba(0, 200, 255, 0.04)'
        ctx.lineWidth = 0.5
        for (let i = 0; i <= res; i += subDiv) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, res)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(res, i)
            ctx.stroke()
        }

        // Major grid — subtle cyan lines
        ctx.strokeStyle = 'rgba(0, 240, 255, 0.18)'
        ctx.lineWidth = 1.5
        for (let i = 0; i <= res; i += blockSize) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, res)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(res, i)
            ctx.stroke()
        }

        // Intersection nodes — glowing crosshairs with outer halo
        for (let x = 0; x <= res; x += blockSize) {
            for (let y = 0; y <= res; y += blockSize) {
                // Outer halo
                const halo = ctx.createRadialGradient(x, y, 0, x, y, 22)
                halo.addColorStop(0, 'rgba(0, 200, 255, 0.25)')
                halo.addColorStop(0.4, 'rgba(0, 180, 255, 0.08)')
                halo.addColorStop(1, 'rgba(0, 160, 255, 0)')
                ctx.fillStyle = halo
                ctx.beginPath()
                ctx.arc(x, y, 22, 0, Math.PI * 2)
                ctx.fill()

                // Inner bright dot
                const dot = ctx.createRadialGradient(x, y, 0, x, y, 4)
                dot.addColorStop(0, 'rgba(0, 255, 255, 0.9)')
                dot.addColorStop(1, 'rgba(0, 255, 255, 0)')
                ctx.fillStyle = dot
                ctx.beginPath()
                ctx.arc(x, y, 4, 0, Math.PI * 2)
                ctx.fill()

                // Crosshair arms
                ctx.strokeStyle = 'rgba(0, 255, 255, 0.6)'
                ctx.lineWidth = 1.5
                const cs = 6
                ctx.beginPath()
                ctx.moveTo(x - cs, y); ctx.lineTo(x + cs, y)
                ctx.stroke()
                ctx.beginPath()
                ctx.moveTo(x, y - cs); ctx.lineTo(x, y + cs)
                ctx.stroke()
            }
        }

        // Sub-grid intersection dots — tiny dim dots at minor grid crossings
        ctx.fillStyle = 'rgba(0, 200, 255, 0.12)'
        for (let x = subDiv; x < res; x += subDiv) {
            for (let y = subDiv; y < res; y += subDiv) {
                if (x % blockSize === 0 && y % blockSize === 0) continue
                ctx.beginPath()
                ctx.arc(x, y, 1.2, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(size / 300, size / 300)
        texture.anisotropy = 16
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter

        return texture
    }, [size])

    // Dispose texture on change/unmount
    React.useEffect(() => {
        return () => gridTexture.dispose()
    }, [gridTexture])

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.15, 0]}
        >
            <circleGeometry args={[size / 2, 64]} />
            <meshBasicMaterial
                map={gridTexture}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
            />
        </mesh>
    )
}

export default React.memo(Ground)
