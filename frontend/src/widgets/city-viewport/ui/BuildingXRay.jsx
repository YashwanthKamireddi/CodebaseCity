import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

export default function BuildingXRay() {
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const groupRef = useRef()
    const wireRef = useRef()

    const xrayData = useMemo(() => {
        if (!selectedBuilding) return null

        const { position, dimensions, classes, functions } = selectedBuilding
        const { x, z } = position
        const { width, height: rawHeight, depth } = dimensions
        const height = rawHeight * 3.0
        const minDim = Math.min(width, depth)

        const nodes = []
        const totalItems = (classes?.length || 0) + (functions?.length || 0)

        // Enclosure overshoots the building for dramatic visibility
        const padXZ = 4
        const padY = 6
        const encDims = [width + padXZ, height + padY, depth + padXZ]
        const center = [x, height / 2, z]

        if (totalItems > 0) {
            const verticalSpacing = height / (totalItems + 1)
            let currentY = verticalSpacing

            classes?.forEach(() => {
                nodes.push({ type: 'class', pos: [x, currentY, z], size: minDim * 0.5 })
                currentY += verticalSpacing
            })
            functions?.forEach(() => {
                nodes.push({ type: 'function', pos: [x, currentY, z], size: minDim * 0.4 })
                currentY += verticalSpacing
            })
        }

        // Pre-build line segment Float32Array
        const lineVerts = []
        for (let i = 0; i < nodes.length - 1; i++) {
            lineVerts.push(...nodes[i].pos, ...nodes[i + 1].pos)
        }
        const lineArray = lineVerts.length > 0 ? new Float32Array(lineVerts) : null
        const lineGeo = lineArray ? new THREE.BufferGeometry() : null
        if (lineGeo) {
            lineGeo.setAttribute('position', new THREE.BufferAttribute(lineArray, 3))
        }

        return { center, encDims, nodes, lineGeo, height, width, depth }
    }, [selectedBuilding])

    useFrame(({ clock }) => {
        if (!groupRef.current) return
        const t = clock.elapsedTime
        // Slowly spin AST nodes
        groupRef.current.children.forEach((child, i) => {
            if (child.userData?.isAstNode) {
                child.rotation.y = t * 0.4 + i * 1.2
            }
        })
        // Pulse the wireframe opacity
        if (wireRef.current) {
            wireRef.current.material.opacity = 0.35 + Math.sin(t * 2) * 0.15
        }
    })

    if (!xrayData) return null

    return (
        <group>
            {/* Outer wireframe enclosure — holographic cage */}
            <mesh ref={wireRef} position={xrayData.center} renderOrder={999}>
                <boxGeometry args={xrayData.encDims} />
                <meshBasicMaterial
                    color="#00d9ff"
                    wireframe
                    transparent
                    opacity={0.5}
                    depthTest={false}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* Holographic scan ring at base */}
            <mesh position={[xrayData.center[0], 0.1, xrayData.center[2]]}
                  rotation={[-Math.PI / 2, 0, 0]} renderOrder={998}>
                <ringGeometry args={[
                    Math.max(xrayData.width, xrayData.depth) * 0.6,
                    Math.max(xrayData.width, xrayData.depth) * 0.8 + 3,
                    32
                ]} />
                <meshBasicMaterial
                    color="#00d9ff"
                    transparent
                    opacity={0.3}
                    depthTest={false}
                    depthWrite={false}
                    side={THREE.DoubleSide}
                />
            </mesh>

            {/* AST nodes */}
            <group ref={groupRef}>
                {xrayData.nodes.map((node, i) => (
                    <mesh
                        key={i}
                        position={node.pos}
                        renderOrder={1000}
                        userData={{ isAstNode: true }}
                    >
                        {node.type === 'class' ? (
                            <boxGeometry args={[node.size, node.size, node.size]} />
                        ) : (
                            <sphereGeometry args={[node.size, 16, 16]} />
                        )}
                        <meshBasicMaterial
                            color={node.type === 'class' ? '#c084fc' : '#60a5fa'}
                            transparent
                            opacity={0.9}
                            depthTest={false}
                            depthWrite={false}
                        />
                    </mesh>
                ))}
            </group>

            {/* Flow connection lines */}
            {xrayData.lineGeo && (
                <lineSegments geometry={xrayData.lineGeo} renderOrder={999}>
                    <lineBasicMaterial
                        color="#00d9ff"
                        transparent
                        opacity={0.7}
                        depthTest={false}
                        depthWrite={false}
                    />
                </lineSegments>
            )}

            {/* Glow point lights at each node */}
            {xrayData.nodes.map((node, i) => (
                <pointLight
                    key={`gl-${i}`}
                    position={node.pos}
                    color={node.type === 'class' ? '#c084fc' : '#60a5fa'}
                    intensity={4}
                    distance={20}
                    decay={2}
                />
            ))}
        </group>
    )
}
