/**
 * CityScene.jsx
 *
 * Clean, practical 3D codebase visualization
 * Focus: Fast, informative, not gimmicky
 */

import React, { useMemo } from 'react'
import * as THREE from 'three'
import DataBlock from './DataBlock'
import Roads from './Roads'
import PostProcessing from './PostProcessing'
import { Environment, Grid } from '@react-three/drei'
import useStore from '../store/useStore'

// Module colors by type - developer-friendly naming
const MODULE_COLORS = {
    api: '#3b82f6',      // Blue
    services: '#8b5cf6', // Purple
    data: '#06b6d4',     // Cyan
    utils: '#22c55e',    // Green
    auth: '#f59e0b',     // Amber
    ui: '#ec4899',       // Pink
    tests: '#6366f1',    // Indigo
    config: '#64748b',   // Slate
    frontend: '#f97316', // Orange
    backend: '#0ea5e9',  // Sky
    default: '#6b7280'   // Gray
}

export default function CityScene({ data }) {
    const { showRoads, selectedBuilding } = useStore()

    // Process and center building data
    const { centeredBuildings, centeredDistricts, buildingMap } = useMemo(() => {
        if (!data?.buildings?.length) {
            return { centeredBuildings: [], centeredDistricts: [], buildingMap: {} }
        }

        let minX = Infinity, maxX = -Infinity
        let minZ = Infinity, maxZ = -Infinity

        data.buildings.forEach(b => {
            minX = Math.min(minX, b.position.x)
            maxX = Math.max(maxX, b.position.x)
            minZ = Math.min(minZ, b.position.z)
            maxZ = Math.max(maxZ, b.position.z)
        })

        const centerX = (minX + maxX) / 2
        const centerZ = (minZ + maxZ) / 2

        const centeredBuildings = data.buildings.map(b => ({
            ...b,
            position: { x: b.position.x - centerX, z: b.position.z - centerZ }
        }))

        const buildingMap = {}
        centeredBuildings.forEach(b => { buildingMap[b.id] = b })

        const centeredDistricts = data.districts?.map(d => ({
            ...d,
            center: d.center ? { x: d.center.x - centerX, y: d.center.y - centerZ } : { x: 0, y: 0 }
        })) || []

        return { centeredBuildings, centeredDistricts, buildingMap }
    }, [data])

    // Find connected files for selected file
    const connectedIds = useMemo(() => {
        if (!selectedBuilding || !data?.roads) return new Set()
        const ids = new Set()
        data.roads.forEach(road => {
            const source = road.source || road.from
            const target = road.target || road.to
            if (source === selectedBuilding.id) ids.add(target)
            if (target === selectedBuilding.id) ids.add(source)
        })
        return ids
    }, [selectedBuilding, data?.roads])

    // Dependencies to show
    const dependenciesToShow = useMemo(() => {
        if (!data?.roads) return []
        if (selectedBuilding) {
            return data.roads.filter(road => {
                const source = road.source || road.from
                const target = road.target || road.to
                return source === selectedBuilding.id || target === selectedBuilding.id
            })
        } else if (showRoads) {
            return data.roads.slice(0, 50)
        }
        return []
    }, [data?.roads, selectedBuilding, showRoads])

    // Empty state
    if (!centeredBuildings.length) {
        return (
            <group>
                <ambientLight intensity={0.6} />
                <directionalLight position={[50, 80, 50]} intensity={1} />
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[200, 200]} />
                    <meshStandardMaterial color="#1e293b" />
                </mesh>
            </group>
        )
    }

    const spread = Math.max(...centeredBuildings.map(b => Math.max(Math.abs(b.position.x), Math.abs(b.position.z))))
    const gridSize = Math.max(200, spread * 2.5)

    return (
        <group>
            {/* ═══════════════════════════════════════════════════════════════
                PRACTICAL LIGHTING - Clean, readable
                ═══════════════════════════════════════════════════════════════ */}

            <PostProcessing enabled={true} />

            {/* HDRI for realistic reflections (subtle but useful) */}
            <Environment preset="city" background={false} />

            {/* Simple ambient for base visibility */}
            <ambientLight intensity={0.5} color="#ffffff" />

            {/* Main directional light */}
            <directionalLight
                position={[60, 80, 40]}
                intensity={1.2}
                color="#ffffff"
                castShadow
                shadow-mapSize={[1024, 1024]}
                shadow-camera-far={200}
                shadow-camera-left={-80}
                shadow-camera-right={80}
                shadow-camera-top={80}
                shadow-camera-bottom={-80}
            />

            {/* Fill light for shadows */}
            <directionalLight
                position={[-40, 50, -40]}
                intensity={0.3}
                color="#94a3b8"
            />

            {/* ═══════════════════════════════════════════════════════════════
                GROUND PLANE - High-end Grid
                ═══════════════════════════════════════════════════════════════ */}

            {/* Ground Grid - Subtle, "liked" by user */}
            <Grid
                position={[0, 0.01, 0]}
                args={[gridSize, gridSize]}
                cellSize={10}
                cellThickness={1}
                cellColor="#334155"
                sectionSize={50}
                sectionThickness={1.5}
                sectionColor="#475569"
                fadeDistance={150}
                fadeStrength={1}
                infiniteGrid
            />




            {/* ═══════════════════════════════════════════════════════════════
                MODULE BOUNDARIES - Show file groupings
                ═══════════════════════════════════════════════════════════════ */}

            {centeredDistricts.map((district) => {
                const cx = district.center?.x || 0
                const cy = district.center?.y || 0
                // Use implicit grouping - no visual boundary, just proximity
                // This creates the "European" feel where buildings cluster naturally
                return null
            })}

            {/* ═══════════════════════════════════════════════════════════════
                FILES (Buildings)
                ═══════════════════════════════════════════════════════════════ */}

            {centeredBuildings.map(building => (
                <DataBlock
                    key={building.id}
                    data={building}
                    isConnected={connectedIds.has(building.id)}
                />
            ))}

            {/* ═══════════════════════════════════════════════════════════════
                DEPENDENCIES (Premium Animated Flow)
                ═══════════════════════════════════════════════════════════════ */}

            <Roads roads={data?.roads || []} buildings={centeredBuildings} />
        </group>
    )
}

export { MODULE_COLORS }
