import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { motion } from 'framer-motion'
import { ArrowRight, FolderSearch, Zap } from 'lucide-react'
import useStore from '../../../store/useStore'

// --- Highly Realistic Miniature Code City Background ---
// No random glass shards or abstract spheres. This is exactly what the product makes.
function IsometricCityGenerator() {
    const group = useRef()

    // Deterministic procedural generation for a "Codebase" looking city
    const buildings = useMemo(() => {
        const temp = []
        const gridSize = 16
        const spacing = 1.1

        for (let x = 0; x < gridSize; x++) {
            for (let z = 0; z < gridSize; z++) {
                // Create logical districts/blocks instead of random noise
                const nx = x - gridSize / 2
                const nz = z - gridSize / 2
                const dist = Math.sqrt(nx * nx + nz * nz)

                // Clear out wide main avenues down the middle and in a cross shape
                if (Math.abs(x - 8) <= 1 || Math.abs(z - 8) <= 1) continue;
                // Add natural sparsity to the edges
                if (Math.random() > 0.9 - (dist * 0.05)) continue;

                // Taller in the center to look like a main API/Core module
                const baseHeight = Math.max(0.5, 10 - dist)
                const height = Math.random() * baseHeight * 1.5 + 0.5

                // Assign a semantic "type" (color accent)
                let type = 'normal'
                if (height > 8) type = 'core'
                else if (Math.random() > 0.85) type = 'service'

                temp.push({ x: nx * spacing, z: nz * spacing, height, type })
            }
        }
        return temp
    }, [])

    useFrame((state) => {
        if (group.current) {
            // Very slow, majestic rotation
            group.current.rotation.y = state.clock.elapsedTime * 0.05
        }
    })

    return (
        <group ref={group} position={[0, -2, 0]}>
            {buildings.map((b, i) => {
                let color = "#111115"
                let edgeColor = "#222230"
                if (b.type === 'core') {
                    color = "#1a1a24"
                    edgeColor = "#3b82f6" // Polished blue
                } else if (b.type === 'service') {
                    color = "#151520"
                    edgeColor = "#8b5cf6" // Polished purple
                }

                return (
                    <mesh key={i} position={[b.x, b.height / 2, b.z]}>
                        <boxGeometry args={[0.9, b.height, 0.9]} />
                        <meshStandardMaterial
                            color={color}
                            metalness={0.5}
                            roughness={0.2}
                        />
                        <lineSegments>
                            <edgesGeometry attach="geometry" args={[new THREE.BoxGeometry(0.9, b.height, 0.9)]} />
                            <lineBasicMaterial attach="material" color={edgeColor} linewidth={1} />
                        </lineSegments>
                    </mesh>
                )
            })}

            {/* Base platform */}
            <mesh position={[0, -0.05, 0]} rotation={[-Math.PI / 2, 0, 0]}>
                <planeGeometry args={[50, 50]} />
                <meshBasicMaterial color="#050505" transparent opacity={0.9} />
            </mesh>
            <gridHelper args={[60, 60, '#111118', '#0a0a0f']} position={[0, 0, 0]} />
        </group>
    )
}

function Hero3DBackground() {
    return (
        <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none' }}>
            <Canvas camera={{ position: [20, 20, 20], fov: 25 }}>
                <ambientLight intensity={1} color="#ffffff" />
                <directionalLight position={[10, 20, 5]} intensity={2.5} color="#ffffff" />
                <directionalLight position={[-10, 10, -10]} intensity={1} color="#e2e8f0" />
                <IsometricCityGenerator />
            </Canvas>

            {/* Smooth Vignettes to blend the 3D perfectly into the 2D UI */}
            <div style={{ position: 'absolute', inset: 0, background: 'radial-gradient(circle at center, transparent 0%, #050508 80%)' }} />
            <div style={{ position: 'absolute', inset: 0, background: 'linear-gradient(to top, #050508 0%, transparent 40%)' }} />
        </div>
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
            position: 'absolute', inset: 0, background: '#050508', overflow: 'hidden',
            fontFamily: 'var(--font-sans)', color: '#fff', display: 'flex', flexDirection: 'column'
        }}>
            <Hero3DBackground />

            {/* Top Navigation - Clean, Enterprise-ready */}
            <header style={{
                position: 'relative', zIndex: 10, display: 'flex', justifyContent: 'space-between',
                alignItems: 'center', padding: '24px 40px', borderBottom: '1px solid rgba(255,255,255,0.05)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '32px', height: '32px', borderRadius: '8px', background: 'linear-gradient(135deg, #ffffff 0%, #a3a3a3 100%)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <div style={{ width: 14, height: 14, border: '2px solid #000', borderRadius: 2 }} />
                    </div>
                    <span style={{ fontSize: '1rem', fontWeight: 600, letterSpacing: '-0.02em' }}>Codebase City</span>
                    <span style={{ padding: '2px 6px', background: 'rgba(255,255,255,0.1)', borderRadius: '4px', fontSize: '0.65rem', fontFamily: 'var(--font-mono)' }}>v2.0</span>
                </div>
            </header>

            {/* Main Content */}
            <main style={{
                flex: 1, position: 'relative', zIndex: 10, display: 'flex', flexDirection: 'column',
                justifyContent: 'center', alignItems: 'center', padding: '0 24px', textAlign: 'center'
            }}>
                <motion.div
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '24px', maxWidth: '800px' }}
                >
                    <div style={{
                        padding: '6px 16px', background: 'rgba(59, 130, 246, 0.1)', border: '1px solid rgba(59, 130, 246, 0.2)',
                        borderRadius: '100px', color: '#60a5fa', fontSize: '0.8rem', fontWeight: 500, display: 'flex', alignItems: 'center', gap: '8px'
                    }}>
                        <Zap size={14} /> The dimensional rendering engine is now active.
                    </div>

                    <h1 style={{
                        fontSize: 'clamp(3rem, 6vw, 4.5rem)', fontWeight: 600, letterSpacing: '-0.03em',
                        lineHeight: 1.1, margin: 0, fontFamily: 'var(--font-sans)', color: '#ffffff'
                    }}>
                        Visualizing Software<br />Architecture.
                    </h1>

                    <p style={{
                        fontSize: '1.25rem', color: '#a1a1aa', maxWidth: '600px', margin: '0',
                        lineHeight: 1.6, fontWeight: 400
                    }}>
                        Transform your local repository into an interactive 3D metropolis. Instantly discover technical debt, map dependencies, and navigate complex codebases.
                    </p>

                    {/* Vercel/Linear Style Input Form */}
                    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '600px', marginTop: '16px', position: 'relative' }}>
                        <div style={{
                            display: 'flex', alignItems: 'center',
                            background: '#09090b', // Zinc 950
                            border: `1px solid ${isFocused ? '#3f3f46' : '#27272a'}`, // Zinc 700/800
                            borderRadius: '12px',
                            padding: '6px 6px 6px 16px',
                            boxShadow: isFocused ? '0 0 0 2px rgba(255,255,255,0.05), 0 20px 40px rgba(0,0,0,0.4)' : '0 10px 30px rgba(0,0,0,0.3)',
                            transition: 'all 0.2s ease'
                        }}>
                            <FolderSearch size={20} color="#71717a" />
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Enter absolute repository path (e.g., /home/user/project)"
                                spellCheck="false"
                                style={{
                                    flex: 1, background: 'transparent', border: 'none', outline: 'none',
                                    color: '#f4f4f5', fontSize: '1rem', padding: '0 16px',
                                    fontFamily: 'var(--font-sans)', letterSpacing: '-0.01em'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!path.trim()}
                                style={{
                                    background: path.trim() ? '#ffffff' : '#27272a',
                                    color: path.trim() ? '#000000' : '#71717a',
                                    border: 'none', borderRadius: '8px', padding: '0 20px', height: '40px',
                                    fontSize: '0.9rem', fontWeight: 500, cursor: path.trim() ? 'pointer' : 'default',
                                    display: 'flex', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                                }}
                            >
                                Analyze <ArrowRight size={16} />
                            </button>
                        </div>
                        {error && (
                            <div style={{ position: 'absolute', top: '100%', left: 0, width: '100%', marginTop: '12px', color: '#ef4444', fontSize: '0.9rem' }}>
                                {error}
                            </div>
                        )}
                    </form>
                </motion.div>
            </main>
        </div>
    )
}
