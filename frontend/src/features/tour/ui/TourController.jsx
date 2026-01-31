import React, { useEffect, useRef } from 'react'
import { useFrame, useThree } from '@react-three/fiber'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import * as THREE from 'three'
import { useTourStore } from '../model/useTourStore'
import useStore from '../../../store/useStore'

export default function TourController() {
    const { isTourActive, tourData, currentStepIndex, nextStep, message, stopTour } = useTourStore()
    const { camera } = useThree()
    const { setCameraAction } = useStore() // We might override default controls

    const progressRef = useRef(0)
    const startTimeRef = useRef(0)

    // Smooth Camera Movement
    useFrame((state, delta) => {
        if (!isTourActive || !tourData[currentStepIndex]) return

        const step = tourData[currentStepIndex]
        const duration = step.duration / 1000 // ms to seconds

        progressRef.current += delta
        const t = Math.min(progressRef.current / duration, 1)

        // Easing (Smoothstep)
        const smoothT = t * t * (3 - 2 * t)

        // Interpolate Position
        const targetPos = new THREE.Vector3(...step.position)
        camera.position.lerp(targetPos, delta * 2) // Soft follow

        // Interpolate LookAt
        // We can't easily lerp LookAt, so we use a dummy target
        // For now, let's just use simple lookAt on every frame
        camera.lookAt(new THREE.Vector3(...step.target))

        // Check for completion
        if (progressRef.current >= duration) {
            progressRef.current = 0
            if (currentStepIndex >= tourData.length - 1) {
                stopTour()
            } else {
                nextStep()
            }
        }
    })

    // Reset loop vars on step change
    useEffect(() => {
        progressRef.current = 0
    }, [currentStepIndex])

    if (!isTourActive) return null

    // UI Overlay (Portal)
    return createPortal(
        <AnimatePresence mode='wait'>
            {message && (
                <motion.div
                    key={currentStepIndex}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ duration: 0.5 }}
                    style={{
                        position: 'fixed',
                        bottom: '100px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        width: '600px',
                        background: 'rgba(0, 0, 0, 0.8)',
                        backdropFilter: 'blur(10px)',
                        border: '1px solid rgba(255, 255, 255, 0.2)',
                        borderRadius: '16px',
                        padding: '24px',
                        color: 'white',
                        textAlign: 'center',
                        zIndex: 10000,
                        pointerEvents: 'none'
                    }}
                >
                    <div style={{
                        fontSize: '0.9rem',
                        color: '#22d3ee',
                        fontWeight: 700,
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.1em'
                    }}>
                        AI GUIDE • STEP {currentStepIndex + 1}/{tourData.length}
                    </div>
                    <div style={{
                        fontSize: '1.2rem',
                        fontFamily: 'var(--font-sans)',
                        lineHeight: '1.5',
                        textShadow: '0 2px 10px rgba(0,0,0,0.5)'
                    }}>
                        "{message}"
                    </div>
                    <div style={{
                        marginTop: '12px',
                        height: '4px',
                        background: 'rgba(255,255,255,0.1)',
                        borderRadius: '2px',
                        overflow: 'hidden'
                    }}>
                        <motion.div
                            initial={{ width: 0 }}
                            animate={{ width: '100%' }}
                            transition={{ duration: tourData[currentStepIndex].duration / 1000, ease: 'linear' }}
                            style={{ height: '100%', background: '#22d3ee' }}
                        />
                    </div>
                </motion.div>
            )}

            {/* Skip Button */}
            <div style={{
                position: 'fixed',
                top: '20px',
                right: '20px',
                zIndex: 10001,
                pointerEvents: 'auto'
            }}>
                <button
                    onClick={stopTour}
                    style={{
                        background: 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(255,255,255,0.2)',
                        color: 'white',
                        padding: '8px 16px',
                        borderRadius: '8px',
                        cursor: 'pointer',
                        fontWeight: 600,
                        backdropFilter: 'blur(4px)'
                    }}
                >
                    End Tour (ESC)
                </button>
            </div>
        </AnimatePresence>,
        document.body
    )
}
