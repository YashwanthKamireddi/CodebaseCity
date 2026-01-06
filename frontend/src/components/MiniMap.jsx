import React, { useMemo, useRef, useCallback } from 'react'
import { useThree } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../store/useStore'

// Mini-map overlay showing city layout
export default function MiniMap({ districts, buildings }) {
    const canvasRef = useRef(null)
    const { camera } = useThree()

    // Draw mini-map on canvas
    const mapData = useMemo(() => {
        if (!buildings || buildings.length === 0) return null

        // Calculate bounds
        let minX = Infinity, maxX = -Infinity
        let minZ = Infinity, maxZ = -Infinity

        buildings.forEach(b => {
            minX = Math.min(minX, b.position.x)
            maxX = Math.max(maxX, b.position.x)
            minZ = Math.min(minZ, b.position.z)
            maxZ = Math.max(maxZ, b.position.z)
        })

        const padding = 20
        minX -= padding; maxX += padding
        minZ -= padding; maxZ += padding

        const width = maxX - minX
        const height = maxZ - minZ

        return { minX, maxX, minZ, maxZ, width, height, buildings, districts }
    }, [buildings, districts])

    if (!mapData) return null

    // This is a 2D overlay, so we render it via HTML portal
    return null // Mini-map will be rendered as HTML overlay
}

// HTML Mini-map component (to be used in App.jsx)
export function MiniMapOverlay({ districts, buildings, style }) {
    const canvasRef = useRef(null)
    const selectBuilding = useStore(state => state.selectBuilding)

    const mapConfig = useMemo(() => {
        if (!buildings || buildings.length === 0) return null

        // Calculate bounds
        let minX = Infinity, maxX = -Infinity
        let minZ = Infinity, maxZ = -Infinity

        buildings.forEach(b => {
            minX = Math.min(minX, b.position.x)
            maxX = Math.max(maxX, b.position.x)
            minZ = Math.min(minZ, b.position.z)
            maxZ = Math.max(maxZ, b.position.z)
        })

        const padding = 30
        const width = (maxX - minX) + padding * 2
        const height = (maxZ - minZ) + padding * 2

        return {
            minX: minX - padding,
            minZ: minZ - padding,
            width,
            height,
            scale: 150 / Math.max(width, height)
        }
    }, [buildings])

    // Draw the mini-map
    const canvasContent = useMemo(() => {
        if (!mapConfig || !buildings) return null

        const { minX, minZ, scale } = mapConfig
        const mapSize = 150

        // Create building dots
        const buildingDots = buildings.map(b => {
            const x = (b.position.x - minX) * scale
            const y = (b.position.z - minZ) * scale
            const size = Math.max(2, Math.min(6, b.dimensions.height / 5))

            let color = '#6366f1'
            if (b.is_hotspot) color = '#ef4444'
            else if (b.language === 'python') color = '#3572A5'
            else if (b.language === 'javascript') color = '#F7DF1E'
            else if (b.language === 'typescript') color = '#3178C6'

            return { x, y, size, color, id: b.id, building: b }
        })

        // Create district circles
        const districtCircles = districts?.map(d => {
            const x = ((d.center?.x || 0) - minX) * scale
            const y = ((d.center?.y || 0) - minZ) * scale
            const size = (35 + (d.building_count || 5) * 4) * scale

            return { x, y, size, id: d.id }
        }) || []

        return { buildingDots, districtCircles, mapSize }
    }, [mapConfig, buildings, districts])

    const handleClick = useCallback((e) => {
        if (!canvasContent || !mapConfig) return

        const rect = e.currentTarget.getBoundingClientRect()
        const x = e.clientX - rect.left
        const y = e.clientY - rect.top

        // Find closest building
        let closest = null
        let minDist = Infinity

        canvasContent.buildingDots.forEach(dot => {
            const dist = Math.sqrt((dot.x - x) ** 2 + (dot.y - y) ** 2)
            if (dist < minDist && dist < 10) {
                minDist = dist
                closest = dot.building
            }
        })

        if (closest) {
            selectBuilding(closest)
        }
    }, [canvasContent, mapConfig, selectBuilding])

    if (!canvasContent) return null

    return (
        <div
            className="mini-map"
            onClick={handleClick}
            style={{
                position: 'absolute',
                top: '80px',
                right: '16px',
                width: '150px',
                height: '150px',
                background: 'rgba(0, 0, 0, 0.7)',
                borderRadius: '8px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                overflow: 'hidden',
                cursor: 'crosshair',
                backdropFilter: 'blur(10px)',
                ...style
            }}
        >
            <svg width="150" height="150" style={{ display: 'block' }}>
                {/* District circles */}
                {canvasContent.districtCircles.map(d => (
                    <circle
                        key={d.id}
                        cx={d.x}
                        cy={d.y}
                        r={d.size}
                        fill="rgba(99, 102, 241, 0.1)"
                        stroke="rgba(99, 102, 241, 0.3)"
                        strokeWidth="1"
                    />
                ))}

                {/* Building dots */}
                {canvasContent.buildingDots.map(dot => (
                    <circle
                        key={dot.id}
                        cx={dot.x}
                        cy={dot.y}
                        r={dot.size}
                        fill={dot.color}
                        opacity={0.8}
                    />
                ))}
            </svg>

            {/* Label */}
            <div style={{
                position: 'absolute',
                bottom: '4px',
                left: '50%',
                transform: 'translateX(-50%)',
                fontSize: '9px',
                color: 'rgba(255, 255, 255, 0.5)',
                fontFamily: 'var(--font-mono)',
                textTransform: 'uppercase',
                letterSpacing: '1px'
            }}>
                Mini-Map
            </div>
        </div>
    )
}
