import React, { useRef, useMemo, useLayoutEffect, useEffect } from 'react'
import * as THREE from 'three'
import useStore from '../../../store/useStore'
import { detectDeviceTier } from '../../../shared/perf/deviceTier'
import { getBuildingColor } from '../../../utils/colorUtils'
import { HEIGHT_SCALE } from './cityScale'
import {
    TYPE_TOWER, TYPE_CIVIC, TYPE_MALL, TYPE_WORKSHOP, TYPE_TOWNHOUSE,
} from './buildingTypes'
import { BLOOM_LAYER } from '../post/Post'

/**
 * BuildingAccents — per-type silhouette accents.
 *
 * The base InstancedCity renders every building as a box. The
 * `aBuildingType` attribute drives the shader's window/edge variation.
 * But silhouette variation — the visible difference between a tower
 * and a townhouse from a distance — needs real geometry, not just a
 * shader trick.
 *
 * This component layers FIVE thin instanced meshes on top of the city,
 * each picking up only buildings of one type and adding a small
 * geometric flourish:
 *
 *   tower     →  thin emissive spire (catches bloom)
 *   civic     →  domed cap          (catches bloom)
 *   workshop  →  chimney box        (industrial silhouette)
 *   mall      →  awning strip       (storefront cue)
 *   townhouse →  hipped gabled cap  (residential cue)
 *
 * Office buildings get no accent — they're the default rectangular
 * silhouette and the city's bulk.
 *
 * All accent meshes share the same per-instance color as the building
 * (read via getBuildingColor) so coloring/dimming/selection still
 * holds together visually. Tier-gated: low tier renders nothing here.
 */

const _o = new THREE.Object3D()
const _c = new THREE.Color()

function buildAccentLayer(buildings, typeId, kindFn) {
    if (!buildings) return null
    const filtered = []
    for (let i = 0; i < buildings.length; i++) {
        if (buildings[i]?.building_type_id === typeId) filtered.push(buildings[i])
    }
    if (filtered.length === 0) return null
    return { items: filtered, kind: kindFn }
}

// Compute scale + position for an accent of a given kind, sitting on
// top of the building (whose visible top is at y = scaled height).
function accentTransform(kind, b) {
    const w = (b.dimensions?.width || 8)
    const d = (b.dimensions?.depth || 8)
    const h = (b.dimensions?.height || 8) * HEIGHT_SCALE
    let sx, sy, sz, cy
    switch (kind) {
        case 'spire':
            sy = Math.max(8, Math.min(28, h * 0.30))
            sx = sz = Math.min(w, d) * 0.18
            cy = h + sy / 2
            break
        case 'dome':
            sy = Math.min(8, Math.min(w, d) * 0.45)
            sx = sz = Math.min(w, d) * 0.85
            cy = h + sy / 2
            break
        case 'chimney':
            sy = Math.max(3, h * 0.18)
            sx = sz = Math.min(w, d) * 0.22
            cy = h + sy / 2
            break
        case 'awning':
            // Thin slab around the perimeter; sits just below the visible
            // top of the mall to read as a "store awning shelf"
            sy = 0.6
            sx = w * 1.08
            sz = d * 1.08
            cy = h * 0.22 // low band, not roof
            break
        case 'gabled':
        default:
            sy = Math.max(2, Math.min(w, d) * 0.5)
            sx = w * 0.95
            sz = d * 0.95
            cy = h + sy / 2
            break
    }
    return { sx, sy, sz, cy }
}

function AccentLayer({ items, kind, geomNode, materialNode, bloomEligible, colorMode }) {
    const meshRef = useRef()

    useLayoutEffect(() => {
        const mesh = meshRef.current
        if (!mesh || !items.length) return
        for (let i = 0; i < items.length; i++) {
            const b = items[i]
            const { sx, sy, sz, cy } = accentTransform(kind, b)
            _o.position.set(b.position.x, cy, b.position.z)
            _o.scale.set(sx, sy, sz)
            _o.rotation.set(0, 0, 0)
            _o.updateMatrix()
            mesh.setMatrixAt(i, _o.matrix)
            _c.set(getBuildingColor(b, colorMode, {}))
            mesh.setColorAt(i, _c)
        }
        mesh.instanceMatrix.needsUpdate = true
        if (mesh.instanceColor) mesh.instanceColor.needsUpdate = true
    }, [items, kind, colorMode])

    // Bloom-eligible accents (towers, civic domes) opt onto the bloom layer
    // so SelectiveBloom catches their emissive output. The mesh stays on
    // layer 0 too so it renders normally; layer 10 is a render-twice tag.
    useEffect(() => {
        if (bloomEligible && meshRef.current) {
            meshRef.current.layers.enable(BLOOM_LAYER)
        }
    }, [bloomEligible, items])

    return (
        <instancedMesh
            key={`${kind}-${items.length}`}
            ref={meshRef}
            args={[null, null, items.length]}
            frustumCulled={false}
        >
            {geomNode}
            {materialNode}
        </instancedMesh>
    )
}

export default function BuildingAccents() {
    const buildings = useStore(s => s.cityData?.buildings)
    const colorMode = useStore(s => s.colorMode)
    const tier = useMemo(() => detectDeviceTier(), [])

    const groups = useMemo(() => {
        if (!buildings?.length) return null
        return {
            // Tower spires removed per user feedback — those white
            // antennae read as "poles in the sky" on every screenshot.
            // Civic domes also removed to keep the silhouette clean.
            // tower:     buildAccentLayer(buildings, TYPE_TOWER,     'spire'),
            // civic:     buildAccentLayer(buildings, TYPE_CIVIC,     'dome'),
            workshop:  buildAccentLayer(buildings, TYPE_WORKSHOP,  'chimney'),
            mall:      buildAccentLayer(buildings, TYPE_MALL,      'awning'),
            townhouse: buildAccentLayer(buildings, TYPE_TOWNHOUSE, 'gabled'),
        }
    }, [buildings])

    if (!groups || tier.tier === 'low') return null
    const midOnly = tier.tier === 'mid'

    return (
        <>
            {false && groups.tower && (
                <AccentLayer
                    items={groups.tower.items}
                    kind="spire"
                    geomNode={<cylinderGeometry args={[0.18, 0.5, 1, 8]} />}
                    materialNode={
                        <meshStandardMaterial
                            metalness={0.7}
                            roughness={0.28}
                            vertexColors
                            emissive="#ffffff"
                            emissiveIntensity={1.4}
                            toneMapped={false}
                        />
                    }
                    colorMode={colorMode}
                    bloomEligible
                />
            )}
            {groups.civic && (
                <AccentLayer
                    items={groups.civic.items}
                    kind="dome"
                    geomNode={<sphereGeometry args={[0.5, 16, 8, 0, Math.PI * 2, 0, Math.PI / 2]} />}
                    materialNode={
                        <meshStandardMaterial
                            metalness={0.45}
                            roughness={0.4}
                            vertexColors
                            emissive="#ffe6b3"
                            emissiveIntensity={0.6}
                            toneMapped={false}
                        />
                    }
                    colorMode={colorMode}
                    bloomEligible
                />
            )}
            {!midOnly && groups.workshop && (
                <AccentLayer
                    items={groups.workshop.items}
                    kind="chimney"
                    geomNode={<boxGeometry args={[1, 1, 1]} />}
                    materialNode={
                        <meshStandardMaterial
                            metalness={0.55}
                            roughness={0.55}
                            vertexColors
                        />
                    }
                    colorMode={colorMode}
                />
            )}
            {!midOnly && groups.mall && (
                <AccentLayer
                    items={groups.mall.items}
                    kind="awning"
                    geomNode={<boxGeometry args={[1, 1, 1]} />}
                    materialNode={
                        <meshStandardMaterial
                            metalness={0.2}
                            roughness={0.7}
                            vertexColors
                        />
                    }
                    colorMode={colorMode}
                />
            )}
            {!midOnly && groups.townhouse && (
                <AccentLayer
                    items={groups.townhouse.items}
                    kind="gabled"
                    geomNode={<coneGeometry args={[0.5, 1, 4, 1, false, Math.PI / 4]} />}
                    materialNode={
                        <meshStandardMaterial
                            metalness={0.15}
                            roughness={0.7}
                            vertexColors
                        />
                    }
                    colorMode={colorMode}
                />
            )}
        </>
    )
}
