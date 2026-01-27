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

function LoadingText({ onComplete }) {
    const [index, setIndex] = useState(0)

    React.useEffect(() => {
        if (index >= TEXT_SEQUENCE.length - 1) return

        const timeout = setTimeout(() => {
            setIndex(prev => prev + 1)
        }, 800) // Speed of text updates

        return () => clearTimeout(timeout)
    }, [index])

    return (
        <div style={{
            position: 'absolute',
            bottom: '15%',
            left: '50%',
            transform: 'translateX(-50%)',
            textAlign: 'center',
            width: '100%',
            maxWidth: '600px',
            fontFamily: '"Fira Code", monospace',
            zIndex: 10
        }}>
            <AnimatePresence mode="wait">
                <motion.div
                    key={index}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.3 }}
                    style={{
                        background: 'rgba(9, 9, 11, 0.8)',
                        backdropFilter: 'blur(12px)',
                        padding: '16px 32px',
                        borderRadius: '12px',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        boxShadow: '0 0 40px rgba(0, 242, 255, 0.2)',
                        display: 'inline-block'
                    }}
                >
                    <div style={{
                        color: '#00f2ff',
                        fontSize: '1rem',
                        fontWeight: 600,
                        letterSpacing: '0.1em',
                        marginBottom: '8px'
                    }}>
                        {TEXT_SEQUENCE[index]}
                    </div>

                    {/* Progress Bar */}
                    <div style={{
                        width: '100%',
                        height: '2px',
                        background: 'rgba(255, 255, 255, 0.1)',
                        position: 'relative',
                        overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: '0%' }}
                            animate={{ width: '100%' }}
                            transition={{ duration: 0.8, ease: "linear" }}
                            style={{
                                height: '100%',
                                background: '#00f2ff',
                                boxShadow: '0 0 10px #00f2ff'
                            }}
                        />
                    </div>
                </motion.div>
            </AnimatePresence>
        </div>
    )
}

export default function CityBuilderLoader() {
    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            zIndex: 9999, // Topmost
            background: '#050505'
        }}>
            <Canvas camera={{ position: [0, 5, 10], fov: 60 }}>
                <color attach="background" args={['#050505']} />
                <fog attach="fog" args={['#050505', 10, 40]} />
                <BuilderScene />
            </Canvas>

            <LoadingText />

            {/* Vignette Overlay */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'radial-gradient(circle, transparent 40%, #000000 100%)',
                pointerEvents: 'none'
            }} />
        </div>
    )
}
