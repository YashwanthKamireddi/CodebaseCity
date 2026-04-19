import React, { useMemo, useRef } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../store/useStore'

/**
 * Ground — world-class holo-platform.
 *
 * Three stacked layers:
 *   1. Void backdrop — huge dark disc underneath so the sky can't leak through
 *      when the camera looks down steeply.
 *   2. Main platform — cyberpunk grid + radial gradient, sized to the city bounds
 *      with generous padding, scales automatically.
 *   3. Edge ring + inner pulse ring — emissive accents (no lights needed).
 *
 * Perf: 3 draw calls total, 1 cached canvas texture (module-level), no per-frame
 * allocations. The pulse ring is a scale animation on a torus (GPU-side).
 */

// Module-level cache so switching repos doesn't re-rasterize the canvas.
let cachedGridTexture = null
function getGridTexture() {
    if (cachedGridTexture) return cachedGridTexture
    const res = 1024
    const canvas = document.createElement('canvas')
    canvas.width = res
    canvas.height = res
    const ctx = canvas.getContext('2d')

    // Radial deep-void base
    const bg = ctx.createRadialGradient(res / 2, res / 2, 0, res / 2, res / 2, res * 0.7)
    bg.addColorStop(0, '#06080f')
    bg.addColorStop(1, '#010203')
    ctx.fillStyle = bg
    ctx.fillRect(0, 0, res, res)

    const major = 128
    const minor = 32

    // Sub-grid (very faint)
    ctx.strokeStyle = 'rgba(0, 200, 255, 0.04)'
    ctx.lineWidth = 0.5
    for (let i = 0; i <= res; i += minor) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // Major grid
    ctx.strokeStyle = 'rgba(0, 240, 255, 0.22)'
    ctx.lineWidth = 1.5
    for (let i = 0; i <= res; i += major) {
        ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke()
        ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke()
    }

    // Intersection nodes
    for (let x = 0; x <= res; x += major) {
        for (let y = 0; y <= res; y += major) {
            const halo = ctx.createRadialGradient(x, y, 0, x, y, 24)
            halo.addColorStop(0, 'rgba(0, 220, 255, 0.35)')
            halo.addColorStop(0.4, 'rgba(0, 180, 255, 0.1)')
            halo.addColorStop(1, 'rgba(0, 160, 255, 0)')
            ctx.fillStyle = halo
            ctx.beginPath(); ctx.arc(x, y, 24, 0, Math.PI * 2); ctx.fill()

            const core = ctx.createRadialGradient(x, y, 0, x, y, 4)
            core.addColorStop(0, 'rgba(255, 255, 255, 0.95)')
            core.addColorStop(1, 'rgba(0, 255, 255, 0)')
            ctx.fillStyle = core
            ctx.beginPath(); ctx.arc(x, y, 4, 0, Math.PI * 2); ctx.fill()
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
    const pulseRef = useRef()

    // Platform radius derived from city extents, with comfortable padding.
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
        // Padding grows sub-linearly so massive cities don't get absurd platforms.
        const padding = Math.max(140, Math.min(800, maxR * 0.28))
        return Math.max(500, maxR + padding)
    }, [cityData])

    const gridTexture = useMemo(() => {
        const base = getGridTexture()
        const tex = base.clone()
        tex.needsUpdate = true
        // Tile the grid roughly every 300 units so major lines stay a consistent size.
        tex.repeat.set(platformRadius / 150, platformRadius / 150)
        return tex
    }, [platformRadius])

    // Slow concentric pulse ring — scales from the center outward, looping.
    useFrame((state) => {
        if (!pulseRef.current) return
        const t = (state.clock.elapsedTime % 6) / 6 // 6-second loop
        const s = 0.1 + t * 0.95
        pulseRef.current.scale.set(s, s, s)
        pulseRef.current.material.opacity = (1 - t) * 0.45
    })

    return (
        <group>
            {/* 1. Void backdrop — huge opaque disc 2× the platform, slightly below.
                    Blocks the nebula from leaking through when looking down. */}
            <mesh position={[0, -2.0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius * 2.5, 64]} />
                <meshBasicMaterial color="#02030a" fog={false} />
            </mesh>

            {/* 2. Main holo platform — grid on top, solid black underside */}
            <mesh position={[0, -0.15, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius, 96]} />
                <meshBasicMaterial
                    map={gridTexture}
                    transparent
                    opacity={0.95}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                    side={THREE.FrontSide}
                />
            </mesh>

            {/* 3. Edge glow ring — bright cyan rim outlining the platform */}
            <mesh position={[0, -0.1, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[platformRadius * 0.98, platformRadius * 1.02, 96]} />
                <meshBasicMaterial color="#00ffcc" toneMapped={false} side={THREE.DoubleSide} />
            </mesh>

            {/* 4. Expanding pulse ring — emanates from center */}
            <mesh ref={pulseRef} position={[0, -0.08, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[platformRadius * 0.96, platformRadius, 96]} />
                <meshBasicMaterial color="#00ddff" transparent opacity={0.3} toneMapped={false} side={THREE.DoubleSide} />
            </mesh>

            {/* 5. Bright core spot — marks center of city */}
            <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[Math.min(40, platformRadius * 0.05), 48]} />
                <meshBasicMaterial color="#ffffff" transparent opacity={0.6} toneMapped={false} />
            </mesh>
        </group>
    )
}

export default React.memo(Ground)
