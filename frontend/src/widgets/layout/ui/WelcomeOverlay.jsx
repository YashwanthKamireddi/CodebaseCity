/**
 * WelcomeOverlay.jsx
 *
 * Clean, utility-focused onboarding.
 * Directs users to analyze their own repository.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
    FolderSearch,
    ArrowRight,
    GitBranch,
    Boxes
} from 'lucide-react'
import useStore from '../../../store/useStore'

const STORAGE_KEY = 'codebase-city-welcomed'

export default function WelcomeOverlay() {
    const [visible, setVisible] = useState(false)
    const { setAnalyzeModalOpen, cityData } = useStore()

    useEffect(() => {
        const welcomed = localStorage.getItem(STORAGE_KEY)
        if (!welcomed && !cityData) {
            setVisible(true)
        }
    }, [cityData])

    const handleDismiss = () => {
        localStorage.setItem(STORAGE_KEY, 'true')
        setVisible(false)
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
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        inset: 0,
                        background: 'rgba(9, 9, 11, 0.9)',
                        backdropFilter: 'blur(12px)',
                        zIndex: 3000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '24px'
                    }}
                >
                    <motion.div
                        initial={{ opacity: 0, y: 12 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: 12 }}
                        transition={{ duration: 0.25, delay: 0.05 }}
                        style={{
                            maxWidth: '420px',
                            width: '100%',
                            padding: '40px',
                            background: 'rgba(24, 24, 27, 0.8)',
                            border: '1px solid rgba(255, 255, 255, 0.08)',
                            borderRadius: '16px',
                            textAlign: 'center'
                        }}
                    >
                        {/* Icon */}
                        <div style={{
                            width: '56px',
                            height: '56px',
                            background: 'rgba(59, 130, 246, 0.12)',
                            borderRadius: '14px',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            margin: '0 auto 20px auto'
                        }}>
                            <Boxes size={26} color="#3b82f6" strokeWidth={1.5} />
                        </div>

                        {/* Title */}
                        <h1 style={{
                            fontSize: '1.375rem',
                            fontWeight: 600,
                            color: '#f4f4f5',
                            margin: '0 0 8px 0',
                            letterSpacing: '-0.01em'
                        }}>
                            Codebase City
                        </h1>

                        {/* Description */}
                        <p style={{
                            fontSize: '0.875rem',
                            color: '#a1a1aa',
                            margin: '0 0 28px 0',
                            lineHeight: 1.6
                        }}>
                            Visualize your codebase as a 3D city. Understand architecture, spot complexity, and explore dependencies.
                        </p>

                        {/* Primary Action */}
                        <button
                            onClick={handleAnalyze}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                gap: '10px',
                                width: '100%',
                                padding: '14px 20px',
                                background: '#3b82f6',
                                border: 'none',
                                borderRadius: '10px',
                                cursor: 'pointer',
                                transition: 'background 0.15s ease',
                                color: 'white',
                                fontWeight: 500,
                                fontSize: '0.9375rem'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#2563eb'}
                            onMouseLeave={e => e.currentTarget.style.background = '#3b82f6'}
                        >
                            <FolderSearch size={18} />
                            Analyze a Repository
                        </button>

                        {/* Features */}
                        <div style={{
                            display: 'flex',
                            gap: '16px',
                            marginTop: '24px',
                            paddingTop: '20px',
                            borderTop: '1px solid rgba(255, 255, 255, 0.06)'
                        }}>
                            <Feature icon={<GitBranch size={14} />} label="GitHub or Local" />
                            <Feature icon={<Boxes size={14} />} label="Any Language" />
                        </div>

                        {/* Skip */}
                        <button
                            onClick={handleDismiss}
                            style={{
                                marginTop: '20px',
                                background: 'none',
                                border: 'none',
                                color: '#52525b',
                                fontSize: '0.8125rem',
                                cursor: 'pointer',
                                display: 'inline-flex',
                                alignItems: 'center',
                                gap: '4px'
                            }}
                            onMouseEnter={e => e.currentTarget.style.color = '#71717a'}
                            onMouseLeave={e => e.currentTarget.style.color = '#52525b'}
                        >
                            Skip <ArrowRight size={12} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function Feature({ icon, label }) {
    return (
        <div style={{
            flex: 1,
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '6px',
            color: '#71717a',
            fontSize: '0.75rem'
        }}>
            {icon}
            <span>{label}</span>
        </div>
    )
}
