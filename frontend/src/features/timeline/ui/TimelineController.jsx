import logger from '../../../utils/logger'
/**
 * TimelineController.jsx
 *
 * Premium Timeline UI — smooth city growth playback
 * Design: Matches app theme (dark, white accents, glass panels)
 * Features: Play/pause, scrubbing, commit info, keyboard shortcuts
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, SkipBack, SkipForward, ChevronFirst, ChevronLast } from 'lucide-react'
import useStore from '../../../store/useStore'


export default function TimelineController() {
    const cityData = useStore(s => s.cityData)
    const showTimeline = useStore(s => s.showTimeline)
    const setCityData = useStore(s => s.setCityData)
    const setAnimating = useStore(s => s.setAnimating)
    const setCommitIndex = useStore(s => s.setCommitIndex)
    const [history, setHistory] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isScrubbing, setIsScrubbing] = useState(false)
    const [hoveredIndex, setHoveredIndex] = useState(null)
    const [playbackSpeed, setPlaybackSpeed] = useState(1)
    const debounceRef = useRef(null)
    const abortControllerRef = useRef(null)
    const trackRef = useRef(null)

    // Sync global animation state
    useEffect(() => {
        setAnimating(isPlaying || isScrubbing)
        return () => setAnimating(false)
    }, [isPlaying, isScrubbing, setAnimating])

    // Sync global commit index
    useEffect(() => {
        setCommitIndex(currentIndex)
        return () => setCommitIndex(-1)
    }, [currentIndex, setCommitIndex])

    // Fetch history via store (client-side — uses GitHub REST API)
    useEffect(() => {
        if (!cityData?.path || !showTimeline) return
        const store = useStore.getState()
        store.fetchHistory(cityData.path).then(() => {
            const { commits } = useStore.getState()
            if (commits?.length > 0) {
                const chronological = [...commits].reverse()
                setHistory(chronological)
                setCurrentIndex(chronological.length - 1)
            } else {
                setHistory([{
                    date: new Date().toLocaleDateString(),
                    short_hash: 'HEAD',
                    message: 'Current State',
                    author: 'You',
                    timestamp: Date.now() / 1000
                }])
                setCurrentIndex(0)
            }
        }).catch(() => {
            setHistory([{
                date: "Now",
                short_hash: "LOCAL",
                message: "Current View",
                author: "Local",
                timestamp: Date.now() / 1000
            }])
        })
    }, [cityData?.path, showTimeline])

    // Analyze at commit — uses store's client-side analysis
    const performAnalysis = useCallback(async (commit) => {
        if (!commit?.hash) return
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }
        const controller = new AbortController()
        abortControllerRef.current = controller

        setIsLoading(true)
        try {
            const store = useStore.getState()
            await store.analyzeAtCommit(commit.hash)
        } catch (e) {
            if (e.name === 'AbortError') return
            logger.error("Time Travel Failed:", e)
        } finally {
            if (abortControllerRef.current === controller) {
                setIsLoading(false)
                setIsScrubbing(false)
                abortControllerRef.current = null
            }
        }
    }, [])

    // Cleanup
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

    // Debounced scrub
    const debouncedTravel = useCallback((commit) => {
        if (!commit || commit.short_hash === 'HEAD' || commit.short_hash === 'LOCAL') return
        if (debounceRef.current) clearTimeout(debounceRef.current)

        setIsScrubbing(true)
        debounceRef.current = setTimeout(() => {
            performAnalysis(commit)
        }, 200)
    }, [performAnalysis])

    // Slider change
    const handleSliderChange = (e) => {
        const newIndex = parseInt(e.target.value)
        setIsPlaying(false)
        setIsScrubbing(true)
        setCurrentIndex(newIndex)
        debouncedTravel(history[newIndex])
    }

    // Step
    const handleStep = useCallback((direction) => {
        setIsPlaying(false)
        const newIndex = currentIndex + direction
        if (newIndex >= 0 && newIndex < history.length) {
            setCurrentIndex(newIndex)
            performAnalysis(history[newIndex])
        }
    }, [currentIndex, history, performAnalysis])

    // Jump to start/end
    const handleJumpStart = () => {
        setIsPlaying(false)
        setCurrentIndex(0)
        if (history[0]?.hash) performAnalysis(history[0])
    }

    const handleJumpEnd = () => {
        setIsPlaying(false)
        const last = history.length - 1
        setCurrentIndex(last)
        if (history[last]?.hash) performAnalysis(history[last])
    }

    // Playback loop — uses refs to avoid stale closures
    const currentIndexRef = useRef(currentIndex)
    currentIndexRef.current = currentIndex

    const isPlayingRef = useRef(isPlaying)
    isPlayingRef.current = isPlaying

    useEffect(() => {
        let isCancelled = false

        const loop = async () => {
            if (!isPlayingRef.current || isCancelled) return

            let nextIndex = currentIndexRef.current + 1
            if (nextIndex >= history.length) {
                setIsPlaying(false)
                return
            }

            setCurrentIndex(nextIndex)
            await performAnalysis(history[nextIndex])

            if (!isPlayingRef.current || isCancelled) return

            const delay = Math.max(300, 1200 / playbackSpeed)
            setTimeout(loop, delay)
        }

        if (isPlaying) loop()

        return () => { isCancelled = true }
    }, [isPlaying, history, playbackSpeed, performAnalysis])

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (!showTimeline) return
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return

            switch (e.key) {
                case 'ArrowLeft':
                    e.preventDefault()
                    handleStep(-1)
                    break
                case 'ArrowRight':
                    e.preventDefault()
                    handleStep(1)
                    break
                case ' ':
                    e.preventDefault()
                    setIsPlaying(p => !p)
                    break
                default:
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [showTimeline, handleStep])

    // Speed cycle
    const cycleSpeed = () => {
        setPlaybackSpeed(s => s === 0.5 ? 1 : s === 1 ? 2 : 0.5)
    }

    if (!cityData || !showTimeline || history.length === 0) return null

    const currentCommit = history[currentIndex] || {}
    const progress = history.length > 1 ? (currentIndex / (history.length - 1)) * 100 : 100
    const hoverCommit = hoveredIndex !== null ? history[hoveredIndex] : null

    return createPortal(
        <div
                className="timeline-wrapper"
                style={{ animation: 'anim-slide-from-bottom 0.4s cubic-bezier(0.32, 0.72, 0, 1) both' }}
            >
                <div className="timeline-panel">

                    {/* Play Controls */}
                    <div className="timeline-controls">
                        <ControlButton
                            onClick={handleJumpStart}
                            disabled={currentIndex <= 0}
                            title="Jump to first commit"
                        >
                            <ChevronFirst size={14} />
                        </ControlButton>

                        <ControlButton
                            onClick={() => handleStep(-1)}
                            disabled={currentIndex <= 0}
                            title="Previous commit (←)"
                        >
                            <SkipBack size={13} />
                        </ControlButton>

                        {/* Play/Pause — primary action */}
                        <button
                            onClick={() => {
                                if (!isPlaying && currentIndex >= history.length - 1) {
                                    setCurrentIndex(0)
                                    performAnalysis(history[0])
                                }
                                setIsPlaying(p => !p)
                            }}
                            style={{
                                width: '36px',
                                height: '36px',
                                borderRadius: '10px',
                                background: isPlaying
                                    ? 'rgba(255, 255, 255, 0.1)'
                                    : 'var(--color-accent, #fff)',
                                border: '1px solid rgba(255, 255, 255, 0.1)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                cursor: 'pointer',
                                flexShrink: 0,
                                transition: 'all 0.2s ease',
                                color: isPlaying ? '#fff' : '#000',
                            }}
                            title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}
                        >
                            {isPlaying
                                ? <Pause size={15} strokeWidth={2.5} />
                                : <Play size={15} strokeWidth={2.5} style={{ marginLeft: '1px' }} />
                            }
                        </button>

                        <ControlButton
                            onClick={() => handleStep(1)}
                            disabled={currentIndex >= history.length - 1}
                            title="Next commit (→)"
                        >
                            <SkipForward size={13} />
                        </ControlButton>

                        <ControlButton
                            onClick={handleJumpEnd}
                            disabled={currentIndex >= history.length - 1}
                            title="Jump to latest"
                        >
                            <ChevronLast size={14} />
                        </ControlButton>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '28px', background: 'var(--border-default, rgba(255,255,255,0.08))', flexShrink: 0 }} />

                    {/* Timeline Track */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px' }}>

                        {/* Top: Hash + Date + Author */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'var(--color-text-primary, #f0f0f4)',
                                    fontFamily: 'var(--font-mono, monospace)',
                                }}>
                                    {currentCommit.short_hash}
                                </span>
                                <span style={{
                                    fontSize: '0.65rem',
                                    color: 'var(--color-text-tertiary, #7a7e95)',
                                }}>
                                    {currentCommit.date}
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.65rem',
                                color: 'var(--color-text-secondary, #b0b3c5)',
                                background: 'rgba(255,255,255,0.04)',
                                padding: '3px 8px',
                                borderRadius: '100px',
                                border: '1px solid rgba(255,255,255,0.04)',
                            }}>
                                <div style={{
                                    width: '16px',
                                    height: '16px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    background: 'var(--gray-700, #3f3f46)',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center',
                                    flexShrink: 0,
                                }}>
                                    <img
                                        src={`https://unavatar.io/${currentCommit.email || currentCommit.author}?fallback=false`}
                                        alt=""
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                                    />
                                    <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '8px', fontWeight: 700, color: '#fff' }}>
                                        {currentCommit.author ? currentCommit.author.charAt(0).toUpperCase() : '?'}
                                    </div>
                                </div>
                                <span style={{ maxWidth: '80px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontWeight: 500 }}>
                                    {currentCommit.author}
                                </span>
                            </div>
                        </div>

                        {/* Slider Track */}
                        <div
                            ref={trackRef}
                            style={{ position: 'relative', height: '20px', display: 'flex', alignItems: 'center', cursor: 'pointer' }}
                            onMouseMove={(e) => {
                                if (!trackRef.current || history.length <= 1) return
                                const rect = trackRef.current.getBoundingClientRect()
                                const ratio = Math.max(0, Math.min(1, (e.clientX - rect.left) / rect.width))
                                setHoveredIndex(Math.round(ratio * (history.length - 1)))
                            }}
                            onMouseLeave={() => setHoveredIndex(null)}
                        >
                            {/* Background */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                width: '100%',
                                height: '4px',
                                background: 'rgba(255, 255, 255, 0.06)',
                                borderRadius: '2px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                            }} />

                            {/* Progress */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                width: `${progress}%`,
                                height: '4px',
                                background: isLoading
                                    ? 'var(--color-warning, #f59e0b)'
                                    : 'var(--color-accent, #fff)',
                                borderRadius: '2px',
                                transition: isScrubbing ? 'none' : 'width 0.3s ease',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                opacity: 0.9,
                            }} />

                            {/* Commit dots */}
                            {history.length > 2 && history.length <= 60 && history.map((_, i) => {
                                if (history.length > 20 && i % Math.ceil(history.length / 20) !== 0) return null
                                const pos = (i / (history.length - 1)) * 100
                                return (
                                    <div
                                        key={i}
                                        style={{
                                            position: 'absolute',
                                            left: `${pos}%`,
                                            top: '50%',
                                            transform: 'translate(-50%, -50%)',
                                            width: '3px',
                                            height: '3px',
                                            borderRadius: '50%',
                                            background: i <= currentIndex ? 'rgba(255,255,255,0.5)' : 'rgba(255,255,255,0.12)',
                                            pointerEvents: 'none',
                                        }}
                                    />
                                )
                            })}

                            {/* Hidden native slider */}
                            <input
                                type="range"
                                min={0}
                                max={Math.max(0, history.length - 1)}
                                value={currentIndex}
                                onChange={handleSliderChange}
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '100%',
                                    top: 0,
                                    left: 0,
                                    margin: 0,
                                    opacity: 0,
                                    cursor: 'grab',
                                    zIndex: 10,
                                }}
                            />

                            {/* Handle */}
                            <div
                                style={{
                                    position: 'absolute',
                                    left: `${progress}%`,
                                    top: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '12px',
                                    height: '12px',
                                    background: '#ffffff',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 0 3px rgba(255, 255, 255, 0.15), 0 2px 6px rgba(0,0,0,0.5)',
                                    pointerEvents: 'none',
                                    zIndex: 5,
                                    animation: isLoading ? 'anim-pulse-scale 0.8s ease-in-out infinite' : undefined,
                                }}
                            />

                            {/* Hover tooltip */}
                            {hoveredIndex !== null && hoverCommit && hoveredIndex !== currentIndex && (
                                <div style={{
                                    position: 'absolute',
                                    left: `${(hoveredIndex / (history.length - 1)) * 100}%`,
                                    bottom: '22px',
                                    transform: 'translateX(-50%)',
                                    background: 'var(--color-bg-elevated, #161616)',
                                    border: '1px solid rgba(255,255,255,0.1)',
                                    borderRadius: '8px',
                                    padding: '6px 10px',
                                    fontSize: '0.6rem',
                                    color: 'var(--color-text-secondary)',
                                    fontFamily: 'var(--font-mono)',
                                    whiteSpace: 'nowrap',
                                    pointerEvents: 'none',
                                    zIndex: 20,
                                    boxShadow: '0 8px 24px rgba(0,0,0,0.4)',
                                }}>
                                    <span style={{ fontWeight: 600, color: '#fff' }}>{hoverCommit.short_hash}</span>
                                    {' '}{hoverCommit.date}
                                </div>
                            )}
                        </div>

                        {/* Commit message */}
                        <div style={{
                            fontSize: '0.6rem',
                            color: 'var(--color-text-muted, #555870)',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: '320px',
                        }}>
                            {currentCommit.message}
                        </div>
                    </div>

                    {/* Divider */}
                    <div style={{ width: '1px', height: '28px', background: 'var(--border-default, rgba(255,255,255,0.08))', flexShrink: 0 }} />

                    {/* Speed + Counter */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', flexShrink: 0 }}>
                        <button
                            onClick={cycleSpeed}
                            style={{
                                fontSize: '0.6rem',
                                fontWeight: 600,
                                color: 'var(--color-text-tertiary, #7a7e95)',
                                background: 'rgba(255,255,255,0.04)',
                                border: '1px solid rgba(255,255,255,0.06)',
                                borderRadius: '6px',
                                padding: '3px 8px',
                                cursor: 'pointer',
                                fontFamily: 'var(--font-mono)',
                                transition: 'all 0.15s',
                            }}
                            title="Change playback speed"
                        >
                            {playbackSpeed}x
                        </button>
                        <span style={{
                            fontSize: '0.55rem',
                            color: 'var(--color-text-muted, #555870)',
                            fontFamily: 'var(--font-mono)',
                        }}>
                            {currentIndex + 1}/{history.length}
                        </span>
                    </div>
                </div>
                <style>{`
                    .timeline-wrapper {
                        position: fixed;
                        bottom: 110px;
                        left: 50%;
                        translate: -50% 0;
                        z-index: 9000;
                        pointer-events: none;
                    }
                    .timeline-panel {
                        background: var(--color-bg-tertiary, #111);
                        backdrop-filter: blur(24px) saturate(180%);
                        -webkit-backdrop-filter: blur(24px) saturate(180%);
                        border-radius: 16px;
                        padding: 14px 20px;
                        border: 1px solid var(--border-default, rgba(255,255,255,0.08));
                        box-shadow: 0 20px 60px -12px rgba(0, 0, 0, 0.7), 0 0 0 1px rgba(255,255,255,0.03) inset;
                        display: flex;
                        align-items: center;
                        justify-content: center;
                        gap: 16px;
                        pointer-events: auto;
                        width: max-content;
                        max-width: 90vw;
                        font-family: var(--font-body, Inter, sans-serif);
                    }
                    .timeline-controls {
                        display: flex;
                        align-items: center;
                        gap: 4px;
                        flex-shrink: 0;
                    }

                    /* Mobile responsive */
                    @media (max-width: 768px) {
                        .timeline-wrapper {
                            bottom: calc(64px + env(safe-area-inset-bottom, 0) + 8px);
                            left: 8px;
                            right: 8px;
                            transform: none;
                        }
                        .timeline-panel {
                            min-width: auto;
                            max-width: none;
                            width: 100%;
                            padding: 10px 14px;
                            gap: 10px;
                            flex-wrap: wrap;
                        }
                        .timeline-controls {
                            order: 2;
                            flex: 1;
                            justify-content: center;
                        }
                        .timeline-track-container {
                            order: 1;
                            flex: 0 0 100%;
                        }
                        .timeline-divider {
                            display: none !important;
                        }
                        .timeline-speed-container {
                            display: none !important;
                        }
                    }

                    @media (max-width: 480px) {
                        .timeline-panel {
                            padding: 8px 10px;
                            gap: 8px;
                        }
                    }
                `}</style>            </div>,
        document.body
    )
}

function ControlButton({ onClick, disabled, title, children }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                width: '28px',
                height: '28px',
                borderRadius: '8px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.04)',
                color: disabled ? 'rgba(255,255,255,0.15)' : 'var(--color-text-secondary, #b0b3c5)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease',
            }}
        >
            {children}
        </button>
    )
}
