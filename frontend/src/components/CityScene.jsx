import React, { useMemo } from 'react'
import * as THREE from 'three'
import Building from './Building'
import Trees from './Trees'
import useStore from '../store/useStore'

// District colors - muted, urban tones
const DISTRICT_COLORS = {
    api: '#4a90a4',
    services: '#7c6b9e',
    data: '#4a9e9e',
    utils: '#6a9e6a',
    auth: '#9e8a4a',
    ui: '#9e6a8a',
    tests: '#5a8e8e',
    config: '#7a7a9e',
    frontend: '#9e6a8a',
    backend: '#4a90a4'
}

export default function CityScene({ data }) {
    const { showRoads, selectedBuilding } = useStore()

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

    // Connected buildings
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

    // Roads to render
    const roadsToRender = useMemo(() => {
        if (!data?.roads) return []
        if (selectedBuilding) {
            return data.roads.filter(road => {
                const source = road.source || road.from
                const target = road.target || road.to
                return source === selectedBuilding.id || target === selectedBuilding.id
            })
        } else if (showRoads) {
            return data.roads.slice(0, 40)
        }
        return []
    }, [data?.roads, selectedBuilding, showRoads])

    if (!centeredBuildings.length) {
        return (
            <group>
                <ambientLight intensity={0.6} />
                <directionalLight position={[50, 80, 50]} intensity={1.2} />
                <mesh rotation={[-Math.PI / 2, 0, 0]}>
                    <planeGeometry args={[300, 300]} />
                    <meshStandardMaterial color="#4a5568" />
                </mesh>
            </group>
        )
    }

    const spread = Math.max(...centeredBuildings.map(b => Math.max(Math.abs(b.position.x), Math.abs(b.position.z))))
    const gridSize = Math.max(200, spread * 2.5)

    return (
        <group>
            {/* City Lighting - warm golden hour */}
            <ambientLight intensity={0.5} color="#fff5eb" />
            <directionalLight
                position={[80, 100, 60]}
                intensity={1.4}
                color="#fef3c7"
                castShadow
                shadow-mapSize={[2048, 2048]}
            />
            <directionalLight position={[-40, 60, -40]} intensity={0.3} color="#bfdbfe" />
            <hemisphereLight args={['#87ceeb', '#6b7280', 0.4]} />

            {/* City Ground - concrete/asphalt */}
            <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
                <planeGeometry args={[gridSize, gridSize]} />
                <meshStandardMaterial color="#4b5563" roughness={0.95} />
            </mesh>

            {/* City grid - street pattern */}
            <gridHelper
                args={[gridSize, Math.floor(gridSize / 20), '#6b7280', '#5a5a68']}
                position={[0, 0.02, 0]}
            />

            {/* District zones - elevated platforms with glow */}
            {centeredDistricts.map((district, idx) => {
                const cx = district.center?.x || 0
                const cy = district.center?.y || 0
                const size = 30 + (district.building_count || 5) * 3
                const color = DISTRICT_COLORS[district.id?.toLowerCase()] || district.color || '#6b7280'
                const elevation = 0.3 + (idx % 3) * 0.15  // Vary elevation

                return (
                    <group key={district.id}>
                        {/* Platform base */}
                        <mesh position={[cx, elevation / 2, cy]} castShadow>
                            <cylinderGeometry args={[size, size + 1, elevation, 32]} />
                            <meshStandardMaterial color="#3f3f46" roughness={0.9} />
                        </mesh>
                        {/* Glowing border ring */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, elevation + 0.02, cy]}>
                            <ringGeometry args={[size - 1.5, size, 64]} />
                            <meshBasicMaterial color={color} transparent opacity={0.7} />
                        </mesh>
                        {/* Inner glow */}
                        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[cx, elevation + 0.01, cy]}>
                            <circleGeometry args={[size - 1.5, 32]} />
                            <meshStandardMaterial color={color} transparent opacity={0.08} />
                        </mesh>
                    </group>
                )
            })}

            {/* Buildings */}
            {centeredBuildings.map(building => (
                <Building
                    key={building.id}
                    data={building}
                    isConnected={connectedIds.has(building.id)}
                />
            ))}

            {/* Trees in green spaces */}
            <Trees buildings={centeredBuildings} />

            {/* Roads - flat ribbon style */}
            {roadsToRender.map((road, i) => {
                const sourceId = road.source || road.from
                const targetId = road.target || road.to
                const fromBuilding = buildingMap[sourceId]
                const toBuilding = buildingMap[targetId]
                if (!fromBuilding || !toBuilding) return null

                const isHighlighted = selectedBuilding &&
                    (sourceId === selectedBuilding.id || targetId === selectedBuilding.id)

                // Simple straight line with raised height
                const start = new THREE.Vector3(fromBuilding.position.x, 0.2, fromBuilding.position.z)
                const end = new THREE.Vector3(toBuilding.position.x, 0.2, toBuilding.position.z)
                const curve = new THREE.LineCurve3(start, end)

                return (
                    <mesh key={i}>
                        <tubeGeometry args={[curve, 2, isHighlighted ? 0.5 : 0.25, 6, false]} />
                        <meshBasicMaterial
                            color={isHighlighted ? "#3b82f6" : "#6b7280"}
                            transparent
                            opacity={isHighlighted ? 0.9 : 0.4}
                        />
                    </mesh>
                )
            })}

            {/* Street lamps */}
            {centeredBuildings.filter((_, i) => i % 4 === 0).slice(0, 20).map((b, i) => (
                <group key={`lamp-${i}`} position={[b.position.x + 4, 0, b.position.z + 4]}>
                    {/* Pole */}
                    <mesh position={[0, 3, 0]} castShadow>
                        <cylinderGeometry args={[0.1, 0.15, 6, 8]} />
                        <meshStandardMaterial color="#374151" metalness={0.7} roughness={0.3} />
                    </mesh>
                    {/* Lamp arm */}
                    <mesh position={[0.5, 5.5, 0]} rotation={[0, 0, Math.PI / 6]}>
                        <cylinderGeometry args={[0.08, 0.08, 1.2, 6]} />
                        <meshStandardMaterial color="#374151" metalness={0.7} />
                    </mesh>
                    {/* Light */}
                    <mesh position={[1, 5.3, 0]}>
                        <sphereGeometry args={[0.25, 16, 16]} />
                        <meshBasicMaterial color="#fef3c7" />
                    </mesh>
                    {/* Point light for glow */}
                    <pointLight position={[1, 5, 0]} intensity={0.5} distance={15} color="#fef3c7" />
                </group>
            ))}
        </group>
    )
}
