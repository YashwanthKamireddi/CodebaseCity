import React, { useMemo } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * Ground — clean terrain plate.
 *
 * Previous iteration was a "masterpiece" canvas texture with 16 spokes,
 * 6 concentric rings, hex grid, glowing intersection nodes, bright cyan
 * center hub, and a saturated cyan rim. It read as a sci-fi dashboard
 * graphic, not as terrain — and the bright dots scattered across the
 * floor were visible from any altitude, distracting from the city.
 *
 * Now: three flat layers with zero per-frame work. The world's
 * detail comes from buildings + districts + landmarks, not the floor.
 *
 * Layers:
 *   1. Void backdrop disc — seals below so nebula doesn't leak through.
 *   2. Main plate — single dark muted color, no patterns.
 *   3. Rim — a single dim band a few shades brighter than the plate
 *      so the city's edge is suggested but not announced.
 */
function Ground() {
    const cityData = useStore(s => s.cityData)

    const platformRadius = useMemo(() => {
        if (!cityData?.buildings?.length) return 1200
        let maxR = 0
        for (const b of cityData.buildings) {
            const halfW = (b.dimensions?.width || 8) / 2
            const halfD = (b.dimensions?.depth || 8) / 2
            const x = b.position.x
            const z = b.position.z || 0
            const corner = Math.sqrt((Math.abs(x) + halfW) ** 2 + (Math.abs(z) + halfD) ** 2)
            if (corner > maxR) maxR = corner
        }
        // Tighter padding — the plate should hug the city footprint
        // like an island shoreline, not extend into a huge empty disc.
        const padding = Math.max(80, Math.min(300, maxR * 0.15))
        return Math.max(400, maxR + padding)
    }, [cityData])

    return (
        <group>
            {/* 1. Void backdrop — seals below */}
            <mesh position={[0, -1.6, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius * 2.2, 48]} />
                <meshBasicMaterial color="#02030a" fog={false} />
            </mesh>

            {/* 2. Main plate — "paved avenue" slate. With the new
                 contiguous layout the 32-unit gaps between district
                 plates expose this surface, so it must read as city
                 ground (asphalt between blocks), not as a black void.
                 #151a26 is bright enough to separate from the backdrop
                 while staying far below the district plates' tint. */}
            <mesh position={[0, -0.12, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <circleGeometry args={[platformRadius, 96]} />
                <meshStandardMaterial
                    color="#151a26"
                    metalness={0.0}
                    roughness={0.85}
                    polygonOffset
                    polygonOffsetFactor={1}
                    polygonOffsetUnits={1}
                />
            </mesh>

            {/* 3. Subtle rim — a couple shades up from plate, dim
                 enough not to compete with the city itself. NOT bright
                 cyan, NOT toneMapped=false. */}
            <mesh position={[0, -0.10, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <ringGeometry args={[platformRadius * 0.992, platformRadius * 1.008, 96]} />
                <meshBasicMaterial color="#1a2238" side={THREE.DoubleSide} />
            </mesh>
        </group>
    )
}

export default React.memo(Ground)
