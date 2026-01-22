import React, { useState } from 'react'
import { FolderSearch, Play, Folder } from 'lucide-react'
import useStore from '../store/useStore'
import {
    Modal,
    ModalContent,
} from './ui/Modal'
import { motion } from 'framer-motion'
import './ui/CommandPalette.css' // Reuse the glass styles

export default function AnalyzeModal({ open, onOpenChange }) {
    const { analyzeRepo } = useStore()
    const [path, setPath] = useState('')
    const [isFocused, setIsFocused] = useState(false)

    const handleSubmit = (e) => {
        e.preventDefault()
        if (path.trim()) {
            analyzeRepo(path.trim())
            onOpenChange(false)
        }
    }

    return (
        <Modal open={open} onOpenChange={onOpenChange}>
            {/* Custom Content without default headers for cinematic look */}
            <ModalContent style={{
                padding: '0',
                background: 'transparent',
                border: 'none',
                boxShadow: 'none',
                overflow: 'visible'
            }}>
                <div className="command-root" style={{
                    padding: '32px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    {/* Header */}
                    <div style={{ textAlign: 'center' }}>
                        <div style={{
                            width: '48px', height: '48px',
                            background: 'rgba(99, 102, 241, 0.15)',
                            borderRadius: '16px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            margin: '0 auto 16px auto',
                            color: '#818cf8',
                            boxShadow: '0 0 40px -10px rgba(99, 102, 241, 0.4)'
                        }}>
                            <FolderSearch size={24} />
                        </div>
                        <h2 style={{
                            margin: 0,
                            fontSize: '1.5rem',
                            fontWeight: 600,
                            color: 'white',
                            letterSpacing: '-0.02em',
                            marginBottom: '8px'
                        }}>
                            Analyze Repository
                        </h2>
                        <p style={{
                            margin: 0,
                            color: 'rgba(255,255,255,0.5)',
                            fontSize: '0.9rem'
                        }}>
                            Visualize any local codebase as a 3D city
                        </p>
                    </div>

                    {/* Hero Input */}
                    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                        <div style={{
                            position: 'relative',
                            background: 'rgba(0,0,0,0.2)',
                            borderRadius: '16px',
                            border: `1px solid ${isFocused ? 'rgba(99, 102, 241, 0.5)' : 'rgba(255,255,255,0.1)'}`,
                            padding: '4px',
                            transition: 'all 0.3s cubic-bezier(0.25, 0.8, 0.25, 1)',
                            boxShadow: isFocused ? '0 0 0 4px rgba(99, 102, 241, 0.15)' : 'none'
                        }}>
                            <div style={{
                                display: 'flex', alignItems: 'center',
                                padding: '16px', gap: '16px'
                            }}>
                                <Folder size={20} color={isFocused ? '#818cf8' : 'rgba(255,255,255,0.3)'} />
                                <input
                                    type="text"
                                    placeholder="/path/to/project"
                                    value={path}
                                    onChange={e => setPath(e.target.value)}
                                    onFocus={() => setIsFocused(true)}
                                    onBlur={() => setIsFocused(false)}
                                    style={{
                                        flex: 1,
                                        background: 'transparent',
                                        border: 'none',
                                        outline: 'none',
                                        color: 'white',
                                        fontSize: '1.1rem',
                                        fontFamily: 'var(--font-mono)',
                                        width: '100%'
                                    }}
                                    autoFocus
                                />
                                {path && (
                                    <motion.button
                                        initial={{ scale: 0.9, opacity: 0 }}
                                        animate={{ scale: 1, opacity: 1 }}
                                        type="submit"
                                        style={{
                                            background: 'var(--color-accent)',
                                            border: 'none',
                                            borderRadius: '8px',
                                            padding: '8px 16px',
                                            color: 'white',
                                            fontWeight: 600,
                                            fontSize: '0.9rem',
                                            cursor: 'pointer',
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                                        }}
                                    >
                                        Run
                                        <Play size={14} fill="currentColor" />
                                    </motion.button>
                                )}
                            </div>
                        </div>
                    </form>

                    {/* Footer / Examples */}
                    <div style={{ display: 'flex', gap: '8px', justifyContent: 'center', flexWrap: 'wrap' }}>
                        {['/home/user/frontend', '/var/www/api'].map(example => (
                            <button
                                key={example}
                                onClick={() => setPath(example)}
                                style={{
                                    background: 'rgba(255,255,255,0.03)',
                                    border: '1px solid rgba(255,255,255,0.05)',
                                    padding: '6px 12px',
                                    borderRadius: '8px',
                                    color: 'rgba(255,255,255,0.4)',
                                    fontSize: '0.75rem',
                                    fontFamily: 'var(--font-mono)',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s ease'
                                }}
                                onMouseEnter={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.08)'
                                    e.currentTarget.style.color = 'white'
                                }}
                                onMouseLeave={e => {
                                    e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                                    e.currentTarget.style.color = 'rgba(255,255,255,0.4)'
                                }}
                            >
                                {example}
                            </button>
                        ))}
                    </div>
                </div>
            </ModalContent>
        </Modal>
    )
}
