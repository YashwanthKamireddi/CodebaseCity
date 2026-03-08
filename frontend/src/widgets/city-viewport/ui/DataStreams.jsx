import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * DataStreams — Curved flowing light trails showing dependency flow between districts.
 * Like energy veins connecting different parts of the city.
 * Uses tube geometry with animated shader along spline paths.
 */
export default function DataStreams() {
    const cityData = useStore(s => s.cityData)
    const groupRef = useRef()

    const streams = useMemo(() => {
        if (!cityData?.districts?.length || cityData.districts.length < 2) return []
        if (!cityData?.roads?.length) return []

        const buildingMap = new Map()
        for (const b of cityData.buildings) buildingMap.set(b.id, b)

        // Find inter-district connections and group by district pairs
        const pairCounts = new Map()
        for (const r of cityData.roads) {
            const from = buildingMap.get(r.source)
            const to = buildingMap.get(r.target)
            if (!from || !to || from.district_id === to.district_id) continue
            const key = [from.district_id, to.district_id].sort().join('::')
            pairCounts.set(key, (pairCounts.get(key) || 0) + 1)
        }

        // Pick the strongest inter-district connections
        const sorted = [...pairCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, 12)

        // Compute district centers
        const districtCenters = new Map()
        for (const d of cityData.districts) {
            if (d.boundary?.length) {
                let cx = 0, cz = 0
                for (const pt of d.boundary) { cx += pt.x; cz += pt.y }
                cx /= d.boundary.length; cz /= d.boundary.length
                districtCenters.set(d.id, { x: cx, z: cz })
            }
        }

        return sorted.map(([key, count]) => {
            const [d1, d2] = key.split('::')
            const c1 = districtCenters.get(d1)
            const c2 = districtCenters.get(d2)
            if (!c1 || !c2) return null
            return { from: c1, to: c2, strength: count }
        }).filter(Boolean)
    }, [cityData])

    const streamMaterial = useMemo(() => new THREE.ShaderMaterial({
        uniforms: { uTime: { value: 0 } },
        vertexShader: /* glsl */`
            varying float vT;
            varying vec3 vWorldPos;
            attribute float tubeT;
            void main() {
                vT = tubeT;
                vWorldPos = (modelMatrix * vec4(position, 1.0)).xyz;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            varying float vT;
            void main() {
                // Flowing energy dots
                float flow = fract(vT * 8.0 - uTime * 0.6);
                float dot = smoothstep(0.0, 0.15, flow) * smoothstep(0.3, 0.15, flow);
                float base = 0.05;
                float alpha = base + dot * 0.5;
                vec3 color = mix(vec3(0.0, 0.5, 1.0), vec3(0.0, 1.0, 0.8), vT);
                gl_FragColor = vec4(color * 2.5, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    }), [])

    useFrame(({ clock }) => {
        streamMaterial.uniforms.uTime.value = clock.getElapsedTime()
    })

    if (!streams.length) return null

    return (
        <group ref={groupRef}>
            {streams.map((stream, i) => (
                <StreamTube key={i} stream={stream} material={streamMaterial} />
            ))}
        </group>
    )
}

function StreamTube({ stream, material }) {
    const tubeRef = useRef()

    const { geometry } = useMemo(() => {
        const from = new THREE.Vector3(stream.from.x, 2, stream.from.z)
        const to = new THREE.Vector3(stream.to.x, 2, stream.to.z)
        const mid = new THREE.Vector3().lerpVectors(from, to, 0.5)

        // Arc height proportional to distance
        const dist = from.distanceTo(to)
        mid.y = Math.min(dist * 0.3, 80)

        const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
        const geo = new THREE.TubeGeometry(curve, 32, 0.5, 6, false)

        // Add tubeT attribute (0→1 along length) for flowing animation
        const count = geo.attributes.position.count
        const tArr = new Float32Array(count)
        // TubeGeometry has (tubularSegments+1) * (radialSegments+1) vertices
        // Each ring of radialSegments+1 vertices shares the same t
        const tubularSegments = 32
        const radialSegments = 6
        for (let i = 0; i <= tubularSegments; i++) {
            const t = i / tubularSegments
            for (let j = 0; j <= radialSegments; j++) {
                tArr[i * (radialSegments + 1) + j] = t
            }
        }
        geo.setAttribute('tubeT', new THREE.BufferAttribute(tArr, 1))

        return { geometry: geo }
    }, [stream])

    return (
        <mesh ref={tubeRef} geometry={geometry} material={material} />
    )
}
