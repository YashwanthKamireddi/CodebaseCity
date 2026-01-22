import React, { useState } from 'react'
import { Map, ChevronDown, ChevronRight, Activity } from 'lucide-react'
import '../styles/ProfessionalUI.css'

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

    // Count top 5 languages only
    const langCounts = {}
    buildings?.forEach(b => {
        const lang = b.language?.toLowerCase() || 'default'
        if (lang !== 'default' && lang !== 'unknown') {
            langCounts[lang] = (langCounts[lang] || 0) + 1
        }
    })

    const topLangs = Object.entries(langCounts)
        .sort((a, b) => b[1] - a[1])
        .slice(0, 5)

    const totalFiles = buildings?.length || 0

    return (
        <div style={{
            position: 'fixed',
            bottom: '100px',
            right: '16px',
            width: collapsed ? '48px' : '200px',
            zIndex: 400,
            transition: 'width 0.2s cubic-bezier(0.2, 0, 0, 1)',
            overflow: 'hidden',
            background: 'rgba(20, 20, 23, 0.75)',
            backdropFilter: 'blur(40px) saturate(180%)',
            WebkitBackdropFilter: 'blur(40px) saturate(180%)',
            border: '1px solid rgba(255, 255, 255, 0.08)',
            boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06) inset',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column'
        }}>
            {/* Header */}
            <div
                className="p-panel-header"
                style={{
                    padding: '12px',
                    cursor: 'pointer',
                    minHeight: '44px',
                    borderBottom: collapsed ? 'none' : '1px solid rgba(255,255,255,0.06)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: 'transparent'
                }}
                onClick={() => setCollapsed(!collapsed)}
            >
                <div className="p-panel-title" style={{ fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Map size={16} color="var(--color-text-secondary)" />
                    {!collapsed && <span style={{ fontWeight: 600 }}>Legend</span>}
                </div>
                {!collapsed ? <ChevronDown size={14} color="var(--color-text-tertiary)" /> : <ChevronRight size={14} color="var(--color-text-tertiary)" />}
            </div>

            {!collapsed && (
                <div style={{ padding: '16px' }}>
                    {/* Languages */}
                    <SectionTitle>Languages</SectionTitle>
                    <div style={{ marginBottom: '20px' }}>
                        {topLangs.map(([lang, count]) => {
                            const langInfo = LANGUAGES[lang] || LANGUAGES.default
                            const percentage = totalFiles > 0 ? Math.round((count / totalFiles) * 100) : 0
                            return (
                                <div key={lang} style={{ marginBottom: '8px' }}>
                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.75rem', marginBottom: '4px', color: 'var(--color-text-secondary)' }}>
                                        <span style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                            <span>{langInfo.icon}</span>
                                            <span style={{ textTransform: 'capitalize' }}>{lang}</span>
                                        </span>
                                        <span style={{ opacity: 0.7 }}>{count}</span>
                                    </div>
                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.05)', borderRadius: '2px', overflow: 'hidden' }}>
                                        <div style={{ height: '100%', width: `${percentage}%`, background: langInfo.color, borderRadius: '2px' }} />
                                    </div>
                                </div>
                            )
                        })}
                    </div>

                    {/* Districts */}
                    {districts?.length > 0 && (
                        <>
                            <SectionTitle>Modules</SectionTitle>
                            <div style={{ marginBottom: '20px', display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                                {districts.slice(0, 5).map(d => (
                                    <div key={d.id} style={{
                                        display: 'flex',
                                        alignItems: 'center',
                                        gap: '6px',
                                        padding: '4px 8px',
                                        background: 'rgba(255,255,255,0.05)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '6px',
                                        fontSize: '0.75rem',
                                        color: 'var(--color-text-secondary)'
                                    }}>
                                        <div style={{ width: '6px', height: '6px', borderRadius: '50%', background: d.color }} />
                                        <span className="truncate" style={{ maxWidth: '80px' }}>{d.name}</span>
                                    </div>
                                ))}
                            </div>
                        </>
                    )}

                    {/* Health Status */}
                    <SectionTitle>Health</SectionTitle>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                        <HealthItem color="var(--color-health-excellent)" label="Healthy" />
                        <HealthItem color="var(--color-health-moderate)" label="Warning" />
                        <HealthItem color="var(--color-health-critical)" label="Critical" />
                    </div>
                </div>
            )}
        </div>
    )
}

function SectionTitle({ children }) {
    return (
        <div style={{
            fontSize: '0.65rem',
            fontWeight: 600,
            textTransform: 'uppercase',
            color: 'var(--color-text-tertiary)',
            letterSpacing: '0.05em',
            marginBottom: '8px'
        }}>
            {children}
        </div>
    )
}

function HealthItem({ color, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.75rem', color: 'var(--color-text-secondary)' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
            <span>{label}</span>
        </div>
    )
}
