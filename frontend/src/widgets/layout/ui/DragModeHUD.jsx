import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'
import { Layers, CheckCircle, XCircle, AlertTriangle } from 'lucide-react'

export default function DragModeHUD() {
    const {
        refactoringDrifts,
        toggleRefactoringMode,
        clearRefactoringDrifts,
        cityData,
        cityId,
        authToken
    } = useStore()

    const [simulating, setSimulating] = useState(false)
    const [simResult, setSimResult] = useState(null)

    const driftCount = refactoringDrifts.length

    // Re-run simulation when drifts change
    useEffect(() => {
        if (driftCount === 0) {
            setSimResult(null)
            return
        }

        const runSimulation = async () => {
            setSimulating(true)
            try {
                const headers = { 'Content-Type': 'application/json' }
                if (authToken) headers['Authorization'] = `Bearer ${authToken}`

                const res = await fetch(`/api/intelligence/simulate/${cityId || 'default'}`, {
                    method: 'POST',
                    headers,
                    body: JSON.stringify({ drifts: refactoringDrifts })
                })

                if (res.ok) {
                    const data = await res.json()
                    setSimResult(data.simulation)
                }
            } catch (err) {
                console.error("Failed to run refactor simulation", err)
            } finally {
                setSimulating(false)
            }
        }

        // Debounce slightly so wildly dragging doesn't spam the backend
        const timeoutId = setTimeout(runSimulation, 500)
        return () => clearTimeout(timeoutId)
    }, [refactoringDrifts, cityId, authToken])

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                style={{
                    position: 'absolute',
                    bottom: '100px', // Just above timeline
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: 'rgba(5, 10, 20, 0.9)',
                    backdropFilter: 'blur(16px)',
                    WebkitBackdropFilter: 'blur(16px)',
                    border: '1px solid rgba(0, 242, 255, 0.3)',
                    borderRadius: '16px',
                    padding: '16px 24px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px',
                    boxShadow: '0 20px 40px rgba(0,0,0,0.6), inset 0 0 0 1px rgba(255,255,255,0.05)',
                    zIndex: 100 // High priority overlay
                }}
            >
                {/* Status Section */}
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <div style={{
                        width: '40px', height: '40px',
                        background: 'rgba(0, 242, 255, 0.1)',
                        borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        color: '#00f2ff'
                    }}>
                        <Layers size={20} />
                    </div>
                    <div>
                        <div style={{
                            fontSize: '0.9rem', fontWeight: 600, color: '#fff',
                            letterSpacing: '0.05em', textTransform: 'uppercase',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            Refactoring Simulator
                            {driftCount > 0 && <span style={{ width: 6, height: 6, background: '#f59e0b', borderRadius: '50%', boxShadow: '0 0 8px #f59e0b' }} />}
                        </div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginTop: '2px' }}>
                            {driftCount === 0
                                ? "Drag and drop buildings to simulate architectural changes"
                                : `${driftCount} pending structural drift${driftCount > 1 ? 's' : ''}`
                            }
                        </div>
                    </div>
                </div>

                {/* Simulation Metrics */}
                {driftCount > 0 && (
                    <>
                        <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />

                        <div style={{ display: 'flex', gap: '24px', minWidth: '180px' }}>
                            {simulating ? (
                                <div style={{ fontSize: '0.8rem', color: '#00f2ff', fontStyle: 'italic', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <div className="sim-spinner" style={{ width: 12, height: 12, border: '2px solid rgba(0,242,255,0.3)', borderTopColor: '#00f2ff', borderRadius: '50%', animation: 'spin 1s linear infinite' }} />
                                    Calculating impact...
                                </div>
                            ) : simResult ? (
                                <>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Blast Radius</span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: simResult.metrics.blast_radius_edges > 20 ? '#ef4444' : '#fff' }}>
                                            {simResult.metrics.blast_radius_edges}
                                        </span>
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column' }}>
                                        <span style={{ fontSize: '0.65rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Stability</span>
                                        <span style={{ fontSize: '1.2rem', fontWeight: 700, color: simResult.recommendation === 'REVERT' ? '#ef4444' : '#10b981' }}>
                                            {simResult.metrics.projected_stability}%
                                        </span>
                                    </div>
                                </>
                            ) : null}
                        </div>
                    </>
                )}

                {/* Vertical Divider */}
                <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)' }} />

                {/* Actions */}
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button
                        onClick={clearRefactoringDrifts}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: 'transparent',
                            color: '#e4e4e7',
                            border: '1px solid rgba(255,255,255,0.1)',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '0.8rem', fontWeight: 500,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = 'rgba(255,255,255,0.05)'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                    >
                        <XCircle size={14} /> Discard
                    </button>
                    <button
                        disabled={driftCount === 0}
                        style={{
                            display: 'flex', alignItems: 'center', gap: '6px',
                            background: driftCount > 0 ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                            color: driftCount > 0 ? '#fff' : 'rgba(255,255,255,0.3)',
                            border: 'none',
                            padding: '8px 16px',
                            borderRadius: '8px',
                            fontSize: '0.8rem', fontWeight: 600,
                            cursor: driftCount > 0 ? 'pointer' : 'not-allowed',
                            transition: 'all 0.2s'
                        }}
                        onClick={() => {
                            // In a full implementation, this would trigger path updates across the AST
                            // For visualization, we just stop the simulation and keep the new positions visually
                            alert(simResult ? simResult.message : `Applying ${driftCount} structural shifts...`)
                            toggleRefactoringMode()
                        }}
                    >
                        <CheckCircle size={14} /> Simulate Commit
                    </button>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}
