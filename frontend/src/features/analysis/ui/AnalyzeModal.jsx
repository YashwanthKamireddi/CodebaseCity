import React, { useState } from 'react'
import { Folder, Globe, ArrowRight } from 'lucide-react'
import useStore from '../../../store/useStore'
import { Modal, ModalContent, ModalTitle, ModalDescription } from '../../../shared/ui/Modal'
import { motion, AnimatePresence } from 'framer-motion'

export default function AnalyzeModal({ open, onOpenChange }) {
    const { analyzeRepo } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)
    const [submitting, setSubmitting] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (path.trim() && !submitting) {
            setSubmitting(true)
            setTimeout(() => {
                analyzeRepo(path.trim())
                onOpenChange(false)
                setSubmitting(false)
            }, 600)
        }
    }

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            <ModalContent style={{
                padding: 0,
                background: 'rgba(5, 5, 10, 0.4)', // Ultra-deep void
                border: '1px solid rgba(255,255,255,0.05)',
                boxShadow: '0 0 0 1px rgba(0,0,0,0.5), 0 20px 40px -10px rgba(0,0,0,0.5)',
                backdropFilter: 'blur(30px) saturate(180%)', // Apple-like blur
                borderRadius: '20px',
                width: '100%',
                maxWidth: '520px',
                overflow: 'hidden',
                fontFamily: 'var(--font-sans)',
                color: 'var(--text-primary)'
            }}>
                {/* SUBTLE TOP GLOW */}
                <div style={{
                    position: 'absolute', top: 0, left: 0, right: 0, height: '1px',
                    background: 'linear-gradient(90deg, transparent, rgba(255,255,255,0.2), transparent)'
                }} />

                <div style={{ padding: '40px' }}>

                    {/* CUSTOM LOGO IDENTITY */}
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '32px' }}>
                        <motion.div
                            initial={{ scale: 0.95, opacity: 0 }}
                            animate={{ scale: 1, opacity: 1 }}
                            transition={{ duration: 0.15 }}
                            style={{
                                width: '64px', height: '64px',
                                borderRadius: '16px',
                                background: 'rgba(59, 130, 246, 0.12)',
                                border: '1px solid rgba(59, 130, 246, 0.2)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                marginBottom: '20px'
                            }}
                        >
                            {/* Universe Icon */}
                            <Globe size={32} color="#60a5fa" strokeWidth={1.5} />
                        </motion.div>

                        <ModalTitle style={{
                            margin: 0,
                            fontFamily: 'var(--font-display)',
                            fontSize: '1.75rem',
                            fontWeight: 600,
                            color: '#f4f4f5',
                            marginBottom: '8px',
                            letterSpacing: '-0.02em',
                            textAlign: 'center'
                        }}>
                            Initialize Workspace
                        </ModalTitle>
                        <ModalDescription style={{
                            margin: 0,
                            fontSize: '1rem',
                            color: 'rgba(255,255,255,0.6)',
                            fontWeight: 400,
                            textAlign: 'center'
                        }}>
                            Connect a repository to visualize structure.
                        </ModalDescription>
                    </div>

                    {/* INPUT FORM */}
                    <form onSubmit={handleSubmit} style={{ marginTop: '32px' }}>
                        <motion.div
                            className="premium-input-wrapper"
                            style={{
                                display: 'flex', alignItems: 'center',
                                paddingRight: '16px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '16px',
                                border: '1px solid rgba(255,255,255,0.08)',
                                transition: 'all 0.2s ease',
                                boxShadow: isFocused ? '0 0 0 2px rgba(59, 130, 246, 0.5)' : 'none',
                                marginBottom: '24px' // Space between input and button
                            }}
                        >
                            <div style={{
                                width: '56px', height: '64px',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                color: isFocused ? '#fff' : 'rgba(255,255,255,0.4)',
                            }}>
                                <Folder size={24} />
                            </div>

                            <input
                                type="text"
                                placeholder="Enter repository path..."
                                value={path}
                                onChange={e => setPath(e.target.value)}
                                onFocus={() => setIsFocused(true)}
                                onBlur={() => setIsFocused(false)}
                                style={{
                                    flex: 1,
                                    height: '64px',
                                    background: 'transparent',
                                    border: 'none',
                                    outline: 'none',
                                    color: 'white',
                                    fontSize: '1.1rem',
                                    fontFamily: 'var(--font-mono)',
                                    fontWeight: 500,
                                }}
                                autoFocus
                            />
                        </motion.div>

                        {/* ACTION BUTTON ROW */}
                        <div style={{ display: 'flex', justifyContent: 'flex-end' }}>
                            <AnimatePresence>
                                {path && (
                                    <motion.button
                                        initial={{ opacity: 0, y: 10 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        exit={{ opacity: 0, y: 10 }}
                                        type="submit"
                                        disabled={submitting}
                                        style={{
                                            height: '48px',
                                            padding: '0 32px',
                                            borderRadius: '12px',
                                            border: 'none',
                                            background: '#3b82f6',
                                            color: '#fff',
                                            fontSize: '1rem',
                                            fontWeight: 600,
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            boxShadow: '0 4px 12px rgba(59, 130, 246, 0.4)',
                                            width: '100%', // Full width on mobile/small modals
                                            justifyContent: 'center'
                                        }}
                                    >
                                        {submitting ? 'Connecting...' : (
                                            <>
                                                Analyze Repository <ArrowRight size={18} />
                                            </>
                                        )}
                                    </motion.button>
                                )}
                            </AnimatePresence>
                        </div>
                    </form>

                </div>
            </ModalContent>
        </Modal>
    )
}
