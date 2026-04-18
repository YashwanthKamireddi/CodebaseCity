import React, { useState, useRef, useEffect } from 'react'
import useStore from '../../../store/useStore'
import { X, Bot, User, Sparkles, Box, ArrowUp, KeyRound, Trash2, ExternalLink } from 'lucide-react'
import ReactMarkdown from 'react-markdown'

function ApiKeyBanner({ onOpenSettings }) {
    return (
        <div className="ci-key-banner">
            <div className="ci-key-banner-head">
                <KeyRound size={14} />
                <span>API Key Required</span>
            </div>
            <p className="ci-key-banner-desc">
                Add your Gemini API key to chat with the AI architect. Your key is stored locally and never sent to any server.
            </p>
            <div className="ci-key-banner-actions">
                <button onClick={onOpenSettings} className="ci-key-add-btn">Add Key</button>
                <a href="https://aistudio.google.com/apikey" target="_blank" rel="noopener noreferrer" className="ci-key-get-link">
                    Get Key <ExternalLink size={10} />
                </a>
            </div>
        </div>
    )
}

function ApiKeySettings({ onClose }) {
    const geminiApiKey = useStore(s => s.geminiApiKey)
    const setGeminiApiKey = useStore(s => s.setGeminiApiKey)
    const [keyInput, setKeyInput] = useState(geminiApiKey)

    const handleSave = () => { setGeminiApiKey(keyInput.trim()); onClose() }
    const handleRemove = () => { setGeminiApiKey(''); setKeyInput('') }

    return (
        <div className="ci-settings">
            <div className="ci-settings-head">
                <span>API Key Settings</span>
                <button onClick={onClose} className="ci-icon-btn"><X size={14} /></button>
            </div>
            <div className="ci-settings-input-row">
                <input
                    type="password" value={keyInput}
                    onChange={e => setKeyInput(e.target.value)}
                    onKeyDown={e => e.key === 'Enter' && handleSave()}
                    placeholder="AIza..." autoFocus className="ci-settings-input"
                />
                {geminiApiKey && (
                    <button onClick={handleRemove} title="Remove key" className="ci-key-remove-btn">
                        <Trash2 size={12} />
                    </button>
                )}
                <button onClick={handleSave} disabled={!keyInput.trim()}
                    className={`ci-key-save-btn ${keyInput.trim() ? 'ci-key-save-btn--active' : ''}`}>
                    Save
                </button>
            </div>
            <p className="ci-settings-hint">Stored in your browser&apos;s localStorage. Never leaves your device.</p>
        </div>
    )
}

export default function ChatInterface() {
    const chatOpen = useStore(s => s.chatOpen)
    const messages = useStore(s => s.messages)
    const sendMessage = useStore(s => s.sendMessage)
    const chatLoading = useStore(s => s.chatLoading)
    const agentStatus = useStore(s => s.agentStatus)
    const geminiApiKey = useStore(s => s.geminiApiKey)
    const incrementAchievementStat = useStore(s => s.incrementAchievementStat)
    const [input, setInput] = useState('')
    const [showSettings, setShowSettings] = useState(false)
    const messagesEndRef = useRef(null)

    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
    }, [messages, chatOpen])

    if (!chatOpen) return null

    const handleSend = () => {
        if (!input.trim()) return
        sendMessage(input)
        setInput('')
        // Track AI question for achievements
        if (incrementAchievementStat) {
            incrementAchievementStat('aiQuestions', 1)
        }
    }

    const hasKey = !!geminiApiKey

    return (
        <div className="ci-root anim-slide-up">
                {/* Top accent line */}
                <div className="ci-accent-line" />

                {/* Header */}
                <div className="ci-header">
                    <div className="ci-header-left">
                        <div className="ci-logo">
                            <Sparkles size={16} />
                        </div>
                        <div className="ci-header-text">
                            <span className="ci-header-title">Architect</span>
                            <span className={`ci-header-status ${hasKey ? 'ci-header-status--ok' : ''}`}>
                                {hasKey ? 'Connected' : 'No API key'}
                            </span>
                        </div>
                    </div>
                    <div className="ci-header-actions">
                        <button onClick={() => setShowSettings(s => !s)} title="API Key Settings"
                            className={`ci-icon-btn ${showSettings ? 'ci-icon-btn--active' : ''} ${hasKey ? 'ci-icon-btn--green' : ''}`}>
                            <KeyRound size={14} />
                        </button>
                        <button onClick={() => useStore.setState({ chatOpen: false })} className="ci-icon-btn">
                            <X size={16} />
                        </button>
                    </div>
                </div>

                {/* API Key Settings */}
                {showSettings && (
                        <div style={{ overflow: 'hidden' }} className="anim-fade-in">
                            <ApiKeySettings onClose={() => setShowSettings(false)} />
                        </div>
                    )}

                {/* Messages */}
                <div className="ci-messages">
                    {!hasKey && messages.length === 0 && (
                        <ApiKeyBanner onOpenSettings={() => setShowSettings(true)} />
                    )}
                    {hasKey && messages.length === 0 && (
                        <div className="ci-empty">
                            <Box size={48} strokeWidth={1} />
                            <p>Ask about your codebase architecture.</p>
                        </div>
                    )}

                    {messages.map((msg, i) => (
                        <div key={i}
                            className={`ci-msg ci-msg--${msg.role} anim-slide-up`}>
                            <div className={`ci-msg-avatar ci-msg-avatar--${msg.role}`}>
                                {msg.role === 'user' ? <User size={14} /> : <Bot size={14} />}
                            </div>
                            <div className={`ci-msg-bubble ci-msg-bubble--${msg.role}`}>
                                <ReactMarkdown components={{
                                    code: ({ inline, children, ...props }) => !inline ? (
                                        <div className="ci-code-block">
                                            <code {...props}>{children}</code>
                                        </div>
                                    ) : (
                                        <code className="ci-code-inline" {...props}>{children}</code>
                                    ),
                                    a: ({ children, href, ...props }) => (
                                        <a href={href} target="_blank" rel="noopener noreferrer" className="ci-link" {...props}>{children}</a>
                                    )
                                }}>
                                    {msg.content}
                                </ReactMarkdown>
                            </div>
                        </div>
                    ))}

                    {chatLoading && (
                        <div className="ci-loading">
                            <div className="ci-msg-avatar ci-msg-avatar--assistant"><Bot size={14} /></div>
                            <div className="ci-typing-dots">
                                <span style={{ animationDelay: '0s' }} />
                                <span style={{ animationDelay: '0.2s' }} />
                                <span style={{ animationDelay: '0.4s' }} />
                            </div>
                            <span className="ci-loading-label">
                                {agentStatus === 'thinking' ? 'Thinking...' :
                                    agentStatus === 'analyzing' ? 'Analyzing context...' : 'Writing...'}
                            </span>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <div className="ci-input-area">
                    <div className="ci-input-row">
                        <input type="text" value={input}
                            onChange={e => setInput(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSend()}
                            placeholder={hasKey ? 'Ask Architect...' : 'Add API key to start...'}
                            className="ci-input"
                        />
                        <button onClick={handleSend} disabled={!input.trim() || chatLoading}
                            className={`ci-send-btn ${input.trim() ? 'ci-send-btn--active' : ''}`}>
                            <ArrowUp size={16} strokeWidth={2.5} />
                        </button>
                    </div>
                </div>

                <style>{`
                    .ci-root {
                        position: fixed; top: 100px; right: 24px;
                        width: 400px; height: calc(100vh - 140px); max-height: 720px;
                        background: var(--glass-bg-elevated);
                        backdrop-filter: blur(32px) saturate(1.6);
                        -webkit-backdrop-filter: blur(32px) saturate(1.6);
                        border: 1px solid var(--border-default);
                        border-radius: var(--radius-2xl);
                        box-shadow: var(--shadow-depth-3), 0 0 0 1px rgba(255,255,255,0.02) inset;
                        display: flex; flex-direction: column;
                        z-index: 2500; overflow: hidden;
                        font-family: var(--font-body);
                        color: var(--color-text-primary);
                    }
                    .ci-accent-line {
                        height: 1px; width: 100%;
                        background: linear-gradient(90deg, transparent 10%, rgba(59,130,246,0.5) 50%, transparent 90%);
                    }

                    /* --- HEADER --- */
                    .ci-header {
                        padding: var(--space-5) var(--space-5);
                        border-bottom: 1px solid var(--border-subtle);
                        display: flex; align-items: center; justify-content: space-between;
                    }
                    .ci-header-left { display: flex; align-items: center; gap: var(--space-3); }
                    .ci-logo {
                        width: 36px; height: 36px; border-radius: var(--radius-lg);
                        background: linear-gradient(135deg, rgba(59,130,246,0.15), rgba(59,130,246,0.05));
                        border: 1px solid rgba(59,130,246,0.2);
                        display: flex; align-items: center; justify-content: center;
                        color: #60a5fa;
                    }
                    .ci-header-title {
                        font-weight: var(--font-semibold); color: var(--color-text-primary);
                        font-size: var(--text-base); display: block; font-family: var(--font-display);
                    }
                    .ci-header-status {
                        font-size: var(--text-xs); color: var(--color-text-muted);
                    }
                    .ci-header-status--ok { color: rgba(52,211,153,0.8); }
                    .ci-header-actions { display: flex; gap: var(--space-1); align-items: center; }

                    .ci-icon-btn {
                        background: transparent; border: none;
                        color: var(--color-text-muted); cursor: pointer;
                        display: flex; align-items: center; justify-content: center;
                        width: 30px; height: 30px; border-radius: var(--radius-md);
                        transition: background 0.2s, color 0.2s;
                    }
                    .ci-icon-btn:hover { background: var(--color-bg-hover); color: var(--color-text-secondary); }
                    .ci-icon-btn--active { background: var(--color-bg-hover); }
                    .ci-icon-btn--green { color: rgba(52,211,153,0.8); }

                    /* --- SETTINGS --- */
                    .ci-settings {
                        padding: var(--space-5); display: flex; flex-direction: column; gap: var(--space-4);
                        border-bottom: 1px solid var(--border-subtle);
                    }
                    .ci-settings-head {
                        display: flex; align-items: center; justify-content: space-between;
                        font-size: var(--text-sm); font-weight: var(--font-semibold); color: var(--color-text-primary);
                    }
                    .ci-settings-input-row {
                        display: flex; gap: var(--space-2); align-items: center;
                        background: var(--color-bg-secondary); border: 1px solid var(--border-default);
                        border-radius: var(--radius-lg); padding: var(--space-1) var(--space-1) var(--space-1) var(--space-3);
                    }
                    .ci-settings-input {
                        flex: 1; background: transparent; border: none;
                        color: var(--color-text-primary); outline: none;
                        font-size: var(--text-sm); font-family: var(--font-mono);
                    }
                    .ci-key-remove-btn {
                        background: var(--color-error-muted); border: 1px solid rgba(239,68,68,0.2);
                        border-radius: var(--radius-md); color: var(--color-error);
                        cursor: pointer; padding: 6px; display: flex; align-items: center;
                        transition: background 0.2s;
                    }
                    .ci-key-remove-btn:hover { background: rgba(239,68,68,0.2); }
                    .ci-key-save-btn {
                        padding: 6px 14px; border-radius: var(--radius-md);
                        background: var(--color-bg-tertiary); border: none;
                        color: var(--color-text-muted); font-size: var(--text-sm);
                        font-weight: var(--font-medium); cursor: default;
                    }
                    .ci-key-save-btn--active {
                        background: #3b82f6; color: white; cursor: pointer;
                    }
                    .ci-settings-hint {
                        margin: 0; font-size: var(--text-xs); color: var(--color-text-muted); line-height: var(--leading-normal);
                    }

                    /* --- KEY BANNER --- */
                    .ci-key-banner {
                        margin: var(--space-4); padding: var(--space-4); border-radius: var(--radius-xl);
                        background: rgba(251,191,36,0.05); border: 1px solid rgba(251,191,36,0.12);
                        display: flex; flex-direction: column; gap: var(--space-3);
                    }
                    .ci-key-banner-head {
                        display: flex; align-items: center; gap: var(--space-2);
                        font-size: var(--text-sm); font-weight: var(--font-semibold); color: #fbbf24;
                    }
                    .ci-key-banner-desc {
                        margin: 0; font-size: var(--text-sm); color: var(--color-text-muted); line-height: var(--leading-normal);
                    }
                    .ci-key-banner-actions { display: flex; gap: var(--space-2); }
                    .ci-key-add-btn {
                        flex: 1; padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
                        background: rgba(251,191,36,0.12); border: 1px solid rgba(251,191,36,0.2);
                        color: #fbbf24; font-size: var(--text-sm); font-weight: var(--font-medium); cursor: pointer;
                        transition: background 0.2s;
                    }
                    .ci-key-add-btn:hover { background: rgba(251,191,36,0.22); }
                    .ci-key-get-link {
                        padding: var(--space-2) var(--space-3); border-radius: var(--radius-md);
                        background: var(--color-bg-tertiary); border: 1px solid var(--border-default);
                        color: var(--color-text-muted); font-size: var(--text-sm);
                        text-decoration: none; display: flex; align-items: center; gap: 4px;
                        transition: background 0.2s;
                    }
                    .ci-key-get-link:hover { background: var(--color-bg-hover); }

                    /* --- MESSAGES --- */
                    .ci-messages {
                        flex: 1; overflow-y: auto; padding: var(--space-5);
                        display: flex; flex-direction: column; gap: var(--space-6);
                    }
                    .ci-empty {
                        flex: 1; display: flex; flex-direction: column;
                        align-items: center; justify-content: center;
                        gap: var(--space-3); opacity: 0.35; color: var(--color-text-muted);
                    }
                    .ci-empty p { margin: 0; font-size: var(--text-base); }
                    .ci-msg { display: flex; gap: var(--space-3); }
                    .ci-msg--user { flex-direction: row-reverse; }
                    .ci-msg-avatar {
                        width: 28px; height: 28px; border-radius: var(--radius-lg);
                        display: flex; align-items: center; justify-content: center;
                        flex-shrink: 0;
                    }
                    .ci-msg-avatar--user { background: var(--color-text-primary); color: var(--color-bg-primary); }
                    .ci-msg-avatar--assistant { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
                    .ci-msg-bubble {
                        max-width: 85%; padding: var(--space-3) var(--space-4);
                        border-radius: var(--radius-xl); font-size: var(--text-sm);
                        line-height: var(--leading-relaxed); color: var(--color-text-primary);
                    }
                    .ci-msg-bubble--user {
                        background: var(--color-bg-tertiary); border: 1px solid var(--border-default);
                    }
                    .ci-msg-bubble--assistant { background: transparent; }
                    .ci-code-block {
                        background: rgba(0,0,0,0.35); padding: var(--space-3); border-radius: var(--radius-lg);
                        margin: var(--space-2) 0; border: 1px solid var(--border-subtle);
                        overflow-x: auto;
                    }
                    .ci-code-block code { font-family: var(--font-mono); font-size: var(--text-xs); }
                    .ci-code-inline {
                        background: rgba(255,255,255,0.08); padding: 2px 6px; border-radius: var(--radius-sm);
                        font-family: var(--font-mono); font-size: 0.8em;
                    }
                    .ci-link { color: #60a5fa; text-decoration: none; }
                    .ci-link:hover { text-decoration: underline; }

                    /* --- LOADING --- */
                    .ci-loading { display: flex; gap: var(--space-3); align-items: center; }
                    .ci-typing-dots { display: flex; gap: 4px; padding: 10px 0; }
                    .ci-typing-dots span {
                        width: 5px; height: 5px; background: var(--color-text-muted); border-radius: 50%;
                        animation: ci-pulse 1s infinite;
                    }
                    @keyframes ci-pulse { 0%, 100% { opacity: 0.3; } 50% { opacity: 1; } }
                    .ci-loading-label { font-size: var(--text-xs); color: var(--color-text-muted); }

                    /* --- INPUT --- */
                    .ci-input-area {
                        padding: var(--space-4); border-top: 1px solid var(--border-subtle);
                    }
                    .ci-input-row {
                        display: flex; align-items: center; gap: var(--space-2);
                        background: var(--color-bg-secondary); border: 1px solid var(--border-default);
                        border-radius: var(--radius-full);
                        padding: 5px 5px 5px var(--space-4);
                        transition: border-color 0.2s;
                    }
                    .ci-input-row:focus-within { border-color: var(--border-strong); }
                    .ci-input {
                        flex: 1; background: transparent; border: none;
                        color: var(--color-text-primary); outline: none;
                        font-size: var(--text-sm); font-family: var(--font-body); font-weight: 400;
                    }
                    .ci-input::placeholder { color: var(--color-text-muted); }
                    .ci-send-btn {
                        width: 34px; height: 34px; border-radius: 50%;
                        background: var(--color-bg-tertiary); border: none;
                        display: flex; align-items: center; justify-content: center;
                        cursor: default; color: var(--color-text-muted);
                        transition: all 0.2s; transform: scale(0.9);
                    }
                    .ci-send-btn--active {
                        background: var(--color-text-primary); color: var(--color-bg-primary);
                        cursor: pointer; transform: scale(1);
                    }
                    .ci-send-btn--active:hover { background: var(--gray-200); }

                    /* Scrollbar */
                    .ci-messages::-webkit-scrollbar { width: 4px; }
                    .ci-messages::-webkit-scrollbar-track { background: transparent; }
                    .ci-messages::-webkit-scrollbar-thumb {
                        background: var(--border-default); border-radius: 2px;
                    }

                    /* ── Mobile Responsive ── */
                    @media (max-width: 768px) {
                        .ci-root {
                            position: fixed !important;
                            top: auto !important;
                            bottom: 0 !important;
                            left: 0 !important;
                            right: 0 !important;
                            width: 100% !important;
                            max-width: 100% !important;
                            height: 75vh !important;
                            max-height: calc(100vh - env(safe-area-inset-top, 0) - 60px) !important;
                            border-radius: 24px 24px 0 0 !important;
                            z-index: 210 !important;
                        }
                        .ci-root::after {
                            content: '';
                            position: absolute;
                            top: 8px;
                            left: 50%;
                            transform: translateX(-50%);
                            width: 36px;
                            height: 4px;
                            background: rgba(255, 255, 255, 0.25);
                            border-radius: 2px;
                            z-index: 10;
                        }
                        .ci-header {
                            padding-top: 24px !important;
                        }
                        .ci-input {
                            font-size: 16px !important; /* Prevents iOS zoom */
                        }
                        .ci-input-area {
                            padding-bottom: calc(env(safe-area-inset-bottom, 0) + 12px) !important;
                        }
                        .ci-settings-input {
                            font-size: 16px !important;
                        }
                        .ci-send-btn {
                            min-width: 44px !important;
                            min-height: 44px !important;
                        }
                    }

                    @media (max-width: 480px) {
                        .ci-root {
                            height: 80vh !important;
                        }
                        .ci-messages {
                            padding: var(--space-4) !important;
                        }
                        .ci-msg-bubble {
                            max-width: 90% !important;
                        }
                    }
                `}</style>
            </div>
    )
}
