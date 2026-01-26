import React, { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import useStore from '../../store/useStore'

const STAGES = [
    { id: 1, label: 'Discovering files', icon: '📂' },
    { id: 2, label: 'Parsing code structure', icon: '🔍' },
    { id: 3, label: 'Building dependency graph', icon: '🔗' },
    { id: 4, label: 'Detecting communities', icon: '🏘️' },
    { id: 5, label: 'Generating city layout', icon: '🏙️' },
    { id: 6, label: 'Finalizing visualization', icon: '✨' }
]

export default function LoadingScreen() {
    const { analysisProgress, loading } = useStore()
    const [currentStage, setCurrentStage] = useState(0)
    const [dots, setDots] = useState('')

    // Animate dots
    useEffect(() => {
        const interval = setInterval(() => {
            setDots(d => d.length >= 3 ? '' : d + '.')
        }, 400)
        return () => clearInterval(interval)
    }, [])

    // Progress through stages
    useEffect(() => {
        if (analysisProgress > 0) {
            const stage = Math.min(Math.floor(analysisProgress / 18), 5)
            setCurrentStage(stage)
        } else if (loading) {
            const interval = setInterval(() => {
                setCurrentStage(s => (s + 1) % STAGES.length)
            }, 2000)
            return () => clearInterval(interval)
        }
    }, [analysisProgress, loading])

    return createPortal(
        <div className="loading-overlay" style={{
            position: 'fixed',
            top: 0,
            left: 0,
            width: '100vw',
            height: '100vh',
            background: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999, // Max Z-Index
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            animation: 'fadeIn 0.3s ease-out'
        }}>
            <div className="loading-container" style={{
                background: 'rgba(255, 255, 255, 0.05)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                padding: '40px',
                borderRadius: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                maxWidth: '400px',
                width: '90%',
                boxShadow: '0 25px 50px -12px rgba(0, 0, 0, 0.5)'
            }}>
                {/* Animated City Icon */}
                {/* Synthetic Scanner Animation */}
                <div className="loading-icon" style={{
                    marginBottom: '32px',
                    position: 'relative',
                    width: '80px',
                    height: '80px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                }}>
                    <div style={{
                        position: 'absolute',
                        width: '100%',
                        height: '100%',
                        borderRadius: '50%',
                        border: '2px solid rgba(129, 140, 248, 0.3)',
                        borderTopColor: '#818cf8',
                        animation: 'spin 1s linear infinite'
                    }} />
                    <div style={{
                        position: 'absolute',
                        width: '70%',
                        height: '70%',
                        borderRadius: '50%',
                        border: '2px solid rgba(196, 181, 253, 0.4)',
                        borderBottomColor: '#c4b5fd',
                        animation: 'spin 1.5s linear infinite reverse'
                    }} />
                    <div style={{
                        width: '12px',
                        height: '12px',
                        background: '#818cf8',
                        borderRadius: '50%',
                        boxShadow: '0 0 20px #818cf8',
                        animation: 'pulse 1s ease-in-out infinite'
                    }} />

                    <style>{`
                        @keyframes spin { 100% { transform: rotate(360deg); } }
                    `}</style>
                </div>

                {/* Title */}
                <h2 className="loading-title" style={{
                    color: 'white',
                    fontSize: '1.5rem',
                    fontWeight: 600,
                    margin: '0 0 8px 0',
                    letterSpacing: '-0.02em'
                }}>Analyzing Codebase{dots}</h2>

                {/* Current Stage */}
                <div className="loading-stage" style={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    marginBottom: '24px',
                    padding: '6px 16px',
                    background: 'rgba(255, 255, 255, 0.05)',
                    borderRadius: '20px'
                }}>
                    <span className="stage-icon" style={{ fontSize: '1.2rem' }}>{STAGES[currentStage]?.icon}</span>
                    <span className="stage-label" style={{ color: 'rgba(255, 255, 255, 0.7)', fontSize: '0.9rem', fontWeight: 500 }}>{STAGES[currentStage]?.label}</span>
                </div>

                {/* Progress Bar */}
                <div className="loading-progress" style={{
                    width: '100%',
                    height: '6px',
                    background: 'rgba(255, 255, 255, 0.1)',
                    borderRadius: '3px',
                    overflow: 'hidden',
                    marginBottom: '16px'
                }}>
                    <div
                        className="loading-progress-bar"
                        style={{
                            height: '100%',
                            background: 'linear-gradient(90deg, #818cf8, #c4b5fd)',
                            borderRadius: '3px',
                            transition: 'width 0.3s ease-out',
                            width: analysisProgress > 0 ? `${analysisProgress}%` : '30%',
                            animation: analysisProgress > 0 ? 'none' : 'pulse 1.5s ease-in-out infinite'
                        }}
                    />
                </div>

                {/* Stage Indicators */}
                <div className="loading-stages" style={{ display: 'flex', gap: '8px', marginBottom: '24px' }}>
                    {STAGES.map((stage, i) => (
                        <div
                            key={stage.id}
                            style={{
                                width: '8px',
                                height: '8px',
                                borderRadius: '50%',
                                background: i <= currentStage ? '#818cf8' : 'rgba(255, 255, 255, 0.2)',
                                transition: 'all 0.3s ease',
                                transform: i === currentStage ? 'scale(1.2)' : 'scale(1)',
                                boxShadow: i === currentStage ? '0 0 8px rgba(129, 140, 248, 0.5)' : 'none'
                            }}
                            title={stage.label}
                        />
                    ))}
                </div>

                {/* Tip */}
                <p className="loading-tip" style={{
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontSize: '0.85rem',
                    textAlign: 'center',
                    margin: 0
                }}>
                    Tip: Click on any building to explore file details
                </p>
            </div>
        </div>,
        document.body
    )
}
