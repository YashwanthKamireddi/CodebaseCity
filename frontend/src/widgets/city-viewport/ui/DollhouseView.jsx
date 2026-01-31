import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Html } from '@react-three/drei'
import useStore from '../../../store/useStore'
import * as THREE from 'three'

export default function DollhouseView() {
    const { selectedBuilding, cameraAction } = useStore()
    const groupRef = useRef()

    // Mock Internal Data (AST Nodes)
    // In a real app, this would come from `fileContent` analysis
    const rooms = useMemo(() => {
        if (!selectedBuilding) return []

        const count = Math.max(3, Math.floor((selectedBuilding.dimensions?.height || 10) / 10))
        const items = []

        for (let i = 0; i < count; i++) {
            items.push({
                id: `room-${i}`,
                type: Math.random() > 0.5 ? 'Function' : 'Class',
                name: `Block_${i}`,
                color: Math.random() > 0.5 ? '#60a5fa' : '#34d399',
                pos: [
                    (Math.random() - 0.5) * 8,
                    (i * 12) + 5,
                    (Math.random() - 0.5) * 8
                ]
            })
        }
        return items
    }, [selectedBuilding])

    // Only show if we are "Zoomed In" (Heuristic: selected and camera is close, or explicitly toggled)
    // For this prototype, we show it when a building is SELECTED.
    if (!selectedBuilding) {
        // console.log("Dollhouse: No selection")
        return null
    }

    // console.log("Dollhouse: Rendering for", selectedBuilding.id)

    return (
        <group position={[selectedBuilding.position.x, 0, selectedBuilding.position.z]}>
            {/* Outline of the walls (Ghost) - Force Red Wireframe for Debug */}
            <mesh position={[0, (selectedBuilding.dimensions?.height || 10) / 2, 0]}>
                <boxGeometry args={[
                    (selectedBuilding.dimensions?.width || 10) * 1.05,
                    (selectedBuilding.dimensions?.height || 10) * 1.05,
                    (selectedBuilding.dimensions?.width || 10) * 1.05
                ]} />
                <meshBasicMaterial color="#ef4444" wireframe transparent opacity={0.5} />
            </mesh>

            {/* Internal "Rooms" (AST Nodes) */}
            {rooms.map((room, i) => (
                <group key={room.id} position={room.pos}>
                    <mesh>
                        <boxGeometry args={[3, 3, 3]} />
                        <meshStandardMaterial color={room.color} transparent opacity={0.8} />
                    </mesh>
                    <Html distanceFactor={20}>
                        <div style={{
                            background: 'rgba(0,0,0,0.8)',
                            color: 'white',
                            padding: '2px 4px',
                            borderRadius: '4px',
                            fontSize: '10px',
                            fontFamily: 'monospace',
                            whiteSpace: 'nowrap'
                        }}>
                            {room.type} {i}
                        </div>
                    </Html>

                    {/* Wiring (Variables) */}
                    {i > 0 && (
                        <line>
                            <bufferGeometry onUpdate={geo => {
                                const points = [
                                    new THREE.Vector3(0, 0, 0),
                                    new THREE.Vector3(
                                        rooms[i - 1].pos[0] - room.pos[0],
                                        rooms[i - 1].pos[1] - room.pos[1],
                                        rooms[i - 1].pos[2] - room.pos[2]
                                    )
                                ]
                                geo.setFromPoints(points)
                            }} />
                            <lineBasicMaterial color="#eab308" transparent opacity={0.5} />
                        </line>
                    )}
                </group>
            ))}
        </group>
    )
}
