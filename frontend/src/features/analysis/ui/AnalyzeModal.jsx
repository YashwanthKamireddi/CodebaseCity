import React, { useState, useEffect, useRef } from 'react'
import { Folder, ArrowRight, Loader2 } from 'lucide-react'
import useStore from '../../../store/useStore'
import { Modal, ModalContent } from '../../../shared/ui/Modal'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { slideUp, getReducedMotionVariants } from '../../../shared/animations/variants'

export default function AnalyzeModal({ open, onOpenChange }) {
    const { analyzeRepo } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [submitting, setSubmitting] = useState(false)
    const inputRef = useRef(null)
    const shouldReduceMotion = useReducedMotion()

    // Auto focus when modal opens
    useEffect(() => {
        if (open) {
            setPath('')
            setTimeout(() => {
                inputRef.current?.focus()
            }, 100)
        }
    }, [open])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (path.trim() && !submitting) {
            setSubmitting(true)

            // Instantly close modal and trigger global 3D loader
            onOpenChange(false)

            // Allow React cycle to unmount modal before freezing thread with heavy fetch
            setTimeout(() => {
                analyzeRepo(path.trim())
                setSubmitting(false)
            }, 50)
        }
    }

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent style={{
                padding: 0,
                background: 'rgba(5, 5, 8, 0.95)', // Extremely dark, minimal transparency
                border: '1px solid rgba(255, 255, 255, 0.08)',
                boxShadow: '0 40px 80px rgba(0,0,0,0.8), 0 0 0 1px rgba(255, 255, 255, 0.02) inset',
                backdropFilter: 'blur(40px) saturate(150%)',
                WebkitBackdropFilter: 'blur(40px) saturate(150%)',
                borderRadius: '24px',
                width: '100%',
                maxWidth: '480px',
                overflow: 'hidden',
                fontFamily: 'var(--font-sans)',
                color: 'white'
            }}>
                <div style={{ padding: '48px 40px 40px 40px' }}>

                    {/* Header */}
                    <div style={{ marginBottom: '32px' }}>
                        <h2 style={{
                            margin: 0,
                            fontFamily: 'var(--font-sans)',
                            fontSize: '1.75rem',
                            fontWeight: 400,
                            letterSpacing: '-0.02em',
                            color: '#ffffff',
                            marginBottom: '8px'
                        }}>
                            Workspace Connection
                        </h2>
                        <p style={{
                            margin: 0,
                            fontSize: '0.95rem',
                            color: 'rgba(255, 255, 255, 0.5)',
                            fontWeight: 400,
                            fontFamily: 'var(--font-sans)',
                            lineHeight: 1.5
                        }}>
                            Enter the absolute path to your local repository to begin architectural analysis.
                        </p>
                    </div>

                    {/* Form */}
                    <form onSubmit={handleSubmit}>
                        <div style={{
                            position: 'relative',
                            marginBottom: '32px'
                        }}>
                            <div style={{
                                position: 'absolute',
                                left: '16px',
                                top: '50%',
                                transform: 'translateY(-50%)',
                                color: isFocused ? '#ffffff' : 'rgba(255, 255, 255, 0.3)',
                                transition: 'color 0.2s ease',
                                pointerEvents: 'none'
                            }}>
                                <Folder size={18} strokeWidth={1.5} />
                            </div>
                            <input
                                ref={inputRef}
                                type="text"
                                placeholder="/Users/name/Projects/repo..."
                                value={path}
                                onChange={e => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                style={{
                                    width: '100%',
                                    background: 'rgba(255, 255, 255, 0.03)',
                                    border: `1px solid ${isFocused ? 'rgba(255, 255, 255, 0.2)' : 'rgba(255, 255, 255, 0.08)'}`,
                                    borderRadius: '12px',
                                    padding: '16px 16px 16px 44px',
                                    color: '#ffffff',
                                    fontSize: '1rem',
                                    fontFamily: 'var(--font-mono)',
                                    outline: 'none',
                                    transition: 'all 0.2s ease',
                                    boxSizing: 'border-box',
                                    boxShadow: isFocused ? '0 4px 12px rgba(0,0,0,0.2)' : 'none'
                                }}
                            />
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                            <button
                                type="button"
                                onClick={() => onOpenChange(false)}
                                style={{
                                    background: 'transparent',
                                    border: 'none',
                                    color: 'rgba(255, 255, 255, 0.5)',
                                    fontSize: '0.95rem',
                                    cursor: 'pointer',
                                    padding: '8px 12px',
                                    margin: '-8px -12px',
                                    transition: 'color 0.2s ease'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.color = '#ffffff'}
                                onMouseLeave={(e) => e.currentTarget.style.color = 'rgba(255, 255, 255, 0.5)'}
                            >
                                Cancel
                            </button>

                            <button
                                type="submit"
                                disabled={!path.trim() || submitting}
                                style={{
                                    background: path.trim() ? '#ffffff' : 'rgba(255, 255, 255, 0.1)',
                                    color: path.trim() ? '#000000' : 'rgba(255, 255, 255, 0.3)',
                                    border: 'none',
                                    padding: '0 24px',
                                    height: '44px',
                                    borderRadius: '22px',
                                    fontSize: '0.95rem',
                                    fontWeight: 500,
                                    cursor: path.trim() ? 'pointer' : 'not-allowed',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '8px',
                                    transition: 'all 0.2s ease',
                                    fontFamily: 'var(--font-sans)',
                                    opacity: submitting ? 0.7 : 1
                                }}
                            >
                                {submitting ? (
                                    <>
                                        <motion.div
                                            animate={{ rotate: 360 }}
                                            transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                                            style={{ display: 'flex' }}
                                        >
                                            <Loader2 size={16} />
                                        </motion.div>
                                        Connecting...
                                    </>
                                ) : (
                                    <>
                                        Connect
                                        <ArrowRight size={16} />
                                    </>
                                )}
                            </button>
                        </div>
                    </form>
                </div>
            </ModalContent>
        </Modal>
    )
}
