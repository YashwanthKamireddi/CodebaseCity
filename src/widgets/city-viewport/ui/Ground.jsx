import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Ground — Cyberpunk Motherboard Platform (optimized)
 *
 * Single cached texture shared across instances (bounds only control UV repeat).
 * 1024² resolution (was 2048²) with simplified node rendering.
 */

// Module-level cache — the texture is independent of bounds and shared forever.
let cachedTexture = null
function getGridTexture() {
    if (cachedTexture) return cachedTexture

    const res = 1024
    const canvas = document.createElement('canvas')
    canvas.width = res
    canvas.height = res
    const ctx = canvas.getContext('2d')

    const bg = ctx.createLinearGradient(0, 0, res, res)
    bg.addColorStop(0, '#050a11')
    bg.addColorStop(0.5, '#020408')
    bg.addColorStop(1, '#050a11')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, res, res)

    const blockSize = 128
    const subDiv = 32

    // Sub-grid — faint neon etching
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)'
    ctx.lineWidth = 1.0
    for (let i = 0; i <= res; i += subDiv) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // Major motherboard pathways
    ctx.strokeStyle = 'rgba(0, 255, 255, 0.28)'
    ctx.lineWidth = 2.5
    for (let i = 0; i <= res; i += blockSize) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // Intersection nodes — single radial gradient per node (was 2 + 4 bracket strokes)
    for (let x = 0; x <= res; x += blockSize) {
        for (let y = 0; y <= res; y += blockSize) {
            const grad = ctx.createRadialGradient(x, y, 0, x, y, 20)
            grad.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
            grad.addColorStop(0.3, 'rgba(0, 255, 255, 0.4)')
            grad.addColorStop(1, 'rgba(0, 160, 255, 0)')
            ctx.fillStyle = grad
            ctx.beginPath(); ctx.arc(x, y, 20, 0, Math.PI * 2); ctx.fill()
        }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    cachedTexture = texture
    return texture
}

function Ground() {
    const cityData = useStore(s => s.cityData)

    const bounds = useMemo(() => {
        if (!cityData?.buildings?.length) return { width: 3000, depth: 3000, cx: 0, cz: 0 }
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
        for (const b of cityData.buildings) {
            if (b.position.x < minX) minX = b.position.x
            if (b.position.x > maxX) maxX = b.position.x
            if (b.position.z < minZ) minZ = b.position.z
            if (b.position.z > maxZ) maxZ = b.position.z
        }
        return {
            width: maxX - minX + 800,
            depth: maxZ - minZ + 800,
            cx: (minX + maxX) / 2,
            cz: (minZ + maxZ) / 2
        }
    }, [cityData])

    // Clone the shared texture so per-instance UV repeat can differ.
    const gridTexture = useMemo(() => {
        const base = getGridTexture()
        const tex = base.clone()
        tex.needsUpdate = true
        tex.repeat.set(bounds.width / 400, bounds.depth / 400)
        return tex
    }, [bounds.width, bounds.depth])

    return (
        <mesh
            position={[bounds.cx, -0.15, bounds.cz]}
            rotation={[-Math.PI / 2, 0, 0]}
        >
            {/* 48-segment circle — visually identical to 96 at this camera distance, half the verts */}
            <circleGeometry args={[Math.max(bounds.width, bounds.depth) / 2 * 1.5, 48]} />
            <meshStandardMaterial
                map={gridTexture}
                emissive="#ffffff"
                emissiveMap={gridTexture}
                emissiveIntensity={1.4}
                color="#555555"
                metalness={0.6}
                roughness={0.4}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
            />
        </mesh>
    )
}

export default React.memo(Ground)
