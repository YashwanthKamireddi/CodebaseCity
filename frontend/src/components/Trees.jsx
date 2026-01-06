import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

// Tree types based on file purpose
const TREE_TYPES = {
    test: { color: '#22c55e', trunkColor: '#854d0e', scale: 1.0 },      // Green - tests
    utility: { color: '#3b82f6', trunkColor: '#78350f', scale: 0.8 },   // Blue - utils
    docs: { color: '#ec4899', trunkColor: '#92400e', scale: 0.6 },      // Pink - docs
    config: { color: '#f59e0b', trunkColor: '#78350f', scale: 0.7 },    // Orange - config
}

// Determine tree type from file info
function getTreeType(building) {
    const name = building.name?.toLowerCase() || ''
    const path = building.path?.toLowerCase() || ''

    if (name.includes('test') || name.includes('spec') || path.includes('test')) {
        return 'test'
    }
    if (name.includes('util') || name.includes('helper') || path.includes('util')) {
        return 'utility'
    }
    if (name.endsWith('.md') || name.endsWith('.txt') || name.includes('readme')) {
        return 'docs'
    }
    if (name.includes('config') || name.endsWith('.json') || name.endsWith('.yaml')) {
        return 'config'
    }
    return null
}

// Single tree component with low-poly style
function Tree({ position, type = 'test', seed = 0 }) {
    const treeRef = useRef()
    const treeConfig = TREE_TYPES[type] || TREE_TYPES.test

    // Gentle sway animation
    useFrame((state) => {
        if (treeRef.current) {
            const sway = Math.sin(state.clock.elapsedTime * 0.5 + seed) * 0.03
            treeRef.current.rotation.z = sway
        }
    })

    const scale = treeConfig.scale * (0.8 + Math.random() * 0.4)

    return (
        <group ref={treeRef} position={position}>
            {/* Trunk */}
            <mesh position={[0, 1.5 * scale, 0]} castShadow>
                <cylinderGeometry args={[0.2 * scale, 0.3 * scale, 3 * scale, 6]} />
                <meshStandardMaterial color={treeConfig.trunkColor} roughness={0.9} />
            </mesh>

            {/* Foliage - stacked cones for low-poly look */}
            <mesh position={[0, 3.5 * scale, 0]} castShadow>
                <coneGeometry args={[1.8 * scale, 2.5 * scale, 6]} />
                <meshStandardMaterial
                    color={treeConfig.color}
                    roughness={0.7}
                    flatShading
                />
            </mesh>
            <mesh position={[0, 4.8 * scale, 0]} castShadow>
                <coneGeometry args={[1.4 * scale, 2 * scale, 6]} />
                <meshStandardMaterial
                    color={treeConfig.color}
                    roughness={0.7}
                    flatShading
                />
            </mesh>
            <mesh position={[0, 5.8 * scale, 0]} castShadow>
                <coneGeometry args={[0.9 * scale, 1.5 * scale, 6]} />
                <meshStandardMaterial
                    color={treeConfig.color}
                    roughness={0.7}
                    flatShading
                />
            </mesh>
        </group>
    )
}

// Generate tree positions around buildings
export default function Trees({ buildings }) {
    const treeData = useMemo(() => {
        if (!buildings || buildings.length === 0) return []

        const trees = []

        buildings.forEach((building, index) => {
            const treeType = getTreeType(building)
            if (!treeType) return

            const { x, z } = building.position
            const { width, depth } = building.dimensions

            // Place 1-3 trees around the building
            const treeCount = 1 + Math.floor(Math.random() * 2)

            for (let i = 0; i < treeCount; i++) {
                const angle = (Math.PI * 2 * i) / treeCount + Math.random() * 0.5
                const distance = Math.max(width, depth) * 0.8 + 2 + Math.random() * 3

                trees.push({
                    id: `tree-${index}-${i}`,
                    position: [
                        x + Math.cos(angle) * distance,
                        0,
                        z + Math.sin(angle) * distance
                    ],
                    type: treeType,
                    seed: index * 100 + i
                })
            }
        })

        // Limit trees for performance
        return trees.slice(0, 150)
    }, [buildings])

    if (treeData.length === 0) return null

    return (
        <group>
            {treeData.map(tree => (
                <Tree
                    key={tree.id}
                    position={tree.position}
                    type={tree.type}
                    seed={tree.seed}
                />
            ))}
        </group>
    )
}
