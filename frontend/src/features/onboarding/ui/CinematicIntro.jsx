import React, { useState, useEffect } from 'react'

const bootSequence = [
    "INITIALIZING_KERNEL_INTERFACE...",
    "LOADING_HOLOGRAPHIC_ASSETS...",
    "CONNECTING_TO_COGNITIVE_GRID...",
    "ANALYZING_AST_STRUCTURES...",
    "RESOLVING_DEPENDENCY_GRAPH...",
    "CALCULATING_PHYSICS_MANIFOLDS...",
    "ESTABLISHING_SECURE_UPLINK...",
    "SYSTEM_READY."
]

export default function CinematicIntro({ onComplete }) {
    const [lines, setLines] = useState([])
    const [progress, setProgress] = useState(0)

    useEffect(() => {
        let currentIndex = 0

        const tick = () => {
            if (currentIndex >= bootSequence.length) {
                setTimeout(onComplete, 500) // Brief pause at end
                return
            }

            const newLine = bootSequence[currentIndex]
            setLines(prev => [...prev.slice(-7), newLine]) // Keep last 8 lines
            setProgress(p => Math.min(100, ((currentIndex + 1) / bootSequence.length) * 100))

            currentIndex++
            setTimeout(tick, Math.random() * 300 + 100) // Random typing speed
        }

        setTimeout(tick, 500)
    }, [])

    return (
        <div style={{
            position: 'absolute', inset: 0,
            background: '#09090b',
            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
            fontFamily: '"Fira Code", monospace',
            zIndex: 9999
        }}>
            {/* Progress Bar */}
            <div style={{
                width: '600px', maxWidth: '90%',
                height: '4px', background: '#27272a',
                marginBottom: '2rem', position: 'relative', overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute', top: 0, left: 0, height: '100%',
                    width: `${progress}%`,
                    background: '#00f2ff',
                    boxShadow: '0 0 20px #00f2ff',
                    transition: 'width 0.2s ease-out'
                }} />
            </div>

            {/* Terminal Lines */}
            <div style={{
                width: '600px', maxWidth: '90%',
                display: 'flex', flexDirection: 'column',
                gap: '8px',
                color: '#00f2ff', opacity: 0.8
            }}>
                {lines.map((line, i) => (
                    <div key={i} style={{
                        opacity: i === lines.length - 1 ? 1 : 0.5 - (lines.length - i) * 0.05,
                        textShadow: i === lines.length - 1 ? '0 0 10px #00f2ff' : 'none',
                        animation: 'fadeIn 0.2s ease-out'
                    }}>
                        {'>'} {line}
                    </div>
                ))}
                <div style={{
                    width: '10px', height: '20px', background: '#00f2ff',
                    animation: 'blink 1s infinite'
                }} />
            </div>

            <style>{`
                @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0; } }
                @keyframes fadeIn { from { opacity: 0; transform: translateY(10px); } to { opacity: 1; transform: translateY(0); } }
            `}</style>
        </div>
    )
}
