import React, { useRef, useMemo } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'

const STREAM_COUNT = 50
const CHAR_COUNT = 20 // Segments per stream

export default function DigitalRain() {
    const meshRef = useRef()

    // Create random stream positions (cylinder around city)
    const streams = useMemo(() => {
        return new Array(STREAM_COUNT).fill(0).map(() => ({
            x: (Math.random() - 0.5) * 500, // Wide spread
            y: Math.random() * 200,
            z: (Math.random() - 0.5) * 500,
            speed: 0.5 + Math.random(),
            offset: Math.random() * 100
        }))
    }, [])

    // Geometry: skinny vertical lines
    const geometry = useMemo(() => new THREE.BoxGeometry(0.5, 10, 0.5), [])
    const material = useMemo(() => new THREE.MeshBasicMaterial({
        color: '#0ea5e9', // Sky Blue 500
        transparent: true,
        opacity: 0.3,
        blending: THREE.AdditiveBlending
    }), [])

    // Instance Matrix Management
    useFrame((state) => {
        if (!meshRef.current) return

        const time = state.clock.elapsedTime
        const dummy = new THREE.Object3D()

        streams.forEach((stream, i) => {
            // Fall down
            let y = stream.y - ((time * stream.speed * 10 + stream.offset) % 300)
            if (y < -100) y += 300 // Loop

            dummy.position.set(stream.x, y, stream.z)
            dummy.scale.set(1, Math.random() * 2 + 0.5, 1) // Flicker length
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        })

        meshRef.current.instanceMatrix.needsUpdate = true
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[geometry, material, STREAM_COUNT]}
            position={[0, 0, 0]}
        />
    )
}
