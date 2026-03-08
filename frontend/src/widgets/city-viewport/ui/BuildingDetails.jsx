import React, { useMemo, useRef, useLayoutEffect } from 'react'
import * as THREE from 'three'
import { useFrame } from '@react-three/fiber'
import useStore from '../../../store/useStore'

const tempObject = new THREE.Object3D()

/**
 * BuildingDetails — Architectural Tier System
 *
 * Adds instanced rooftop details based on building height/size:
 *   Tier 1 (Small, h < 15):  Bare box — "shed"
 *   Tier 2 (Mid, h 15–35):   Antenna spire — "tower"
 *   Tier 3 (Large, h 35–55): Taller spire + beacon — "skyscraper"
 *   Tier 4 (Mega, h ≥ 55):   Spire + beacon + satellite dish — "mega tower"
 *
 * Each detail tier is a separate instanced mesh for optimal GPU batching.
 */
export default function BuildingDetails() {
    const cityData = useStore(s => s.cityData)
    const buildings = useMemo(() => cityData?.buildings || [], [cityData])

    const tiers = useMemo(() => {
        const spires = []   // h >= 15
        const beacons = []  // h >= 35
        const dishes = []   // h >= 55

        buildings.forEach((b) => {
            const h = b.dimensions?.height || 5
            if (h >= 15) spires.push(b)
            if (h >= 35) beacons.push(b)
            if (h >= 55) dishes.push(b)
        })

        return { spires, beacons, dishes }
    }, [buildings])

    if (buildings.length === 0) return null

    return (
        <group>
            {tiers.spires.length > 0 && <AntennaSpires buildings={tiers.spires} />}
            {tiers.beacons.length > 0 && <BeaconLights buildings={tiers.beacons} />}
            {tiers.dishes.length > 0 && <SatelliteDishes buildings={tiers.dishes} />}
        </group>
    )
}

/* ═══════════════════════════════════════════════════════════════
   ANTENNA SPIRES — Tapered cyan rods atop towers & skyscrapers
   ═══════════════════════════════════════════════════════════════ */
function AntennaSpires({ buildings }) {
    const meshRef = useRef()
    const count = buildings.length

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        buildings.forEach((b, i) => {
            const { x, z } = b.position
            const h = b.dimensions?.height || 15
            const w = b.dimensions?.width || 8
            const d = b.dimensions?.depth || 8

            // Spire height scales with building: 20-35% of building height
            const spireH = Math.max(3, Math.min(h * 0.25, 15))
            const spireY = h + spireH / 2

            // Offset from center for visual realism
            const ox = w * 0.15
            const oz = d * 0.15

            tempObject.position.set(x + ox, spireY, z - oz)
            tempObject.scale.set(0.3, spireH, 0.3)
            tempObject.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObject.matrix)
        })

        meshRef.current.instanceMatrix.needsUpdate = true
    }, [buildings, count])

    if (count === 0) return null

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
            <cylinderGeometry args={[0.15, 0.5, 1, 4]} />
            <meshBasicMaterial
                color="#2299ff"
                transparent
                opacity={0.55}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    )
}

/* ═══════════════════════════════════════════════════════════════
   BEACON LIGHTS — Pulsing warning orbs on large skyscrapers
   ═══════════════════════════════════════════════════════════════ */
function BeaconLights({ buildings }) {
    const meshRef = useRef()
    const matRef = useRef()
    const count = buildings.length

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        buildings.forEach((b, i) => {
            const { x, z } = b.position
            const h = b.dimensions?.height || 35
            const w = b.dimensions?.width || 8
            const d = b.dimensions?.depth || 8

            const spireH = Math.max(3, Math.min(h * 0.25, 15))
            const beaconY = h + spireH + 0.5

            const ox = w * 0.15
            const oz = d * 0.15

            tempObject.position.set(x + ox, beaconY, z - oz)
            tempObject.scale.set(0.8, 0.8, 0.8)
            tempObject.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObject.matrix)
        })

        meshRef.current.instanceMatrix.needsUpdate = true
    }, [buildings, count])

    // Pulsing glow animation
    useFrame((state) => {
        if (matRef.current) {
            matRef.current.opacity = 0.35 + Math.sin(state.clock.elapsedTime * 3.0) * 0.3
        }
    })

    if (count === 0) return null

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
            <sphereGeometry args={[1, 8, 6]} />
            <meshBasicMaterial
                ref={matRef}
                color="#ff3333"
                transparent
                opacity={0.5}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    )
}

/* ═══════════════════════════════════════════════════════════════
   SATELLITE DISHES — Tilted discs on mega-towers
   ═══════════════════════════════════════════════════════════════ */
function SatelliteDishes({ buildings }) {
    const meshRef = useRef()
    const count = buildings.length

    useLayoutEffect(() => {
        if (!meshRef.current || count === 0) return

        buildings.forEach((b, i) => {
            const { x, z } = b.position
            const h = b.dimensions?.height || 55
            const w = b.dimensions?.width || 8
            const d = b.dimensions?.depth || 8

            // Dish sits on opposite corner from antenna
            const dishY = h + 1.5
            const ox = -w * 0.2
            const oz = d * 0.2

            tempObject.position.set(x + ox, dishY, z + oz)
            // Tilt 40° toward sky and scale to a flat disc
            tempObject.rotation.set(-0.7, 0.4, 0)
            tempObject.scale.set(2.5, 0.3, 2.5)
            tempObject.updateMatrix()
            meshRef.current.setMatrixAt(i, tempObject.matrix)
        })

        meshRef.current.instanceMatrix.needsUpdate = true
    }, [buildings, count])

    if (count === 0) return null

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]} frustumCulled={false}>
            <cylinderGeometry args={[0.5, 0.3, 1, 8]} />
            <meshBasicMaterial
                color="#6644cc"
                transparent
                opacity={0.45}
                blending={THREE.AdditiveBlending}
                depthWrite={false}
            />
        </instancedMesh>
    )
}
