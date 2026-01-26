import React, { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import mermaid from 'mermaid'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'
import { User, GitCommit, Calendar, Mail } from 'lucide-react'

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        darkMode: true,
        background: '#09090b',
        primaryColor: '#3b82f6',
        secondaryColor: '#6366f1',
        tertiaryColor: '#09090b',
        primaryBorderColor: '#3b82f6',
        lineColor: '#52525b',
        textColor: '#e2e8f0'
    },
    securityLevel: 'loose',
    fontFamily: 'Inter, monospace'
})

// Hash string to HSL color (same logic as colorUtils.js)
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 60%)`;
}

export default function HolographicXRay() {
    const { selectedBuilding, cityData, colorMode } = useStore()
    const [chartSvg, setChartSvg] = useState(null)
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(false)

    // Determine if we're in Social Mode
    const isSocialMode = colorMode === 'author'

    // Reset visibility on selection change
    useEffect(() => {
        if (!selectedBuilding) {
            setVisible(false)
            setChartSvg(null)
            return
        }

        setVisible(true)

        // Only fetch flowchart if NOT in social mode
        if (!isSocialMode) {
            const fetchFlowchart = async () => {
                setLoading(true)
                try {
                    const res = await fetch('/api/v2/intelligence/flowchart', {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                            city_id: cityData.name || 'default',
                            file_path: selectedBuilding.path
                        })
                    })

                    if (!res.ok) throw new Error("Failed to fetch")
                    const data = await res.json()
                    const code = data.chart || "graph TD\n Error[No Data]"

                    const id = `mermaid-${selectedBuilding.id.replace(/[^a-zA-Z0-9]/g, '')}`
                    const { svg } = await mermaid.render(id, code)
                    setChartSvg(svg)
                } catch (e) {
                    console.warn("X-Ray Info:", e)
                    setChartSvg(null)
                } finally {
                    setLoading(false)
                }
            }
            fetchFlowchart()
        }
    }, [selectedBuilding, cityData, isSocialMode])

    if (!selectedBuilding || !visible) return null
    if (!selectedBuilding.position) return null

    // In flowchart mode, hide entirely if no chart data loaded
    if (!isSocialMode && !loading && !chartSvg) return null

    const { x, z } = selectedBuilding.position
    const y = (selectedBuilding.dimensions.height || 10) + 20

    // Author data from building
    const author = selectedBuilding.author || 'Unknown'
    const email = selectedBuilding.email || ''
    const authorColor = stringToColor(author)

    return (
        <group position={[x, y, z]}>
            <Html transform occlude distanceFactor={25} style={{ pointerEvents: 'none' }}>
                <AnimatePresence>
                    {visible && (
                        <motion.div
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                            style={{
                                display: 'flex',
                                flexDirection: 'column',
                                alignItems: 'center',
                                gap: '12px'
                            }}
                        >
                            {/* THE NEURAL LINK (Glass Card) */}
                            <div className="neural-card" style={{
                                background: 'rgba(9, 9, 11, 0.7)',
                                backdropFilter: 'blur(16px) saturate(180%)',
                                WebkitBackdropFilter: 'blur(16px) saturate(180%)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.5)',
                                padding: '20px',
                                borderRadius: '16px',
                                color: '#e2e8f0',
                                width: isSocialMode ? '280px' : '420px',
                                fontFamily: "'Inter', sans-serif",
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Top Glow Line */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                                    background: isSocialMode
                                        ? `linear-gradient(90deg, transparent, ${authorColor}, transparent)`
                                        : 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.5), transparent)'
                                }} />

                                {/* Header */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginBottom: '16px', paddingBottom: '12px',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a' }}>
                                            {isSocialMode ? 'Owner' : 'Logic Core'}
                                        </span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>
                                            {selectedBuilding.name}
                                        </span>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: isSocialMode ? `${authorColor}20` : 'rgba(56, 189, 248, 0.1)',
                                        border: `1px solid ${isSocialMode ? `${authorColor}40` : 'rgba(56, 189, 248, 0.2)'}`,
                                        padding: '4px 8px', borderRadius: '100px'
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: isSocialMode ? authorColor : '#38bdf8', boxShadow: `0 0 8px ${isSocialMode ? authorColor : '#38bdf8'}` }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: isSocialMode ? authorColor : '#38bdf8' }}>
                                            {isSocialMode ? 'SOCIAL' : 'LIVE'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content: Social Mode vs Flowchart */}
                                {isSocialMode ? (
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                                        {/* Author Avatar & Name */}
                                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                                            <div style={{
                                                width: '48px', height: '48px', borderRadius: '50%',
                                                background: `linear-gradient(135deg, ${authorColor}, ${authorColor}80)`,
                                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                                fontSize: '1.2rem', fontWeight: 700, color: 'white',
                                                boxShadow: `0 0 20px ${authorColor}40`
                                            }}>
                                                {author.charAt(0).toUpperCase()}
                                            </div>
                                            <div>
                                                <div style={{ fontSize: '1rem', fontWeight: 600, color: 'white' }}>
                                                    {author}
                                                </div>
                                                {email && (
                                                    <div style={{ fontSize: '0.75rem', color: '#71717a', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                                        <Mail size={10} /> {email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div style={{ display: 'flex', gap: '16px' }}>
                                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                                                    {selectedBuilding.metrics?.churn || 0}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Commits
                                                </div>
                                            </div>
                                            <div style={{ flex: 1, background: 'rgba(255,255,255,0.03)', padding: '12px', borderRadius: '8px', textAlign: 'center' }}>
                                                <div style={{ fontSize: '1.2rem', fontWeight: 700, color: 'white' }}>
                                                    {selectedBuilding.metrics?.loc || 0}
                                                </div>
                                                <div style={{ fontSize: '0.65rem', color: '#71717a', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                                                    Lines
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <>
                                        {loading && (
                                            <div style={{ height: '120px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                                <div style={{
                                                    width: '40px', height: '2px', background: '#38bdf8', borderRadius: '2px',
                                                    animation: 'pulse 1.5s ease-in-out infinite'
                                                }} />
                                                <span style={{ fontSize: '0.75rem', color: '#52525b' }}>Analyzing...</span>
                                            </div>
                                        )}

                                        {!loading && chartSvg && (
                                            <div
                                                dangerouslySetInnerHTML={{ __html: chartSvg }}
                                                style={{
                                                    opacity: 0.9,
                                                    filter: 'contrast(1.1)',
                                                    maxHeight: '300px',
                                                    overflow: 'auto'
                                                }}
                                            />
                                        )}
                                    </>
                                )}
                            </div>

                            {/* THE TETHER (Laser Beam) */}
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 40, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                style={{
                                    width: '1px',
                                    background: `linear-gradient(to bottom, ${isSocialMode ? authorColor : 'rgba(56, 189, 248, 0.5)'}, transparent)`,
                                    boxShadow: `0 0 10px ${isSocialMode ? authorColor : 'rgba(56, 189, 248, 0.4)'}`
                                }}
                            />

                            {/* Anchor Point on Roof */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.6 }}
                                style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: isSocialMode ? authorColor : '#38bdf8',
                                    boxShadow: `0 0 15px ${isSocialMode ? authorColor : '#38bdf8'}`
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Html>
        </group>
    )
}
