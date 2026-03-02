/**
 * WelcomeOverlay.jsx
 *
 * Clean, inviting onboarding experience.
 * Directs users to analyze their own repository.
 */

import React, { useState, useEffect } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { fadeIn, slideUp, getReducedMotionVariants } from '../../../shared/animations/variants'
import {
    FolderSearch,
    ArrowRight,
    GitBranch,
    Boxes,
    Sparkles,
    Zap
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

    const shouldReduceMotion = useReducedMotion()

    return (
        <AnimatePresence>
            {visible && (
                <motion.div
                    className="welcome-backdrop"
                    variants={getReducedMotionVariants(fadeIn, shouldReduceMotion)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                >
                    <motion.div
                        className="welcome-card"
                        variants={getReducedMotionVariants(slideUp, shouldReduceMotion)}
                        initial="initial"
                        animate="animate"
                        exit="exit"
                    >
                        {/* Icon */}
                        <div className="welcome-icon">
                            <Boxes size={26} strokeWidth={1.5} />
                        </div>

                        {/* Title */}
                        <h1 className="welcome-title">Codebase City</h1>

                        {/* Description */}
                        <p className="welcome-desc">
                            Visualize your codebase as a living 3D city. Understand architecture,
                            spot complexity hotspots, and explore code dependencies — all at a glance.
                        </p>

                        {/* Primary Action */}
                        <button className="welcome-cta" onClick={handleAnalyze}>
                            <FolderSearch size={18} />
                            Analyze a Repository
                        </button>

                        {/* Features */}
                        <div className="welcome-features">
                            <div className="welcome-feature">
                                <GitBranch size={14} />
                                <span>GitHub or Local</span>
                            </div>
                            <div className="welcome-feature">
                                <Boxes size={14} />
                                <span>Any Language</span>
                            </div>
                            <div className="welcome-feature">
                                <Sparkles size={14} />
                                <span>AI Insights</span>
                            </div>
                        </div>

                        {/* Skip */}
                        <button className="welcome-skip" onClick={handleDismiss}>
                            Skip <ArrowRight size={12} />
                        </button>
                    </motion.div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}
