import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X, Copy, Download, FileCode2, Check } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function CodeViewer({ building, onClose }) {
    const { fileContent } = useStore()
    const [copied, setCopied] = React.useState(false)

    if (!building) return null

    const handleCopy = () => {
        if (fileContent?.content) {
            navigator.clipboard.writeText(fileContent.content)
            setCopied(true)
            setTimeout(() => setCopied(false), 2000)
        }
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                style={{
                    position: 'fixed',
                    top: 0, left: 0, right: 0, bottom: 0,
                    background: 'rgba(0,0,0,0.8)',
                    backdropFilter: 'blur(8px)',
                    zIndex: 2000, // Higher than panel
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
                        // THE VOID THEME
                        background: '#09090b',
                        color: '#f4f4f5', // Explicit White Text
                        borderRadius: '16px',
                        boxShadow: '0 50px 100px -20px rgba(0, 0, 0, 0.8)',
                        border: '1px solid #27272a',
                        display: 'flex',
                        flexDirection: 'column',
                        overflow: 'hidden'
                    }}
                    onClick={e => e.stopPropagation()}
                >
                    {/* Header - macOS Style Window Controls */}
                    <div style={{
                        height: '42px',
                        background: 'rgba(255, 255, 255, 0.03)',
                        borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 16px',
                        userSelect: 'none'
                    }}>
                        {/* Traffic Lights */}
                        <div style={{ display: 'flex', gap: '8px' }}>
                            <div onClick={onClose} style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ff5f56', cursor: 'pointer', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#ffbd2e', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                            <div style={{ width: '12px', height: '12px', borderRadius: '50%', background: '#27c93f', boxShadow: 'inset 0 0 0 1px rgba(0,0,0,0.1)' }} />
                        </div>

                        {/* Title */}
                        <div style={{
                            position: 'absolute', left: '50%', transform: 'translateX(-50%)',
                            color: 'rgba(255,255,255,0.6)', fontSize: '0.8rem', fontWeight: 500, fontFamily: 'var(--font-mono)',
                            display: 'flex', alignItems: 'center', gap: '6px'
                        }}>
                            <FileCode2 size={12} opacity={0.5} />
                            {building.path.split('/').pop()}
                        </div>

                        {/* Actions */}
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                            <button
                                onClick={handleCopy}
                                style={{
                                    display: 'flex', alignItems: 'center', gap: '6px',
                                    background: copied ? 'rgba(34, 197, 94, 0.1)' : 'transparent',
                                    color: copied ? '#4ade80' : '#71717a',
                                    border: 'none',
                                    padding: '4px 8px',
                                    borderRadius: '4px',
                                    fontSize: '0.75rem',
                                    cursor: 'pointer',
                                    transition: 'all 0.2s'
                                }}
                            >
                                {copied ? <Check size={14} /> : <Copy size={14} />}
                                {copied ? 'Copied' : 'Copy'}
                            </button>
                        </div>
                    </div>

                    {/* Code Content */}
                    <div style={{
                        flex: 1,
                        overflow: 'auto',
                        padding: '24px',
                        fontFamily: '"JetBrains Mono", "Fira Code", monospace',
                        fontSize: '14px',
                        lineHeight: '1.6',
                        color: '#d4d4d4',
                        background: '#1e1e1e'
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
                        height: '30px',
                        background: '#007acc',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        padding: '0 12px',
                        fontSize: '0.75rem',
                        color: 'white'
                    }}>
                        <span>TypeScript</span>
                        <span>{building.metrics.loc} lines • UTF-8</span>
                    </div>
                </motion.div>
            </motion.div>
        </AnimatePresence>
    )
}
