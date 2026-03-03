/**
 * ExplorationHUD.jsx
 *
 * A minimal heads-up display shown when first-person exploration mode is active.
 * Shows WASD controls, flight instructions, and an exit button.
 */
import React from 'react'
import { motion } from 'framer-motion'
import { Gamepad2, X } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function ExplorationHUD() {
    const explorationMode = useStore(s => s.explorationMode)
    const setExplorationMode = useStore(s => s.setExplorationMode)

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
                gap: '20px',
                padding: '14px 28px',
                background: 'rgba(0, 0, 0, 0.85)',
                backdropFilter: 'blur(20px)',
                borderRadius: '16px',
                border: '1px solid rgba(0, 242, 255, 0.2)',
                color: '#fff',
                fontFamily: 'var(--font-mono)',
                fontSize: '0.75rem',
                letterSpacing: '0.05em',
                boxShadow: '0 8px 32px rgba(0, 0, 0, 0.5)',
                pointerEvents: 'auto'
            }}
        >
            <Gamepad2 size={16} color="#00f2ff" />

            <div style={{ display: 'flex', gap: '16px', alignItems: 'center' }}>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <kbd style={kbdStyle}>W</kbd><kbd style={kbdStyle}>A</kbd><kbd style={kbdStyle}>S</kbd><kbd style={kbdStyle}>D</kbd>
                    {' '}Move
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <kbd style={kbdStyle}>Space</kbd> Up
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    <kbd style={kbdStyle}>Shift</kbd> Sprint
                </span>
                <span style={{ color: 'rgba(255,255,255,0.3)' }}>|</span>
                <span style={{ color: 'rgba(255,255,255,0.5)' }}>
                    Mouse Look
                </span>
            </div>

            <button
                onClick={() => setExplorationMode(false)}
                style={{
                    background: 'rgba(255, 255, 255, 0.05)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '8px',
                    padding: '6px 12px',
                    color: 'rgba(255, 255, 255, 0.6)',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '6px',
                    fontSize: '0.7rem',
                    fontFamily: 'var(--font-mono)',
                    transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = 'rgba(255,100,100,0.5)'; e.currentTarget.style.color = '#f87171' }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.6)' }}
            >
                <X size={12} /> ESC
            </button>
        </motion.div>
    )
}

const kbdStyle = {
    display: 'inline-block',
    padding: '2px 6px',
    margin: '0 2px',
    background: 'rgba(255, 255, 255, 0.08)',
    borderRadius: '4px',
    border: '1px solid rgba(255, 255, 255, 0.15)',
    fontSize: '0.65rem',
    fontFamily: 'var(--font-mono)',
    color: '#00f2ff'
}
