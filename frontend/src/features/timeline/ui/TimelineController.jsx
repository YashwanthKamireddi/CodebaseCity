import React from 'react'
import { Play, Square, FastForward } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function TimelineController() {
    const showTimeline = useStore(s => s.showTimeline)
    const isGenesisPlaying = useStore(s => s.isGenesisPlaying)
    const setGenesisPlay = useStore(s => s.setGenesisPlay)
    const setGenesisTime = useStore(s => s.setGenesisTime)
    const genesisTime = useStore(s => s.genesisTime)
    
    if (!showTimeline) return null

    return (
        <div style={{
            position: 'absolute', bottom: '40px', left: '50%', transform: 'translateX(-50%)',
            background: 'rgba(5, 8, 16, 0.7)', backdropFilter: 'blur(24px)',
            border: '1px solid rgba(0, 255, 204, 0.15)',
            boxShadow: '0 12px 64px rgba(0, 0, 0, 0.8)',
            borderRadius: '32px', padding: '12px 32px',
            display: 'flex', alignItems: 'center', gap: '32px', zIndex: 100
        }}>
            {/* Progress bar background */}
            <div style={{
                position: 'absolute', top: 0, left: 0, bottom: 0,
                width: \`${(genesisTime || 0) * 100}%\`,
                background: 'linear-gradient(90deg, transparent, rgba(0, 255, 204, 0.1))',
                zIndex: 0, transition: 'width 0.1s linear', pointerEvents: 'none'
            }} />

            <div style={{ display: 'flex', flexDirection: 'column', zIndex: 1 }}>
                <span style={{ fontSize: '11px', color: '#00ffcc', fontWeight: 600, letterSpacing: '2px', textTransform: 'uppercase' }}>
                    Genesis Protocol
                </span>
                <span style={{ fontSize: '14px', color: 'rgba(255,255,255,0.7)', fontWeight: 500 }}>
                    Cinematic Sequence
                </span>
            </div>

            <div style={{ width: '1px', height: '32px', background: 'rgba(255,255,255,0.1)', zIndex: 1 }} />

            <div style={{ display: 'flex', gap: '16px', zIndex: 1 }}>
                <button
                    onClick={() => setGenesisPlay(!isGenesisPlaying)}
                    style={{
                        background: isGenesisPlaying ? 'transparent' : '#00ffcc',
                        color: isGenesisPlaying ? '#00ffcc' : '#050810',
                        border: isGenesisPlaying ? '1px solid #00ffcc' : 'none',
                        width: '48px', height: '48px', borderRadius: '50%',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        cursor: 'pointer', transition: 'all 0.2s',
                        boxShadow: isGenesisPlaying ? 'none' : '0 0 20px rgba(0,255,204,0.4)'
                    }}
                >
                    {isGenesisPlaying ? <Square size={18} fill=currentColor /> : <Play size={20} fill=currentColor style={{ marginLeft: '4px' }} />}
                </button>
                <button
                    onClick={() => { setGenesisTime(1.0); setGenesisPlay(false); }}
                    title=Skip
