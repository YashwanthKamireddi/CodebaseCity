/**
 * Animated Building Component
 * Handles smooth transitions when buildings change size during time travel
 */

import React, { useRef, useMemo, useEffect, useState } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

// Custom hook for animated values
function useAnimatedValue(target, speed = 0.1) {
    const [value, setValue] = useState(target)
    const targetRef = useRef(target)

    useEffect(() => {
        targetRef.current = target
    }, [target])

    useFrame(() => {
        setValue(prev => {
            const diff = targetRef.current - prev
            if (Math.abs(diff) < 0.01) return targetRef.current
            return prev + diff * speed
        })
    })

    return value
}

// Wrapper component that adds animation to buildings
export function AnimatedBuilding({ data, previousData, children }) {
    const groupRef = useRef()
    const { isAnimating, highlightedCategory } = useStore()

    // Highlight logic
    const isHighlighted = useMemo(() => {
        if (!highlightedCategory) return false
        if (highlightedCategory.type === 'language') {
            return data.language?.toLowerCase() === highlightedCategory.value.toLowerCase()
        }
        if (highlightedCategory.type === 'health') {
            const health = data.health || 0
            if (highlightedCategory.value === 'healthy') return health >= 70
            if (highlightedCategory.value === 'warning') return health >= 40 && health < 70
            if (highlightedCategory.value === 'critical') return health < 40
        }
        if (highlightedCategory.type === 'district') {
            return data.district_id === highlightedCategory.value
        }
        return false
    }, [highlightedCategory, data])

    // Smooth scale animation & Pulse
    useFrame((state) => {
        if (groupRef.current) {
            const currentScale = groupRef.current.scale.x
            let targetScale = 1

            // Pulse if highlighted
            if (isHighlighted) {
                targetScale = 1.1 + Math.sin(state.clock.elapsedTime * 8) * 0.05
            }

            const diff = targetScale - currentScale
            if (Math.abs(diff) > 0.001) {
                const newScale = currentScale + diff * 0.1
                groupRef.current.scale.set(newScale, newScale, newScale)
            }
        }
    })

    return (
        <group ref={groupRef} scale={scale}>
            {children}

            {/* Growth indicator particle effect for new buildings */}
            {isNew && <GrowthParticles />}

            {/* Change indicator for modified buildings */}
            {hasChanged && <ChangeIndicator
                growing={targetHeight > prevHeight}
                height={targetHeight}
            />}
        </group>
    )
}

// Particle effect for new buildings
function GrowthParticles() {
    const groupRef = useRef()
    const [visible, setVisible] = useState(true)
    const [opacity, setOpacity] = useState(0.8)

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), 2000)
        return () => clearTimeout(timer)
    }, [])

    useFrame((state) => {
        if (groupRef.current && visible) {
            groupRef.current.rotation.y += 0.02
            setOpacity(prev => Math.max(0, prev - 0.008))
        }
    })

    if (!visible || opacity <= 0) return null

    return (
        <group ref={groupRef}>
            {Array.from({ length: 8 }).map((_, i) => (
                <mesh
                    key={i}
                    position={[
                        Math.sin(i * Math.PI / 4) * 2,
                        i * 0.5,
                        Math.cos(i * Math.PI / 4) * 2
                    ]}
                >
                    <sphereGeometry args={[0.2, 8, 8]} />
                    <meshBasicMaterial
                        color="#22c55e"
                        transparent
                        opacity={opacity}
                    />
                </mesh>
            ))}
        </group>
    )
}

// Indicator showing if building grew or shrunk
function ChangeIndicator({ growing, height }) {
    const [visible, setVisible] = useState(true)
    const arrowRef = useRef()

    useEffect(() => {
        const timer = setTimeout(() => setVisible(false), 3000)
        return () => clearTimeout(timer)
    }, [])

    useFrame((state) => {
        if (arrowRef.current && visible) {
            arrowRef.current.position.y = height + 2 + Math.sin(state.clock.elapsedTime * 3) * 0.5
        }
    })

    if (!visible) return null

    const color = growing ? '#22c55e' : '#ef4444'

    return (
        <group ref={arrowRef} position={[0, height + 2, 0]}>
            {/* Arrow indicator */}
            <mesh rotation={[growing ? 0 : Math.PI, 0, 0]}>
                <coneGeometry args={[0.5, 1, 4]} />
                <meshBasicMaterial color={color} transparent opacity={0.8} />
            </mesh>

            {/* Glow effect */}
            <pointLight color={color} intensity={2} distance={5} />
        </group>
    )
}

// Hook to track building changes between commits
export function useBuildingChanges(currentBuildings, previousBuildings) {
    return useMemo(() => {
        if (!previousBuildings) {
            return {
                newBuildings: new Set(currentBuildings?.map(b => b.id) || []),
                removedBuildings: new Set(),
                changedBuildings: new Map()
            }
        }

        const prevMap = new Map(previousBuildings.map(b => [b.id, b]))
        const currMap = new Map(currentBuildings?.map(b => [b.id, b]) || [])

        const newBuildings = new Set()
        const removedBuildings = new Set()
        const changedBuildings = new Map()

        // Find new and changed buildings
        currMap.forEach((building, id) => {
            const prev = prevMap.get(id)
            if (!prev) {
                newBuildings.add(id)
            } else if (
                prev.dimensions?.height !== building.dimensions?.height ||
                prev.metrics?.loc !== building.metrics?.loc
            ) {
                changedBuildings.set(id, { prev, current: building })
            }
        })

        // Find removed buildings
        prevMap.forEach((_, id) => {
            if (!currMap.has(id)) {
                removedBuildings.add(id)
            }
        })

        return { newBuildings, removedBuildings, changedBuildings }
    }, [currentBuildings, previousBuildings])
}

// Stats component showing changes
export function TimeTravelStats() {
    const { cityData, previousCityData, isAnimating, currentCommitIndex, commits } = useStore()

    const changes = useBuildingChanges(cityData?.buildings, previousCityData?.buildings)

    if (!isAnimating && !previousCityData) return null
    if (!previousCityData) return null

    const currentCommit = currentCommitIndex >= 0 ? commits[currentCommitIndex] : null

    return (
        <div style={{
            position: 'fixed',
            top: '100px',
            right: '20px',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(12px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '12px',
            padding: '16px',
            zIndex: 500,
            minWidth: '200px'
        }}>
            <h3 style={{
                margin: '0 0 12px 0',
                fontSize: '13px',
                color: '#a5b4fc',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                🔄 Changes
                {currentCommit && (
                    <span style={{
                        fontSize: '10px',
                        color: '#7a7a8c',
                        fontWeight: 'normal'
                    }}>
                        {currentCommit.short_hash}
                    </span>
                )}
            </h3>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {changes.newBuildings.size > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                    }}>
                        <span style={{
                            background: '#22c55e',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 600
                        }}>
                            +{changes.newBuildings.size}
                        </span>
                        <span style={{ color: '#9ca3af' }}>new files</span>
                    </div>
                )}

                {changes.removedBuildings.size > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                    }}>
                        <span style={{
                            background: '#ef4444',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 600
                        }}>
                            -{changes.removedBuildings.size}
                        </span>
                        <span style={{ color: '#9ca3af' }}>removed</span>
                    </div>
                )}

                {changes.changedBuildings.size > 0 && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        fontSize: '12px'
                    }}>
                        <span style={{
                            background: '#f59e0b',
                            padding: '2px 8px',
                            borderRadius: '4px',
                            color: '#fff',
                            fontWeight: 600
                        }}>
                            ~{changes.changedBuildings.size}
                        </span>
                        <span style={{ color: '#9ca3af' }}>modified</span>
                    </div>
                )}

                {changes.newBuildings.size === 0 &&
                    changes.removedBuildings.size === 0 &&
                    changes.changedBuildings.size === 0 && (
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                            No structural changes
                        </div>
                    )}
            </div>
        </div>
    )
}

export default AnimatedBuilding
