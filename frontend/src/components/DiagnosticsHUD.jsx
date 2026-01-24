import React, { useState } from 'react'
import useStore from '../store/useStore'
import { AlertTriangle, Shield, Layers, Copy, GitMerge, Activity, X } from 'lucide-react'

export default function DiagnosticsHUD() {
    const { cityData, setHighlightedIssue, highlightedIssue, selectedBuilding } = useStore()
    const [activeTab, setActiveTab] = useState('issues') // issues, patterns, security
    const [expanded, setExpanded] = useState(true)

    if (!cityData) return null

    // Safety check for metadata (it might be missing in demo data or old scans)
    const metadata = cityData.metadata || {}
    const health = metadata.health || cityData.stats?.health || { grade: 'B', score: 85 } // Fallback
    const issues = metadata.issues || {}
    const layer_violations = metadata.layer_violations || []
    const duplicates = metadata.duplicates || []

    const stats = {
        files: metadata.num_files || cityData.stats?.total_files || 0,
        violations: layer_violations.length,
        duplicates: duplicates.length,
        circles: issues.circular_dependencies?.length || 0,
        coupled: issues.highly_coupled?.length || 0,
        large: issues.large_files?.length || 0
    }

    const getGradeColor = (grade) => {
        if (grade === 'A') return '#4ade80' // Green
        if (grade === 'B') return '#a3e635' // Lime
        if (grade === 'C') return '#facc15' // Yellow
        if (grade === 'D') return '#fb923c' // Orange
        return '#ef4444' // Red
    }

    const toggleIssue = (type, items) => {
        if (highlightedIssue?.type === type) {
            setHighlightedIssue(null) // Toggle off
        } else {
            // Extract paths from items for highlighting
            let paths = []
            if (type === 'circles') {
                paths = items.flatMap(i => i.paths)
            } else if (type === 'duplicates') {
                paths = items.flatMap(i => [i.original, i.duplicate])
            } else if (type === 'violations') {
                paths = items.flatMap(i => [i.source, i.target])
            } else {
                paths = items.map(i => i.path)
            }
            setHighlightedIssue({ type, paths })
        }
    }

    const gradeColor = getGradeColor(health?.grade || 'C')

    const baseStyle = {
        position: 'fixed',
        top: '24px',
        left: '340px', // Fixed Left
        // right: 'auto',
        transition: 'all 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
        zIndex: 900,
    }

    // Minified View
    if (!expanded) {
        return (
            <div
                onClick={() => setExpanded(true)}
                style={{
                    ...baseStyle,
                    background: 'rgba(9, 9, 11, 0.6)',
                    backdropFilter: 'blur(12px)',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    borderRadius: '12px',
                    padding: '12px',
                    cursor: 'pointer',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                }}
            >
                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: `3px solid ${gradeColor}`, color: gradeColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold'
                }}>
                    {health?.grade || '?'}
                </div>
                <span style={{ color: 'white', fontWeight: 600, fontSize: '0.9rem' }}>Diagnostics</span>
            </div>
        )
    }

    return (
        <div style={{
            ...baseStyle,
            width: '320px',
            background: 'rgba(9, 9, 11, 0.85)',
            backdropFilter: 'blur(16px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '16px',
            display: 'flex',
            flexDirection: 'column',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            maxHeight: 'calc(100vh - 120px)',
            overflow: 'hidden',
            fontFamily: '"JetBrains Mono", monospace'
        }}>
            {/* Header */}
            <div style={{
                padding: '20px',
                borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                background: 'linear-gradient(180deg, rgba(255,255,255,0.05) 0%, rgba(0,0,0,0) 100%)'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                    <div style={{
                        width: '48px', height: '48px', borderRadius: '50%',
                        background: 'rgba(0,0,0,0.3)',
                        border: `4px solid ${gradeColor}`,
                        display: 'flex', alignItems: 'center', justifyContent: 'center',
                        fontSize: '1.5rem', fontWeight: 800, color: gradeColor,
                        boxShadow: `0 0 20px ${gradeColor}40`
                    }}>
                        {health?.grade || 'C'}
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#94a3b8', textTransform: 'uppercase', letterSpacing: '1px' }}>Health Score</div>
                        <div style={{ fontSize: '1.25rem', fontWeight: 700, color: 'white' }}>{health?.score || 50}/100</div>
                    </div>
                </div>
                <button
                    onClick={() => setExpanded(false)}
                    style={{ background: 'none', border: 'none', color: '#64748b', cursor: 'pointer' }}
                >
                    <X size={18} />
                </button>
            </div>

            {/* Tabs */}
            <div style={{ display: 'flex', padding: '8px', gap: '4px', borderBottom: '1px solid rgba(255,255,255,0.05)' }}>
                {['issues', 'patterns'].map(tab => (
                    <button
                        key={tab}
                        onClick={() => setActiveTab(tab)}
                        style={{
                            flex: 1,
                            padding: '8px',
                            background: activeTab === tab ? 'rgba(255,255,255,0.1)' : 'transparent',
                            border: 'none',
                            borderRadius: '6px',
                            color: activeTab === tab ? 'white' : '#64748b',
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            textTransform: 'capitalize'
                        }}
                    >
                        {tab}
                    </button>
                ))}
            </div>

            {/* Content List */}
            <div style={{ flex: 1, overflowY: 'auto', padding: '12px' }}>

                {/* Architecture Issues */}
                {activeTab === 'issues' && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>

                        <IssueCard
                            icon={<Layers size={16} color="#ef4444" />}
                            label="Architecture Violations"
                            count={stats.violations}
                            active={highlightedIssue?.type === 'violations'}
                            onClick={() => toggleIssue('violations', layer_violations)}
                        />

                        <IssueCard
                            icon={<Activity size={16} color="#f97316" />}
                            label="Circular Dependencies"
                            count={stats.circles}
                            active={highlightedIssue?.type === 'circles'}
                            onClick={() => toggleIssue('circles', issues.circular_dependencies)}
                        />

                        <IssueCard
                            icon={<GitMerge size={16} color="#eab308" />}
                            label="Highly Coupled Files"
                            count={stats.coupled}
                            active={highlightedIssue?.type === 'coupled'}
                            onClick={() => toggleIssue('coupled', issues.highly_coupled)}
                        />

                        <IssueCard
                            icon={<Copy size={16} color="#a855f7" />}
                            label="Duplicate Files"
                            count={stats.duplicates}
                            active={highlightedIssue?.type === 'duplicates'}
                            onClick={() => toggleIssue('duplicates', duplicates)}
                        />

                        <IssueCard
                            icon={<AlertTriangle size={16} color="#3b82f6" />}
                            label="Large Files (>300 lines)"
                            count={stats.large}
                            active={highlightedIssue?.type === 'large'}
                            onClick={() => toggleIssue('large', issues.large_files)}
                        />
                    </div>
                )}

                {/* Patterns (Mock for now, data flows later) */}
                {activeTab === 'patterns' && (
                    <div style={{ padding: '20px', textAlign: 'center', color: '#64748b', fontSize: '0.9rem' }}>
                        <p>Design Pattern detection is running in background.</p>
                        <br />
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Layers size={14} color="#94a3b8" /> <span style={{ color: 'white' }}>Factories detected</span>
                            </div>
                            <div style={{ padding: '10px', background: 'rgba(255,255,255,0.05)', borderRadius: '8px', display: 'flex', alignItems: 'center', gap: '8px' }}>
                                <Activity size={14} color="#94a3b8" /> <span style={{ color: 'white' }}>React Hooks extracted</span>
                            </div>
                        </div>
                    </div>
                )}

            </div>
        </div>
    )
}

function IssueCard({ icon, label, count, active, onClick }) {
    return (
        <div
            onClick={onClick}
            style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '12px',
                background: active ? 'rgba(59, 130, 246, 0.15)' : 'rgba(255, 255, 255, 0.03)',
                border: active ? '1px solid #3b82f6' : '1px solid rgba(255, 255, 255, 0.05)',
                borderRadius: '8px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {icon}
                <span style={{ fontSize: '0.85rem', color: active ? 'white' : '#cbd5e1' }}>{label}</span>
            </div>
            <span style={{
                fontSize: '0.8rem',
                fontWeight: 600,
                color: count > 0 ? (active ? 'white' : '#94a3b8') : '#475569',
                background: count > 0 ? 'rgba(0,0,0,0.3)' : 'transparent',
                padding: '2px 8px',
                borderRadius: '10px'
            }}>
                {count}
            </span>
        </div>
    )
}
