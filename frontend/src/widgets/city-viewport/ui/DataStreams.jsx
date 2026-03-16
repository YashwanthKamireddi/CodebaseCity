import React, { useRef, useMemo, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

/**
 * DataStreams — Curved flowing light trails showing dependency flow between districts.
 * Dynamic cap scales with repo size. Reduced tube segments for perf.
 * Skipped on low-end. Shared shader material, throttled to 30fps.
 */
export default React.memo(function DataStreams() {
    const cityData = useStore(s => s.cityData)
    const groupRef = useRef()
    const lastT = useRef(0)

    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

    const streams = useMemo(() => {
        if (!cityData?.districts?.length || cityData.districts.length < 2) return []
        if (!cityData?.roads?.length) return []

        const n = cityData.buildings?.length || 0
        const maxStreams = n > 15000 ? 3 : n > 5000 ? 6 : n > 2000 ? 8 : 12

        const buildingMap = new Map()
        for (const b of cityData.buildings) buildingMap.set(b.id, b)

        const pairCounts = new Map()
        for (const r of cityData.roads) {
            const from = buildingMap.get(r.source)
            const to = buildingMap.get(r.target)
            if (!from || !to || from.district_id === to.district_id) continue
            const key = [from.district_id, to.district_id].sort().join('::')
            pairCounts.set(key, (pairCounts.get(key) || 0) + 1)
        }

        const sorted = [...pairCounts.entries()]
            .sort((a, b) => b[1] - a[1])
            .slice(0, maxStreams)

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
            attribute float tubeT;
            void main() {
                vT = tubeT;
                gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
            }
        `,
        fragmentShader: /* glsl */`
            uniform float uTime;
            varying float vT;
            void main() {
                float flow = fract(vT * 10.0 - uTime * 0.5);
                float dot = smoothstep(0.0, 0.12, flow) * smoothstep(0.28, 0.12, flow);
                float base = 0.04;
                float alpha = base + dot * 0.55;
                vec3 color = mix(vec3(0.05, 0.5, 1.0), vec3(0.0, 1.0, 0.7), vT);
                gl_FragColor = vec4(color * 2.5, alpha);
            }
        `,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        side: THREE.DoubleSide,
    }), [])

    useEffect(() => () => streamMaterial.dispose(), [streamMaterial])

    useFrame(({ clock }) => {
        const t = clock.getElapsedTime()
        if (t - lastT.current < 0.033) return
        lastT.current = t
        streamMaterial.uniforms.uTime.value = t
    })

    if (!streams.length || isLowEnd) return null

    // Reduced segments for large repos
    const n = cityData?.buildings?.length || 0
    const tubeSeg = n > 5000 ? 16 : 24
    const radSeg = n > 5000 ? 4 : 5

    return (
        <group ref={groupRef}>
            {streams.map((stream, i) => (
                <StreamTube key={i} stream={stream} material={streamMaterial} tubeSeg={tubeSeg} radSeg={radSeg} />
            ))}
        </group>
    )
})

function StreamTube({ stream, material, tubeSeg, radSeg }) {
    const geometry = useMemo(() => {
        const from = new THREE.Vector3(stream.from.x, 2, stream.from.z)
        const to = new THREE.Vector3(stream.to.x, 2, stream.to.z)
        const mid = new THREE.Vector3().lerpVectors(from, to, 0.5)
        const dist = from.distanceTo(to)
        mid.y = Math.min(dist * 0.3, 80)

        const curve = new THREE.QuadraticBezierCurve3(from, mid, to)
        const geo = new THREE.TubeGeometry(curve, tubeSeg, 0.6, radSeg, false)

        const count = geo.attributes.position.count
        const tArr = new Float32Array(count)
        for (let i = 0; i <= tubeSeg; i++) {
            const t = i / tubeSeg
            for (let j = 0; j <= radSeg; j++) {
                tArr[i * (radSeg + 1) + j] = t
            }
        }
        geo.setAttribute('tubeT', new THREE.BufferAttribute(tArr, 1))
        return geo
    }, [stream, tubeSeg, radSeg])

    useEffect(() => () => geometry.dispose(), [geometry])

    return <mesh geometry={geometry} material={material} />
}
