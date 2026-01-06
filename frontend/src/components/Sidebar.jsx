import React, { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'

export default function Sidebar({ isOpen, onClose }) {
    const { messages, sendMessage, chatLoading } = useStore()
    const [input, setInput] = useState('')
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (input.trim() && !chatLoading) {
            sendMessage(input.trim())
            setInput('')
        }
    }

    const displayMessages = messages.length === 0 ? [{
        role: 'assistant',
        content: `Welcome to Codebase City. I'm your AI guide.\n\nI can help you:\n• Navigate the codebase\n• Understand code structure\n• Find issues and hotspots\n\nClick on any building to learn more.`
    }] : messages

    if (!isOpen) return null

    return (
        <aside style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '340px',
            height: '100vh',
            background: 'rgba(15, 15, 22, 0.98)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 800,
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '16px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.08)'
            }}>
                <div>
                    <div style={{ fontSize: '14px', fontWeight: 600, color: '#fff' }}>AI Guide</div>
                    <div style={{ fontSize: '11px', color: '#7a7a8c' }}>Ask about this codebase</div>
                </div>
                <button
                    onClick={onClose}
                    style={{
                        background: 'none',
                        border: 'none',
                        color: '#7a7a8c',
                        cursor: 'pointer',
                        padding: '4px'
                    }}
                >
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            {/* Messages */}
            <div style={{ flex: 1, overflow: 'auto', padding: '16px' }}>
                {displayMessages.map((msg, i) => (
                    <div key={i} style={{ marginBottom: '16px', display: 'flex', gap: '10px' }}>
                        <div style={{
                            width: '28px',
                            height: '28px',
                            borderRadius: '6px',
                            background: msg.role === 'assistant' ? 'linear-gradient(135deg, #818cf8, #6366f1)' : '#374151',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            fontSize: '11px',
                            fontWeight: 600,
                            color: '#fff',
                            flexShrink: 0
                        }}>
                            {msg.role === 'assistant' ? 'AI' : 'U'}
                        </div>
                        <div style={{
                            padding: '10px 14px',
                            background: msg.role === 'assistant' ? 'rgba(255,255,255,0.05)' : 'rgba(129,140,248,0.15)',
                            borderRadius: '10px',
                            fontSize: '13px',
                            color: '#e5e5e5',
                            lineHeight: 1.5,
                            whiteSpace: 'pre-wrap'
                        }}>
                            {msg.content}
                        </div>
                    </div>
                ))}
                {chatLoading && (
                    <div style={{ display: 'flex', gap: '10px' }}>
                        <div style={{
                            width: '28px', height: '28px', borderRadius: '6px',
                            background: 'linear-gradient(135deg, #818cf8, #6366f1)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            fontSize: '11px', fontWeight: 600, color: '#fff'
                        }}>AI</div>
                        <div style={{ padding: '10px 14px', background: 'rgba(255,255,255,0.05)', borderRadius: '10px' }}>
                            <span style={{ color: '#a5b4fc' }}>Thinking...</span>
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>

            {/* Input */}
            <div style={{ padding: '16px', borderTop: '1px solid rgba(255,255,255,0.08)' }}>
                <form onSubmit={handleSubmit} style={{ display: 'flex', gap: '8px' }}>
                    <input
                        type="text"
                        placeholder="Ask about this codebase..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={chatLoading}
                        style={{
                            flex: 1,
                            height: '40px',
                            padding: '0 14px',
                            background: 'rgba(255,255,255,0.06)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '8px',
                            color: '#fff',
                            fontSize: '13px',
                            outline: 'none'
                        }}
                    />
                    <button
                        type="submit"
                        disabled={chatLoading || !input.trim()}
                        style={{
                            width: '40px',
                            height: '40px',
                            background: '#818cf8',
                            border: 'none',
                            borderRadius: '8px',
                            color: '#fff',
                            cursor: input.trim() && !chatLoading ? 'pointer' : 'not-allowed',
                            opacity: input.trim() && !chatLoading ? 1 : 0.5,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                            <path d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
                        </svg>
                    </button>
                </form>
            </div>
        </aside>
    )
}
