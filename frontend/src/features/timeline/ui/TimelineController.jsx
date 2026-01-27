/**
 * TimelineController.jsx
 *
 * Premium Timeline UI - "Gource Mode"
 * Design: Minimal floating bar with smooth scrubbing and keyboard support.
 * Refactored for smooth async playback loop to prevent API overload.
 */
import React, { useState, useEffect, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Play, Pause, ChevronLeft, ChevronRight, Clock, User } from 'lucide-react'
import useStore from '../../../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'

export default function TimelineController() {
    const { cityData, showTimeline, setCityData, setAnimating, setCommitIndex, sidebarOpen, sidebarWidth, selectedBuilding } = useStore()
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

    const abortControllerRef = useRef(null)

    // Raw API Call (Memoized)
    const performAnalysis = useCallback(async (commit) => {
        // Cancel previous request
        if (abortControllerRef.current) {
            abortControllerRef.current.abort()
        }

        // Create new controller
        const controller = new AbortController()
        abortControllerRef.current = controller

        setIsLoading(true)
        try {
            const res = await fetch('/api/analyze-at-commit', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    path: cityData.path,
                    commit_hash: commit.hash
                }),
                signal: controller.signal // Bind signal
            })

            if (res.ok) {
                const newCityData = await res.json()
                setCityData(newCityData)
            }
        } catch (e) {
            if (e.name === 'AbortError') {
                console.log('Analysis aborted')
                return
            }
            console.error("Time Travel Failed:", e)
        } finally {
            // Only clear loading if THIS request finished (wasn't aborted)
            if (abortControllerRef.current === controller) {
                setIsLoading(false)
                setIsScrubbing(false)
                abortControllerRef.current = null
            }
        }
    }, [cityData?.path, setCityData])

    // Cleanup on unmount
    useEffect(() => {
        return () => {
            if (abortControllerRef.current) {
                abortControllerRef.current.abort()
            }
        }
    }, [])

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
        setIsPlaying(false) // Kill Loop
        setIsScrubbing(true) // Visual Feedback
        setCurrentIndex(newIndex)
        // Debounce actual API call to prevent flooding during drag
        debouncedTravel(history[newIndex])
    }

    // Step navigation
    const handleStep = (direction) => {
        setIsPlaying(false)
        const newIndex = currentIndex + direction
        if (newIndex >= 0 && newIndex < history.length) {
            setCurrentIndex(newIndex)
            performAnalysis(history[newIndex])
        }
    }

    // Async Recursive Playback Engine (Robust)
    useEffect(() => {
        let isCancelled = false

        const loop = async () => {
            if (!isPlaying || isCancelled) return

            // 1. Calculate Next
            let nextIndex = currentIndex + 1
            if (nextIndex >= history.length) {
                setIsPlaying(false)
                return
            }

            // 2. Optimistic UI Update
            setCurrentIndex(nextIndex)

            // 3. Perform Analysis (BLOCKING)
            // We await this so we don't pile up requests
            await performAnalysis(history[nextIndex])

            // 4. Check if we should continue
            // (User might have paused DURING the await)
            if (!isPlaying || isCancelled) return

            // 5. Schedule next frame (Delay for readability)
            setTimeout(loop, 800)
        }

        if (isPlaying) {
            // Kickstart loop
            loop()
        }

        return () => {
            isCancelled = true // Kill any pending loops on unmount/dep change
        }
    }, [isPlaying, history]) // Removed dependencies that cause re-eval loops

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

    return createPortal(
        <AnimatePresence>
            <motion.div
                key="timeline-bar"
                initial={{ y: 80, opacity: 0 }}
                animate={{
                    y: 0,
                    opacity: 1
                }}
                exit={{ y: 80, opacity: 0 }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                style={{
                    position: 'fixed',
                    bottom: '130px',
                    left: 0,
                    right: 0,
                    marginInline: 'auto', // CSS Native Centering (Robust)
                    width: 'fit-content', // Hugs content
                    maxWidth: '90vw',
                    zIndex: 9000,
                    padding: '0 24px',
                    pointerEvents: 'none', // Allow clicking through side gaps
                    boxSizing: 'border-box',
                    display: 'flex',
                    justifyContent: 'center'
                }}
            >
                <div style={{
                    background: 'rgba(5, 5, 10, 0.65)',
                    backdropFilter: 'blur(24px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(24px) saturate(180%)',
                    borderRadius: '24px',
                    padding: '16px 24px',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.8)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '32px',
                    pointerEvents: 'auto', // Re-enable clicks
                    minWidth: '600px'
                }}>

                    {/* Play/Pause Button */}
                    {/* Play/Pause Button - Prominent Primary Action */}
                    <button
                        onClick={() => {
                            if (!isPlaying && currentIndex >= history.length - 1) {
                                setCurrentIndex(0)
                                performAnalysis(history[0])
                            }
                            setIsPlaying(p => !p)
                        }}
                        style={{
                            width: '48px', // Larger hit target
                            height: '48px',
                            borderRadius: '50%',
                            background: isPlaying
                                ? 'white'
                                : 'linear-gradient(135deg, #3b82f6, #8b5cf6)', // Blue-Purple Gradient
                            border: 'none',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            cursor: 'pointer',
                            flexShrink: 0,
                            boxShadow: isPlaying
                                ? '0 0 24px rgba(255,255,255,0.4)' // Brighter glow active
                                : '0 4px 16px rgba(59, 130, 246, 0.4)', // Color glow inactive
                            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
                        }}
                    >
                        {isPlaying
                            ? <Pause size={20} fill="#09090b" stroke="#09090b" />
                            : <Play size={20} fill="white" stroke="white" style={{ marginLeft: '3px' }} />
                        }
                    </button>

                    {/* Timeline Track */}
                    <div style={{ flex: 1, minWidth: 0, display: 'flex', flexDirection: 'column', gap: '6px', marginRight: '8px' }}>

                        {/* Meta Info */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', paddingBottom: '2px' }}>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                                    <span style={{
                                        fontSize: '0.85rem',
                                        fontWeight: 700,
                                        color: '#f4f4f5',
                                        fontFamily: 'var(--font-mono, monospace)',
                                        letterSpacing: '-0.02em'
                                    }}>
                                        {currentCommit.short_hash}
                                    </span>
                                    <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
                                        {currentCommit.date}
                                    </span>
                                </div>
                            </div>

                            <div style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '8px',
                                fontSize: '0.75rem',
                                color: '#d4d4d8',
                                background: 'rgba(255,255,255,0.05)',
                                padding: '4px 8px 4px 4px', // Adjusted padding for avatar
                                borderRadius: '20px',
                                border: '1px solid rgba(255,255,255,0.05)'
                            }}>
                                {/* Avatar Implementation */}
                                <div style={{
                                    width: '20px',
                                    height: '20px',
                                    borderRadius: '50%',
                                    overflow: 'hidden',
                                    background: '#3f3f46',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    {/* Unavatar for GitHub/Gravatar resolution */}
                                    <img
                                        src={`https://unavatar.io/${currentCommit.email || currentCommit.author}?fallback=false`}
                                        alt={currentCommit.author}
                                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                                    />
                                    <div style={{ display: 'none', width: '100%', height: '100%', alignItems: 'center', justifyContent: 'center', fontSize: '10px', fontWeight: 700, color: 'white' }}>
                                        {currentCommit.author ? currentCommit.author.charAt(0).toUpperCase() : '?'}
                                    </div>
                                </div>

                                <span style={{ fontWeight: 500, maxWidth: '120px', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                    {currentCommit.author}
                                </span>
                            </div>
                        </div>

                        {/* Slider Track */}
                        <div style={{ position: 'relative', height: '24px', display: 'flex', alignItems: 'center' }}>
                            {/* Background Track */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                width: '100%',
                                height: '6px', // Thicker track
                                background: 'rgba(255, 255, 255, 0.1)',
                                borderRadius: '4px',
                                top: 0, bottom: 0, margin: 'auto'
                            }} />

                            {/* Progress Fill */}
                            <div style={{
                                position: 'absolute',
                                left: 0,
                                width: `${progress}%`,
                                height: '6px',
                                background: isPlaying || isLoading
                                    ? 'linear-gradient(90deg, #3b82f6, #a855f7)'
                                    : '#3b82f6',
                                borderRadius: '4px',
                                transition: isScrubbing ? 'none' : 'width 0.2s linear', // Smoother logic
                                boxShadow: '0 0 12px rgba(59, 130, 246, 0.5)', // Neon glow
                                top: 0, bottom: 0, margin: 'auto'
                            }} />

                            {/* Native Slider */}
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
                                    top: 0, left: 0,
                                    margin: 0,
                                    opacity: 0,
                                    cursor: 'grab',
                                    zIndex: 10
                                }}
                            />

                            {/* Visual Handle */}
                            <motion.div
                                style={{
                                    position: 'absolute',
                                    left: `${progress}%`,
                                    top: 0, bottom: 0, margin: 'auto',
                                    transform: 'translateX(-50%)',
                                    width: '16px',
                                    height: '16px',
                                    background: '#ffffff',
                                    borderRadius: '50%',
                                    boxShadow: '0 0 0 4px rgba(59, 130, 246, 0.3), 0 2px 8px rgba(0,0,0,0.4)',
                                    pointerEvents: 'none',
                                    zIndex: 5
                                }}
                                whileHover={{ scale: 1.2 }}
                                animate={isLoading ? { scale: [1, 1.1, 1], boxShadow: '0 0 0 8px rgba(59, 130, 246, 0.2)' } : {}}
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
        </AnimatePresence>,
        document.body
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
