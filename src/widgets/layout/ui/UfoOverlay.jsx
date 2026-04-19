import React, { useEffect, useState } from 'react'
import useStore from '../../../store/useStore'
import { Rocket, MousePointerClick, X } from 'lucide-react'

export default function UfoOverlay() {
    const ufoIntroOpen = useStore(s => s.ufoIntroOpen)
    const closeUfoIntro = useStore(s => s.closeUfoIntro)
    const ufoMode = useStore(s => s.ufoMode)
    const setUfoMode = useStore(s => s.setUfoMode)

    // Auto-close instruction overlay after pressing any flight key
    useEffect(() => {
        if (!ufoIntroOpen) return
        const onFirstKey = (e) => {
            const k = e.key.toLowerCase()
            if (['w', 'a', 's', 'd', ' ', 'shift'].includes(k)) {
                closeUfoIntro()
            }
        }
        window.addEventListener('keydown', onFirstKey)
        return () => window.removeEventListener('keydown', onFirstKey)
    }, [ufoIntroOpen, closeUfoIntro])

    if (!ufoMode) return null

    return (
        <div style={{
            position: 'absolute', top: 0, left: 0, right: 0, bottom: 0,
            pointerEvents: 'none', zIndex: 50, display: 'flex',
            flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end',
            paddingTop: 0, paddingBottom: '120px'
        }}>

            {ufoIntroOpen && (
                <div style={{
                    background: 'rgba(5, 8, 16, 0.85)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(0, 255, 204, 0.4)',
                    boxShadow: '0 8px 32px rgba(0,255,204,0.1)',
                    borderRadius: '16px',
                    padding: '28px 44px',
                    textAlign: 'center',
                    pointerEvents: 'auto',
                    position: 'relative',
                    marginBottom: '20px'
                }}>
                    <button
                        onClick={() => closeUfoIntro()}
                        style={{
                            position: 'absolute', top: '12px', right: '12px',
                            background: 'transparent', border: 'none', color: '#fff',
                            cursor: 'pointer', opacity: 0.6
                        }}
                    >
                        <X size={20} />
                    </button>

                    <Rocket size={48} color="#00ffcc" style={{ marginBottom: '16px', filter: 'drop-shadow(0 0 8px #00ffcc)' }} />
                    <h2 style={{
                        color: '#fff', fontSize: '24px', margin: '0 0 8px 0',
                        fontWeight: 600, letterSpacing: '1px', textTransform: 'uppercase'
                    }}>
                        Explore Mode Engaged
                    </h2>
                    <p style={{ color: 'rgba(255,255,255,0.7)', fontSize: '15px', marginBottom: '24px' }}>
                        Take control of the codebase drone. Avoid buildings.
                    </p>

                    <div style={{ display: 'flex', gap: '24px', justifyContent: 'center', marginBottom: '8px' }}>
                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <Kbd>W</Kbd>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <Kbd>A</Kbd><Kbd>S</Kbd><Kbd>D</Kbd>
                            </div>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Move</span>
                        </div>

                        <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }} />

                        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', justifyContent: 'flex-start' }}>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <Kbd style={{ width: '60px' }}>SPACE</Kbd>
                            </div>
                            <div style={{ display: 'flex', gap: '4px' }}>
                                <Kbd style={{ width: '60px' }}>SHIFT</Kbd>
                            </div>
                            <span style={{ fontSize: '13px', color: 'rgba(255,255,255,0.5)', marginTop: '4px' }}>Ascend / Descend</span>
                        </div>
                    </div>
                </div>
            )}

            {/* Minimal bottom HUD when flying — out of the way of the top toolbar */}
            {!ufoIntroOpen && (
                <div style={{
                    background: 'rgba(5, 8, 16, 0.55)',
                    backdropFilter: 'blur(10px)',
                    border: '1px solid rgba(0, 255, 204, 0.18)',
                    borderRadius: '24px',
                    padding: '8px 8px 8px 18px',
                    display: 'flex', gap: '14px', alignItems: 'center',
                    pointerEvents: 'auto',
                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)'
                }}>
                    <span style={{ color: '#00ffcc', fontSize: '12.5px', fontWeight: 600, letterSpacing: '0.08em', display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#00ffcc', borderRadius: '50%', boxShadow: '0 0 10px #00ffcc' }} />
                        DRONE ONLINE
                    </span>
                    <span style={{ color: 'rgba(255,255,255,0.42)', fontSize: '11.5px', fontFamily: 'var(--font-mono)' }}>
                        WASD · SPACE / SHIFT · Click a building to exit
                    </span>
                    <button
                        onClick={() => setUfoMode(false)}
                        style={{
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.12)',
                            color: 'rgba(255,255,255,0.9)',
                            fontSize: '12.5px', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '6px',
                            padding: '6px 12px', borderRadius: '16px',
                            transition: 'background 0.15s ease'
                        }}
                        onMouseEnter={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.12)' }}
                        onMouseLeave={(e) => { e.currentTarget.style.background = 'rgba(255,255,255,0.06)' }}
                    >
                        <X size={14} /> Exit
                    </button>
                </div>
            )}
        </div>
    )
}

function Kbd({ children, style }) {
    return (
        <div style={{
            background: 'linear-gradient(180deg, #1e2638 0%, #151b2b 100%)',
            border: '1px solid #2e3b52',
            borderBottomWidth: '3px',
            borderRadius: '6px',
            color: '#fff',
            fontSize: '14px',
            fontWeight: 600,
            width: '32px', height: '32px',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            boxShadow: '0 2px 0 rgba(0,0,0,0.4)',
            ...style
        }}>
            {children}
        </div>
    )
}
