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
            flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-start',
            paddingTop: '80px', paddingBottom: 0
        }}>

            {ufoIntroOpen && (
                <div style={{
                    background: 'rgba(5, 8, 16, 0.85)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(0, 255, 204, 0.4)',
                    boxShadow: '0 8px 32px rgba(0,255,204,0.1)',
                    borderRadius: '16px',
                    padding: '32px 48px',
                    textAlign: 'center',
                    pointerEvents: 'auto',
                    position: 'relative'
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

            {/* Very minimal HUD when flying */}
            {!ufoIntroOpen && (
                <div style={{
                    background: 'rgba(5, 8, 16, 0.4)',
                    backdropFilter: 'blur(8px)',
                    border: '1px solid rgba(0, 255, 204, 0.1)',
                    borderRadius: '24px',
                    padding: '8px 16px',
                    display: 'flex', gap: '16px', alignItems: 'center',
                    pointerEvents: 'auto'
                }}>
                    <span style={{ color: '#00ffcc', fontSize: '13px', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '6px' }}>
                        <div style={{ width: '8px', height: '8px', background: '#00ffcc', borderRadius: '50%', boxShadow: '0 0 8px #00ffcc' }} />
                        DRONE ONLINE
                    </span>
                    <div style={{ width: '1px', height: '16px', background: 'rgba(255,255,255,0.2)' }} />
                    <button
                        onClick={() => setUfoMode(false)}
                        style={{
                            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.7)',
                            fontSize: '13px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '4px',
                            padding: 0
                        }}
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
