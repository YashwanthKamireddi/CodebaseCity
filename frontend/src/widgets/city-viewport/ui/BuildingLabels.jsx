import { Text, Billboard } from '@react-three/drei'
import useStore from '../../../store/useStore'
import { detectPattern } from '../../../entities/building/utils'

/**
 * BuildingLabels — Floating holographic labels above buildings.
 * Shows labels for selected building and hotspot/pattern buildings.
 */
export default function BuildingLabels() {
    const { cityData, showLabels, selectedBuilding, hoveredBuilding } = useStore()
    const codeViewerOpen = useStore(s => s.codeViewerOpen)

    if (!showLabels || codeViewerOpen || !cityData?.buildings?.length) return null

    const buildings = cityData.buildings

    return (
        <>
            {buildings.map((b) => {
                const isSelected = selectedBuilding?.id === b.id
                const isHovered = hoveredBuilding?.id === b.id
                const pattern = detectPattern(b)
                const isHotspot = b.is_hotspot

                // Only show labels for selected, hovered, pattern, or hotspot buildings
                if (!isSelected && !isHovered && !pattern && !isHotspot) return null

                const height = b.dimensions?.height || 8
                const name = b.name || 'Unknown'
                const displayName = name.length > 22 ? name.slice(0, 19) + '...' : name

                return (
                    <group key={b.id} position={[b.position.x, height + 1.5, b.position.z]}>
                        <Billboard follow>
                            <Text
                                fontSize={isSelected ? 1.0 : isHovered ? 0.85 : 0.7}
                                color={isSelected ? '#22c55e' : isHovered ? '#60a5fa' : '#ffffff'}
                                anchorX="center"
                                anchorY="bottom"
                                outlineWidth={0.05}
                                outlineColor="#000000"
                                fillOpacity={isSelected || isHovered ? 1 : 0.8}
                            >
                                {displayName}
                            </Text>

                            {pattern && (
                                <Text
                                    position={[0, -0.5, 0]}
                                    fontSize={0.45}
                                    color={pattern.color}
                                    anchorX="center"
                                    anchorY="top"
                                    outlineWidth={0.04}
                                    outlineColor="#000000"
                                >
                                    {pattern.label}
                                </Text>
                            )}
                        </Billboard>
                    </group>
                )
            })}
        </>
    )
}
