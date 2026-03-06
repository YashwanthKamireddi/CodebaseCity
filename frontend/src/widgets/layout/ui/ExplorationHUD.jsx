/**
 * ExplorationHUD.jsx
 *
 * Minimal HUD for third-person exploration mode.
 * Matches app design system (dark, white accents, glass).
 */
import React from 'react'
import { motion } from 'framer-motion'
import { X } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function ExplorationHUD() {
    const explorationMode = useStore(s => s.explorationMode)
    const setExplorationMode = useStore(s => s.setExplorationMode)
    const showTraffic = useStore(s => s.showTraffic)
    const toggleShowTraffic = useStore(s => s.toggleShowTraffic)

    if (!explorationMode) return null

    return (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 20 }}
            style={{
                position: 'fixed',
                bottom: '100px',
                left: '50%',
                transform: 'translateX(-50%)',
                zIndex: 1000,
                display: 'flex',
                alignItems: 'center',
                gap: '16px',
                padding: '10px 20px',
                background: 'var(--color-bg-tertiary, #111)',
                backdropFilter: 'blur(20px)',
                borderRadius: '12px',
                border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
                boxShadow: '0 12px 40px rgba(0, 0, 0, 0.5)',
                color: 'var(--color-text-secondary, #b0b3c5)',
                fontFamily: 'var(--font-body, Inter, sans-serif)',
                fontSize: '0.7rem',
                pointerEvents: 'auto',
            }}
        >
            {/* Robot icon */}
            <span style={{ fontSize: '1rem' }}>🤖</span>

            <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                <span>
                    <Kbd>W</Kbd><Kbd>A</Kbd><Kbd>S</Kbd><Kbd>D</Kbd>
                    {' '}Move
                </span>
                <Sep />
                <span>
                    <Kbd>Space</Kbd> Elevate
                </span>
                <Sep />
                <span>
                    <Kbd>Ctrl</Kbd> Descend
                </span>
                <Sep />
                <span>
                    <Kbd>Shift</Kbd> Sprint
                </span>
                <Sep />
                <span>
                    <Kbd>Scroll</Kbd> Zoom (1st Person)
                </span>
                <Sep />
                <span>
                    <Kbd>RMB</Kbd> Orbit
                </span>
                <Sep />
                <button
                    onClick={toggleShowTraffic}
                    style={{
                        background: showTraffic ? 'rgba(34, 211, 238, 0.1)' : 'transparent',
                        border: '1px solid ' + (showTraffic ? 'rgba(34, 211, 238, 0.4)' : 'rgba(255,255,255,0.1)'),
                        borderRadius: '6px',
                        padding: '2px 8px',
                        fontSize: '0.6rem',
                        color: showTraffic ? '#22d3ee' : '#71717a',
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                    }}
                >
                    {showTraffic ? 'Data Flow: ON' : 'Data Flow: OFF'}
                </button>
            </div>

            <button
                onClick={() => setExplorationMode(false)}
                style={{
                    background: 'rgba(255, 255, 255, 0.04)',
                    border: '1px solid var(--border-default, rgba(255,255,255,0.08))',
                    borderRadius: '8px',
                    padding: '5px 10px',
                    color: 'var(--color-text-tertiary, #7a7e95)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    fontSize: '0.65rem',
                    fontFamily: 'var(--font-body)',
                    transition: 'all 0.15s',
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#f87171' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'var(--border-default, rgba(255,255,255,0.08))'; e.currentTarget.style.color = 'var(--color-text-tertiary, #7a7e95)' }}
            >
                <X size={11} /> ESC
            </button>
        </motion.div>
    )
}

function Kbd({ children }) {
    return (
        <kbd style={{
            display: 'inline-block',
            padding: '1px 5px',
            margin: '0 2px',
            background: 'rgba(255, 255, 255, 0.06)',
            borderRadius: '4px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            fontSize: '0.6rem',
            fontFamily: 'var(--font-mono, monospace)',
            color: 'var(--color-text-primary, #f0f0f4)',
            fontWeight: 500,
        }}>
            {children}
        </kbd>
    )
}

function Sep() {
    return <span style={{ color: 'rgba(255,255,255,0.1)' }}>|</span>
}
