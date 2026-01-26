/**
 * WelcomeOverlay.jsx
 *
 * First-time user experience overlay.
 * Shows on first visit, guides users on how to use the app.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    Box,
    FolderSearch,
    Play,
    Sparkles,
    ArrowRight,
    Code2
} from 'lucide-react'
import useStore from '../../../store/useStore'
import '../../../features/search/ui/CommandPalette.css'

const STORAGE_KEY = 'codebase-city-welcomed'

export default function WelcomeOverlay() {
    const [visible, setVisible] = useState(false)
    const { fetchDemo, setAnalyzeModalOpen, cityData } = useStore()

    useEffect(() => {
        // Check if user has been welcomed before
        const welcomed = localStorage.getItem(STORAGE_KEY)
        if (!welcomed && !cityData) {
            setVisible(true)
        }
    }, [cityData])

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true')
        setVisible(false)
    }

    const handleLoadDemo = () => {
        fetchDemo()
        handleDismiss()
    }

    const handleAnalyze = () => {
        setAnalyzeModalOpen(true)
        handleDismiss()
    }

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(0, 0, 0, 0.85)',
                        backdropFilter: 'blur(20px)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, scale: 0.95, y: 20 }}
                        animate={{ opacity: 1, scale: 1, y: 0 }}
                        exit={{ opacity: 0, scale: 0.95, y: 20 }}
                        transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        className="command-root"
                        style={{
                            maxWidth: '520px',
                            width: '100%',
                            padding: '48px',
                            textAlign: 'center'
                        }}
                    >
                        {/* Logo */}
                        <div style={{
                            width: '80px',
                            height: '80px',
                            background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                            borderRadius: '24px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 24px auto',
                            boxShadow: '0 20px 40px -10px rgba(99, 102, 241, 0.4)'
                        }}>
                            <Code2 size={40} color="white" strokeWidth={1.5} />
                        </div>

                        {/* Title */}
                        <h1 style={{
                            fontSize: '2rem',
                            fontWeight: 700,
                            color: 'white',
                            margin: '0 0 12px 0',
                            letterSpacing: '-0.02em'
                        }}>
                            Codebase City
                        </h1>

                        {/* Subtitle */}
                        <p style={{
                            fontSize: '1rem',
                            color: 'rgba(255,255,255,0.6)',
                            margin: '0 0 40px 0',
                            lineHeight: 1.6
                        }}>
                            Visualize your codebase as an interactive 3D city.
                            <br />
                            Explore architecture, find hotspots, and understand dependencies.
                        </p>

                        {/* Action Buttons */}
                        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center', flexWrap: 'wrap' }}>
                            <ActionButton
                                icon={<Play size={18} fill="currentColor" />}
                                label="Load Demo"
                                description="Explore a sample project"
                                onClick={handleLoadDemo}
                                primary
                            />
                        </div>

                        {/* Skip */}
                        <button
                            onClick={handleDismiss}
                            style={{
                                marginTop: '32px',
                                background: 'none',
                                border: 'none',
                                color: 'rgba(255,255,255,0.4)',
                                fontSize: '0.85rem',
                                cursor: 'pointer',
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                margin: '32px auto 0 auto'
                            }}
                        >
                            Skip for now <ArrowRight size={14} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function ActionButton({ icon, label, description, onClick, primary }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '8px',
                padding: '20px 28px',
                background: primary
                    ? 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)'
                    : 'rgba(255,255,255,0.05)',
                border: primary ? 'none' : '1px solid rgba(255,255,255,0.1)',
                borderRadius: '16px',
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                minWidth: '180px'
            }}
            onMouseEnter={e => {
                if (!primary) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.1)'
                    e.currentTarget.style.transform = 'translateY(-2px)'
                }
            }}
            onMouseLeave={e => {
                if (!primary) {
                    e.currentTarget.style.background = 'rgba(255,255,255,0.05)'
                    e.currentTarget.style.transform = 'translateY(0)'
                }
            }}
        >
            <div style={{ color: primary ? 'white' : 'var(--color-accent)' }}>
                {icon}
            </div>
            <div style={{
                color: 'white',
                fontWeight: 600,
                fontSize: '0.95rem'
            }}>
                {label}
            </div>
            <div style={{
                color: primary ? 'rgba(255,255,255,0.7)' : 'rgba(255,255,255,0.5)',
                fontSize: '0.75rem'
            }}>
                {description}
            </div>
        </button>
    )
}
