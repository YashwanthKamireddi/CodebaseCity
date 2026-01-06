import React from 'react'

// Simple tree component for green spaces
export default function Trees({ buildings }) {
    if (!buildings || buildings.length < 5) return null

    // Place trees in gaps between buildings
    const treePositions = []
    const gridSize = 15

    // Create a grid of potential tree positions
    for (let x = -80; x < 80; x += gridSize) {
        for (let z = -80; z < 80; z += gridSize) {
            // Check if any building is too close
            const tooClose = buildings.some(b => {
                const dx = b.position.x - x
                const dz = b.position.z - z
                return Math.sqrt(dx * dx + dz * dz) < 8
            })

            if (!tooClose && Math.random() > 0.7) {
                treePositions.push({ x, z, scale: 0.5 + Math.random() * 0.5 })
            }
        }
    }

    return (
        <group>
            {treePositions.slice(0, 30).map((pos, i) => (
                <Tree key={i} position={[pos.x, 0, pos.z]} scale={pos.scale} />
            ))}
        </group>
    )
}

function Tree({ position, scale = 1 }) {
    return (
        <group position={position} scale={[scale, scale, scale]}>
            {/* Trunk */}
            <mesh position={[0, 1.5, 0]} castShadow>
                <cylinderGeometry args={[0.3, 0.4, 3, 8]} />
                <meshStandardMaterial color="#5d4037" roughness={0.9} />
            </mesh>
            {/* Foliage layers */}
            <mesh position={[0, 3.5, 0]} castShadow>
                <coneGeometry args={[2, 3, 8]} />
                <meshStandardMaterial color="#2d5a27" roughness={0.8} />
            </mesh>
            <mesh position={[0, 5, 0]} castShadow>
                <coneGeometry args={[1.5, 2.5, 8]} />
                <meshStandardMaterial color="#3d7a37" roughness={0.8} />
            </mesh>
            <mesh position={[0, 6.2, 0]} castShadow>
                <coneGeometry args={[1, 2, 8]} />
                <meshStandardMaterial color="#4d8a47" roughness={0.8} />
            </mesh>
        </group>
    )
}
