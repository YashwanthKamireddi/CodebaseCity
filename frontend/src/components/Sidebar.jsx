import React, { useState, useRef, useEffect } from 'react'
import useStore from '../store/useStore'

export default function Sidebar({ isOpen, onClose }) {
    const { messages, sendMessage, chatLoading, cityData } = useStore()
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

    const displayMessages = messages.length === 0 ? [
        {
            role: 'assistant',
            content: `Welcome to Codebase City. I'm your AI guide.\n\nI can help you:\n• Navigate the codebase - "Where is the authentication logic?"\n• Understand code - "What does UserService do?"\n• Find issues - "Show me the hotspots"\n\nClick on any building to learn more about that file.`
        }
    ] : messages

    return (
        <aside className={`sidebar ${isOpen ? '' : 'collapsed'}`}>
            <div className="sidebar-header">
                <div>
                    <div className="sidebar-title">AI Guide</div>
                    <div className="sidebar-subtitle">Ask anything about this codebase</div>
                </div>
                <button className="sidebar-close" onClick={onClose}>
                    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M18 6L6 18M6 6l12 12" />
                    </svg>
                </button>
            </div>

            <div className="chat-messages">
                {displayMessages.map((msg, i) => (
                    <div key={i} className="chat-message">
                        <div className={`chat-avatar ${msg.role === 'assistant' ? 'ai' : ''}`}>
                            {msg.role === 'assistant' ? 'AI' : 'U'}
                        </div>
                        <div className={`chat-bubble ${msg.role}`}>
                            {msg.content.split('\n').map((line, j) => (
                                <React.Fragment key={j}>
                                    {line}
                                    {j < msg.content.split('\n').length - 1 && <br />}
                                </React.Fragment>
                            ))}
                        </div>
                    </div>
                ))}

                {chatLoading && (
                    <div className="chat-message">
                        <div className="chat-avatar ai">AI</div>
                        <div className="chat-bubble">
                            <TypingDots />
                        </div>
                    </div>
                )}

                <div ref={messagesEndRef} />
            </div>

            <div className="chat-input-container">
                <form onSubmit={handleSubmit} className="chat-input">
                    <input
                        type="text"
                        placeholder="Ask about this codebase..."
                        value={input}
                        onChange={(e) => setInput(e.target.value)}
                        disabled={chatLoading}
                    />
                    <button
                        type="submit"
                        className="chat-send"
                        disabled={chatLoading || !input.trim()}
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

function TypingDots() {
    return (
        <span style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
            <span className="typing-dot" style={dotStyle(0)}>.</span>
            <span className="typing-dot" style={dotStyle(1)}>.</span>
            <span className="typing-dot" style={dotStyle(2)}>.</span>
            <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-4px); }
        }
      `}</style>
        </span>
    )
}

function dotStyle(index) {
    return {
        display: 'inline-block',
        animation: 'typingBounce 1.2s infinite',
        animationDelay: `${index * 0.15}s`
    }
}
