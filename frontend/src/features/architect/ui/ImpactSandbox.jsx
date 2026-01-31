import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { AlertTriangle, Trash2, ArrowRight, RotateCcw, Box } from 'lucide-react'
import { useArchitectStore } from '../model/useArchitectStore'
import useStore from '../../../store/useStore'

export default function ImpactSandbox() {
    const { isArchitectMode, simulatedDeletions, blastRadius, resetSimulation } = useArchitectStore()
    const { selectedBuilding } = useStore() // We can use this to show contextual actions

    if (!isArchitectMode) return null

    // Calculate Risk
    const brokenCount = blastRadius.length
    const deletedCount = simulatedDeletions.size
    const riskLevel = brokenCount > 20 ? 'Critical' : brokenCount > 5 ? 'High' : brokenCount > 0 ? 'Moderate' : 'Low'
    const riskColor = brokenCount > 20 ? '#ef4444' : brokenCount > 5 ? '#f97316' : brokenCount > 0 ? '#eab308' : '#10b981'

    return (
        <AnimatePresence>
            <motion.div
                initial={{ y: 100, opacity: 0 }}
                animate={{ y: 0, opacity: 1 }}
                exit={{ y: 100, opacity: 0 }}
                style={{
                    position: 'fixed',
                    bottom: '100px', // Above Floating Dock
                    left: '50%',
                    transform: 'translateX(-50%)',
                    width: '400px',
                    background: 'var(--glass-surface)',
                    backdropFilter: 'var(--glass-backdrop)',
                    WebkitBackdropFilter: 'var(--glass-backdrop)',
                    border: '1px solid var(--glass-border)',
                    borderRadius: '16px',
                    boxShadow: '0 20px 50px -10px rgba(0,0,0,0.5)',
                    zIndex: 1900,
                    padding: '16px',
                    color: 'white',
                    fontFamily: 'var(--font-sans)',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '12px'
                }}
            >
                {/* Header */}
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: '#f59e0b', display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Box size={16} color="white" />
                        </div>
                        <div style={{ fontWeight: 700, fontSize: '0.95rem' }}>Architect Sandbox</div>
                    </div>
                    <div style={{
                        fontSize: '0.75rem',
                        padding: '4px 8px',
                        borderRadius: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.6)',
                        fontWeight: 600,
                        textTransform: 'uppercase'
                    }}>
                        Simulation Active
                    </div>
                </div>

                {/* Main Metrics */}
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '8px', marginTop: '4px' }}>
                    <MetricBox label="Deleted" value={deletedCount} color="#ef4444" />
                    <MetricBox label="Broken" value={brokenCount} color={riskColor} />
                    <MetricBox label="Risk" value={riskLevel} color={riskColor} text />
                </div>

                {/* Context Action */}
                {selectedBuilding && !simulatedDeletions.has(selectedBuilding.id) && (
                    <div style={{ padding: '12px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '8px', border: '1px dashed rgba(239, 68, 68, 0.3)' }}>
                        <div style={{ fontSize: '0.85rem', color: '#fca5a5', marginBottom: '8px', display: 'flex', alignItems: 'center', gap: '6px' }}>
                            <Trash2 size={14} /> Simulate deletion of <b>{selectedBuilding.name}</b>?
                        </div>
                        <button
                            onClick={() => useArchitectStore.getState().toggleDeletion(selectedBuilding.id, useStore.getState().cityData)}
                            style={{
                                width: '100%',
                                padding: '8px',
                                background: '#ef4444',
                                border: 'none',
                                borderRadius: '6px',
                                color: 'white',
                                fontWeight: 600,
                                fontSize: '0.85rem',
                                cursor: 'pointer'
                            }}
                        >
                            Confirm Deletion
                        </button>
                    </div>
                )}

                {selectedBuilding && simulatedDeletions.has(selectedBuilding.id) && (
                    <button
                        onClick={() => useArchitectStore.getState().toggleDeletion(selectedBuilding.id, useStore.getState().cityData)}
                        style={{
                            width: '100%',
                            padding: '10px',
                            background: 'rgba(255,255,255,0.1)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: 600,
                            fontSize: '0.85rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px'
                        }}
                    >
                        <RotateCcw size={14} /> Restore File
                    </button>
                )}

                {/* Footer */}
                {/* Drop Zone (Trash) */}
                <div
                    onMouseEnter={() => document.body.style.cursor = 'copy'}
                    onMouseLeave={() => document.body.style.cursor = 'default'}
                    onMouseUp={() => {
                        const { selectedBuilding, cityData } = useStore.getState()
                        if (selectedBuilding) useArchitectStore.getState().toggleDeletion(selectedBuilding.id, cityData)
                    }}
                    className="trash-dropzone"
                    style={{
                        marginTop: '12px',
                        border: '2px dashed #52525b',
                        borderRadius: '12px',
                        height: '60px',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                        color: '#71717a', fontSize: '0.8rem', transition: 'all 0.2s', cursor: 'pointer'
                    }}
                >
                    <Trash2 size={16} /> <span>Drop to Delete</span>
                </div>

                {/* Refactoring Zones (Largo) */}
                <div style={{ marginTop: '16px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#a1a1aa', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Refactor Targets (Move File)
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                        {['features/shared', 'core/utils', 'components/ui', 'legacy/archive'].map(folder => (
                            <div
                                key={folder}
                                onMouseUp={() => {
                                    const { selectedBuilding } = useStore.getState()
                                    if (selectedBuilding) {
                                        import('../../../utils/RefactorUtils').then(({ generateRefactorScript }) => {
                                            const script = generateRefactorScript(selectedBuilding, folder)
                                            console.log("Refactor Script Generated:", script)
                                            alert(`Generated Script for moving ${selectedBuilding.name} to ${folder}:\n\n${script}`)
                                        })
                                    }
                                }}
                                style={{
                                    background: 'rgba(255,255,255,0.05)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '10px',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)',
                                    color: '#bae6fd',
                                    cursor: 'pointer',
                                    textAlign: 'center',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {folder}
                            </div>
                        ))}
                    </div>
                </div>

                {/* Chaos Simulator (Phase 8) */}
                <div style={{ marginTop: '16px', borderTop: '1px solid rgba(255,255,255,0.1)', paddingTop: '12px' }}>
                    <div style={{ fontSize: '0.75rem', color: '#f87171', marginBottom: '8px', textTransform: 'uppercase', fontWeight: 600 }}>
                        Chaos Engineering (Resilience)
                    </div>
                    <button
                        onClick={() => {
                            const zero = useArchitectStore.getState().triggerOutage(useStore.getState().cityData)
                            if (zero) alert(`💥 CHAOS SIMULATOR ACTIVE\n\nPatient Zero: ${zero.name}\n\nCascading failure initiated. Check the red lightning connectors.`)
                        }}
                        style={{
                            width: '100%',
                            padding: '12px',
                            background: 'linear-gradient(90deg, #7f1d1d, #ef4444)',
                            border: '1px solid #fca5a5',
                            borderRadius: '8px',
                            color: 'white',
                            fontWeight: 700,
                            fontSize: '0.9rem',
                            cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px',
                            boxShadow: '0 4px 12px rgba(239, 68, 68, 0.4)'
                        }}
                    >
                        <AlertTriangle size={18} /> Simulate Random Outage
                    </button>
                    {useArchitectStore.getState().chaosSource && (
                        <div style={{ marginTop: '8px', fontSize: '0.75rem', color: '#fca5a5', textAlign: 'center' }}>
                            Outage Active. Impact Radius: {brokenCount} nodes.
                        </div>
                    )}
                </div>

                {/* Reset Action */}
                {deletedCount > 0 && (
                    <div style={{ display: 'flex', justifyContent: 'center', marginTop: '12px' }}>
                        <button
                            onClick={resetSimulation}
                            style={{
                                background: 'transparent',
                                border: 'none',
                                color: '#ef4444',
                                fontSize: '0.75rem',
                                cursor: 'pointer',
                                textDecoration: 'underline',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}
                        >
                            <RotateCcw size={10} /> Reset Simulation
                        </button>
                    </div>
                )}

            </motion.div>
        </AnimatePresence>
    )
}

function MetricBox({ label, value, color, text }) {
    return (
        <div style={{
            background: 'rgba(255,255,255,0.03)',
            borderRadius: '8px',
            padding: '10px 8px',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            border: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{ fontSize: '1.2rem', fontWeight: 700, color: color }}>{value}</div>
            <div style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.5)', textTransform: 'uppercase' }}>{label}</div>
        </div>
    )
}
