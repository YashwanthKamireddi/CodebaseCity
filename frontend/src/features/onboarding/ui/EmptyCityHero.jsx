import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { ArrowRight, Compass } from 'lucide-react'
import useStore from '../../../store/useStore'

// --- World-Class 3D Background ---
function SilentCity() {
    const meshRef = useRef()
    const count = 1000
    const dummy = useMemo(() => new THREE.Object3D(), [])

    const buildings = useMemo(() => {
        const temp = []
        for (let i = 0; i < count; i++) {
            const r = Math.random() * 80
            const theta = Math.random() * Math.PI * 2
            const x = r * Math.cos(theta)
            const z = r * Math.sin(theta)
            // Power curve distribution: mostly low buildings, few massive towers
            const height = Math.pow(Math.random(), 4) * 30 + 1
            const width = Math.random() * 1.5 + 0.5
            const depth = Math.random() * 1.5 + 0.5
            temp.push({ x, z, height, width, depth })
        }
        return temp
    }, [])

    useFrame((state) => {
        if (!meshRef.current) return

        buildings.forEach((b, i) => {
            dummy.position.set(b.x, b.height / 2, b.z)
            dummy.scale.set(b.width, b.height, b.depth)
            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        })
        meshRef.current.instanceMatrix.needsUpdate = true

        // Extremely subtle, high-end camera parallax
        const targetX = state.pointer.x * 10
        const targetY = 20 + state.pointer.y * 5
        const targetZ = 60

        state.camera.position.x += (targetX - state.camera.position.x) * 0.02
        state.camera.position.y += (targetY - state.camera.position.y) * 0.02
        state.camera.position.z += (targetZ - state.camera.position.z) * 0.02
        state.camera.lookAt(0, 5, 0)
    })

    return (
        <instancedMesh ref={meshRef} args={[null, null, count]}>
            <boxGeometry args={[1, 1, 1]} />
            <meshStandardMaterial
                color="#0a0a0c"
                roughness={0.2}
                metalness={0.8}
                envMapIntensity={1}
            />
        </instancedMesh>
    )
}

export default function EmptyCityHero() {
    const { analyzeRepo, error } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (path.trim()) {
            analyzeRepo(path.trim())
        }
    }

    return (
        <div style={{
            position: 'absolute',
            inset: 0,
            background: '#020202',
            overflow: 'hidden',
            fontFamily: 'var(--font-sans)',
            color: '#fff'
        }}>
            {/* 3D Interactive Canvas */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Canvas dpr={[1, 2]} camera={{ position: [0, 20, 60], fov: 35 }}>
                    <fog attach="fog" args={['#020202', 40, 100]} />
                    <ambientLight intensity={0.5} color="#ffffff" />
                    <directionalLight position={[10, 20, 5]} intensity={1.5} color="#ffffff" />
                    <directionalLight position={[-10, 10, -10]} intensity={0.5} color="#444444" />
                    <SilentCity />
                </Canvas>
            </div>

            {/* Gradient Overlay for Text Readability */}
            <div style={{
                position: 'absolute',
                inset: 0,
                background: 'linear-gradient(to top, #020202 0%, transparent 60%)',
                zIndex: 1,
                pointerEvents: 'none'
            }} />

            {/* UI Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 40px',
                pointerEvents: 'none' // Let clicks pass to canvas where possible
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 1.2, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '40px',
                        width: '100%',
                        maxWidth: '800px',
                        pointerEvents: 'auto'
                    }}
                >
                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '16px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '8px',
                            margin: '0 auto',
                            padding: '6px 16px',
                            background: 'rgba(255,255,255,0.03)',
                            border: '1px solid rgba(255,255,255,0.08)',
                            borderRadius: '100px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <Compass size={14} color="#888" />
                            <span style={{ fontSize: '0.75rem', letterSpacing: '0.1em', textTransform: 'uppercase', color: '#aaa', fontWeight: 500 }}>
                                Architecture Intelligence
                            </span>
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(2.5rem, 5vw, 4.5rem)',
                            fontWeight: 400,
                            letterSpacing: '-0.03em',
                            lineHeight: 1.05,
                            margin: 0,
                            color: '#ffffff',
                            fontFamily: 'var(--font-display)' // Use standard precise font
                        }}>
                            Map Your Codebase.
                        </h1>
                        <p style={{
                            fontSize: '1.1rem',
                            color: '#888888',
                            maxWidth: '540px',
                            margin: '0 auto',
                            lineHeight: 1.6,
                            letterSpacing: '-0.01em'
                        }}>
                            Enter a local repository path to instantly synthesize a navigable, structured 3D metropolis of your architecture.
                        </p>
                    </div>

                    {/* Premium Input Form */}
                    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '540px', position: 'relative' }}>
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: isFocused ? 'rgba(20, 20, 22, 0.9)' : 'rgba(15, 15, 18, 0.7)',
                            border: `1px solid ${isFocused ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
                            borderRadius: '16px',
                            padding: '6px 6px 6px 20px',
                            backdropFilter: 'blur(20px)',
                            transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isFocused ? '0 24px 48px rgba(0,0,0,0.4)' : '0 12px 24px rgba(0,0,0,0.2)'
                        }}>
                            <span style={{ color: '#666', fontFamily: 'var(--font-mono)', fontSize: '0.9rem', marginRight: '8px' }}>~</span>
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="/path/to/project"
                                spellCheck="false"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#fff',
                                    fontSize: '1rem',
                                    fontFamily: 'var(--font-mono)', // Mono for paths feels professional
                                    letterSpacing: '-0.01em'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!path.trim()}
                                style={{
                                    background: path.trim() ? '#ffffff' : 'rgba(255,255,255,0.05)',
                                    color: path.trim() ? '#000000' : 'rgba(255,255,255,0.3)',
                                    border: 'none',
                                    borderRadius: '10px',
                                    padding: '0 20px',
                                    height: '40px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    fontSize: '0.9rem',
                                    fontWeight: 500,
                                    cursor: path.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s ease'
                                }}
                            >
                                Analyze <ArrowRight size={16} />
                            </button>
                        </div>
                        {error && (
                            <div style={{
                                position: 'absolute', top: '100%', left: 0, width: '100%',
                                marginTop: '16px', textAlign: 'center',
                                color: '#ef4444', fontSize: '0.85rem', fontWeight: 500
                            }}>
                                {error}
                            </div>
                        )}
                    </form>
                </motion.div>
            </div>
        </div>
    )
}
