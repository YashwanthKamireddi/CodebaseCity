import React, { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'
import { Send, X, Bot, User, Sparkles } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

export default function ChatInterface() {
    const { chatOpen, messages, sendMessage, chatLoading } = useStore()
    const [input, setInput] = useState('')
    const messagesEndRef = useRef(null)

    // Auto-scroll to bottom
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, chatOpen])

    if (!chatOpen) return null

    const handleSend = () => {
        if (!input.trim()) return
        sendMessage(input)
        setInput('')
    }

    return (
        <AnimatePresence>
            <motion.div
                initial={{ opacity: 0, y: 20, scale: 0.95 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.95 }}
                transition={{ duration: 0.2 }}
                style={{
                    position: 'fixed',
                    bottom: '100px', // Above the dock
                    right: '360px', // Left of the Diagnostics HUD (approx)
                    // Or center it? User said "AI Architect". Let's put it Bottom Right-ish but clear of others.
                    // Actually, let's float it Center-Left to balance the Inspector on the Right.
                    // NO, let's put it TOP RIGHT, below Diagnostics?
                    // Let's stick to Bottom Left for now as Zoom is Right.
                    left: '24px',
                    width: '380px',
                    height: '500px',
                    background: '#111111',
                    border: '1px solid #333333',
                    borderRadius: '16px',
                    boxShadow: '0 24px 48px -12px rgba(0,0,0,0.5)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 2500, // Top layer
                    overflow: 'hidden',
                    fontFamily: '"Inter", sans-serif'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '16px',
                    borderBottom: '1px solid #333333',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#18181b'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                        <Sparkles size={18} color="#818cf8" />
                        <span style={{ fontWeight: 600, color: '#f4f4f5' }}>AI Architect</span>
                    </div>
                    <button
                        onClick={() => useStore.setState({ chatOpen: false })}
                        style={{
                            background: 'transparent',
                            border: 'none',
                            color: '#71717a',
                            cursor: 'pointer'
                        }}
                    >
                        <X size={18} />
                    </button>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '16px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '16px',
                    background: '#09090b'
                }}>
                    {messages.length === 0 && (
                        <div style={{ textAlign: 'center', color: '#52525b', marginTop: '40px', fontSize: '0.9rem' }}>
                            <Bot size={32} style={{ marginBottom: '12px', opacity: 0.5 }} />
                            <p>Ask me about your codebase architecture, patterns, or refactoring ideas.</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i} style={{
                            display: 'flex',
                            gap: '12px',
                            justifyContent: msg.role === 'user' ? 'flex-end' : 'flex-start'
                        }}>
                            {msg.role === 'assistant' && (
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <Bot size={16} color="#a1a1aa" />
                                </div>
                            )}

                            <div style={{
                                maxWidth: '80%',
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: msg.role === 'user' ? '#3b82f6' : '#27272a',
                                color: msg.role === 'user' ? 'white' : '#e4e4e7',
                                fontSize: '0.9rem',
                                lineHeight: '1.5',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.1)'
                            }}>
                                <ReactMarkdown components={{
                                    code: ({ node, inline, className, children, ...props }) => {
                                        return !inline ? (
                                            <div style={{ background: '#18181b', padding: '8px', borderRadius: '6px', margin: '8px 0', overflowX: 'auto' }}>
                                                <code style={{ fontFamily: 'monospace', fontSize: '0.8rem' }} {...props}>{children}</code>
                                            </div>
                                        ) : (
                                            <code style={{ background: 'rgba(0,0,0,0.2)', padding: '2px 4px', borderRadius: '4px', fontFamily: 'monospace' }} {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>

                            {msg.role === 'user' && (
                                <div style={{
                                    width: '28px', height: '28px', borderRadius: '50%',
                                    background: '#3b82f6', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    flexShrink: 0
                                }}>
                                    <User size={16} color="white" />
                                </div>
                            )}
                        </div>
                    ))}

                    {chatLoading && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '50%',
                                background: '#27272a', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Bot size={16} color="#a1a1aa" />
                            </div>
                            <div style={{
                                padding: '10px 14px',
                                borderRadius: '12px',
                                background: '#27272a',
                                color: '#a1a1aa',
                                fontSize: '0.9rem',
                                display: 'flex', alignItems: 'center', gap: '4px'
                            }}>
                                <span className="typing-dot" style={{ animationDelay: '0s' }}>.</span>
                                <span className="typing-dot" style={{ animationDelay: '0.2s' }}>.</span>
                                <span className="typing-dot" style={{ animationDelay: '0.4s' }}>.</span>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    padding: '12px',
                    background: '#18181b',
                    borderTop: '1px solid #333333'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: '#09090b',
                        border: '1px solid #333333',
                        borderRadius: '20px',
                        padding: '4px 4px 4px 16px'
                    }}>
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Type a message..."
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem'
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || chatLoading}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: input.trim() ? '#3b82f6' : '#27272a',
                                border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: input.trim() ? 'pointer' : 'default',
                                transition: 'all 0.2s'
                            }}
                        >
                            <Send size={16} color={input.trim() ? 'white' : '#52525b'} />
                        </button>
                    </div>
                </div>

                <style>{`
                    .typing-dot { animation: pulse 1s infinite; }
                    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                `}</style>
            </motion.div>
        </AnimatePresence>
    )
}
