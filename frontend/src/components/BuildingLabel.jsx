import React from 'react'
import { Text, Billboard } from '@react-three/drei'
import useStore from '../store/useStore'

// Pattern detection based on CodeCity paper metrics
export function detectPattern(building) {
    const metrics = building.metrics || {}
    const loc = metrics.loc || 0
    const complexity = metrics.complexity || 0
    const methods = metrics.methods || metrics.complexity || 0  // Use complexity as proxy for methods
    const attributes = metrics.dependencies_in || 0  // Use dependencies as proxy for attributes

    // God Class: Too many methods and attributes
    if ((loc > 400 && complexity > 20) || building.is_hotspot) {
        return { type: 'god_class', label: 'God Class', color: '#ef4444', severity: 'critical' }
    }

    // Data Class: Many attributes, few methods
    if (attributes > 10 && methods < 3) {
        return { type: 'data_class', label: 'Data Class', color: '#f59e0b', severity: 'warning' }
    }

    // Lazy Class: Almost no functionality
    if (loc < 50 && methods < 3 && !building.is_hotspot) {
        return { type: 'lazy_class', label: 'Lazy Class', color: '#6b7280', severity: 'info' }
    }

    // Brain Class: High complexity
    if (complexity > 25) {
        return { type: 'brain_class', label: 'Brain Class', color: '#8b5cf6', severity: 'warning' }
    }

    // Blob: Very large file
    if (loc > 800) {
        return { type: 'blob', label: 'Blob', color: '#dc2626', severity: 'critical' }
    }

    return null
}

// Building label component
export default function BuildingLabel({ building, position, height }) {
    const { showLabels, selectedBuilding } = useStore()

    if (!showLabels) return null

    const isSelected = selectedBuilding?.id === building.id
    const pattern = detectPattern(building)
    const name = building.name || 'Unknown'

    // Show label if selected, has pattern, or is hotspot
    const shouldShow = isSelected || pattern || building.is_hotspot

    if (!shouldShow && !isSelected) return null

    return (
        <Billboard position={[position.x, height + 2, position.z]} follow={true}>
            {/* File name */}
            <Text
                fontSize={isSelected ? 1.2 : 0.8}
                color={isSelected ? '#22c55e' : '#ffffff'}
                anchorX="center"
                anchorY="bottom"
                outlineWidth={0.08}
                outlineColor="#000000"
            >
                {name.length > 20 ? name.slice(0, 17) + '...' : name}
            </Text>

            {/* Pattern badge */}
            {pattern && (
                <Text
                    position={[0, -0.8, 0]}
                    fontSize={0.6}
                    color={pattern.color}
                    anchorX="center"
                    anchorY="top"
                    outlineWidth={0.06}
                    outlineColor="#000000"
                >
                    ⚠ {pattern.label}
                </Text>
            )}
        </Billboard>
    )
}
