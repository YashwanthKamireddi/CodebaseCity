import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import { Box, Sphere, Line } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

export default function BuildingXRay() {
    const { selectedBuilding, activeIntelligencePanel } = useStore()
    const groupRef = useRef()

    const nodesData = useMemo(() => {
        if (!selectedBuilding || activeIntelligencePanel !== 'xray') return null

        const { position, dimensions, classes, functions } = selectedBuilding
        const { x, z } = position // y is usually ground 0 in our layout logic
        const { width, height, depth } = dimensions

        // Internal layout calculations
        const nodes = []
        const totalItems = (classes?.length || 0) + (functions?.length || 0)

        if (totalItems === 0) return {
            center: [x, height / 2, z],
            dimensions: [width + 0.5, height + 0.5, depth + 0.5],
            nodes: [],
            lines: []
        }

        // Stack nodes vertically inside the building bounding box
        const verticalSpacing = height / (totalItems + 1)
        let currentY = verticalSpacing

        // Layout Classes (Boxes)
        classes?.forEach((cls, i) => {
            nodes.push({
                type: 'class',
                name: typeof cls === 'string' ? cls : cls.name,
                position: [x, currentY, z],
                color: '#8b5cf6', // Purple for classes
                size: Math.min(width, depth) * 0.4
            })
            currentY += verticalSpacing
        })

        // Layout Functions (Spheres)
        functions?.forEach((func, i) => {
            nodes.push({
                type: 'function',
                name: typeof func === 'string' ? func : func.name,
                position: [x, currentY, z],
                color: '#3b82f6', // Blue for functions
                size: Math.min(width, depth) * 0.3
            })
            currentY += verticalSpacing
        })

        // Generate flow lines between sequential nodes to simulate execution/dependency flow
        const lines = []
        for (let i = 0; i < nodes.length - 1; i++) {
            lines.push({
                start: nodes[i].position,
                end: nodes[i + 1].position
            })
        }

        return {
            center: [x, height / 2, z],
            dimensions: [width + 0.5, height + 0.5, depth + 0.5], // slightly larger than the building
            nodes,
            lines
        }
    }, [selectedBuilding, activeIntelligencePanel])

    useFrame(({ clock }) => {
        if (groupRef.current) {
            // Slowly rotate the inner nodes or pulse
            const t = clock.elapsedTime
            groupRef.current.children.forEach((child, i) => {
                if (child.userData.isAstNode) {
                    child.rotation.y = t * 0.5 + i
                    // bobble slightly
                    child.position.y += Math.sin(t * 2 + i) * 0.005
                }
            })
        }
    })

    if (!nodesData) return null

    return (
        <group>
            {/* The Glass Enclosure (Outer Wireframe that wraps the solid building perfectly) */}
            <Box position={nodesData.center} args={nodesData.dimensions}>
                <meshBasicMaterial color="#00d9ff" wireframe transparent opacity={0.3} />
            </Box>

            {/* Inner AST Nodes */}
            <group ref={groupRef}>
                {nodesData.nodes.map((node, i) => (
                    <group
                        key={i}
                        position={node.position}
                        userData={{ isAstNode: true }}
                    >
                        {node.type === 'class' ? (
                            <Box args={[node.size, node.size, node.size]}>
                                <meshStandardMaterial
                                    color={node.color}
                                    emissive={node.color}
                                    emissiveIntensity={1.5}
                                    transparent
                                    opacity={0.8}
                                />
                            </Box>
                        ) : (
                            <Sphere args={[node.size, 16, 16]}>
                                <meshStandardMaterial
                                    color={node.color}
                                    emissive={node.color}
                                    emissiveIntensity={1.5}
                                    transparent
                                    opacity={0.8}
                                />
                            </Sphere>
                        )}
                    </group>
                ))}
            </group>

            {/* Internal Flow Lines */}
            {nodesData.lines.map((line, i) => (
                <Line
                    key={`line-${i}`}
                    points={[line.start, line.end]}
                    color="#00d9ff"
                    lineWidth={1.5}
                    transparent
                    opacity={0.3}
                />
            ))}
        </group>
    )
}
