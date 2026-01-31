import React, { useState, useRef, useEffect } from 'react'
import useStore from '../../../store/useStore'
import { Send, X, Bot, User, Sparkles, Box, ArrowUp } from 'lucide-react'
import { motion, AnimatePresence } from 'framer-motion'
import ReactMarkdown from 'react-markdown'

export default function ChatInterface() {
    const { chatOpen, messages, sendMessage, chatLoading, agentStatus } = useStore()
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
                initial={{ opacity: 0, y: 20, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 20, scale: 0.98 }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                style={{
                    position: 'fixed',
                    top: '100px', // Below top header
                    right: '24px',
                    width: '380px',
                    height: 'calc(100vh - 140px)', // Full height minus header and padding
                    maxHeight: '700px',
                    background: 'rgba(5, 5, 10, 0.65)',
                    backdropFilter: 'blur(30px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    borderRadius: '24px',
                    boxShadow: '0 24px 64px -12px rgba(0,0,0,0.6)',
                    display: 'flex',
                    flexDirection: 'column',
                    zIndex: 2500,
                    overflow: 'hidden',
                    fontFamily: 'var(--font-sans)'
                }}
            >
                {/* Header */}
                <div style={{
                    padding: '20px',
                    borderBottom: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'rgba(255,255,255,0.02)'
                }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <div style={{
                            width: '32px', height: '32px',
                            borderRadius: '8px',
                            background: 'linear-gradient(135deg, rgba(59, 130, 246, 0.2), rgba(59, 130, 246, 0.05))',
                            border: '1px solid rgba(59, 130, 246, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center'
                        }}>
                            <Sparkles size={16} color="#60a5fa" />
                        </div>
                        <div>
                            <span style={{ fontWeight: 600, color: '#fff', fontSize: '0.95rem', display: 'block' }}>Architect</span>
                            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.4)' }}>AI Copilot</span>
                        </div>
                    </div>
                    <button
                        onClick={() => useStore.setState({ chatOpen: false })}
                        style={{
                            background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            width: '24px', height: '24px', borderRadius: '50%',
                            transition: 'background 0.2s'
                        }}
                        onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                        onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                    >
                        <X size={16} />
                    </button>
                </div>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    {messages.length === 0 && (
                        <div style={{
                            flex: 1,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            opacity: 0.4
                        }}>
                            <Box size={48} strokeWidth={1} style={{ marginBottom: '16px' }} />
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Ask me about architecture.</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            key={i}
                            style={{
                                display: 'flex',
                                gap: '12px',
                                flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                            }}
                        >
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '8px',
                                background: msg.role === 'user' ? '#fff' : 'rgba(255,255,255,0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                flexShrink: 0,
                                color: msg.role === 'user' ? '#000' : '#a1a1aa'
                            }}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>

                            <div style={{
                                maxWidth: '85%',
                                padding: '12px 16px',
                                borderRadius: '12px',
                                background: msg.role === 'user' ? '#27272a' : 'transparent',
                                border: msg.role === 'assistant' ? 'none' : '1px solid rgba(255,255,255,0.1)',
                                color: '#e4e4e7',
                                fontSize: '0.9rem',
                                lineHeight: '1.6'
                            }}>
                                <ReactMarkdown components={{
                                    code: ({ node, inline, className, children, ...props }) => {
                                        return !inline ? (
                                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', margin: '8px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} {...props}>{children}</code>
                                            </div>
                                        ) : (
                                            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.8em' }} {...props}>
                                                {children}
                                            </code>
                                        )
                                    }
                                }}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </motion.div>
                    ))}

                    {chatLoading && (
                        <div style={{ display: 'flex', gap: '12px' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Bot size={14} color="#a1a1aa" />
                            </div>
                            <div style={{ display: 'flex', gap: '4px', padding: '10px 0' }}>
                                <span className="typing-dot" style={{ animationDelay: '0s' }}></span>
                                <span className="typing-dot" style={{ animationDelay: '0.2s' }}></span>
                                <span className="typing-dot" style={{ animationDelay: '0.4s' }}></span>
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa', alignSelf: 'center', marginLeft: '4px' }}>
                                {agentStatus === 'thinking' ? 'Thinking...' :
                                    agentStatus === 'analyzing' ? 'Analyzing context...' : 'Writing...'}
                            </span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div style={{
                    padding: '16px',
                    background: 'rgba(255,255,255,0.01)',
                    borderTop: '1px solid rgba(255,255,255,0.05)'
                }}>
                    <div style={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        background: 'rgba(0,0,0,0.2)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        borderRadius: '24px',
                        padding: '6px 6px 6px 16px',
                        transition: 'border-color 0.2s'
                    }}
                        onFocus={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.2)'}
                        onBlur={e => e.currentTarget.style.borderColor = 'rgba(255,255,255,0.1)'}
                    >
                        <input
                            type="text"
                            value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder="Ask Architect..."
                            style={{
                                flex: 1,
                                background: 'transparent',
                                border: 'none',
                                color: 'white',
                                outline: 'none',
                                fontSize: '0.9rem',
                                fontFamily: 'var(--font-sans)',
                                fontWeight: 400
                            }}
                        />
                        <button
                            onClick={handleSend}
                            disabled={!input.trim() || chatLoading}
                            style={{
                                width: '32px',
                                height: '32px',
                                borderRadius: '50%',
                                background: input.trim() ? '#fff' : 'rgba(255,255,255,0.05)',
                                border: 'none',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                cursor: input.trim() ? 'pointer' : 'default',
                                transition: 'all 0.2s',
                                transform: input.trim() ? 'scale(1)' : 'scale(0.9)'
                            }}
                        >
                            <ArrowUp size={16} color={input.trim() ? '#000' : '#52525b'} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <style>{`
                    .typing-dot {
                        width: 4px; height: 4px; background: #71717a; border-radius: 50%;
                        animation: pulse 1s infinite;
                    }
                    @keyframes pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                `}</style>
            </motion.div>
        </AnimatePresence>
    )
}
