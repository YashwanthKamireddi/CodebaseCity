import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../store/useStore'

export default function Roads({ roads, buildings }) {
    const showRoads = useStore((state) => state.showRoads)

    const buildingPositions = useMemo(() => {
        const positions = {}
        buildings?.forEach(b => {
            positions[b.id] = {
                x: b.position.x,
                y: b.dimensions.height / 2 + 0.5,
                z: b.position.z
            }
        })
        return positions
    }, [buildings])

    const roadData = useMemo(() => {
        if (!roads || roads.length === 0 || !showRoads) return []

        return roads.map((road, index) => {
            const srcPos = buildingPositions[road.source]
            const tgtPos = buildingPositions[road.target]

            if (!srcPos || !tgtPos) return null

            const midX = (srcPos.x + tgtPos.x) / 2
            const midZ = (srcPos.z + tgtPos.z) / 2
            const distance = Math.sqrt(
                Math.pow(tgtPos.x - srcPos.x, 2) + Math.pow(tgtPos.z - srcPos.z, 2)
            )

            // Higher arc for cross-district
            const baseHeight = road.is_cross_district ? 5 : 1.5
            const arcHeight = road.is_cross_district ? 12 + distance * 0.04 : 3

            const points = [
                new THREE.Vector3(srcPos.x, baseHeight, srcPos.z),
                new THREE.Vector3(midX, arcHeight, midZ),
                new THREE.Vector3(tgtPos.x, baseHeight, tgtPos.z)
            ]

            const curve = new THREE.CatmullRomCurve3(points)

            return {
                id: index,
                curve,
                isCrossDistrict: road.is_cross_district,
                weight: road.weight || 1
            }
        }).filter(Boolean)
    }, [roads, buildingPositions, showRoads])

    if (!showRoads || roadData.length === 0) return null

    return (
        <group>
            {roadData.map((road) => (
                <RoadTube key={road.id} {...road} />
            ))}
        </group>
    )
}

function RoadTube({ curve, isCrossDistrict, weight }) {
    const tubeRef = useRef()

    const geometry = useMemo(() => {
        const radius = isCrossDistrict ? 0.25 : 0.15
        return new THREE.TubeGeometry(curve, 24, radius, 8, false)
    }, [curve, isCrossDistrict])

    // Animated glow
    useFrame((state) => {
        if (tubeRef.current) {
            const pulse = 0.6 + Math.sin(state.clock.elapsedTime * 3) * 0.2
            tubeRef.current.material.opacity = pulse
        }
    })

    // Vibrant colors for roads
    const color = isCrossDistrict ? '#60a5fa' : '#86efac'

    return (
        <mesh ref={tubeRef} geometry={geometry}>
            <meshBasicMaterial
                color={color}
                transparent
                opacity={0.7}
            />
        </mesh>
    )
}
