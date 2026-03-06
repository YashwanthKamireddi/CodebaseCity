import React, { useState, useRef, useEffect } from 'react'
import useStore from '../../../store/useStore'
import { X, Bot, User, Sparkles, Box, ArrowUp, KeyRound, Trash2, ExternalLink } from 'lucide-react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { slideUp, getReducedMotionVariants } from '../../../shared/animations/variants'
import ReactMarkdown from 'react-markdown'

function ApiKeyBanner({ onOpenSettings }) {
    return (
        <div style={{
            margin: '16px',
            padding: '16px',
            borderRadius: '12px',
            background: 'rgba(251, 191, 36, 0.06)',
            border: '1px solid rgba(251, 191, 36, 0.15)',
            display: 'flex',
            flexDirection: 'column',
            gap: '10px'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <KeyRound size={14} color="#fbbf24" />
                <span style={{ fontSize: '0.8rem', fontWeight: 600, color: '#fbbf24' }}>API Key Required</span>
            </div>
            <p style={{ margin: 0, fontSize: '0.8rem', color: 'rgba(255,255,255,0.5)', lineHeight: 1.5 }}>
                Add your Gemini API key to chat with the AI architect. Your key is stored locally and never sent to any server.
            </p>
            <div style={{ display: 'flex', gap: '8px' }}>
                <button
                    onClick={onOpenSettings}
                    style={{
                        flex: 1,
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(251, 191, 36, 0.15)',
                        border: '1px solid rgba(251, 191, 36, 0.25)',
                        color: '#fbbf24',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: 'pointer',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.25)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(251, 191, 36, 0.15)'}
                >
                    Add Key
                </button>
                <a
                    href="https://aistudio.google.com/apikey"
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{
                        padding: '8px 12px',
                        borderRadius: '8px',
                        background: 'rgba(255,255,255,0.05)',
                        border: '1px solid rgba(255,255,255,0.1)',
                        color: 'rgba(255,255,255,0.5)',
                        fontSize: '0.8rem',
                        textDecoration: 'none',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '4px',
                        transition: 'background 0.2s'
                    }}
                    onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                    onMouseLeave={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                >
                    Get Key <ExternalLink size={10} />
                </a>
            </div>
        </div>
    )
}

function ApiKeySettings({ onClose }) {
    const { geminiApiKey, setGeminiApiKey } = useStore()
    const [keyInput, setKeyInput] = useState(geminiApiKey)

    const handleSave = () => {
        setGeminiApiKey(keyInput.trim())
        onClose()
    }

    const handleRemove = () => {
        setGeminiApiKey('')
        setKeyInput('')
    }

    return (
        <div style={{
            padding: '20px',
            display: 'flex',
            flexDirection: 'column',
            gap: '16px',
            borderBottom: '1px solid rgba(255,255,255,0.05)'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <span style={{ fontSize: '0.85rem', fontWeight: 600, color: '#fff' }}>API Key Settings</span>
                <button
                    onClick={onClose}
                    style={{
                        background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer', padding: '4px'
                    }}
                >
                    <X size={14} />
                </button>
            </div>

            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'rgba(0,0,0,0.2)',
                border: '1px solid rgba(255,255,255,0.1)',
                borderRadius: '10px',
                padding: '4px 4px 4px 12px',
                alignItems: 'center'
            }}>
                <input
                    type="password"
                    value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="AIza..."
                    autoFocus
                    style={{
                        flex: 1,
                        background: 'transparent',
                        border: 'none',
                        color: '#fff',
                        outline: 'none',
                        fontSize: '0.85rem',
                        fontFamily: 'var(--font-mono)'
                    }}
                />
                {geminiApiKey && (
                    <button
                        onClick={handleRemove}
                        title="Remove key"
                        style={{
                            background: 'rgba(239, 68, 68, 0.1)',
                            border: '1px solid rgba(239, 68, 68, 0.2)',
                            borderRadius: '6px',
                            color: '#ef4444',
                            cursor: 'pointer',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center'
                        }}
                    >
                        <Trash2 size={12} />
                    </button>
                )}
                <button
                    onClick={handleSave}
                    disabled={!keyInput.trim()}
                    style={{
                        padding: '6px 14px',
                        borderRadius: '6px',
                        background: keyInput.trim() ? '#3b82f6' : 'rgba(255,255,255,0.05)',
                        border: 'none',
                        color: keyInput.trim() ? '#fff' : '#52525b',
                        fontSize: '0.8rem',
                        fontWeight: 500,
                        cursor: keyInput.trim() ? 'pointer' : 'default'
                    }}
                >
                    Save
                </button>
            </div>

            <p style={{ margin: 0, fontSize: '0.7rem', color: 'rgba(255,255,255,0.3)', lineHeight: 1.5 }}>
                Stored in your browser&apos;s localStorage. Never leaves your device.
            </p>
        </div>
    )
}

export default function ChatInterface() {
    const { chatOpen, messages, sendMessage, chatLoading, agentStatus, geminiApiKey } = useStore()
    const [input, setInput] = useState('')
    const [showSettings, setShowSettings] = useState(false)
    const messagesEndRef = useRef(null)
    const shouldReduceMotion = useReducedMotion()

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, chatOpen])

    if (!chatOpen) return null

    const handleSend = () => {
        if (!input.trim()) return
        sendMessage(input)
        setInput('')
    }

    const hasKey = !!geminiApiKey

    return (
        <AnimatePresence>
            <motion.div
                variants={getReducedMotionVariants(slideUp, shouldReduceMotion)}
                initial="initial"
                animate="animate"
                exit="exit"
                style={{
                    position: 'fixed',
                    top: '100px',
                    right: '24px',
                    width: '380px',
                    height: 'calc(100vh - 140px)',
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
                            <span style={{ fontSize: '0.75rem', color: hasKey ? 'rgba(52, 211, 153, 0.7)' : 'rgba(255,255,255,0.4)' }}>
                                {hasKey ? 'Connected' : 'No API key'}
                            </span>
                        </div>
                    </div>
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                        <button
                            onClick={() => setShowSettings(s => !s)}
                            title="API Key Settings"
                            style={{
                                background: showSettings ? 'rgba(255,255,255,0.1)' : 'transparent',
                                border: 'none',
                                color: hasKey ? 'rgba(52, 211, 153, 0.7)' : 'rgba(255,255,255,0.3)',
                                cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', borderRadius: '6px',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => { if (!showSettings) e.currentTarget.style.background = 'transparent' }}
                        >
                            <KeyRound size={14} />
                        </button>
                        <button
                            onClick={() => useStore.setState({ chatOpen: false })}
                            style={{
                                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.3)', cursor: 'pointer',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '28px', height: '28px', borderRadius: '6px',
                                transition: 'background 0.2s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* API Key Settings Panel */}
                <AnimatePresence>
                    {showSettings && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <ApiKeySettings onClose={() => setShowSettings(false)} />
                        </motion.div>
                    )}
                </AnimatePresence>

                {/* Messages */}
                <div style={{
                    flex: 1,
                    overflowY: 'auto',
                    padding: '20px',
                    display: 'flex',
                    flexDirection: 'column',
                    gap: '24px'
                }}>
                    {!hasKey && messages.length === 0 && (
                        <ApiKeyBanner onOpenSettings={() => setShowSettings(true)} />
                    )}

                    {hasKey && messages.length === 0 && (
                        <div style={{
                            flex: 1,
                            display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
                            gap: '12px', opacity: 0.4
                        }}>
                            <Box size={48} strokeWidth={1} />
                            <p style={{ margin: 0, fontSize: '0.9rem' }}>Ask about your codebase architecture.</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <motion.div
                            initial={{ opacity: 0, y: shouldReduceMotion ? 0 : 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ duration: shouldReduceMotion ? 0.01 : 0.2 }}
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
                                    code: ({ inline, children, ...props }) => {
                                        return !inline ? (
                                            <div style={{ background: 'rgba(0,0,0,0.3)', padding: '12px', borderRadius: '8px', margin: '8px 0', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <code style={{ fontFamily: 'var(--font-mono)', fontSize: '0.8rem' }} {...props}>{children}</code>
                                            </div>
                                        ) : (
                                            <code style={{ background: 'rgba(255,255,255,0.1)', padding: '2px 5px', borderRadius: '4px', fontFamily: 'var(--font-mono)', fontSize: '0.8em' }} {...props}>
                                                {children}
                                            </code>
                                        )
                                    },
                                    a: ({ children, href, ...props }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" style={{ color: '#60a5fa', textDecoration: 'none' }} {...props}>
                                            {children}
                                        </a>
                                    )
                                }}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </motion.div>
                    ))}

                    {chatLoading && (
                        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <div style={{
                                width: '28px', height: '28px', borderRadius: '8px',
                                background: 'rgba(255,255,255,0.05)', display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <Bot size={14} color="#a1a1aa" />
                            </div>
                            <div style={{ display: 'flex', gap: '4px', padding: '10px 0' }}>
                                <span className="cc-typing-dot" style={{ animationDelay: '0s' }} />
                                <span className="cc-typing-dot" style={{ animationDelay: '0.2s' }} />
                                <span className="cc-typing-dot" style={{ animationDelay: '0.4s' }} />
                            </div>
                            <span style={{ fontSize: '0.75rem', color: '#a1a1aa' }}>
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
                            placeholder={hasKey ? 'Ask Architect...' : 'Add API key to start...'}
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
                                transition: shouldReduceMotion ? 'none' : 'all 0.2s',
                                transform: input.trim() ? 'scale(1)' : (shouldReduceMotion ? 'scale(1)' : 'scale(0.9)')
                            }}
                        >
                            <ArrowUp size={16} color={input.trim() ? '#000' : '#52525b'} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <style>{`
                    .cc-typing-dot {
                        width: 4px; height: 4px; background: #71717a; border-radius: 50%;
                        animation: cc-pulse 1s infinite;
                    }
                    @keyframes cc-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                `}</style>
            </motion.div>
        </AnimatePresence>
    )
}
