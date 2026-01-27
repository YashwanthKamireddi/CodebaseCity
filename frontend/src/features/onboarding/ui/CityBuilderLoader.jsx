import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Instance, Instances, Environment, Text } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

// --- CONSTANTS ---
const BLOCK_COUNT = 60
const GRID_SIZE = 40
const TEXT_SEQUENCE = [
    "INITIALIZING_KERNEL...",
    "CONNECTING_TO_MAIN_FRAME...",
    "PARSING_AST_NODES...",
    "BUILDING_DEPENDENCY_GRAPH...",
    "CALCULATING_METRICS...",
    "RENDERING_VIRTUAL_CITY...",
    "SYSTEM_READY."
]

// --- 3D COMPONENTS ---

function MovingGrid() {
    const gridRef = useRef()

    useFrame((state) => {
        if (gridRef.current) {
            // Move grid towards camera to simulate forward motion
            gridRef.current.position.z = (state.clock.elapsedTime * 10) % 10
        }
    })

    return (
        <group ref={gridRef}>
            <gridHelper
                args={[100, 50, '#27272a', '#18181b']}
                position={[0, -2, 0]}
            />
            {/* Second grid for infinite illusion */}
            <gridHelper
                args={[100, 50, '#27272a', '#18181b']}
                position={[0, -2, -100]}
            />
        </group>
    )
}

function FloatingBlock({ position, delay }) {
    const ref = useRef()
    const [speed] = useState(() => Math.random() * 0.5 + 0.2)
    const [offset] = useState(() => Math.random() * 100)

    useFrame((state) => {
        const time = state.clock.elapsedTime
        if (time < delay) return

        // Bobbing motion
        ref.current.position.y = Math.sin(time * speed + offset) * 2 + 1

        // Rotation
        ref.current.rotation.x = time * 0.2
        ref.current.rotation.y = time * 0.1
    })

    return (
        <Instance position={position} ref={ref} />
    )
}

function BuilderScene() {
    const blocks = useMemo(() => {
        const temp = []
        for (let i = 0; i < BLOCK_COUNT; i++) {
            const x = (Math.random() - 0.5) * GRID_SIZE
            const z = (Math.random() - 0.5) * GRID_SIZE - 20 // Placing vaguely in front
            temp.push({ position: [x, 0, z], delay: Math.random() * 2 })
        }
        return temp
    }, [])

    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={1} color="#6366f1" />

            <MovingGrid />

            {/* Instanced Blocks for Performance */}
            <Instances range={BLOCK_COUNT}>
                <boxGeometry args={[1, 4, 1]} /> {/* Tall blocks */}
                <meshStandardMaterial
                    color="#00f2ff"
                    emissive="#00f2ff"
                    emissiveIntensity={0.8}
                    transparent
                    opacity={0.6}
                    wireframe
                />

                {blocks.map((data, i) => (
                    <FloatingBlock key={i} {...data} />
                ))}
            </Instances>

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0} luminanceSmoothing={0.9} height={300} intensity={1.5} />
            </EffectComposer>
        </>
    )
}

// --- UI OVERLAY ---

function LoadingText() {
    const [text, setText] = useState(TEXT_SEQUENCE[0])

    React.useEffect(() => {
        let i = 0
        const interval = setInterval(() => {
            i = (i + 1) % TEXT_SEQUENCE.length
            setText(TEXT_SEQUENCE[i])
        }, 1200)
        return () => clearInterval(interval)
    }, [])

    return (
        <div style={{
            position: 'absolute',
            bottom: '20%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            zIndex: 100000, // Force top
            pointerEvents: 'none'
        }}>
            <div style={{
                color: '#fff',
                fontSize: '2rem',
                fontWeight: 800,
                fontFamily: '"Fira Code", monospace',
                textShadow: '0 0 20px rgba(0, 242, 255, 0.8)',
                marginBottom: '16px',
                letterSpacing: '0.1em'
            }}>
                INITIALIZING...
            </div>
            <div style={{
                color: '#00f2ff',
                fontSize: '1rem',
                fontFamily: '"Fira Code", monospace',
                letterSpacing: '0.05em',
                background: 'rgba(0,0,0,0.6)',
                padding: '8px 16px',
                borderRadius: '8px'
            }}>
                {'>'} {text}
            </div>
        </div>
    )
}

export default function CityBuilderLoader() {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999,
            background: '#050505'
        }}>
            <Canvas camera={{ position: [0, 8, 15], fov: 60 }}>
                <color attach="background" args={['#050505']} />
                <fog attach="fog" args={['#050505', 10, 50]} />
                <ambientLight intensity={2} /> {/* Brighter */}
                <pointLight position={[10, 10, 10]} intensity={3} color="#6366f1" />
                <BuilderScene />
            </Canvas>

            <LoadingText />
        </div>
    )
}
