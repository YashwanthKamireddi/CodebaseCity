import React, { useMemo } from 'react'
import * as THREE from 'three'

/**
 * HeroLandmarks — Futuristic spire towers above the top 5 most complex files.
 *
 * Design: Tapered dark metallic obelisk with a glowing accent ring and
 * apex crystal. Inspired by Avengers Tower / sci-fi antenna spires.
 *
 * Perf budget: 5 groups × 3 meshes = 15 draw calls, 0 useFrame (fully static),
 * 0 pointLights, 0 transparent materials.
 */

const CITY_HEIGHT_SCALE = 3.0

const HERO_PALETTE = [
    { body: '#0a0e14', accent: '#ffcc00', crystal: '#ffe066' },
    { body: '#0a0e14', accent: '#00ccff', crystal: '#80eeff' },
    { body: '#0a0e14', accent: '#ff3388', crystal: '#ff77aa' },
    { body: '#0a0e14', accent: '#8844ff', crystal: '#aa77ff' },
    { body: '#0a0e14', accent: '#00ff88', crystal: '#66ffaa' },
]

export default function HeroLandmarks({ buildings }) {
    const heroes = useMemo(() => {
        if (!buildings || buildings.length < 1) return []
        return [...buildings]
            .map(b => {
                const w = b.dimensions?.width || 8
                const h = b.dimensions?.height || 8
                return { ...b, volume: w * w * h, rawW: w, rawH: h }
            })
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 5)
    }, [buildings])

    if (heroes.length === 0) return null

    return (
        <group>
            {heroes.map((hero, i) => {
                const { x, z } = hero.position
                const palette = HERO_PALETTE[i % HERO_PALETTE.length]

                const buildingH = hero.rawH * CITY_HEIGHT_SCALE
                const spireH = Math.max(12, buildingH * 0.35)
                const spireW = Math.min(hero.rawW * 0.15, 2.5)
                const ringR = spireW * 2.2
                const baseY = buildingH + 1
                const centerY = baseY + spireH / 2

                return (
                    <group key={hero.id || i} position={[x, centerY, z]}>
                        {/* Tapered obelisk body — dark metallic */}
                        <mesh>
                            <cylinderGeometry args={[spireW * 0.06, spireW * 0.5, spireH, 6, 1]} />
                            <meshStandardMaterial
                                color={palette.body}
                                metalness={0.92}
                                roughness={0.08}
                            />
                        </mesh>

                        {/* Accent ring at mid-height — static, tilted */}
                        <mesh
                            position={[0, spireH * 0.08, 0]}
                            rotation={[Math.PI / 2.3, 0, 0]}
                        >
                            <torusGeometry args={[ringR, ringR * 0.08, 8, 24]} />
                            <meshStandardMaterial
                                color={palette.accent}
                                emissive={palette.accent}
                                emissiveIntensity={0.6}
                                metalness={0.8}
                                roughness={0.15}
                            />
                        </mesh>

                        {/* Apex crystal — octahedron on top */}
                        <mesh position={[0, spireH * 0.5 + spireW * 0.2, 0]}>
                            <octahedronGeometry args={[spireW * 0.3, 0]} />
                            <meshStandardMaterial
                                color={palette.crystal}
                                emissive={palette.crystal}
                                emissiveIntensity={0.5}
                                metalness={0.6}
                                roughness={0.2}
                            />
                        </mesh>
                    </group>
                )
            })}
        </group>
    )
}
