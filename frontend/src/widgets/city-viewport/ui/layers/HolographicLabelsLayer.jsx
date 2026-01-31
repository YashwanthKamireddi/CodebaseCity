import React, { useMemo } from 'react'
import { Html } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../../store/useStore'

export default function HolographicLabelsLayer() {
    const { cityData, selectedBuilding, selectBuilding } = useStore() // Assume hover state might be needed later

    // We can also track hovered state via store if we want hover labels
    // but for now let's focus on the Selected Building + "Landmarks" (Top 5 tallest)

    const labels = useMemo(() => {
        if (!cityData?.buildings) return []

        const results = []

        // 1. Always show selected
        if (selectedBuilding) {
            results.push({ ...selectedBuilding, type: 'selected' })
        }

        // 2. Show landmarks (Top 5 tallest) to orient the user
        // avoiding duplicates
        const sorted = [...cityData.buildings].sort((a, b) => (b.dimensions?.height || 0) - (a.dimensions?.height || 0))
        const landmarks = sorted.slice(0, 5)

        landmarks.forEach(b => {
            if (!selectedBuilding || b.id !== selectedBuilding.id) {
                results.push({ ...b, type: 'landmark' })
            }
        })

        return results
    }, [cityData, selectedBuilding])

    if (labels.length === 0) return null

    return (
        <group>
            {labels.map((building) => (
                <LabelItem key={building.id} building={building} />
            ))}
        </group>
    )
}

function LabelItem({ building }) {
    const { position, dimensions, name, path, type } = building
    const isSelected = type === 'selected'

    // Position at top corner of building
    const y = dimensions ? dimensions.height : 10
    const pos = [position.x + (dimensions ? dimensions.width / 2 : 0), y, position.z + (dimensions ? dimensions.width / 2 : 0)]

    return (
        <group position={pos}>
            {/* Leader Line */}
            <mesh position={[5, 10, 5]}>
                <bufferGeometry>
                    <float32BufferAttribute
                        attach="attributes-position"
                        count={2}
                        array={new Float32Array([0, 0, 0, 0, -10, 0])} // Simple vertical line for now
                        itemSize={3}
                    />
                </bufferGeometry>
                <lineBasicMaterial color={isSelected ? "#3b82f6" : "rgba(255,255,255,0.2)"} transparent opacity={0.6} />
            </mesh>

            <Html
                position={[0, 10, 0]} // Float above
                center
                distanceFactor={isSelected ? undefined : 150} // Scale with distance for landmarks
                occlude={false} // Clean overlay for now, occlude true can be glitchy with large meshes
                style={{
                    pointerEvents: 'none',
                    transition: 'all 0.2s',
                    opacity: 1,
                    transform: 'translate3d(0,0,0)'
                }}
            >
                <div style={{
                    display: 'flex',
                    alignItems: 'flex-start',
                    gap: '12px',
                    fontFamily: 'var(--font-mono)',
                    pointerEvents: 'none'
                }}>
                    {/* Animated Decorator */}
                    <div style={{
                        width: '2px',
                        height: '40px',
                        background: isSelected ? '#3b82f6' : 'rgba(255,255,255,0.2)',
                        boxShadow: isSelected ? '0 0 10px #3b82f6' : 'none'
                    }} />

                    <div>
                        <div style={{
                            background: isSelected ? 'rgba(59, 130, 246, 0.9)' : 'rgba(0,0,0,0.6)',
                            backdropFilter: 'blur(8px)',
                            padding: '4px 12px',
                            borderRadius: '4px',
                            border: isSelected ? '1px solid #60a5fa' : '1px solid rgba(255,255,255,0.1)',
                            color: 'white',
                            fontSize: isSelected ? '14px' : '12px',
                            fontWeight: 700,
                            whiteSpace: 'nowrap',
                            boxShadow: isSelected ? '0 4px 20px rgba(59, 130, 246, 0.4)' : 'none',
                            marginBottom: '4px'
                        }}>
                            {name}
                        </div>
                        {isSelected && (
                            <div style={{
                                fontSize: '10px',
                                color: '#93c5fd',
                                background: 'rgba(0,0,0,0.8)',
                                padding: '2px 6px',
                                borderRadius: '2px',
                                maxWidth: '200px',
                                overflow: 'hidden',
                                textOverflow: 'ellipsis'
                            }}>
                                {path}
                            </div>
                        )}
                    </div>
                </div>
            </Html>

            {/* Connecting Line (Using Drei Line or simple mesh above) */}
            <Line start={[0, 0, 0]} end={[0, 10, 0]} color={isSelected ? "#3b82f6" : "rgba(255,255,255,0.2)"} />
        </group>
    )
}

function Line({ start, end, color }) {
    const ref = React.useRef()
    React.useLayoutEffect(() => {
        if (ref.current) {
            ref.current.setFromPoints([new THREE.Vector3(...start), new THREE.Vector3(...end)])
        }
    }, [start, end])
    return (
        <line>
            <bufferGeometry ref={ref} />
            <lineBasicMaterial color={color} transparent opacity={0.5} />
        </line>
    )
}
