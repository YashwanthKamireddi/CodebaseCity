import React from 'react'
import { Text, Billboard, Html } from '@react-three/drei'
import useStore from '../../../store/useStore'
import { detectPattern } from '../utils'

// Building label component
export default function BuildingLabel({ building, position, height }) {
    const { showLabels, selectedBuilding } = useStore()
    const codeViewerOpen = useStore(state => state.codeViewerOpen)

    if (!showLabels || codeViewerOpen) return null

    const isSelected = selectedBuilding?.id === building.id
    const pattern = detectPattern(building)
    const name = building.name || 'Unknown'
    const author = building.author // { author, email_hash } from backend

    // Show label if selected, has pattern, or is hotspot
    const shouldShow = isSelected || pattern || building.is_hotspot

    if (!shouldShow && !isSelected) return null

    return (
        <group position={[position.x, height + 2, position.z]}>
            {/* 1. Standard Text Label */}
            <Billboard follow={true}>
                <Text
                    fontSize={isSelected ? 1.0 : 0.8}
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
                        position={[0, -0.6, 0]}
                        fontSize={0.5}
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

            {/* 2. Holographic Author Identity (Only on Selection) */}
            {isSelected && author && author.author !== 'Unknown' && (
                <AuthorHologram author={author} />
            )}
        </group>
    )
}

function AuthorHologram({ author }) {
    return (
        <Html position={[0, 2.5, 0]} center transform sprite zIndexRange={[0, 50]}>
            <div style={{
                display: 'flex',
                alignItems: 'center',
                gap: '12px',
                padding: '8px 16px',
                background: 'rgba(0, 0, 0, 0.6)', // Deep semi-transparent
                backdropFilter: 'blur(12px)',
                border: '1px solid rgba(255, 255, 255, 0.2)',
                borderRadius: '50px',
                boxShadow: '0 0 20px rgba(59, 130, 246, 0.4)', // Blue Glow
                color: 'white',
                whiteSpace: 'nowrap',
                pointerEvents: 'none',
                minWidth: '200px'
            }}>
                {/* Avatar Hologram */}
                <div style={{
                    width: '32px', height: '32px',
                    borderRadius: '50%',
                    overflow: 'hidden',
                    border: '2px solid #3b82f6',
                    position: 'relative'
                }}>
                    <img
                        src={`https://www.gravatar.com/avatar/${author.email_hash}?d=retro`}
                        alt="Author"
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                    />
                    <div style={{ position: 'absolute', inset: 0, boxShadow: 'inset 0 0 6px #3b82f6' }} />
                </div>

                {/* Text Info */}
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                    <span style={{
                        fontSize: '10px',
                        textTransform: 'uppercase',
                        letterSpacing: '1px',
                        color: '#94a3b8'
                    }}>
                        Main Architect
                    </span>
                    <span style={{
                        fontWeight: 700,
                        fontSize: '14px',
                        textShadow: '0 0 10px rgba(255,255,255,0.5)'
                    }}>
                        {author.author}
                    </span>
                </div>

                {/* Deco Elements */}
                <div style={{
                    marginLeft: 'auto',
                    width: '6px', height: '6px',
                    borderRadius: '50%',
                    background: '#22c55e',
                    boxShadow: '0 0 8px #22c55e'
                }} />
            </div>
        </Html>
    )
}
