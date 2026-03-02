import React, { useRef, useState, useEffect } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import { Icosahedron, Sphere, Stars } from '@react-three/drei'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { EffectComposer, Bloom } from '@react-three/postprocessing'
import useStore from '../../../store/useStore'

// --- CONSTANTS ---
const TEXT_SEQUENCE = [
    "INITIALIZING_WORKSPACE",
    "CONNECTING_TO_MAIN_FRAME",
    "PARSING_AST_NODES",
    "BUILDING_DEPENDENCY_GRAPH",
    "CALCULATING_METRICS",
    "RENDERING_VIRTUAL_CITY",
    "SYSTEM_READY"
]

// --- 3D DATA CORE COMPONENTS ---

function DataCore() {
    const groupRef = useRef()
    const outerRef = useRef()
    const innerRef = useRef()
    const ringsRef = useRef([])

    useFrame((state, delta) => {
        if (!groupRef.current) return
        const t = state.clock.elapsedTime

        // Complex multi-axis rotation
        groupRef.current.rotation.y += delta * 0.2
        groupRef.current.rotation.x = Math.sin(t * 0.5) * 0.2

        if (outerRef.current) {
            outerRef.current.rotation.y -= delta * 0.5
            outerRef.current.rotation.z += delta * 0.3
            // Throbbing scale
            const throb = 1 + Math.sin(t * 4) * 0.02
            outerRef.current.scale.setScalar(throb)
        }

        if (innerRef.current) {
            innerRef.current.rotation.y += delta * 1.5
            innerRef.current.rotation.x -= delta * 0.8
        }

        ringsRef.current.forEach((ring, i) => {
            if (ring) {
                ring.rotation.x += delta * (0.5 + i * 0.1)
                ring.rotation.y -= delta * (0.3 + i * 0.2)
            }
        })
    })

    return (
        <group ref={groupRef} position={[0, 0, 0]}>
            {/* Inner dense energy core */}
            <Icosahedron ref={innerRef} args={[1.5, 2]} >
                <meshStandardMaterial
                    color="#ffffff"
                    emissive="#ffffff"
                    emissiveIntensity={2}
                    wireframe={false}
                    transparent
                    opacity={0.8}
                />
            </Icosahedron>

            {/* Outer wireframe shell */}
            <Icosahedron ref={outerRef} args={[2.5, 1]} >
                <meshStandardMaterial
                    color="#3b82f6"
                    emissive="#3b82f6"
                    emissiveIntensity={1.5}
                    wireframe={true}
                    transparent
                    opacity={0.3}
                />
            </Icosahedron>

            {/* Orbital Rings representing scanning/parsing */}
            {[2.8, 3.2, 3.8].map((radius, i) => (
                <mesh key={i} ref={el => ringsRef.current[i] = el}>
                    <torusGeometry args={[radius, 0.02, 16, 100]} />
                    <meshBasicMaterial color={i === 1 ? "#a855f7" : "#3b82f6"} transparent opacity={0.4} />
                </mesh>
            ))}
        </group>
    )
}

function LoaderScene() {
    return (
        <>
            <ambientLight intensity={0.5} />
            <pointLight position={[10, 10, 10]} intensity={2} color="#ffffff" />
            <pointLight position={[-10, -10, -10]} intensity={1} color="#3b82f6" />

            <Stars radius={100} depth={50} count={2000} factor={4} saturation={0} fade speed={1} />

            <DataCore />

            <EffectComposer disableNormalPass>
                <Bloom luminanceThreshold={0.2} luminanceSmoothing={0.9} height={300} intensity={2.5} />
            </EffectComposer>
        </>
    )
}

// --- UI OVERLAY ---

export default function CityBuilderLoader() {
    const { analysisProgress } = useStore()
    const [simulatedProgress, setSimulatedProgress] = useState(0)

    // Simulate progress while backend is blocking
    useEffect(() => {
        if (analysisProgress >= 80) return

        const interval = setInterval(() => {
            setSimulatedProgress(p => {
                const increment = p > 65 ? 0.2 : p > 40 ? 0.8 : 2;
                return Math.min(p + increment, 78)
            })
        }, 300)
        return () => clearInterval(interval)
    }, [analysisProgress])

    const effectiveProgress = Math.max(analysisProgress || 0, simulatedProgress)

    const currentStage = Math.min(
        Math.floor(effectiveProgress / (100 / TEXT_SEQUENCE.length)),
        TEXT_SEQUENCE.length - 1
    )

    const text = TEXT_SEQUENCE[currentStage] || TEXT_SEQUENCE[0]

    return (
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8, ease: [0.16, 1, 0.3, 1] }}
            style={{
                position: 'fixed',
                inset: 0,
                zIndex: 99999,
                background: '#030305',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontFamily: 'var(--font-sans)',
                color: '#fff',
                overflow: 'hidden'
            }}
        >
            {/* 3D Background */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Canvas camera={{ position: [0, 0, 8], fov: 45 }}>
                    <color attach="background" args={['#030305']} />
                    <fog attach="fog" args={['#030305', 5, 15]} />
                    <LoaderScene />
                </Canvas>
            </div>

            {/* Typography Overlay */}
            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', width: '400px', zIndex: 1, marginTop: '25vh' }}>
                <div style={{ height: '32px', position: 'relative', width: '100%', display: 'flex', justifyContent: 'center', marginBottom: '24px' }}>
                    <AnimatePresence mode="wait">
                        <motion.div
                            key={text}
                            initial={{ opacity: 0, filter: 'blur(8px)', scale: 0.98 }}
                            animate={{ opacity: 1, filter: 'blur(0px)', scale: 1 }}
                            exit={{ opacity: 0, filter: 'blur(8px)', scale: 1.02 }}
                            transition={{ duration: 0.5, ease: [0.16, 1, 0.3, 1] }}
                            style={{
                                color: '#ffffff',
                                fontSize: '0.85rem',
                                fontFamily: 'var(--font-mono)',
                                letterSpacing: '0.25em',
                                position: 'absolute',
                                whiteSpace: 'nowrap',
                                textTransform: 'uppercase',
                                textShadow: '0 0 20px rgba(255,255,255,0.5)'
                            }}
                        >
                            {text}
                        </motion.div>
                    </AnimatePresence>
                </div>

                {/* Ultra-sleek Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '2px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    position: 'relative',
                    overflow: 'hidden',
                    marginBottom: '16px',
                    borderRadius: '2px'
                }}>
                    <motion.div
                        initial={{ width: '0%' }}
                        animate={{ width: `${effectiveProgress}%` }}
                        transition={{ ease: "easeOut", duration: 0.3 }}
                        style={{
                            position: 'absolute',
                            top: 0,
                            left: 0,
                            height: '100%',
                            background: '#ffffff',
                            boxShadow: '0 0 10px rgba(255,255,255,0.8), 0 0 20px rgba(59, 130, 246, 0.8)'
                        }}
                    />
                </div>

                <div style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontFamily: 'var(--font-mono)',
                    fontSize: '0.7rem',
                    letterSpacing: '0.3em'
                }}>
                    {String(Math.round(effectiveProgress)).padStart(2, '0')}%
                </div>
            </div>
        </motion.div>
    )
}
