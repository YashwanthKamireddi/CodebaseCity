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
    const { cityData, showTimeline, setCityData, setAnimating, setCommitIndex, sidebarOpen, sidebarWidth, selectedBuilding } = useStore()
    // ... (rest of state)

    // Calculate centering offset
    // 50% + (LeftSidebar - RightPanel) / 2
    // If panels are open, we shift the center point to balance the visual space.
    const leftPanelWidth = sidebarOpen ? sidebarWidth : 0
    const rightPanelWidth = selectedBuilding ? 380 : 0 // Fixed width from BuildingPanel
    const centerOffset = (leftPanelWidth - rightPanelWidth) / 2

    // ...

    return (
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
                    bottom: '120px',
                    left: `calc(50% + ${centerOffset}px)`, // Dynamic centering
                    transform: 'translateX(-50%)',
                    zIndex: 200,
                    width: '100%',
                    maxWidth: '560px',
                    padding: '0 24px',
                    pointerEvents: 'auto',
                    boxSizing: 'border-box'
                }}
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
        </AnimatePresence >
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
