/**
 * ExplorationHUD.jsx
 *
 * Minimal HUD for third-person exploration mode.
 * Shows controls hint + nearby building prompt.
 */
import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, FileCode } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function ExplorationHUD() {
    const explorationMode = useStore(s => s.explorationMode)
    const setExplorationMode = useStore(s => s.setExplorationMode)

    if (!explorationMode) return null

    return (
        <>
            {/* Bottom controls bar */}
            <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 20 }}
                style={{
                    position: 'fixed',
                    bottom: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    zIndex: 1000,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    padding: '8px 16px',
                    background: 'rgba(0, 0, 0, 0.6)',
                    backdropFilter: 'blur(20px)',
                    borderRadius: '10px',
                    border: '1px solid rgba(255,255,255,0.06)',
                    color: 'rgba(255,255,255,0.4)',
                    fontSize: '0.65rem',
                    pointerEvents: 'auto',
                    fontFamily: 'var(--font-sans)',
                    whiteSpace: 'nowrap'
                }}
            >
                <span><Kbd>WASD</Kbd> Move</span>
                <Sep />
                <span><Kbd>Space</Kbd> Up <Kbd>Ctrl</Kbd> Down</span>
                <Sep />
                <span><Kbd>Shift</Kbd> Sprint</span>
                <Sep />
                <span><Kbd>RMB</Kbd> Orbit</span>
                <Sep />
                <span><Kbd>Scroll</Kbd> Zoom</span>
                <Sep />
                <button
                    onClick={() => setExplorationMode(false)}
                    style={{
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '6px',
                        padding: '3px 8px',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        fontSize: '0.6rem',
                        fontFamily: 'var(--font-sans)',
                        transition: 'all 0.15s',
                    }}
                    onMouseEnter={e => { e.currentTarget.style.borderColor = 'rgba(239,68,68,0.3)'; e.currentTarget.style.color = '#f87171' }}
                    onMouseLeave={e => { e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                >
                    <X size={10} /> ESC
                </button>
            </motion.div>
        </>
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
            color: 'rgba(255,255,255,0.6)',
            fontWeight: 500,
        }}>
            {children}
        </kbd>
    )
}

function Sep() {
    return <span style={{ color: 'rgba(255,255,255,0.08)' }}>|</span>
}
