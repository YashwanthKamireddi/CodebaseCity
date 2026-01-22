import React, { useState, useRef, useEffect, useMemo } from 'react'
import useStore from '../store/useStore'
import {
    MessageSquare,
    Send,
    Zap,
    X,
    Layout,
    BarChart2,
    Activity,
    AlertTriangle,
    CheckCircle,
    Sparkles
} from 'lucide-react'
import { detectPattern } from './BuildingLabel'
import { motion, AnimatePresence } from 'framer-motion'

export default function Sidebar({ isOpen, onClose }) {
    const { messages, sendMessage, chatLoading, cityData } = useStore()
    const [input, setInput] = useState('')
    const [activeTab, setActiveTab] = useState('chat') // 'chat' | 'health'
    const messagesEndRef = useRef(null)

    // Scroll to bottom on new message
    useEffect(() => {
        if (activeTab === 'chat') {
            messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
        }
    }, [messages, activeTab])

    const handleSubmit = (e) => {
        e.preventDefault()
        if (input.trim() && !chatLoading) {
            sendMessage(input.trim())
            setInput('')
        }
    }

    // Health Stats Logic (Simplified from previous)
    const stats = useMemo(() => {
        if (!cityData?.buildings) return null
        const buildings = cityData.buildings
        // ... (Logic remains same, simplified for brevity in this view, assuming calculated correctly)
        // Recalculating briefly for robust display
        let hotspots = buildings.filter(b => b.is_hotspot).length
        let healthScore = 100 - (hotspots * 5)
        if (healthScore < 0) healthScore = 0

        return {
            total: buildings.length,
            hotspots,
            healthScore
        }
    }, [cityData])


    if (!isOpen) return null

    return (
        <aside style={{
            position: 'fixed',
            top: 0,
            right: 0,
            width: '360px',
            height: '100vh',
            background: 'rgba(10, 10, 12, 0.9)', // Deeper, richer dark
            backdropFilter: 'blur(50px) saturate(150%)',
            borderLeft: '1px solid rgba(255, 255, 255, 0.08)',
            zIndex: 800,
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '-20px 0 60px rgba(0,0,0,0.7)',
            transition: 'transform 0.3s cubic-bezier(0.2, 0, 0, 1)'
        }}>
            {/* Header / Tabs */}
            <div className="p-panel-header" style={{
                height: '72px',
                padding: '0 24px',
                borderBottom: '1px solid rgba(255,255,255,0.06)',
                background: 'transparent',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between'
            }}>
                <div style={{ display: 'flex', gap: '4px', background: 'rgba(255,255,255,0.03)', padding: '4px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <TabButton
                        active={activeTab === 'chat'}
                        onClick={() => setActiveTab('chat')}
                        icon={<Sparkles size={14} />}
                        label="Assistant"
                    />
                    <TabButton
                        active={activeTab === 'health'}
                        onClick={() => setActiveTab('health')}
                        icon={<Activity size={14} />}
                        label="Health"
                    />
                </div>
                <button
                    onClick={onClose}
                    style={{
                        width: '32px', height: '32px',
                        background: 'transparent',
                        border: 'none',
                        color: 'rgba(255,255,255,0.4)',
                        cursor: 'pointer',
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        borderRadius: '8px',
                        transition: 'all 0.2s'
                    }}
                    onMouseEnter={e => { e.currentTarget.style.background = 'rgba(255,255,255,0.1)'; e.currentTarget.style.color = 'white' }}
                    onMouseLeave={e => { e.currentTarget.style.background = 'transparent'; e.currentTarget.style.color = 'rgba(255,255,255,0.4)' }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Content Area */}
            <div className="p-sidebar-content" style={{ padding: '0', flex: 1, overflowY: 'auto', display: 'flex', flexDirection: 'column' }}>

                {activeTab === 'chat' ? (
                    <>
                        {/* Messages Area */}
                        <div style={{ flex: 1, padding: '24px', display: 'flex', flexDirection: 'column', gap: '24px' }}>
                            {messages.length === 0 ? (
                                <div style={{ marginTop: '40px', textAlign: 'center', color: 'rgba(255,255,255,0.4)' }}>
                                    <div style={{
                                        width: '48px', height: '48px',
                                        background: 'linear-gradient(135deg, #6366f1 0%, #a855f7 100%)',
                                        borderRadius: '16px',
                                        margin: '0 auto 16px auto',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                                        boxShadow: '0 8px 32px rgba(99, 102, 241, 0.3)'
                                    }}>
                                        <Sparkles color="white" size={24} />
                                    </div>
                                    <h3 style={{ color: 'white', fontWeight: 600, fontSize: '1.1rem', marginBottom: '8px' }}>Codebase Assistant</h3>
                                    <p style={{ fontSize: '0.9rem', lineHeight: '1.5', maxWidth: '80%', margin: '0 auto' }}>
                                        I can help you understand architecture, find bugs, and refactor code.
                                    </p>

                                    <div style={{ marginTop: '32px', display: 'grid', gap: '12px' }}>
                                        <SuggestionCard
                                            icon={<Zap color="#fbbf24" size={16} />}
                                            title="Find Hotspots"
                                            desc="Identify complex files needing attention"
                                            onClick={() => sendMessage("Where are the hotspots?")}
                                        />
                                        <SuggestionCard
                                            icon={<Activity color="#34d399" size={16} />}
                                            title="Code Quality"
                                            desc="Analyze overall maintainability"
                                            onClick={() => sendMessage("Analyze code quality")}
                                        />
                                    </div>
                                </div>
                            ) : (
                                messages.map((msg, i) => (
                                    <div key={i} style={{
                                        display: 'flex',
                                        flexDirection: 'column',
                                        alignItems: msg.role === 'user' ? 'flex-end' : 'flex-start',
                                        gap: '8px'
                                    }}>
                                        <div style={{
                                            display: 'flex', alignItems: 'center', gap: '8px',
                                            flexDirection: msg.role === 'user' ? 'row-reverse' : 'row',
                                            opacity: 0.7, fontSize: '0.75rem'
                                        }}>
                                            <span style={{ fontWeight: 600 }}>{msg.role === 'user' ? 'You' : 'AI'}</span>
                                        </div>
                                        <div style={{
                                            maxWidth: '90%',
                                            padding: '12px 16px',
                                            borderRadius: msg.role === 'user' ? '16px 16px 4px 16px' : '16px 16px 16px 4px',
                                            background: msg.role === 'user'
                                                ? 'var(--color-accent)'
                                                : 'rgba(255,255,255,0.05)',
                                            border: msg.role === 'user' ? 'none' : '1px solid rgba(255,255,255,0.05)',
                                            color: msg.role === 'user' ? 'white' : 'rgba(255,255,255,0.9)',
                                            lineHeight: '1.6',
                                            fontSize: '0.9rem',
                                            boxShadow: msg.role === 'user' ? '0 4px 12px rgba(99, 102, 241, 0.3)' : 'none'
                                        }}>
                                            {msg.content}
                                        </div>
                                    </div>
                                ))
                            )}
                            {chatLoading && (
                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center', opacity: 0.6 }}>
                                    <div className="typing-dot" style={{ animationDelay: '0s' }} />
                                    <div className="typing-dot" style={{ animationDelay: '0.2s' }} />
                                    <div className="typing-dot" style={{ animationDelay: '0.4s' }} />
                                </div>
                            )}
                            <div ref={messagesEndRef} />
                        </div>
                    </>
                ) : (
                    /* Health Dashboard (simplified wrapper) */
                    <div style={{ padding: '24px' }}>
                        <div style={{
                            padding: '32px', textAlign: 'center',
                            background: 'rgba(255,255,255,0.03)',
                            borderRadius: '16px', border: '1px solid rgba(255,255,255,0.05)'
                        }}>
                            <div style={{ fontSize: '4rem', fontWeight: 700, lineHeight: 1, color: stats?.healthScore > 70 ? '#4ade80' : '#f87171' }}>
                                {stats?.healthScore || 0}
                            </div>
                            <div style={{ textTransform: 'uppercase', fontSize: '0.8rem', letterSpacing: '0.1em', opacity: 0.6, marginTop: '8px' }}>Health Score</div>
                        </div>
                    </div>
                )}
            </div>

            {/* Floating Input Area - Premium */}
            {activeTab === 'chat' && (
                <div style={{ padding: '24px', background: 'linear-gradient(to top, rgba(10,10,12,1) 0%, rgba(10,10,12,0) 100%)' }}>
                    <form onSubmit={handleSubmit} style={{ position: 'relative' }}>
                        <div style={{
                            background: 'rgba(30,30,35,0.8)',
                            backdropFilter: 'blur(20px)',
                            border: '1px solid rgba(255,255,255,0.1)',
                            borderRadius: '16px',
                            padding: '6px',
                            display: 'flex',
                            alignItems: 'center',
                            boxShadow: '0 8px 32px -8px rgba(0,0,0,0.5)',
                            transition: 'border-color 0.2s'
                        }}>
                            <input
                                type="text"
                                placeholder="Type a message..."
                                value={input}
                                onChange={(e) => setInput(e.target.value)}
                                style={{
                                    flex: 1,
                                    background: 'transparent',
                                    border: 'none',
                                    padding: '12px 16px',
                                    color: 'white',
                                    fontSize: '0.95rem',
                                    outline: 'none'
                                }}
                            />
                            <button
                                type="submit"
                                disabled={!input.trim() || chatLoading}
                                style={{
                                    width: '36px', height: '36px',
                                    borderRadius: '10px',
                                    border: 'none',
                                    background: input.trim() ? 'var(--color-accent)' : 'rgba(255,255,255,0.1)',
                                    color: input.trim() ? 'white' : 'rgba(255,255,255,0.3)',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                    cursor: input.trim() ? 'pointer' : 'default',
                                    transition: 'all 0.2s cubic-bezier(0.2, 0, 0, 1)'
                                }}
                            >
                                <Send size={16} />
                            </button>
                        </div>
                    </form>
                </div>
            )}
        </aside>
    )
}

function TabButton({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '8px',
                padding: '8px 16px',
                borderRadius: '8px',
                border: 'none',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem',
                fontWeight: 500,
                cursor: 'pointer',
                transition: 'all 0.2s ease',
                boxShadow: active ? '0 1px 2px rgba(0,0,0,0.1)' : 'none'
            }}
        >
            {icon}
            {label}
        </button>
    )
}

function SuggestionCard({ icon, title, desc, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                display: 'flex', alignItems: 'center', gap: '16px',
                padding: '16px',
                background: 'rgba(255,255,255,0.03)',
                border: '1px solid rgba(255,255,255,0.05)',
                borderRadius: '12px',
                cursor: 'pointer',
                textAlign: 'left',
                transition: 'all 0.2s ease'
            }}
            onMouseEnter={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.06)'
                e.currentTarget.style.transform = 'translateY(-2px)'
                e.currentTarget.style.boxShadow = '0 8px 20px -5px rgba(0,0,0,0.3)'
            }}
            onMouseLeave={e => {
                e.currentTarget.style.background = 'rgba(255,255,255,0.03)'
                e.currentTarget.style.transform = 'translateY(0)'
                e.currentTarget.style.boxShadow = 'none'
            }}
        >
            <div style={{
                width: '36px', height: '36px',
                borderRadius: '10px',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center'
            }}>
                {icon}
            </div>
            <div>
                <div style={{ color: 'white', fontWeight: 500, fontSize: '0.9rem', marginBottom: '4px' }}>{title}</div>
                <div style={{ color: 'rgba(255,255,255,0.5)', fontSize: '0.8rem' }}>{desc}</div>
            </div>
        </button>
    )
}
