/**
 * Roads.jsx - Premium Dependency Visualization
 *
 * World-class animated flow connections between files.
 * Features:
 * - Smooth animated particles flowing along curves
 * - Gradient colors based on connection type
 * - Glow effects at endpoints
 * - Selection-based highlighting with fade
 */
import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

export default function Roads({ roads, buildings }) {
    const showRoads = useStore((state) => state.showRoads)
    const selectedBuilding = useStore((state) => state.selectedBuilding)

    const buildingPositions = useMemo(() => {
        const positions = {}
        buildings?.forEach(b => {
            positions[b.id] = {
                x: b.position.x,
                y: (b.dimensions?.height || 10) / 2 + 0.5,
                z: b.position.z
            }
        })
        return positions
    }, [buildings])

    const roadData = useMemo(() => {
        if (!roads || roads.length === 0) return []

        return roads.map((road, index) => {
            const srcPos = buildingPositions[road.source]
            const tgtPos = buildingPositions[road.target]

            if (!srcPos || !tgtPos) return null

            const distance = Math.sqrt(
                Math.pow(tgtPos.x - srcPos.x, 2) + Math.pow(tgtPos.z - srcPos.z, 2)
            )

            // Elegant arc height based on distance
            const arcHeight = Math.min(8, 2 + distance * 0.08)

            const midX = (srcPos.x + tgtPos.x) / 2
            const midZ = (srcPos.z + tgtPos.z) / 2

            const points = [
                new THREE.Vector3(srcPos.x, 1.5, srcPos.z),
                new THREE.Vector3(midX, arcHeight, midZ),
                new THREE.Vector3(tgtPos.x, 1.5, tgtPos.z)
            ]

            const curve = new THREE.CatmullRomCurve3(points)

            // Determine if this connection involves the selected building
            const isHighlighted = selectedBuilding && (
                road.source === selectedBuilding.id ||
                road.target === selectedBuilding.id
            )

            const isOutgoing = selectedBuilding && road.source === selectedBuilding.id

            return {
                id: `road-${index}`,
                curve,
                sourceId: road.source,
                targetId: road.target,
                isCrossDistrict: road.is_cross_district,
                weight: road.weight || 1,
                isHighlighted,
                isOutgoing
            }
        }).filter(Boolean)
    }, [roads, buildingPositions, selectedBuilding])

    // Don't render if disabled
    if (!showRoads && !selectedBuilding) return null

    // Filter: Show all if showRoads, or only highlighted if a building is selected
    const visibleRoads = selectedBuilding
        ? roadData.filter(r => r.isHighlighted)
        : showRoads ? roadData.slice(0, 30) : [] // Limit for performance

    return (
        <group>
            {visibleRoads.map((road) => (
                <FlowConnection key={road.id} {...road} />
            ))}
        </group>
    )
}

/**
 * FlowConnection - Single animated dependency connection
 * Premium implementation with:
 * - Subtle base tube
 * - Animated flow particles
 * - Endpoint glow spheres
 */
function FlowConnection({ curve, isHighlighted, isOutgoing, isCrossDistrict }) {
    const tubeRef = useRef()
    const particlesRef = useRef()
    const startGlowRef = useRef()
    const endGlowRef = useRef()

    // Generate points along the curve for particles
    const { tubeGeometry, particlePositions, curveLength } = useMemo(() => {
        const tubeGeo = new THREE.TubeGeometry(curve, 64, 0.08, 8, false)

        // Create particle positions along the curve
        const numParticles = 12
        const positions = []
        for (let i = 0; i < numParticles; i++) {
            const t = i / numParticles
            const point = curve.getPointAt(t)
            positions.push(point.x, point.y, point.z)
        }

        return {
            tubeGeometry: tubeGeo,
            particlePositions: new Float32Array(positions),
            curveLength: curve.getLength()
        }
    }, [curve])

    // Animation loop
    useFrame((state) => {
        const time = state.clock.elapsedTime

        // Animate tube opacity (subtle pulse when highlighted)
        if (tubeRef.current) {
            const baseOpacity = isHighlighted ? 0.4 : 0.15
            const pulse = isHighlighted ? Math.sin(time * 2) * 0.1 : 0
            tubeRef.current.material.opacity = baseOpacity + pulse
        }

        // Animate particles along the curve
        if (particlesRef.current) {
            const positions = particlesRef.current.geometry.attributes.position.array
            const numParticles = positions.length / 3
            const speed = isHighlighted ? 0.4 : 0.15

            for (let i = 0; i < numParticles; i++) {
                // Each particle has an offset phase
                const phase = (i / numParticles + time * speed) % 1
                const point = curve.getPointAt(isOutgoing ? phase : 1 - phase)

                positions[i * 3] = point.x
                positions[i * 3 + 1] = point.y
                positions[i * 3 + 2] = point.z
            }
            particlesRef.current.geometry.attributes.position.needsUpdate = true
        }

        // Animate endpoint glows
        if (startGlowRef.current && endGlowRef.current) {
            const pulse = 0.8 + Math.sin(time * 3) * 0.2
            const scale = isHighlighted ? 0.4 * pulse : 0.2
            startGlowRef.current.scale.setScalar(scale)
            endGlowRef.current.scale.setScalar(scale * 1.2)
        }
    })

    // Color scheme
    const baseColor = isHighlighted
        ? (isOutgoing ? '#4ade80' : '#f87171') // Green out (Dependency), Red in (Impact check)
        : (isCrossDistrict ? '#475569' : '#334155')

    const particleColor = isHighlighted
        ? (isOutgoing ? '#86efac' : '#fca5a5')
        : '#64748b'

    const glowColor = isOutgoing ? '#22c55e' : '#ef4444'

    // Get start and end points
    const startPoint = curve.getPointAt(0)
    const endPoint = curve.getPointAt(1)

    return (
        <group>
            {/* Base Tube - Subtle path indicator */}
            <mesh ref={tubeRef} geometry={tubeGeometry} raycast={() => null}>
                <meshBasicMaterial
                    color={baseColor}
                    transparent
                    opacity={0.2}
                    depthWrite={false}
                />
            </mesh>

            {/* Flow Particles - Animated dots */}
            <points ref={particlesRef} raycast={() => null}>
                <bufferGeometry>
                    <bufferAttribute
                        attach="attributes-position"
                        count={particlePositions.length / 3}
                        array={particlePositions}
                        itemSize={3}
                    />
                </bufferGeometry>
                <pointsMaterial
                    color={particleColor}
                    size={isHighlighted ? 0.5 : 0.25}
                    transparent
                    opacity={isHighlighted ? 0.9 : 0.4}
                    sizeAttenuation={true}
                    depthWrite={false}
                />
            </points>

            {/* Start Glow - Source indicator */}
            {isHighlighted && (
                <mesh ref={startGlowRef} position={[startPoint.x, startPoint.y, startPoint.z]}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshBasicMaterial
                        color={glowColor}
                        transparent
                        opacity={0.3}
                        depthWrite={false}
                    />
                </mesh>
            )}

            {/* End Glow - Target indicator */}
            {isHighlighted && (
                <mesh ref={endGlowRef} position={[endPoint.x, endPoint.y, endPoint.z]}>
                    <sphereGeometry args={[1, 16, 16]} />
                    <meshBasicMaterial
                        color={isOutgoing ? '#22c55e' : glowColor}
                        transparent
                        opacity={0.4}
                        depthWrite={false}
                    />
                </mesh>
            )}
        </group>
    )
}
