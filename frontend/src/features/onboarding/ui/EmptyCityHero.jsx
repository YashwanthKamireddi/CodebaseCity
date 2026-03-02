import React, { useRef, useState, useMemo } from 'react'
import { Canvas, useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import { motion, AnimatePresence } from 'framer-motion'
import { ArrowRight, Box, Compass, Terminal, ShieldAlert, Cpu } from 'lucide-react'
import useStore from '../../../store/useStore'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

// --- Ultra-Premium Glass Particle Background ---
function GlassAtelierBackground() {
    const meshRef = useRef()
    const count = 400
    const dummy = useMemo(() => new THREE.Object3D(), [])

    // Generate sleek floating vertical glass shards
    const particles = useMemo(() => {
        const temp = []
        for (let i = 0; i < count; i++) {
            const x = (Math.random() - 0.5) * 80
            const y = (Math.random() - 0.5) * 40
            const z = (Math.random() - 0.5) * 40 - 20
            const speed = Math.random() * 0.05 + 0.01
            const width = Math.random() * 0.2 + 0.05
            const height = Math.random() * 8 + 2
            const depth = Math.random() * 0.2 + 0.05
            temp.push({ x, y, z, speed, width, height, depth, offset: Math.random() * Math.PI * 2 })
        }
        return temp
    }, [])

    useFrame((state) => {
        if (!meshRef.current) return
        const t = state.clock.elapsedTime

        particles.forEach((p, i) => {
            // Elegant vertical drifting
            const currentY = p.y + Math.sin(t * p.speed + p.offset) * 10
            dummy.position.set(p.x, currentY, p.z)
            dummy.scale.set(p.width, p.height, p.depth)

            // Subtle rotation for light catching
            dummy.rotation.x = Math.sin(t * 0.2 + p.offset) * 0.1
            dummy.rotation.y = t * 0.1 + p.offset

            dummy.updateMatrix()
            meshRef.current.setMatrixAt(i, dummy.matrix)
        })
        meshRef.current.instanceMatrix.needsUpdate = true

        // Extremely subtle, high-end camera parallax
        const targetX = state.pointer.x * 5
        const targetY = state.pointer.y * 5

        state.camera.position.x += (targetX - state.camera.position.x) * 0.02
        state.camera.position.y += (targetY - state.camera.position.y) * 0.02
        state.camera.lookAt(0, 0, 0)
    })

    return (
        <>
            <instancedMesh ref={meshRef} args={[null, null, count]}>
                <boxGeometry args={[1, 1, 1]} />
                <meshPhysicalMaterial
                    color="#ffffff"
                    transparent
                    opacity={0.15}
                    transmission={0.9} // Glass effect
                    ior={1.5}
                    thickness={1.5}
                    roughness={0.1}
                    metalness={0.5}
                    clearcoat={1}
                    clearcoatRoughness={0.1}
                />
            </instancedMesh>
        </>
    )
}

function StatBadge({ icon: Icon, label, value }) {
    return (
        <div style={{
            display: 'flex', alignItems: 'center', gap: '12px',
            padding: '12px 20px',
            background: 'rgba(255, 255, 255, 0.02)',
            border: '1px solid rgba(255, 255, 255, 0.05)',
            borderRadius: '16px',
            backdropFilter: 'blur(20px)'
        }}>
            <Icon size={16} color="rgba(255, 255, 255, 0.5)" />
            <div style={{ display: 'flex', flexDirection: 'column' }}>
                <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#666', fontFamily: 'var(--font-mono)' }}>{label}</span>
                <span style={{ fontSize: '0.95rem', fontWeight: 500, color: '#fff', letterSpacing: '-0.02em' }}>{value}</span>
            </div>
        </div>
    )
}

export default function EmptyCityHero() {
    const { analyzeRepo, error } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [isHovered, setIsHovered] = useState(false)

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
            background: '#020202', // Absolute deep black
            overflow: 'hidden',
            fontFamily: 'var(--font-sans)',
            color: '#fff'
        }}>
            {/* 3D Interactive Canvas - Glass Shards */}
            <div style={{ position: 'absolute', inset: 0, zIndex: 0 }}>
                <Canvas dpr={[1, 2]} camera={{ position: [0, 0, 40], fov: 35 }}>
                    <fog attach="fog" args={['#020202', 10, 60]} />
                    <ambientLight intensity={0.2} color="#ffffff" />

                    {/* Cinematic Lighting Setup for Glass */}
                    <directionalLight position={[10, 20, 10]} intensity={2} color="#ffffff" castShadow />
                    <directionalLight position={[-10, -20, -10]} intensity={1} color="#3b82f6" /> {/* Deep blue rim light */}
                    <spotLight position={[0, 0, 20]} angle={0.3} penumbra={1} intensity={3} color="#a855f7" /> {/* Violet center punch */}

                    <GlassAtelierBackground />
                    <EffectComposer disableNormalPass>
                        <Bloom luminanceThreshold={0.5} luminanceSmoothing={0.9} height={300} intensity={0.8} />
                    </EffectComposer>
                </Canvas>
            </div>

            {/* Gradient Overlays for High-End Contrast */}
            <div style={{
                position: 'absolute', inset: 0,
                background: 'radial-gradient(circle at center, transparent 0%, #020202 100%)',
                zIndex: 1, pointerEvents: 'none'
            }} />
            <div style={{
                position: 'absolute', inset: 0,
                background: 'linear-gradient(to top, #020202 0%, transparent 40%)',
                zIndex: 1, pointerEvents: 'none'
            }} />

            {/* High-End Editoral UI Layer */}
            <div style={{
                position: 'absolute',
                inset: 0,
                zIndex: 2,
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'center',
                alignItems: 'center',
                padding: '0 40px',
                pointerEvents: 'none'
            }}>
                <motion.div
                    initial={{ opacity: 0, scale: 0.95, filter: 'blur(20px)' }}
                    animate={{ opacity: 1, scale: 1, filter: 'blur(0px)' }}
                    transition={{ duration: 1.5, ease: [0.16, 1, 0.3, 1] }}
                    style={{
                        display: 'flex',
                        flexDirection: 'column',
                        alignItems: 'center',
                        gap: '64px',
                        width: '100%',
                        maxWidth: '900px',
                        pointerEvents: 'auto'
                    }}
                >

                    <div style={{ textAlign: 'center', display: 'flex', flexDirection: 'column', gap: '20px' }}>
                        <div style={{
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '12px',
                            margin: '0 auto',
                            padding: '8px 20px',
                            background: 'rgba(255,255,255,0.02)',
                            border: '1px solid rgba(255,255,255,0.04)',
                            borderRadius: '100px',
                            backdropFilter: 'blur(10px)'
                        }}>
                            <div style={{ width: 6, height: 6, borderRadius: '50%', background: '#fff', boxShadow: '0 0 10px #fff' }} />
                            <span style={{ fontSize: '0.7rem', letterSpacing: '0.2em', textTransform: 'uppercase', color: '#888', fontWeight: 500, fontFamily: 'var(--font-mono)' }}>
                                System Ready
                            </span>
                        </div>

                        <h1 style={{
                            fontSize: 'clamp(3rem, 6vw, 5.5rem)',
                            fontWeight: 400,
                            letterSpacing: '-0.04em',
                            lineHeight: 1.05,
                            margin: 0,
                            color: '#ffffff',
                            fontFamily: 'var(--font-display)',
                            textShadow: '0 20px 40px rgba(0,0,0,0.5)'
                        }}>
                            Instantiate City.
                        </h1>
                        <p style={{
                            fontSize: '1.25rem',
                            color: 'rgba(255,255,255,0.4)',
                            maxWidth: '600px',
                            margin: '0 auto',
                            lineHeight: 1.6,
                            letterSpacing: '-0.01em',
                            fontWeight: 300
                        }}>
                            Connect your codebase to the dimensional engine.
                            <br />We transform raw syntax into structural geometry.
                        </p>
                    </div>

                    {/* Architectural Input Console */}
                    <form onSubmit={handleSubmit} style={{ width: '100%', maxWidth: '640px', position: 'relative' }}>
                        {/* Glow underlay */}
                        <div style={{
                            position: 'absolute', inset: '-20px',
                            background: isFocused ? 'radial-gradient(circle at center, rgba(255,255,255,0.05) 0%, transparent 70%)' : 'transparent',
                            borderRadius: '32px',
                            transition: 'all 0.6s ease',
                            zIndex: -1
                        }} />

                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            background: isFocused ? 'rgba(10, 10, 12, 0.8)' : 'rgba(10, 10, 12, 0.4)',
                            border: `1px solid ${isFocused ? 'rgba(255, 255, 255, 0.15)' : 'rgba(255, 255, 255, 0.05)'}`,
                            borderRadius: '24px',
                            padding: '8px 8px 8px 24px',
                            backdropFilter: 'blur(30px)',
                            WebkitBackdropFilter: 'blur(30px)',
                            transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
                            boxShadow: isFocused
                                ? '0 32px 64px rgba(0,0,0,0.6), inset 0 1px 0 rgba(255,255,255,0.05)'
                                : '0 16px 32px rgba(0,0,0,0.4)'
                        }}>
                            <Terminal size={18} color={isFocused ? "#fff" : "#444"} style={{ transition: 'color 0.3s' }} />
                            <input
                                type="text"
                                value={path}
                                onChange={(e) => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                placeholder="Enter absolute repository path..."
                                spellCheck="false"
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: '#fff',
                                    fontSize: '1.05rem',
                                    fontFamily: 'var(--font-sans)',
                                    letterSpacing: '-0.01em',
                                    padding: '0 16px',
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!path.trim()}
                                onMouseEnter={() => setIsHovered(true)}
                                onMouseLeave={() => setIsHovered(false)}
                                style={{
                                    background: path.trim() ? '#ffffff' : 'rgba(255,255,255,0.03)',
                                    color: path.trim() ? '#000000' : 'rgba(255,255,255,0.2)',
                                    border: path.trim() ? 'none' : '1px solid rgba(255,255,255,0.02)',
                                    borderRadius: '16px',
                                    padding: '0 32px',
                                    height: '52px',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '12px',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    cursor: path.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                                    transform: isHovered && path.trim() ? 'scale(1.02)' : 'scale(1)',
                                    boxShadow: path.trim() && isHovered ? '0 12px 24px rgba(255,255,255,0.15)' : 'none'
                                }}
                            >
                                Process <ArrowRight size={18} />
                            </button>
                        </div>
                        {error && (
                            <motion.div
                                initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                                style={{
                                    position: 'absolute', top: '100%', left: 0, width: '100%',
                                    marginTop: '20px', textAlign: 'center',
                                    color: '#f87171', fontSize: '0.85rem', fontFamily: 'var(--font-mono)'
                                }}
                            >
                                ERR: {error}
                            </motion.div>
                        )}
                    </form>

                    {/* Contextual Data Badges */}
                    <div style={{ display: 'flex', gap: '24px', opacity: isFocused ? 0.3 : 1, transition: 'opacity 0.4s ease' }}>
                        <StatBadge icon={Box} label="Architecture" value="Dimensional" />
                        <StatBadge icon={ShieldAlert} label="Diagnostics" value="Real-Time" />
                        <StatBadge icon={Cpu} label="Rendering" value="Instanced" />
                    </div>

                </motion.div>
            </div>
        </div>
    )
}
