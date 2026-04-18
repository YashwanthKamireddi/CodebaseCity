/**
 * LoadingScreen - Minimal, professional loading experience
 * Clean design without gimmicks - just clear progress feedback
 */
import React from 'react'
import { createPortal } from 'react-dom'
import useStore from '../../store/useStore'
import { Loader2 } from 'lucide-react'

const STAGES = [
    'Scanning files',
    'Parsing code',
    'Building graph',
    'Detecting patterns',
    'Generating layout',
    'Finalizing'
]

export default function LoadingScreen() {
    const analysisProgress = useStore(s => s.analysisProgress)

    // Calculate current stage from progress
    const currentStage = Math.min(
        Math.floor((analysisProgress || 0) / (100 / STAGES.length)),
        STAGES.length - 1
    )

    const progressWidth = analysisProgress > 0 ? analysisProgress : 12

    return createPortal(
        <div style={{
            position: 'fixed',
            inset: 0,
            background: 'radial-gradient(ellipse at 50% 120%, rgba(10, 22, 40, 0.7) 0%, rgba(6, 11, 20, 0.85) 50%, rgba(3, 5, 8, 0.95) 100%)',
            backdropFilter: 'blur(12px)',
            WebkitBackdropFilter: 'blur(12px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            overflow: 'hidden'
        }}>
            {/* Animated grid floor effect */}
            <div style={{
                position: 'absolute',
                bottom: 0,
                left: '-50%',
                right: '-50%',
                height: '55%',
                background: `
                    linear-gradient(rgba(0, 200, 255, 0.06) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(0, 200, 255, 0.06) 1px, transparent 1px)
                `,
                backgroundSize: '60px 60px',
                transform: 'perspective(500px) rotateX(60deg)',
                transformOrigin: 'center top',
                maskImage: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 80%)',
                WebkitMaskImage: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent 80%)',
                animation: 'gridScroll 8s linear infinite'
            }} />

            {/* Skyline silhouette */}
            <div style={{
                position: 'absolute',
                bottom: '25%',
                left: 0,
                right: 0,
                height: '120px',
                background: 'linear-gradient(to top, #0a1628 0%, transparent 100%)',
                opacity: 0.6,
                display: 'flex',
                alignItems: 'flex-end',
                justifyContent: 'center',
                gap: '3px'
            }}>
                {Array.from({length: 50}, (_, i) => {
                    const h = 15 + Math.sin(i * 0.7) * 30 + Math.random() * 40
                    return <div key={i} style={{
                        width: '8px', height: `${h}px`,
                        background: `rgba(0, 180, 255, ${0.04 + Math.random() * 0.06})`,
                        borderTop: '1px solid rgba(0, 200, 255, 0.12)'
                    }}/>
                })}
            </div>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                maxWidth: '320px',
                width: '100%',
                padding: '0 24px',
                position: 'relative',
                zIndex: 1
            }}>
                {/* Simple Spinner */}
                <Loader2
                    size={28}
                    color="#00c8ff"
                    style={{ animation: 'spin 1s linear infinite' }}
                />

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: '#d0e8f7',
                        marginBottom: '4px'
                    }}>
                        Building your city
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '0.8125rem',
                        color: '#5a8aaa'
                    }}>
                        {STAGES[currentStage]}
                    </p>
                </div>

                {/* Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '3px',
                    background: 'rgba(0, 200, 255, 0.1)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progressWidth}%`,
                        background: 'linear-gradient(90deg, #0088cc, #00c8ff)',
                        borderRadius: '2px',
                        transition: 'width 0.4s ease',
                        boxShadow: '0 0 8px rgba(0, 200, 255, 0.3)'
                    }} />
                </div>

                {/* Percentage */}
                <span style={{
                    fontSize: '0.6875rem',
                    color: '#3a6a88',
                    fontFamily: 'ui-monospace, monospace',
                    letterSpacing: '0.05em'
                }}>
                    {Math.round(analysisProgress || 0)}%
                </span>
            </div>

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
                @keyframes gridScroll { 100% { background-position: 0 60px; } }
                @keyframes progressPulse { 0%, 100% { opacity: 1; } 50% { opacity: 0.7; } }
            `}</style>
        </div>,
        document.body
    )
}
