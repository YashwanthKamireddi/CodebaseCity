import React, { useMemo, useEffect, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import useStore from '../../../store/useStore'
import * as THREE from 'three'
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js'

/**
 * HeroLandmarks — Futuristic spire towers above the top 5 most complex files.
 *
 * Design: Tapered dark metallic obelisk with a glowing accent ring and
 * apex crystal. Inspired by Avengers Tower / sci-fi antenna spires.
 *
 * Perf: Merges all bodies → 1 draw call, all accents → 1 DC, all crystals → 1 DC.
 * Total: 3 draw calls (down from 15). Uses vertex colors. 0 useFrame.
 */

const CITY_HEIGHT_SCALE = 3.0

const HERO_PALETTE = [
    { body: '#ffd700', accent: '#ffffff', crystal: '#ffaa00' }, // Gold/Sun
    { body: '#00e5ff', accent: '#ffffff', crystal: '#00aaff' }, // Cyan/Electric
    { body: '#ff2a6d', accent: '#ffffff', crystal: '#ff0055' }, // Neon Pink
    { body: '#b55bff', accent: '#ffffff', crystal: '#8800ff' }, // Deep Purple
    { body: '#00ff88', accent: '#ffffff', crystal: '#00cc66' }, // Matrix Green
]

const _color = new THREE.Color()

function addVertexColors(geo, hexColor) {
    _color.set(hexColor)
    const count = geo.attributes.position.count
    const colors = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
        colors[i * 3] = _color.r
        colors[i * 3 + 1] = _color.g
        colors[i * 3 + 2] = _color.b
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3))
    return geo
}

const HeroLandmarks = React.memo(function HeroLandmarks({ buildings }) {
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

    const { bodyGeo, accentGeo, crystalGeo } = useMemo(() => {
        if (heroes.length === 0) return { bodyGeo: null, accentGeo: null, crystalGeo: null }

        const bodies = []
        const accents = []
        const crystals = []

        for (let i = 0; i < heroes.length; i++) {
            const hero = heroes[i]
            const { x, z } = hero.position
            const palette = HERO_PALETTE[i % HERO_PALETTE.length]

            const buildingH = hero.rawH * CITY_HEIGHT_SCALE
            const spireH = Math.max(18, buildingH * 0.35)
            const spireW = Math.min(hero.rawW * 0.15, 5)
            const ringR = spireW * 2.2
            const baseY = buildingH + 1
            const centerY = baseY + spireH / 2

            // Body cylinder
            const bGeo = new THREE.CylinderGeometry(spireW * 0.06, spireW * 0.5, spireH, 6, 1)
            bGeo.translate(x, centerY, z)
            addVertexColors(bGeo, palette.body)
            bodies.push(bGeo)

            // Accent torus
            const aGeo = new THREE.TorusGeometry(ringR, ringR * 0.08, 8, 24)
            aGeo.rotateX(Math.PI / 2.3)
            aGeo.translate(x, centerY + spireH * 0.08, z)
            addVertexColors(aGeo, palette.accent)
            accents.push(aGeo)

            // Crystal octahedron
            const cGeo = new THREE.OctahedronGeometry(spireW * 0.3, 0)
            cGeo.translate(x, centerY + spireH * 0.5 + spireW * 0.2, z)
            addVertexColors(cGeo, palette.crystal)
            crystals.push(cGeo)
        }

        const bodyGeo = mergeGeometries(bodies, false)
        const accentGeo = mergeGeometries(accents, false)
        const crystalGeo = mergeGeometries(crystals, false)

        // Dispose temp geometries
        for (const g of [...bodies, ...accents, ...crystals]) g.dispose()

        return { bodyGeo, accentGeo, crystalGeo }
    }, [heroes])

    useEffect(() => {
        return () => {
            bodyGeo?.dispose()
            accentGeo?.dispose()
            crystalGeo?.dispose()
        }
    }, [bodyGeo, accentGeo, crystalGeo])

    const groupRef = useRef();
    const settledRef = useRef(false);
    useFrame(() => {
      if (!groupRef.current || settledRef.current) return;
      const t = useStore.getState().genesisTime !== undefined ? useStore.getState().genesisTime : 1.0;
      const s = Math.max(0.001, t > 0.8 ? (t - 0.8) * 5.0 : 0.0);
      groupRef.current.scale.set(s, s, s);
      // Stop touching scale once the pop-in is done — no reason to run every frame forever.
      if (t >= 1.0) settledRef.current = true;
    });
    if (!bodyGeo) return null;


    return (
        <group ref={groupRef}>
            <mesh geometry={bodyGeo} raycast={() => null}>
                <meshBasicMaterial vertexColors />
            </mesh>
            <mesh geometry={accentGeo} raycast={() => null}>
                <meshBasicMaterial vertexColors />
            </mesh>
            <mesh geometry={crystalGeo} raycast={() => null}>
                <meshBasicMaterial vertexColors />
            </mesh>
        </group>
    )
})

export default HeroLandmarks
