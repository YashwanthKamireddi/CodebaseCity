import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Ground — Dark city floor with structural grid aligned to actual city extents.
 *
 * Perf budget: 1 draw call, 1 mesh, 1024×1024 canvas texture.
 * Grid repeat is derived from city bounds so lines align with real district spacing.
 */
function Ground() {
    const cityData = useStore(s => s.cityData)

    const { size, gridRepeat } = useMemo(() => {
        if (!cityData?.buildings?.length) return { size: 3000, gridRepeat: 15 }
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.max(Math.abs(b.position.x), Math.abs(b.position.z || 0))
            if (r > maxR) maxR = r
        }
        const s = Math.max(600, (maxR + 80) * 2)
        // ~20 grid blocks across the city for clean spacing
        const repeat = Math.round(s / 40)
        return { size: s, gridRepeat: Math.max(8, repeat) }
    }, [cityData])

    const gridTexture = useMemo(() => {
        const res = 1024
        const canvas = document.createElement('canvas')
        canvas.width = res
        canvas.height = res
        const ctx = canvas.getContext('2d')

        // Deep dark base
        ctx.fillStyle = '#030508'
        ctx.fillRect(0, 0, res, res)

        // One "tile" is the full canvas — it repeats gridRepeat times
        // Major grid lines — subtle cyan
        ctx.strokeStyle = 'rgba(0, 180, 240, 0.10)'
        ctx.lineWidth = 1.5

        // Border of tile
        ctx.strokeRect(0, 0, res, res)

        // Subdivide tile into a 4×4 minor grid
        const sub = res / 4
        ctx.strokeStyle = 'rgba(0, 160, 220, 0.05)'
        ctx.lineWidth = 0.8
        for (let i = 1; i < 4; i++) {
            ctx.beginPath()
            ctx.moveTo(sub * i, 0)
            ctx.lineTo(sub * i, res)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(0, sub * i)
            ctx.lineTo(res, sub * i)
            ctx.stroke()
        }

        // Corner intersections — brighter accent dots
        ctx.fillStyle = 'rgba(0, 200, 255, 0.30)'
        const dotR = 3
        // 4 corners of the tile
        const pts = [0, res]
        for (const x of pts) {
            for (const y of pts) {
                ctx.beginPath()
                ctx.arc(x, y, dotR, 0, Math.PI * 2)
                ctx.fill()
            }
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(gridRepeat, gridRepeat)
        texture.anisotropy = 8
        texture.minFilter = THREE.LinearMipmapLinearFilter
        texture.magFilter = THREE.LinearFilter

        return texture
    }, [gridRepeat])

    return (
        <mesh
            rotation={[-Math.PI / 2, 0, 0]}
            position={[0, -0.15, 0]}
        >
            <circleGeometry args={[size / 2, 64]} />
            <meshStandardMaterial
                map={gridTexture}
                roughness={0.92}
                metalness={0.08}
                envMapIntensity={0.05}
                polygonOffset
                polygonOffsetFactor={1}
                polygonOffsetUnits={1}
            />
        </mesh>
    )
}

export default Ground
