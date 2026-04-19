import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Ground — cyber holo-platform, masterpiece edition.
 *
 * Layers (3 draw calls, zero per-frame work):
 *   1. Void backdrop disc — seals below so nebula can't leak through.
 *   2. Main platform — rich canvas texture with:
 *        · radial gradient base (bright center, black edge)
 *        · 16 radial spokes emanating outward
 *        · 6 concentric bright rings at precise radii
 *        · dense hex-grid sub-pattern
 *        · bright cyan glow at center
 *   3. Rim band — sharp cyan edge with inner darker bevel.
 *
 * Texture is cached at module scope. Platform radius scales with city extents.
 */

let cachedTexture = null
function getPlatformTexture() {
    if (cachedTexture) return cachedTexture

    const res = 1024
    const canvas = document.createElement('canvas')
    canvas.width = res
    canvas.height = res
    const ctx = canvas.getContext('2d')
    const cx = res / 2
    const cy = res / 2

    // ── Base: radial gradient from rich blue core to void edge ──
    const base = ctx.createRadialGradient(cx, cy, 0, cx, cy, res * 0.5)
    base.addColorStop(0, '#0a2a4a')
    base.addColorStop(0.15, '#072034')
    base.addColorStop(0.55, '#040c18')
    base.addColorStop(1, '#01030a')
    ctx.fillStyle = base
    ctx.fillRect(0, 0, res, res)

    // ── Fine sub-grid (32-unit) ──
    ctx.strokeStyle = 'rgba(0, 220, 255, 0.05)'
    ctx.lineWidth = 0.5
    const minor = 32
    for (let i = 0; i <= res; i += minor) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // ── Major grid (128-unit) ──
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.16)'
    ctx.lineWidth = 1.2
    const major = 128
    for (let i = 0; i <= res; i += major) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // ── 16 radial spokes from center ──
    ctx.strokeStyle = 'rgba(0, 255, 220, 0.18)'
    ctx.lineWidth = 1
    for (let a = 0; a < 16; a++) {
        const angle = (a / 16) * Math.PI * 2
        ctx.beginPath()
        ctx.moveTo(cx, cy)
        ctx.lineTo(cx + Math.cos(angle) * res * 0.55, cy + Math.sin(angle) * res * 0.55)
        ctx.stroke()
    }

    // ── 6 concentric rings at precise radii ──
    const ringRadii = [0.14, 0.24, 0.34, 0.42, 0.48, 0.495]
    ringRadii.forEach((r, i) => {
        const radius = r * res
        const isRim = i === ringRadii.length - 1
        ctx.strokeStyle = isRim
            ? 'rgba(0, 255, 220, 0.7)'
            : `rgba(0, 220, 255, ${0.15 + i * 0.04})`
        ctx.lineWidth = isRim ? 2.5 : 1.4
        ctx.beginPath()
        ctx.arc(cx, cy, radius, 0, Math.PI * 2)
        ctx.stroke()

        // Tick marks on each ring every 30°
        if (!isRim) {
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.28)'
            ctx.lineWidth = 1
            for (let t = 0; t < 12; t++) {
                const a = (t / 12) * Math.PI * 2
                const x1 = cx + Math.cos(a) * (radius - 3)
                const y1 = cy + Math.sin(a) * (radius - 3)
                const x2 = cx + Math.cos(a) * (radius + 3)
                const y2 = cy + Math.sin(a) * (radius + 3)
                ctx.beginPath(); ctx.moveTo(x1, y1); ctx.lineTo(x2, y2); ctx.stroke()
            }
        }
    })

    // ── Intersection nodes on major grid ──
    for (let x = 0; x <= res; x += major) {
        for (let y = 0; y <= res; y += major) {
            const dx = x - cx, dy = y - cy
            const dist = Math.sqrt(dx * dx + dy * dy)
            if (dist > res * 0.48) continue
            const g = ctx.createRadialGradient(x, y, 0, x, y, 14)
            g.addColorStop(0, 'rgba(255, 255, 255, 0.8)')
            g.addColorStop(0.4, 'rgba(0, 230, 255, 0.3)')
            g.addColorStop(1, 'rgba(0, 160, 255, 0)')
            ctx.fillStyle = g
            ctx.beginPath(); ctx.arc(x, y, 14, 0, Math.PI * 2); ctx.fill()
        }
    }

    // ── Bright center hub ──
    const hub = ctx.createRadialGradient(cx, cy, 0, cx, cy, res * 0.08)
    hub.addColorStop(0, 'rgba(255, 255, 255, 0.85)')
    hub.addColorStop(0.3, 'rgba(0, 255, 220, 0.5)')
    hub.addColorStop(1, 'rgba(0, 180, 255, 0)')
    ctx.fillStyle = hub
    ctx.beginPath(); ctx.arc(cx, cy, res * 0.08, 0, Math.PI * 2); ctx.fill()

    const texture = new THREE.CanvasTexture(canvas)
    texture.anisotropy = 8
    texture.minFilter = THREE.LinearMipmapLinearFilter
    texture.magFilter = THREE.LinearFilter
    // NO repeat — this texture maps to the full platform disc.
    texture.wrapS = THREE.ClampToEdgeWrapping
    texture.wrapT = THREE.ClampToEdgeWrapping
    cachedTexture = texture
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
        const padding = Math.max(140, Math.min(700, maxR * 0.25))
        return Math.max(500, maxR + padding)
    }, [cityData])

    const texture = useMemo(() => getPlatformTexture(), [])

    return (
        <group>
            {/* 1. Void backdrop disc — seals below */}
            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius * 2.2, 48]} />
                <meshBasicMaterial color="#02040a" fog={false} />
            </mesh>

            {/* 2. Main holo platform — the masterpiece texture */}
            <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius, 96]} />
                <meshBasicMaterial
                    map={texture}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </mesh>

            {/* 3. Sharp rim band — bright cyan edge with darker inner bevel */}
            <mesh position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[platformRadius * 0.992, platformRadius * 1.012, 96]} />
                <meshBasicMaterial color="#00ffcc" toneMapped={false} side={THREE.DoubleSide} />
            </mesh>
        </group>
    )
}

export default React.memo(Ground)
