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
    const { analysisProgress } = useStore()

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
            background: 'rgba(9, 9, 11, 0.92)',
            backdropFilter: 'blur(8px)',
            zIndex: 999999,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center'
        }}>
            <div style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '20px',
                maxWidth: '280px',
                width: '100%',
                padding: '0 24px'
            }}>
                {/* Simple Spinner */}
                <Loader2
                    size={28}
                    color="#3b82f6"
                    style={{ animation: 'spin 1s linear infinite' }}
                />

                {/* Status */}
                <div style={{ textAlign: 'center' }}>
                    <h3 style={{
                        margin: 0,
                        fontSize: '0.9375rem',
                        fontWeight: 500,
                        color: '#e4e4e7',
                        marginBottom: '4px'
                    }}>
                        Analyzing repository
                    </h3>
                    <p style={{
                        margin: 0,
                        fontSize: '0.8125rem',
                        color: '#71717a'
                    }}>
                        {STAGES[currentStage]}
                    </p>
                </div>

                {/* Progress Bar */}
                <div style={{
                    width: '100%',
                    height: '3px',
                    background: 'rgba(255, 255, 255, 0.08)',
                    borderRadius: '2px',
                    overflow: 'hidden'
                }}>
                    <div style={{
                        height: '100%',
                        width: `${progressWidth}%`,
                        background: '#3b82f6',
                        borderRadius: '2px',
                        transition: 'width 0.4s ease'
                    }} />
                </div>

                {/* Percentage */}
                <span style={{
                    fontSize: '0.6875rem',
                    color: '#52525b',
                    fontFamily: 'ui-monospace, monospace',
                    letterSpacing: '0.02em'
                }}>
                    {Math.round(analysisProgress || 0)}%
                </span>
            </div>

            <style>{`
                @keyframes spin { 100% { transform: rotate(360deg); } }
            `}</style>
        </div>,
        document.body
    )
}
