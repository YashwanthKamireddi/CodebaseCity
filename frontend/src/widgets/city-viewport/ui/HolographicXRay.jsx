import React, { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import mermaid from 'mermaid'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base', // 'base' allows better custom CSS overrides usually, or stick to dark
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

export default function HolographicXRay() {
    const { selectedBuilding, cityData } = useStore()
    const [chartSvg, setChartSvg] = useState(null)
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(false)

    // reset visibility on selection change
    useEffect(() => {
        if (!selectedBuilding) {
            setVisible(false)
            setChartSvg(null)
            return
        }

        // Fetch Logic
        const fetchFlowchart = async () => {
            setLoading(true)
            setVisible(true)
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

                // Render SVG
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

    }, [selectedBuilding, cityData])

    if (!selectedBuilding || !visible) return null
    if (!selectedBuilding.position) return null

    const { x, z } = selectedBuilding.position
    const y = (selectedBuilding.dimensions.height || 10) + 20 // Higher float

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
                                boxShadow: '0 20px 50px -10px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(0,0,0,0.2), inset 0 0 20px rgba(255,255,255,0.02)',
                                padding: '20px',
                                borderRadius: '16px',
                                color: '#e2e8f0',
                                width: '420px',
                                fontFamily: "'Inter', sans-serif",
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                {/* Top Glow Line */}
                                <div style={{
                                    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                                    background: 'linear-gradient(90deg, transparent, rgba(56, 189, 248, 0.5), transparent)'
                                }} />

                                {/* Header */}
                                <div style={{
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    marginBottom: '16px', paddingBottom: '12px',
                                    borderBottom: '1px solid rgba(255,255,255,0.06)'
                                }}>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.1em', color: '#71717a' }}>Logic Core</span>
                                        <span style={{ fontSize: '0.9rem', fontWeight: 600, color: 'white' }}>{selectedBuilding.name}</span>
                                    </div>
                                    <div style={{
                                        display: 'flex', alignItems: 'center', gap: '6px',
                                        background: 'rgba(56, 189, 248, 0.1)', border: '1px solid rgba(56, 189, 248, 0.2)',
                                        padding: '4px 8px', borderRadius: '100px'
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: '#38bdf8', boxShadow: '0 0 8px #38bdf8' }} />
                                        <span style={{ fontSize: '0.7rem', fontWeight: 600, color: '#38bdf8' }}>LIVE</span>
                                    </div>
                                </div>

                                {/* Content */}
                                {loading && (
                                    <div style={{ height: '180px', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                        <div className="loader-line" style={{ width: '40px', height: '2px', background: '#38bdf8', borderRadius: '2px' }} />
                                        <span style={{ fontSize: '0.75rem', color: '#52525b' }}>Syncing Neural Graph...</span>
                                    </div>
                                )}

                                {!loading && chartSvg && (
                                    <div
                                        dangerouslySetInnerHTML={{ __html: chartSvg }}
                                        style={{
                                            opacity: 0.9,
                                            filter: 'contrast(1.1)',
                                            maxHeight: '400px',
                                            overflow: 'hidden'
                                        }}
                                    />
                                )}
                            </div>

                            {/* THE TETHER (Laser Beam) */}
                            {/* Connecting the card bottom to the building top */}
                            <motion.div
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 40, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                style={{
                                    width: '1px',
                                    background: 'linear-gradient(to bottom, rgba(56, 189, 248, 0.5), transparent)',
                                    boxShadow: '0 0 10px rgba(56, 189, 248, 0.4)'
                                }}
                            />

                            {/* Anchor Point on Roof */}
                            <motion.div
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.6 }}
                                style={{
                                    width: '6px', height: '6px', borderRadius: '50%',
                                    background: '#38bdf8',
                                    boxShadow: '0 0 15px #38bdf8'
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Html>
        </group>
    )
}
