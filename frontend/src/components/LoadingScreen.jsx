import React, { useState, useEffect } from 'react'
import useStore from '../store/useStore'

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

    return (
        <div className="loading-overlay">
            <div className="loading-container">
                {/* Animated City Icon */}
                <div className="loading-icon">
                    <svg width="80" height="80" viewBox="0 0 80 80" fill="none">
                        <rect x="10" y="40" width="12" height="30" fill="#818cf8" rx="2">
                            <animate attributeName="height" values="30;40;30" dur="1s" repeatCount="indefinite" />
                            <animate attributeName="y" values="40;30;40" dur="1s" repeatCount="indefinite" />
                        </rect>
                        <rect x="26" y="25" width="12" height="45" fill="#a78bfa" rx="2">
                            <animate attributeName="height" values="45;55;45" dur="1.2s" repeatCount="indefinite" />
                            <animate attributeName="y" values="25;15;25" dur="1.2s" repeatCount="indefinite" />
                        </rect>
                        <rect x="42" y="35" width="12" height="35" fill="#c4b5fd" rx="2">
                            <animate attributeName="height" values="35;45;35" dur="0.8s" repeatCount="indefinite" />
                            <animate attributeName="y" values="35;25;35" dur="0.8s" repeatCount="indefinite" />
                        </rect>
                        <rect x="58" y="20" width="12" height="50" fill="#818cf8" rx="2">
                            <animate attributeName="height" values="50;60;50" dur="1.4s" repeatCount="indefinite" />
                            <animate attributeName="y" values="20;10;20" dur="1.4s" repeatCount="indefinite" />
                        </rect>
                        <rect x="5" y="70" width="70" height="4" fill="#4ade80" rx="2" />
                    </svg>
                </div>

                {/* Title */}
                <h2 className="loading-title">Building Your City{dots}</h2>

                {/* Current Stage */}
                <div className="loading-stage">
                    <span className="stage-icon">{STAGES[currentStage]?.icon}</span>
                    <span className="stage-label">{STAGES[currentStage]?.label}</span>
                </div>

                {/* Progress Bar */}
                <div className="loading-progress">
                    <div
                        className="loading-progress-bar"
                        style={{
                            width: analysisProgress > 0 ? `${analysisProgress}%` : '30%',
                            animation: analysisProgress > 0 ? 'none' : 'pulse 1.5s ease-in-out infinite'
                        }}
                    />
                </div>

                {/* Stage Indicators */}
                <div className="loading-stages">
                    {STAGES.map((stage, i) => (
                        <div
                            key={stage.id}
                            className={`stage-dot ${i <= currentStage ? 'active' : ''} ${i === currentStage ? 'current' : ''}`}
                            title={stage.label}
                        />
                    ))}
                </div>

                {/* Tip */}
                <p className="loading-tip">
                    Tip: Click on any building to explore file details
                </p>
            </div>
        </div>
    )
}
