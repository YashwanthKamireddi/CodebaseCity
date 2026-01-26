import React, { useEffect, useCallback, useState, useRef } from 'react'
import useStore from '../../../store/useStore'
import '../../../styles/ProfessionalUI.css'
import {
    Play,
    Pause,
    SkipBack,
    SkipForward,
    ChevronLeft,
    ChevronRight,
    Clock,
    GitCommit,
    Calendar,
    User,
    Zap,
    Repeat,
    RefreshCw
} from 'lucide-react'


export default function TimelineSlider() {
    const {
        commits,
        currentCommitIndex,
        historyLoading,
        currentRepoPath,
        fetchHistory,
        setCommitIndex,
        analyzeAtCommit,
        loading,
        isAnimating,
        animationSpeed,
        startTimeTravel,
        stopTimeTravel,
        setAnimationSpeed
    } = useStore()

    const [showControls, setShowControls] = useState(false)
    const [playDirection, setPlayDirection] = useState('backward') // backward = go back in time
    const progressRef = useRef(null)

    // Fetch history when repo path changes
    useEffect(() => {
        if (currentRepoPath && commits.length === 0) {
            fetchHistory(currentRepoPath)
        }
    }, [currentRepoPath, commits.length, fetchHistory])

    const handleSliderChange = useCallback((e) => {
        const index = parseInt(e.target.value, 10)
        setCommitIndex(index)
    }, [setCommitIndex])

    const handleCommitSelect = useCallback(() => {
        if (currentCommitIndex >= 0 && currentCommitIndex < commits.length) {
            const commit = commits[currentCommitIndex]
            analyzeAtCommit(commit.hash)
        }
    }, [currentCommitIndex, commits, analyzeAtCommit])

    // Play/Pause animation
    const handlePlayPause = useCallback(() => {
        if (isAnimating) {
            stopTimeTravel()
        } else {
            const start = currentCommitIndex >= 0 ? currentCommitIndex : 0
            const end = playDirection === 'backward' ? commits.length - 1 : 0
            startTimeTravel(start, end, playDirection)
        }
    }, [isAnimating, currentCommitIndex, commits.length, playDirection, startTimeTravel, stopTimeTravel])

    // Step forward/backward one commit
    const handleStep = useCallback((direction) => {
        const newIndex = currentCommitIndex + direction
        if (newIndex >= 0 && newIndex < commits.length) {
            setCommitIndex(newIndex)
            analyzeAtCommit(commits[newIndex].hash)
        }
    }, [currentCommitIndex, commits, setCommitIndex, analyzeAtCommit])

    // Jump to first/last commit
    const handleJumpToStart = useCallback(() => {
        setCommitIndex(0)
        analyzeAtCommit(commits[0].hash)
    }, [commits, setCommitIndex, analyzeAtCommit])

    const handleJumpToEnd = useCallback(() => {
        const lastIndex = commits.length - 1
        setCommitIndex(lastIndex)
        analyzeAtCommit(commits[lastIndex].hash)
    }, [commits, setCommitIndex, analyzeAtCommit])

    const { showTimeline } = useStore()

    // Don't show if toggled off
    if (!showTimeline) return null

    // Helper to Retry
    const handleRetry = () => {
        if (currentRepoPath) fetchHistory(currentRepoPath)
    }

    // Empty / Loading State
    if (commits.length === 0) {
        return (
            <div style={{
                position: 'fixed',
                bottom: '120px',
                left: '50%',
                transform: 'translateX(-50%)',
                background: 'rgba(9, 9, 11, 0.8)',
                backdropFilter: 'blur(20px)',
                padding: '16px 24px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex', alignItems: 'center', gap: '12px',
                zIndex: 500,
                color: 'white',
                fontSize: '0.9rem',
                boxShadow: '0 20px 40px -10px rgba(0,0,0,0.5)'
            }}>
                {historyLoading ? (
                    <>
                        <RefreshCw className="spin" size={16} />
                        <span>Loading History...</span>
                    </>
                ) : (
                    <>
                        <Clock size={16} color="#94a3b8" />
                        <span style={{ color: '#94a3b8' }}>No history data available.</span>
                        <button
                            onClick={handleRetry}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: 'none',
                                padding: '4px 12px',
                                borderRadius: '6px',
                                color: 'white',
                                cursor: 'pointer',
                                fontSize: '0.85rem'
                            }}
                        >
                            Retry
                        </button>
                    </>
                )}
            </div>
        )
    }

    const currentCommit = currentCommitIndex >= 0 ? commits[currentCommitIndex] : null
    const progress = commits.length > 1 ? ((currentCommitIndex >= 0 ? currentCommitIndex : 0) / (commits.length - 1)) * 100 : 0

    return (
        <div
            // Centered above the Floating Dock
            style={{
                position: 'fixed',
                bottom: '100px', // Clear the dock
                left: '50%',
                transform: 'translateX(-50%)',
                width: '420px', // Slightly wider
                zIndex: 500,
                padding: '0',
                background: 'rgba(5, 5, 10, 0.65)',
                backdropFilter: 'blur(30px) saturate(180%)',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                borderRadius: '24px',
                boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)',
                transition: 'all 0.3s ease',
            }}
            onMouseEnter={() => setShowControls(true)}
            onMouseLeave={() => setShowControls(false)}
        >
            <div style={{ padding: '16px' }}>
                {/* Header */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    marginBottom: '16px'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            borderRadius: '6px',
                            background: 'var(--color-bg-tertiary)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            color: 'var(--color-accent)'
                        }}>
                            <Clock size={18} />
                        </div>
                        <div>
                            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: 'var(--color-text-primary)' }}>
                                History
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--color-text-tertiary)' }}>
                                {commits.length} commits
                            </div>
                        </div>
                        {isAnimating && (
                            <span className="p-tag p-tag-red">
                                LIVE
                            </span>
                        )}
                    </div>
                    <div className="p-tag p-tag-default">
                        {currentCommitIndex >= 0 ? currentCommitIndex + 1 : commits.length} / {commits.length}
                    </div>
                </div>

                {/* Timeline Progress Bar */}
                <div style={{ position: 'relative', marginBottom: '16px', padding: '10px 0' }}>
                    {/* Background track */}
                    <div style={{
                        position: 'absolute',
                        top: '50%',
                        left: 0,
                        right: 0,
                        height: '4px',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: '2px',
                        transform: 'translateY(-50%)'
                    }}>
                        {/* Progress fill */}
                        <div style={{
                            position: 'absolute',
                            left: 0,
                            top: 0,
                            height: '100%',
                            width: `${progress}%`,
                            background: 'var(--color-accent)',
                            borderRadius: '2px',
                            transition: isAnimating ? 'none' : 'width 0.3s ease'
                        }} />
                    </div>

                    {/* Slider */}
                    <input
                        type="range"
                        min="0"
                        max={commits.length - 1}
                        value={currentCommitIndex >= 0 ? currentCommitIndex : 0}
                        onChange={handleSliderChange}
                        disabled={loading || historyLoading || isAnimating}
                        className="timeline-slider"
                        style={{
                            width: '100%',
                            height: '24px',
                            appearance: 'none',
                            background: 'transparent',
                            cursor: loading || isAnimating ? 'not-allowed' : 'pointer',
                            position: 'relative',
                            zIndex: 2
                        }}
                    />
                </div>

                {/* Playback Controls */}
                <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    gap: '4px',
                    marginBottom: '12px'
                }}>
                    <ControlButton onClick={handleJumpToEnd} disabled={loading || isAnimating} title="Oldest">
                        <SkipBack size={16} />
                    </ControlButton>
                    <ControlButton onClick={() => handleStep(1)} disabled={loading || isAnimating || currentCommitIndex >= commits.length - 1} title="Previous">
                        <ChevronLeft size={16} />
                    </ControlButton>

                    <button
                        onClick={handlePlayPause}
                        disabled={loading && !isAnimating}
                        className="p-btn p-btn-primary"
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            padding: 0,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        {isAnimating ? <Pause size={20} /> : <Play size={20} />}
                    </button>

                    <ControlButton onClick={() => handleStep(-1)} disabled={loading || isAnimating || currentCommitIndex <= 0} title="Next">
                        <ChevronRight size={16} />
                    </ControlButton>
                    <ControlButton onClick={handleJumpToStart} disabled={loading || isAnimating} title="Newest">
                        <SkipForward size={16} />
                    </ControlButton>
                </div>

                {/* Speed & Direction (shown on hover) */}
                {showControls && (
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        gap: '16px',
                        paddingTop: '12px',
                        borderTop: '1px solid var(--border-subtle)'
                    }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                            <Zap size={12} className="text-secondary" />
                            {[500, 1000, 2000].map(speed => (
                                <button
                                    key={speed}
                                    onClick={() => setAnimationSpeed(speed)}
                                    className={`p-tag ${animationSpeed === speed ? 'p-tag-blue' : 'p-tag-default'}`}
                                    style={{ cursor: 'pointer', border: 'none' }}
                                >
                                    {speed === 500 ? '2x' : speed === 1000 ? '1x' : '0.5x'}
                                </button>
                            ))}
                        </div>

                        <div style={{ width: '1px', height: '16px', background: 'var(--border-subtle)' }} />

                        <button
                            onClick={() => setPlayDirection(d => d === 'backward' ? 'forward' : 'backward')}
                            className="p-btn p-btn-secondary"
                            style={{ padding: '2px 8px', fontSize: '11px', height: '24px' }}
                        >
                            <Repeat size={12} style={{ marginRight: '4px' }} />
                            {playDirection === 'backward' ? 'To Past' : 'To Future'}
                        </button>
                    </div>
                )}

                {/* Commit Info */}
                {currentCommit && (
                    <div style={{
                        marginTop: '16px',
                        padding: '12px',
                        background: 'var(--color-bg-tertiary)',
                        borderRadius: 'var(--radius-md)',
                        display: 'flex',
                        gap: '12px',
                        alignItems: 'center'
                    }}>
                        <div style={{
                            width: '32px',
                            height: '32px',
                            background: 'var(--color-bg-secondary)',
                            borderRadius: '4px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            border: '1px solid var(--border-subtle)'
                        }}>
                            <GitCommit size={16} color="var(--color-text-secondary)" />
                        </div>
                        <div style={{ flex: 1, minWidth: 0 }}>
                            <div className="truncate" style={{ fontSize: '0.875rem', fontWeight: 500, color: 'var(--color-text-primary)' }}>
                                {currentCommit.message}
                            </div>
                            <div style={{ display: 'flex', gap: '12px', fontSize: '0.75rem', color: 'var(--color-text-tertiary)', marginTop: '2px' }}>
                                <span style={{ fontFamily: 'var(--font-mono)' }}>{currentCommit.short_hash}</span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <Calendar size={10} /> {currentCommit.date}
                                </span>
                                <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                                    <User size={10} /> {currentCommit.author}
                                </span>
                            </div>
                        </div>
                        <button
                            onClick={handleCommitSelect}
                            disabled={loading || isAnimating}
                            className="p-btn p-btn-primary"
                            style={{ fontSize: '0.75rem', padding: '4px 10px' }}
                        >
                            Switch
                        </button>
                    </div>
                )}
            </div>

            {/* Slider Scrubber Style */}
            <style>{`
                .timeline-slider::-webkit-slider-thumb {
                    appearance: none;
                    width: 14px;
                    height: 14px;
                    background: var(--color-accent);
                    border-radius: 50%;
                    cursor: pointer;
                    box-shadow: 0 0 0 2px var(--color-bg-primary);
                    transition: transform 0.15s ease;
                    margin-top: -5px;
                }
                .timeline-slider::-webkit-slider-thumb:hover {
                    transform: scale(1.2);
                }
            `}</style>
        </div>
    )
}

function ControlButton({ children, onClick, disabled, title }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            className="p-icon-btn"
            style={{
                width: '32px',
                height: '32px',
                opacity: disabled ? 0.4 : 1,
                cursor: disabled ? 'not-allowed' : 'pointer'
            }}
        >
            {children}
        </button>
    )
}
