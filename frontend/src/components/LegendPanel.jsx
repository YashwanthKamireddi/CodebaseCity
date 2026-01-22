import React, { useState, useMemo } from 'react'
import { Map, ChevronDown, ChevronRight, Activity, Filter, Info, Target } from 'lucide-react'
import useStore from '../store/useStore'
import { motion, AnimatePresence } from 'framer-motion'
import './ui/CommandPalette.css' // Reuse the premium glass styles

// Language colors with icons
const LANGUAGES = {
    python: { color: '#3572A5', icon: '🐍' },
    javascript: { color: '#F7DF1E', icon: '📜' },
    typescript: { color: '#3178C6', icon: '🔷' },
    java: { color: '#B07219', icon: '☕' },
    go: { color: '#00ADD8', icon: '🔵' },
    rust: { color: '#DEA584', icon: '🦀' },
    default: { color: '#6B7280', icon: '📄' }
}

export default function LegendPanel({ districts, buildings }) {
    const [collapsed, setCollapsed] = useState(false)
    const { highlightedCategory, setHighlightedCategory } = useStore()

    // Count top languages
    const langCounts = useMemo(() => {
        const counts = {}
        buildings?.forEach(b => {
            const lang = b.language?.toLowerCase() || 'default'
            if (lang !== 'default' && lang !== 'unknown') {
                counts[lang] = (counts[lang] || 0) + 1
            }
        })
        return Object.entries(counts)
            .sort((a, b) => b[1] - a[1])
            .slice(0, 5)
    }, [buildings])

    const totalFiles = buildings?.length || 0

    const toggleHighlight = (type, value) => {
        if (highlightedCategory?.type === type && highlightedCategory?.value === value) {
            setHighlightedCategory(null)
        } else {
            setHighlightedCategory({ type, value })
        }
    }

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px',
            right: '24px',
            width: collapsed ? '56px' : '260px',
            zIndex: 400,
            transition: 'all 0.4s cubic-bezier(0.2, 0, 0, 1)',
        }}>
            <div className="command-root" style={{
                display: 'flex',
                flexDirection: 'column',
                boxShadow: '0 20px 40px rgba(0,0,0,0.4)',
                borderRadius: '16px'
            }}>
                {/* Header */}
                <div
                    style={{
                        padding: '12px 16px',
                        cursor: 'pointer',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'space-between',
                        borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.05)',
                    }}
                    onClick={() => setCollapsed(!collapsed)}
                >
                    <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                        <div style={{
                            width: '28px', height: '28px',
                            background: 'rgba(99, 102, 241, 0.1)',
                            borderRadius: '8px',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            color: '#818cf8'
                        }}>
                            <Target size={16} />
                        </div>
                        {!collapsed && (
                            <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'white' }}>
                                Compass
                            </span>
                        )}
                    </div>
                </div>

                <AnimatePresence>
                    {!collapsed && (
                        <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            exit={{ height: 0, opacity: 0 }}
                            style={{ overflow: 'hidden' }}
                        >
                            <div style={{ padding: '20px', display: 'flex', flexDirection: 'column', gap: '20px' }}>

                                {/* Languages Section */}
                                <section>
                                    <SectionTitle icon={<Filter size={10} />}>Focus Language</SectionTitle>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                        {langCounts.map(([lang, count]) => {
                                            const langInfo = LANGUAGES[lang] || LANGUAGES.default
                                            const isActive = highlightedCategory?.type === 'language' && highlightedCategory?.value === lang
                                            const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0

                                            return (
                                                <button
                                                    key={lang}
                                                    onClick={() => toggleHighlight('language', lang)}
                                                    style={{
                                                        background: isActive ? 'rgba(99, 102, 241, 0.15)' : 'rgba(255,255,255,0.03)',
                                                        border: `1px solid ${isActive ? 'rgba(99, 102, 241, 0.3)' : 'rgba(255,255,255,0.05)'}`,
                                                        borderRadius: '10px',
                                                        padding: '10px',
                                                        width: '100%',
                                                        cursor: 'pointer',
                                                        transition: 'all 0.2s',
                                                        textAlign: 'left'
                                                    }}
                                                >
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '6px' }}>
                                                        <span style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.8rem', color: 'white' }}>
                                                            <span>{langInfo.icon}</span>
                                                            <span style={{ fontWeight: 500, textTransform: 'capitalize' }}>{lang}</span>
                                                        </span>
                                                        <span style={{ fontSize: '0.75rem', opacity: 0.5, color: 'white' }}>{count}</span>
                                                    </div>
                                                    <div style={{ height: '3px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                                        <motion.div
                                                            initial={{ width: 0 }}
                                                            animate={{ width: `${percentage}%` }}
                                                            style={{ height: '100%', background: langInfo.color }}
                                                        />
                                                    </div>
                                                </button>
                                            )
                                        })}
                                    </div>
                                </section>

                                {/* Health Section */}
                                <section>
                                    <SectionTitle icon={<Activity size={10} />}>Filter Health</SectionTitle>
                                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                                        <HealthButton
                                            color="#4ade80"
                                            label="High"
                                            active={highlightedCategory?.type === 'health' && highlightedCategory?.value === 'healthy'}
                                            onClick={() => toggleHighlight('health', 'healthy')}
                                        />
                                        <HealthButton
                                            color="#fbbf24"
                                            label="Med"
                                            active={highlightedCategory?.type === 'health' && highlightedCategory?.value === 'warning'}
                                            onClick={() => toggleHighlight('health', 'warning')}
                                        />
                                        <HealthButton
                                            color="#f87171"
                                            label="Low"
                                            active={highlightedCategory?.type === 'health' && highlightedCategory?.value === 'critical'}
                                            onClick={() => toggleHighlight('health', 'critical')}
                                        />
                                    </div>
                                </section>

                                {/* Hint */}
                                <div style={{
                                    padding: '10px',
                                    background: 'rgba(255,255,255,0.02)',
                                    borderRadius: '8px',
                                    fontSize: '0.7rem',
                                    color: 'rgba(255,255,255,0.3)',
                                    display: 'flex',
                                    gap: '8px',
                                    alignItems: 'center'
                                }}>
                                    <Info size={12} />
                                    <span>Click an item to highlight buildings in 3D</span>
                                </div>
                            </div>
                        </motion.div>
                    )}
                </AnimatePresence>
            </div>
        </div>
    )
}

function SectionTitle({ children, icon }) {
    return (
        <div style={{
            fontSize: '0.65rem',
            fontWeight: 700,
            textTransform: 'uppercase',
            color: 'rgba(255,255,255,0.3)',
            letterSpacing: '0.08em',
            marginBottom: '10px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
        }}>
            {icon}
            {children}
        </div>
    )
}

function HealthButton({ color, label, active, onClick }) {
    return (
        <button
            onClick={onClick}
            style={{
                background: active ? `color-mix(in srgb, ${color}, transparent 85%)` : 'rgba(255,255,255,0.03)',
                border: `1px solid ${active ? color : 'rgba(255,255,255,0.05)'}`,
                borderRadius: '8px',
                padding: '8px 4px',
                cursor: 'pointer',
                transition: 'all 0.2s',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                gap: '4px'
            }}
        >
            <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ fontSize: '0.65rem', color: active ? 'white' : 'rgba(255,255,255,0.4)', fontWeight: 600 }}>{label}</span>
        </button>
    )
}
