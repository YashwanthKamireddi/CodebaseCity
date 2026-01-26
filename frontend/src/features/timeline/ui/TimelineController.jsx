/**
 * TimelineController.jsx
 *
 * Premium Timeline UI - "Gource Mode"
 * Design: Minimal floating bar with smooth scrubbing and keyboard support.
 * Refactored for smooth async playback loop to prevent API overload.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { Play, Pause, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'
import useStore from '../../../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function TimelineController() {
    const { cityData, showTimeline, setCityData, setAnimating, setCommitIndex, sidebarOpen, sidebarWidth } = useStore()
    const [history, setHistory] = useState([])
    const [currentIndex, setCurrentIndex] = useState(0)
    const [isPlaying, setIsPlaying] = useState(false)
    const [isLoading, setIsLoading] = useState(false)
    const [isScrubbing, setIsScrubbing] = useState(false)
    const debounceRef = useRef(null)

    // Sync global animation state (for InstancedCity optimization)
    useEffect(() => {
        setAnimating(isPlaying || isScrubbing)
        return () => setAnimating(false)
    }, [isPlaying, isScrubbing, setAnimating])

    // Sync global Commit Index (Critical for disabling growth animation during time travel)
    useEffect(() => {
        setCommitIndex(currentIndex)
        return () => setCommitIndex(-1) // Reset on unmount
    }, [currentIndex, setCommitIndex])

    // Fetch History
    useEffect(() => {
        if (!cityData?.path || !showTimeline) return

        const fetchHistory = async () => {
            try {
                const url = `/api/history?path=${encodeURIComponent(cityData.path)}&limit=100`
                const res = await fetch(url)
                const data = await res.json()

                if (!data.commits || data.commits.length === 0) {
                    setHistory([{
                        date: new Date().toLocaleDateString(),
                        short_hash: 'HEAD',
                        message: 'Current State',
                        author: 'You',
                        timestamp: Date.now() / 1000
                    }])
                    setCurrentIndex(0)
                } else {
                    const chronological = [...data.commits].reverse()
                    setHistory(chronological)
                    setCurrentIndex(chronological.length - 1)
                }
            } catch (e) {
                setHistory([{
                    date: "Now",
                    short_hash: "LOCAL",
                    message: "Current View",
                    author: "Local",
                    timestamp: Date.now() / 1000
                }])
            }
        }

        fetchHistory()
    }, [cityData?.path, showTimeline])

    // Raw API Call (Memoized)
    const performAnalysis = useCallback(async (commit) => {
        setIsLoading(true)
        try {
            const res = await fetch('/api/analyze-at-commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: cityData.path,
                    commit_hash: commit.hash
                })
            })

            if (res.ok) {
                const newCityData = await res.json()
                setCityData(newCityData)
            }
        } catch (e) {
            console.error("Time Travel Failed:", e)
        } finally {
            setIsLoading(false)
            setIsScrubbing(false)
        }
    }, [cityData?.path, setCityData])

    // Debounced Wrapper for SCRUBBING
    const debouncedTravel = useCallback((commit) => {
        if (!commit || commit.short_hash === 'HEAD' || commit.short_hash === 'LOCAL') return
        if (debounceRef.current) clearTimeout(debounceRef.current)

        setIsScrubbing(true)
        debounceRef.current = setTimeout(() => {
            performAnalysis(commit)
        }, 400)
    }, [performAnalysis])

    // Handle slider change
    const handleSliderChange = (e) => {
        const newIndex = parseInt(e.target.value)
        setCurrentIndex(newIndex)
        setIsPlaying(false)
        debouncedTravel(history[newIndex])
    }

    // Step navigation
    const handleStep = (direction) => {
        const newIndex = currentIndex + direction
        if (newIndex >= 0 && newIndex < history.length) {
            setCurrentIndex(newIndex)
            setIsPlaying(false)
            performAnalysis(history[newIndex])
        }
    }

    // Async Recursive Playback Engine
    useEffect(() => {
        let isCancelled = false

        const playNext = () => {
            if (isCancelled || !isPlaying || isLoading) return

            setCurrentIndex(prev => {
                const nextIndex = prev + 1
                if (nextIndex >= history.length) {
                    setIsPlaying(false)
                    return prev
                }
                performAnalysis(history[nextIndex])
                return nextIndex
            })
        }

        playNext()

        return () => { isCancelled = true }
    }, [isPlaying, isLoading, history, performAnalysis])

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
    }, [showTimeline, currentIndex, history])

    if (!cityData || !showTimeline) return null

    const currentCommit = history[currentIndex] || {}
    const progress = history.length > 1 ? (currentIndex / (history.length - 1)) * 100 : 100

    return (
        <AnimatePresence>
            <motion.div
                key="timeline-bar"
                initial={{ y: 80, opacity: 0 }}
                animate={{
                    y: 0,
                    opacity: 1,
                    // Precise centering: 50vw + half sidebar width
                    left: sidebarOpen ? `calc(50% + ${sidebarWidth / 2}px)` : '50%'
                }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed',
                    bottom: '120px', // Closer to dock (was 140px)
                    left: '20%', // Default, overridden by animate
                    transform: 'translateX(-50%)',
                    zIndex: 200,
                    width: '100%',
                    maxWidth: '560px',
                    padding: '0 24px',
                    pointerEvents: 'auto',
                    boxSizing: 'border-box' // Fix centering if padding adds to width
                }}
            >
                <div style={{
                    background: 'rgba(9, 9, 11, 0.85)',
                    backdropFilter: 'blur(20px)',
                    WebkitBackdropFilter: 'blur(20px)',
                    borderRadius: '16px',
                    padding: '12px 20px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 20px 40px -10px rgba(0, 0, 0, 0.6)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '24px' // Increased gap for breathing room
                }}>

                    {/* Play/Pause Button */}
                    <button
                        onClick={() => {
                            // Auto-Rewind Logic
                            if (!isPlaying && currentIndex >= history.length - 1) {
                                setCurrentIndex(0)
                                performAnalysis(history[0])
                            }
                            setIsPlaying(p => !p)
                        }}
                        style={{
                            width: '40px',
                            height: '40px',
                            borderRadius: '50%',
                            background: isPlaying
                                ? 'white'
                                : 'linear-gradient(135deg, #6366f1, #8b5cf6)',
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            boxShadow: isPlaying
                                ? '0 0 20px rgba(255,255,255,0.3)'
                                : '0 4px 12px rgba(99, 102, 241, 0.4)',
                            transition: 'all 0.2s ease'
                        }}
                    >
                        {isPlaying
                            ? <Pause size={18} fill="#09090b" stroke="#09090b" />
                            : <Play size={18} fill="white" stroke="white" style={{ marginLeft: '2px' }} />
                        }
                    </button>

                    {/* Timeline Track */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px', marginRight: '8px' }}>

                        {/* Meta Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <span style={{
                                    fontSize: '0.75rem',
                                    fontWeight: 600,
                                    color: 'white',
                                    fontFamily: 'var(--font-mono, monospace)'
                                }}>
                                    {currentCommit.short_hash}
                                </span>
                                <span style={{ color: '#52525b' }}>•</span>
                                <span style={{ fontSize: '0.75rem', color: '#71717a' }}>
                                    {currentCommit.date}
                                </span>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                fontSize: '0.7rem',
                                color: '#a1a1aa'
                            }}>
                                <User size={12} />
                                <span style={{ maxWidth: '100px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {currentCommit.author}
                                </span>
                            </div>
                        </div>

                        {/* Slider Track */}
                        <div style={{ position: 'relative', height: '16px', display: 'flex', alignItems: 'center' }}>
                            {/* Background Track - Absolute Centering */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                width: '100%',
                                height: '4px',
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '2px',
                                top: 0,
                                bottom: 0,
                                margin: 'auto'
                            }} />

                            {/* Progress Fill - Absolute Centering */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                width: `${progress}%`,
                                height: '4px',
                                background: isLoading
                                    ? 'linear-gradient(90deg, #6366f1, #8b5cf6)'
                                    : '#6366f1',
                                borderRadius: '2px',
                                transition: isScrubbing ? 'none' : 'width 0.3s ease',
                                boxShadow: '0 0 8px rgba(99, 102, 241, 0.5)',
                                top: 0,
                                bottom: 0,
                                margin: 'auto'
                            }} />

                            {/* Native Slider (Invisible but interactive) */}
                            <input
                                type="range"
                                min={0}
                                max={Math.max(0, history.length - 1)}
                                value={currentIndex}
                                onChange={handleSliderChange}
                                style={{
                                    position: 'absolute',
                                    width: '100%',
                                    height: '32px', // Larger hit area
                                    top: '50%',
                                    transform: 'translateY(-50%)', // Center hit area
                                    margin: 0,
                                    left: 0,
                                    opacity: 0,
                                    cursor: 'grab',
                                    zIndex: 10, // Topmost
                                    appearance: 'none', // Reset native styles
                                }}
                            />

                            {/* Visual Handle - Absolute Centering */}
                            <motion.div
                                style={{
                                    position: 'absolute',
                                    left: `${progress}%`,
                                    // Remove transform centering for TOP, keep for LEFT
                                    transform: 'translateX(-50%)',
                                    top: 0,
                                    bottom: 0,
                                    margin: 'auto',
                                    width: isLoading ? '18px' : '12px',
                                    height: isLoading ? '18px' : '12px', // Must match width for circle
                                    // Explicit fix: Ensure height is fixed so margin:auto works
                                    background: 'white',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 0 4px rgba(99, 102, 241, 0.3)',
                                    pointerEvents: 'none',
                                    zIndex: 5
                                }}
                                animate={isLoading ? { scale: [1, 1.2, 1] } : {}}
                                transition={{ repeat: Infinity, duration: 0.8 }}
                            />
                        </div>

                        {/* Commit Message (truncated) */}
                        <div style={{
                            fontSize: '0.7rem',
                            color: '#71717a',
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap'
                        }}>
                            {currentCommit.message}
                        </div>
                    </div>

                    {/* Step Buttons */}
                    <div style={{ display: 'flex', gap: '4px' }}>
                        <StepButton
                            onClick={() => handleStep(-1)}
                            disabled={currentIndex <= 0}
                            icon={<ChevronLeft size={16} />}
                            title="Previous (←)"
                        />
                        <StepButton
                            onClick={() => handleStep(1)}
                            disabled={currentIndex >= history.length - 1}
                            icon={<ChevronRight size={16} />}
                            title="Next (→)"
                        />
                    </div>

                    {/* Counter */}
                    <div style={{
                        fontSize: '0.7rem',
                        color: '#52525b',
                        fontFamily: 'var(--font-mono, monospace)',
                        whiteSpace: 'nowrap'
                    }}>
                        {currentIndex + 1}/{history.length}
                    </div>
                </div>
            </motion.div>
        </AnimatePresence>
    )
}

function StepButton({ onClick, disabled, icon, title }) {
    return (
        <button
            onClick={onClick}
            disabled={disabled}
            title={title}
            style={{
                width: '28px',
                height: '28px',
                borderRadius: '6px',
                border: 'none',
                background: 'rgba(255, 255, 255, 0.06)',
                color: disabled ? '#3f3f46' : '#a1a1aa',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: disabled ? 'not-allowed' : 'pointer',
                transition: 'all 0.15s ease'
            }}
        >
            {icon}
        </button>
    )
}
