import React, { useMemo, useRef, useState } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import * as THREE from 'three'
import Building, { InstancedBuildings } from './Building'
import District from './District'
import Roads from './Roads'
import useStore from '../store/useStore'

// Threshold for switching to instanced rendering
const INSTANCED_THRESHOLD = 200

export default function CityScene({ data }) {
    const groupRef = useRef()
    const { camera } = useThree()
    const [lodLevel, setLodLevel] = useState('high')

    // Dynamic LOD based on camera distance
    useFrame(() => {
        if (camera && data?.buildings?.length > 100) {
            const distance = camera.position.length()
            if (distance > 250) {
                setLodLevel('low')
            } else if (distance > 150) {
                setLodLevel('medium')
            } else {
                setLodLevel('high')
            }
        }
    })

    if (!data) {
        return <EmptyScene />
    }

    const useInstanced = data.buildings?.length > INSTANCED_THRESHOLD

    return (
        <group ref={groupRef}>
            {/* Bright ambient light */}
            <ambientLight intensity={0.8} color="#ffffff" />

            {/* Main Sun */}
            <directionalLight
                position={[60, 100, 40]}
                intensity={1.5}
                color="#fff5e6"
                castShadow={lodLevel === 'high'}
                shadow-mapSize-width={lodLevel === 'high' ? 2048 : 1024}
                shadow-mapSize-height={lodLevel === 'high' ? 2048 : 1024}
                shadow-camera-far={300}
                shadow-camera-left={-120}
                shadow-camera-right={120}
                shadow-camera-top={120}
                shadow-camera-bottom={-120}
                shadow-bias={-0.0001}
            />

            {/* Fill Light */}
            <directionalLight position={[-40, 50, -40]} intensity={0.6} color="#87ceeb" />

            {/* Sky/Ground ambient */}
            <hemisphereLight args={['#87ceeb', '#3d5c3d', 0.6]} />

            {/* Ground */}
            <Ground size={data.buildings?.length > 500 ? 800 : 500} />

            {/* Districts - skip for very large datasets */}
            {lodLevel !== 'low' && data.districts?.map(district => (
                <District key={district.id} data={district} />
            ))}

            {/* Buildings - use instanced for large datasets */}
            {useInstanced ? (
                <InstancedBuildings buildings={data.buildings} />
            ) : (
                data.buildings?.map(building => (
                    <Building key={building.id} data={building} />
                ))
            )}

            {/* Roads - only show in high LOD */}
            {lodLevel === 'high' && (
                <Roads roads={data.roads} buildings={data.buildings} />
            )}

            {/* Fog for depth */}
            <fog attach="fog" args={['#e8f4f8', 150, 500]} />
        </group>
    )
}

function Ground({ size = 500 }) {
    const gridTexture = useMemo(() => {
        const canvas = document.createElement('canvas')
        canvas.width = 512
        canvas.height = 512
        const ctx = canvas.getContext('2d')

        // Grass base
        const gradient = ctx.createRadialGradient(256, 256, 0, 256, 256, 360)
        gradient.addColorStop(0, '#4a7c4e')
        gradient.addColorStop(1, '#3a5c3e')
        ctx.fillStyle = gradient
        ctx.fillRect(0, 0, 512, 512)

        // Grass texture
        ctx.fillStyle = '#5a8c5e'
        for (let i = 0; i < 200; i++) {
            ctx.beginPath()
            ctx.arc(Math.random() * 512, Math.random() * 512, 2 + Math.random() * 3, 0, Math.PI * 2)
            ctx.fill()
        }

        // Grid
        ctx.strokeStyle = '#6b7b6c'
        ctx.lineWidth = 2
        for (let i = 0; i <= 512; i += 64) {
            ctx.beginPath()
            ctx.moveTo(i, 0)
            ctx.lineTo(i, 512)
            ctx.stroke()
            ctx.beginPath()
            ctx.moveTo(0, i)
            ctx.lineTo(512, i)
            ctx.stroke()
        }

        const texture = new THREE.CanvasTexture(canvas)
        texture.wrapS = THREE.RepeatWrapping
        texture.wrapT = THREE.RepeatWrapping
        texture.repeat.set(size / 50, size / 50)
        return texture
    }, [size])

    return (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.1, 0]} receiveShadow>
            <planeGeometry args={[size, size]} />
            <meshStandardMaterial map={gridTexture} roughness={0.9} metalness={0} />
        </mesh>
    )
}

function EmptyScene() {
    return (
        <group>
            <ambientLight intensity={0.6} />
            <directionalLight position={[50, 100, 50]} intensity={1.2} color="#ffffff" />
            <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0, 0]}>
                <planeGeometry args={[200, 200]} />
                <meshStandardMaterial color="#4a7c4e" />
            </mesh>
            <fog attach="fog" args={['#e8f4f8', 50, 200]} />
        </group>
    )
}
