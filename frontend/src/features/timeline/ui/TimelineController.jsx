import React, { useEffect, useState } from 'react'
import { Play, RotateCcw, Shield } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function TimelineController() {
    const showTimeline = useStore(s => s.showTimeline)
    const isGenesisPlaying = useStore(s => s.isGenesisPlaying)
    const setGenesisPlay = useStore(s => s.setGenesisPlay)
    const setGenesisTime = useStore(s => s.setGenesisTime)
    const commits = useStore(s => s.commits)
    const isComplete = useStore(s => s.genesisTime >= 0.999)
    const [isVisible, setIsVisible] = useState(false)
    
    useEffect(() => {
        if (showTimeline) {
            setTimeout(() => setIsVisible(true), 600)
        } else {
            setIsVisible(false)
        }
    }, [showTimeline])

    if (!showTimeline) return null

    const handleAction = () => {
        if (isComplete) {
            setGenesisTime(0.0) 
            setTimeout(() => setGenesisPlay(true), 150) 
        } else {
            setGenesisPlay(!isGenesisPlaying)
        }
    }

    const _commitsLen = Array.isArray(commits) ? commits.length : 0;

    return (
        <div style={{
            position: 'absolute', bottom: '96px', left: '50%',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            opacity: isVisible ? (isGenesisPlaying ? 0.3 : 1.0) : 0, 
            transform: `translate(-50%, ${isVisible ? '0' : '30px'})`,
            transition: 'opacity 0.8s cubic-bezier(0.16, 1, 0.3, 1), transform 0.8s cubic-bezier(0.16, 1, 0.3, 1)',
            zIndex: 1000, pointerEvents: 'auto'
        }}
        onMouseEnter={(e) => {
             e.currentTarget.style.opacity = '1.0'
        }}
        onMouseLeave={(e) => {
             e.currentTarget.style.opacity = isGenesisPlaying ? '0.3' : '1.0'
        }}>
            
            <button
                onClick={handleAction}
                style={{
                    background: 'rgba(10, 15, 25, 0.85)',
                    backdropFilter: 'blur(24px)',
                    WebkitBackdropFilter: 'blur(24px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    boxShadow: '0 12px 64px rgba(0, 0, 0, 0.8)',
                    borderRadius: '40px',
                    padding: '8px 24px 8px 8px',
                    display: 'flex', alignItems: 'center', gap: '16px',
                    cursor: 'pointer', transition: 'all 0.4s ease-out',
                    color: '#fff', outline: 'none'
                }}
            >
                <div style={{
                    width: '44px', height: '44px', borderRadius: '50%',
                    background: isGenesisPlaying ? 'transparent' : '#fff',
                    color: isGenesisPlaying ? '#fff' : '#050810',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    border: isGenesisPlaying ? '1px solid rgba(255,255,255,0.2)' : 'none',
                    transition: 'all 0.3s ease',
                    position: 'relative'
                }}>
                    {isComplete ? (
                        <RotateCcw size={18} strokeWidth={2.5} />
                    ) : isGenesisPlaying ? (
                        <Shield size={18} strokeWidth={1.5} color="rgba(255,255,255,0.7)" />
                    ) : (
                        <Play size={20} fill="currentColor" strokeWidth={0} style={{ marginLeft: '4px' }} />
                    )}
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start', paddingRight: '8px' }}>
                    <span style={{ 
                        fontSize: '11px', color: 'rgba(255,255,255,0.5)', 
                        fontWeight: 700, letterSpacing: '2px', textTransform: 'uppercase',
                        transition: 'color 0.3s'
                    }}>
                        {isComplete ? 'Analysis Finished' : (isGenesisPlaying ? 'Simulation in Progress' : 'Git Evolution')}
                    </span>
                    <span style={{ 
                        fontSize: '14px', color: 'rgba(255,255,255,0.9)', fontWeight: 500,
                        opacity: isGenesisPlaying ? 0.7 : 1
                    }}>
                        {isComplete ? 'Replay History' : (isGenesisPlaying ? (`${Number(_commitsLen)} Commits`) : 'Play Cinematic Matrix')}
                    </span>
                </div>
            </button>
        </div>
    )
}
