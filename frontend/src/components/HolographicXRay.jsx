import React, { useEffect, useState, useRef } from 'react'
import { Html } from '@react-three/drei'
import mermaid from 'mermaid'
import useStore from '../store/useStore'

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'dark',
    securityLevel: 'loose',
    fontFamily: 'Fira Code'
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
                // If the selected building has no actual logic (e.g. image), skip
                // For now assuming all code files are valid targets

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
                const { svg } = await mermaid.render(`mermaid-${selectedBuilding.id.replace(/[^a-zA-Z0-9]/g, '')}`, code)
                setChartSvg(svg)

            } catch (e) {
                console.error("X-Ray Error", e)
                setChartSvg(null)
            } finally {
                setLoading(false)
            }
        }

        fetchFlowchart()

    }, [selectedBuilding, cityData])

    if (!selectedBuilding || !visible) return null
    if (!selectedBuilding.position) return null

    // Position slightly above and to the right of the building
    const { x, z } = selectedBuilding.position
    const y = (selectedBuilding.dimensions.height || 10) + 15

    return (
        <group position={[x + 5, y, z]} rotation={[0, Math.PI / 4, 0]}>
            <Html transform occlude distanceFactor={15}>
                <div className="xray-panel" style={{
                    background: 'rgba(10, 10, 20, 0.85)',
                    border: '1px solid #00f2ff',
                    boxShadow: '0 0 20px rgba(0, 242, 255, 0.3)',
                    padding: '16px',
                    borderRadius: '8px',
                    color: '#00f2ff',
                    width: '400px',
                    fontFamily: 'Fira Code, monospace',
                    backdropFilter: 'blur(8px)',
                    transform: 'scale(1)',
                    pointerEvents: 'none' // Let clicks pass through if needed, or 'auto'
                }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '8px', borderBottom: '1px solid rgba(0,242,255,0.3)', paddingBottom: '4px' }}>
                        <span style={{ fontWeight: 'bold' }}>LOGIC_CORE // {selectedBuilding.name}</span>
                        <span>{loading ? 'SCANNING...' : 'ONLINE'}</span>
                    </div>

                    {loading && (
                        <div style={{ height: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                            <div className="scan-line" style={{
                                width: '100%', height: '2px', background: '#00f2ff',
                                animation: 'scan 1s infinite linear'
                            }} />
                        </div>
                    )}

                    {!loading && chartSvg && (
                        <div
                            dangerouslySetInnerHTML={{ __html: chartSvg }}
                            style={{
                                svg: { width: '100%', height: 'auto', maxHeight: '400px' }
                            }}
                        />
                    )}
                </div>
            </Html>

            {/* Connecting Line */}
            <mesh position={[-5, -10, 0]}>
                <cylinderGeometry args={[0.05, 0.05, 20]} />
                <meshBasicMaterial color="#00f2ff" transparent opacity={0.5} />
            </mesh>
        </group>
    )
}
