import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

/**
 * HeroLandmarks — Signature Spires for the 3 most architecturally complex files.
 *
 * Design intent (world-class city):
 *  - Slim, tapered OBELISK spire floating just above the building's roof.
 *  - Each spire has ONE thin orbiting ring at mid-height (not oversized).
 *  - Apex crystal: a tiny glowing gem at the very tip.
 *  - Width is capped to keep them elegant — TALL not WIDE.
 *  - Height is 50% of the scaled building height, so they read as
 *    "antenna / feature" not as competing city-filling pillars.
 *
 * Syncs with InstancedCity's CITY_HEIGHT_SCALE = 3.0
 */

const CITY_HEIGHT_SCALE = 3.0

// Palette: gold, ice-blue, magenta  (one per hero rank)
const HERO_PALETTE = [
    { core: '#ffcc00', ring: '#ffe566', glow: '#ff9900' },
    { core: '#00e5ff', ring: '#80f0ff', glow: '#0080ff' },
    { core: '#ff0077', ring: '#ff66bb', glow: '#cc0055' },
]

export default function HeroLandmarks({ buildings }) {
    const groupRef = useRef()

    const heroes = useMemo(() => {
        if (!buildings || buildings.length < 1) return []
        return [...buildings]
            .map(b => {
                const w = b.dimensions?.width || 8
                const h = b.dimensions?.height || 8
                return { ...b, volume: w * w * h, rawW: w, rawH: h }
            })
            .sort((a, b) => b.volume - a.volume)
            .slice(0, 3)
    }, [buildings])

    useFrame(({ clock }) => {
        if (!groupRef.current) return
        const t = clock.elapsedTime
        groupRef.current.children.forEach((landmark, i) => {
            const ring = landmark.getObjectByName('orbitRing')
            if (ring) {
                // Gentle rotation — 1 full revolution every ~20s
                ring.rotation.z = t * (0.31 + i * 0.07)
                // Subtle float oscillation (~0.5 unit up-down over 4s)
                ring.position.y = Math.sin(t * 0.8 + i * 2.1) * 0.5
            }
        })
    })

    if (heroes.length === 0) return null

    return (
        <group ref={groupRef}>
            {heroes.map((hero, i) => {
                const { x, z } = hero.position
                const palette = HERO_PALETTE[i % 3]

                // Actual scaled building height (matches InstancedCity)
                const buildingH = hero.rawH * CITY_HEIGHT_SCALE

                // Spire dimensions — slim, proportional
                // Height: 45% of the building it marks (not taller than the building)
                // Width: very narrow cap so it reads as spire not pillar
                const spireH = buildingH * 0.45
                const spireW = Math.min(hero.rawW * 0.18, 3.0) // max 3 units across

                // Ring stays modest — 2× the spire radius
                const ringR = spireW * 2.5

                // Base of spire sits at building roof (+2 gap)
                const spireBaseY = buildingH + 2
                // Group pivot at spire center
                const groupY = spireBaseY + spireH / 2

                return (
                    <group key={hero.id || i} position={[x, groupY, z]}>

                        {/* ── Tapered obelisk body ── */}
                        <mesh>
                            <cylinderGeometry args={[spireW * 0.05, spireW * 0.45, spireH, 6, 1]} />
                            <meshStandardMaterial
                                color="#060a10"
                                metalness={0.95}
                                roughness={0.05}
                            />
                        </mesh>

                        {/* ── Neon energy core line (thin inner glow) ── */}
                        <mesh>
                            <cylinderGeometry args={[spireW * 0.04, spireW * 0.08, spireH * 0.92, 6, 1]} />
                            <meshStandardMaterial
                                color={palette.core}
                                emissive={palette.core}
                                emissiveIntensity={4.0}
                                transparent
                                opacity={0.85}
                            />
                        </mesh>

                        {/* ── Single orbiting ring (not oversized) ── */}
                        <group
                            name="orbitRing"
                            position={[0, spireH * 0.1, 0]}
                            rotation={[Math.PI / 2.5, 0, 0]}
                        >
                            <mesh>
                                <torusGeometry args={[ringR, ringR * 0.06, 16, 64]} />
                                <meshStandardMaterial
                                    color={palette.ring}
                                    emissive={palette.ring}
                                    emissiveIntensity={3.5}
                                    transparent
                                    opacity={0.9}
                                />
                            </mesh>
                        </group>

                        {/* ── Apex crystal ── */}
                        <mesh position={[0, spireH / 2, 0]}>
                            <octahedronGeometry args={[spireW * 0.28, 0]} />
                            <meshStandardMaterial
                                color="#ffffff"
                                emissive={palette.glow}
                                emissiveIntensity={8.0}
                                transparent
                                opacity={0.95}
                            />
                        </mesh>

                        {/* ── Point light for local bloom ── */}
                        <pointLight
                            position={[0, spireH / 2, 0]}
                            color={palette.core}
                            intensity={6}
                            distance={spireH * 2.5}
                            decay={2}
                        />

                    </group>
                )
            })}
        </group>
    )
}
