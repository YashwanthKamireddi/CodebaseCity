import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Ground — lean holo-platform. 3 draw calls, zero per-frame work.
 *
 *   1. Void backdrop disc (below) — opaque black so nebula can't bleed through
 *      when the camera looks down at low angles.
 *   2. Platform disc — radial gradient + cyan grid, cached canvas texture.
 *   3. Edge rim — thin bright ring that reads as the platform border.
 *
 * No pulse animation, no useFrame. The platform scales to city extents.
 */

let cachedGridTexture = null
function getGridTexture() {
    if (cachedGridTexture) return cachedGridTexture
    const res = 1024
    const canvas = document.createElement('canvas')
    canvas.width = res
    canvas.height = res
    const ctx = canvas.getContext('2d')

    // Radial gradient: brighter at center, fades to black at edges.
    const bg = ctx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, res * 0.6)
    bg.addColorStop(0, '#0a1a2a')
    bg.addColorStop(0.55, '#04080f')
    bg.addColorStop(1, '#010204')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, res, res)

    // Minor grid
    const minor = 32
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.05)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= res; i += minor) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // Major grid
    const major = 128
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)'
    ctx.lineWidth = 1.3
    for (let i = 0; i <= res; i += major) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // Intersection dots (single gradient per node — cheap)
    for (let x = 0; x <= res; x += major) {
        for (let y = 0; y <= res; y += major) {
            const g = ctx.createRadialGradient(x, y, 0, x, y, 18)
            g.addColorStop(0, 'rgba(255, 255, 255, 0.9)')
            g.addColorStop(0.35, 'rgba(0, 230, 255, 0.35)')
            g.addColorStop(1, 'rgba(0, 160, 255, 0)')
            ctx.fillStyle = g
            ctx.beginPath(); ctx.arc(x, y, 18, 0, Math.PI * 2); ctx.fill()
        }
    }

    const texture = new THREE.CanvasTexture(canvas)
    texture.wrapS = THREE.RepeatWrapping
    texture.wrapT = THREE.RepeatWrapping
    texture.anisotropy = 8
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    cachedGridTexture = texture
    return texture
}

function Ground() {
    const cityData = useStore(s => s.cityData)

    const platformRadius = useMemo(() => {
        if (!cityData?.buildings?.length) return 1200
        let maxR = 0
        for (const b of cityData.buildings) {
            const halfW = (b.dimensions?.width || 8) / 2
            const halfD = (b.dimensions?.depth || 8) / 2
            const x = b.position.x
            const z = b.position.z || 0
            const corner = Math.sqrt((Math.abs(x) + halfW) ** 2 + (Math.abs(z) + halfD) ** 2)
            if (corner > maxR) maxR = corner
        }
        const padding = Math.max(120, Math.min(700, maxR * 0.25))
        return Math.max(500, maxR + padding)
    }, [cityData])

    const gridTexture = useMemo(() => {
        const base = getGridTexture()
        const tex = base.clone()
        tex.needsUpdate = true
        tex.repeat.set(platformRadius / 160, platformRadius / 160)
        return tex
    }, [platformRadius])

    return (
        <group>
            {/* 1. Void backdrop — big opaque disc below. Seals the ground so sky can't leak through. */}
            <mesh position={[0, -1.5, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius * 2.2, 48]} />
                <meshBasicMaterial color="#020308" fog={false} />
            </mesh>

            {/* 2. Main holo platform */}
            <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius, 64]} />
                <meshBasicMaterial
                    map={gridTexture}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </mesh>

            {/* 3. Bright rim edge — outlines the platform, no animation */}
            <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[platformRadius * 0.985, platformRadius * 1.01, 64]} />
                <meshBasicMaterial color="#00ffcc" toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
        </group>
    )
}

export default React.memo(Ground)
