import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Ground — AAA Cyberpunk Motherboard Platform
 *
 * Design: A perfectly fitted rectangular PlaneGeometry tracing the exact bounds
 * of the city grid. Uses a procedural glowing canvas grid with intersection nodes
 * to mimic a massive data-chip motherboard.
 */
function Ground() {
    const cityData = useStore(s => s.cityData)

    // Calculate exact grid boundary from building positions
    const bounds = useMemo(() => {
        if (!cityData?.buildings?.length) return { width: 3000, depth: 3000, cx: 0, cz: 0 }
        let minX = Infinity, maxX = -Infinity, minZ = Infinity, maxZ = -Infinity
        for (const b of cityData.buildings) {
            if (b.position.x < minX) minX = b.position.x
            if (b.position.x > maxX) maxX = b.position.x
            if (b.position.z < minZ) minZ = b.position.z
            if (b.position.z > maxZ) maxZ = b.position.z
        }
        // Add 600 units of padding so the ground elegantly frames the city
        return { 
            width: maxX - minX + 800, 
            depth: maxZ - minZ + 800, 
            cx: (minX + maxX) / 2, 
            cz: (minZ + maxZ) / 2 
        }
    }, [cityData])

    const gridTexture = useMemo(() => {
        const res = 2048 // High-res AAA texture
        const canvas = document.createElement('canvas')
        canvas.width = res
        canvas.height = res
        const ctx = canvas.getContext('2d')

        // Deep obsidian base for the 'chip'
        const bg = ctx.createLinearGradient(0, 0, res, res)
        bg.addColorStop(0, '#050a11')
        bg.addColorStop(0.5, '#020408')
        bg.addColorStop(1, '#050a11')
        ctx.fillStyle = bg
        ctx.fillRect(0, 0, res, res)

        const blockSize = 128 // Major Data Canyons
        const subDiv = 32     // Minor Streets

        // Sub-grid — Faint neon etching
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.05)'
        ctx.lineWidth = 1.0
        for (let i = 0; i <= res; i += subDiv) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke();
        }

        // Major grid — Glowing Motherboard pathways
        ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)'
        ctx.lineWidth = 3.0
        for (let i = 0; i <= res; i += blockSize) {
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke();
            
            // Core accent lines (Creates depth)
            ctx.strokeStyle = 'rgba(255, 255, 255, 0.5)'
            ctx.lineWidth = 0.5
            ctx.beginPath(); ctx.moveTo(i, 0); ctx.lineTo(i, res); ctx.stroke();
            ctx.beginPath(); ctx.moveTo(0, i); ctx.lineTo(res, i); ctx.stroke();
            ctx.strokeStyle = 'rgba(0, 255, 255, 0.25)'
            ctx.lineWidth = 3.0
        }

        // Data Intersection Nodes (Glowing Cores)
        for (let x = 0; x <= res; x += blockSize) {
            for (let y = 0; y <= res; y += blockSize) {
                // Outer Cyan Halo
                const halo = ctx.createRadialGradient(x, y, 0, x, y, 32)
                halo.addColorStop(0, 'rgba(0, 255, 255, 0.35)')
                halo.addColorStop(0.5, 'rgba(0, 255, 255, 0.1)')
                halo.addColorStop(1, 'rgba(0, 160, 255, 0)')
                ctx.fillStyle = halo
                ctx.beginPath(); ctx.arc(x, y, 32, 0, Math.PI * 2); ctx.fill();

                // Inner Bright Data Node
                const dot = ctx.createRadialGradient(x, y, 0, x, y, 6)
                dot.addColorStop(0, 'rgba(255, 255, 255, 1.0)')
                dot.addColorStop(1, 'rgba(0, 255, 255, 0)')
                ctx.fillStyle = dot
                ctx.beginPath(); ctx.arc(x, y, 6, 0, Math.PI * 2); ctx.fill();

                // Advanced Sci-Fi Corner Brackets
                ctx.strokeStyle = '#00ffff'
                ctx.lineWidth = 2.0
                const cs = 16
                const gap = 8
                ctx.beginPath(); ctx.moveTo(x - cs, y - gap); ctx.lineTo(x - cs, y - cs); ctx.lineTo(x - gap, y - cs); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + cs, y - gap); ctx.lineTo(x + cs, y - cs); ctx.lineTo(x + gap, y - cs); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x - cs, y + gap); ctx.lineTo(x - cs, y + cs); ctx.lineTo(x - gap, y + cs); ctx.stroke();
                ctx.beginPath(); ctx.moveTo(x + cs, y + gap); ctx.lineTo(x + cs, y + cs); ctx.lineTo(x + gap, y + cs); ctx.stroke();
            }
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        
        // Ensure UV mapping tiles perfectly to standard units
        texture.repeat.set(bounds.width / 400, bounds.depth / 400)
        texture.anisotropy = 16
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter

        return texture
    }, [bounds.width, bounds.depth])

    // Clean up memory
    React.useEffect(() => {
        return () => gridTexture.dispose()
    }, [gridTexture])

    return (
        <mesh
            // Center the plane perfectly under the exact middle of the dynamically scaled city block
            position={[bounds.cx, -0.15, bounds.cz]}
            rotation={[-Math.PI / 2, 0, 0]}
        >
            {/* The ground is now a perfectly curved circular Motherboard chip */}
            <circleGeometry args={[Math.max(bounds.width, bounds.depth) / 2 * 1.5, 96]} />
            <meshPhysicalMaterial
                map={gridTexture}
                emissive="#ffffff"
                emissiveMap={gridTexture}
                emissiveIntensity={1.5}
                color="#666666"
                metalness={0.7}
                roughness={0.3}
                clearcoat={0.8}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
            />
        </mesh>
    )
}

export default React.memo(Ground)
