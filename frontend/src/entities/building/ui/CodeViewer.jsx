import React from 'react'
import { createPortal } from 'react-dom'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Download, FileCode2, Check } from 'lucide-react'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'

export default function CodeViewer({ building, onClose }) {
    const { fileContent } = useStore()
    const [copied, setCopied] = React.useState(false)

    if (!building) return null

    const handleCopy = () => {
        logger.debug('[CodeViewer] Copying:', fileContent?.content?.length)
        if (fileContent?.content) {
            navigator.clipboard.writeText(fileContent.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return createPortal(
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.85)', // Slightly darker
                    backdropFilter: 'blur(12px)', // heavier blur
                    zIndex: 2147483647, // CSS MAX INT
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    padding: '40px'
                }}
                onClick={onClose}
            >
                <motion.div
                    initial={{ scale: 0.95, y: 20 }}
                    animate={{ scale: 1, y: 0 }}
                    exit={{ scale: 0.95, y: 20 }}
                    style={{
                        width: '100%',
                        maxWidth: '1200px',
                        height: '90vh',
                        background: 'rgba(5, 10, 20, 0.95)',
                        color: '#f4f4f5',
                        borderRadius: '12px',
                        boxShadow: '0 40px 80px rgba(0, 0, 0, 0.8), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                        border: '1px solid rgba(255, 255, 255, 0.1)',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header - Minimalist Tech Style */}
                    <div style={{
                        height: '42px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        userSelect: 'none'
                    }}>
                        {/* Close button */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div
                                onClick={onClose}
                                title="Close (Esc)"
                                style={{
                                    width: '14px', height: '14px', borderRadius: '4px',
                                    background: 'rgba(239, 68, 68, 0.2)', cursor: 'pointer',
                                    border: '1px solid rgba(239, 68, 68, 0.5)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}
                            />
                        </div>

                        {/* Title */}
                        <div style={{
                            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                            color: '#ffffff', fontSize: '0.8rem', fontWeight: 500, fontFamily: 'var(--font-sans)',
                            display: 'flex', alignItems: 'center', gap: '8px',
                            letterSpacing: '0.02em', textShadow: '0 0 10px rgba(255, 255, 255, 0.2)'
                        }}>
                            <FileCode2 size={14} color="#ffffff" opacity={0.5} />
                            {building.path.split('/').pop()}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <motion.button
                                onClick={handleCopy}
                                whileTap={{ scale: 0.95 }}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '8px',
                                    background: copied ? 'rgba(255, 255, 255, 0.1)' : 'transparent',
                                    color: copied ? '#ffffff' : 'rgba(255, 255, 255, 0.5)',
                                    border: copied ? '1px solid rgba(255, 255, 255, 0.2)' : '1px solid transparent',
                                    boxShadow: copied ? '0 0 10px rgba(255, 255, 255, 0.1)' : 'none',
                                    padding: '6px 12px',
                                    borderRadius: '6px',
                                    fontSize: '0.8rem',
                                    fontWeight: 500,
                                    cursor: 'pointer',
                                    transition: 'all 0.2s',
                                    outline: 'none',
                                    fontFamily: 'var(--font-sans)'
                                }}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </motion.button>
                        </div>
                    </div>

                    {/* Code Content */}
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '24px',
                        fontFamily: 'var(--font-mono)',
                        fontSize: '13px',
                        lineHeight: '1.6',
                        color: 'rgba(255, 255, 255, 0.8)',
                        background: 'transparent'
                    }}>
                        {fileContent?.loading ? (
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#52525b' }}>
                                Loading source code...
                            </div>
                        ) : fileContent?.error ? (
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', color: '#ef4444', gap: '12px' }}>
                                <FileCode2 size={48} opacity={0.5} />
                                <div style={{ fontWeight: 600 }}>Access Denied</div>
                                <div style={{ fontSize: '0.9rem', color: '#a1a1aa', textAlign: 'center', maxWidth: '300px' }}>
                                    Please click <b>Analyze</b> again to refresh the repository connection.
                                </div>
                                <div style={{ fontSize: '0.8rem', color: '#52525b', marginTop: '12px' }}>{fileContent.content}</div>
                            </div>
                        ) : (
                            <pre style={{ margin: 0 }}>
                                <code>{fileContent?.content}</code>
                            </pre>
                        )}
                    </div>

                    {/* Footer / Status */}
                    <div style={{
                        height: '32px',
                        background: 'rgba(255, 255, 255, 0.05)',
                        borderTop: '1px solid rgba(255, 255, 255, 0.2)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        fontSize: '0.75rem',
                        fontFamily: 'var(--font-mono)',
                        color: 'rgba(255, 255, 255, 0.6)',
                        textTransform: 'uppercase',
                        letterSpacing: '0.05em'
                    }}>
                        <span>{building.language || 'Text'}</span>
                        <span>Complexity: {building.metrics?.complexity || 1} • UTF-8</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>,
        document.body
    )
}
