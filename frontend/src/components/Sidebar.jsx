import React from 'react'
import useStore from '../store/useStore'
import { Folder, File, Code, Hash, Link as LinkIcon, ChevronRight, ChevronDown } from 'lucide-react'

export default function Sidebar() {
    const { cityData, selectBuilding, selectedBuilding, sidebarOpen, setSidebarOpen } = useStore()

    if (!cityData) return null

    const onClose = () => setSidebarOpen(false)

    const { stats, metadata } = cityData
    const health = metadata?.health || { grade: 'A', score: 100 }

    const metrics = [
        { label: 'Files', value: stats?.total_files || 0, icon: <File size={14} /> },
        { label: 'Functions', value: stats?.functions_count || 'N/A', icon: <Code size={14} /> },
        { label: 'Links', value: stats?.total_dependencies || 0, icon: <LinkIcon size={14} /> },
        { label: 'LOC', value: stats?.total_loc?.toLocaleString() || 0, icon: <Hash size={14} /> }
    ]

    return (
        <div
            style={{
                position: 'fixed',
                top: 0,
                left: 0,
                width: '320px',
                height: '100vh',
                zIndex: 900,
                // THE VOID THEME: Premium Solid Dark
                background: '#09090b',
                borderRight: '1px solid #27272a',
                boxShadow: '30px 0 100px rgba(0,0,0,0.8)',
                display: 'flex',
                flexDirection: 'column',
                transform: sidebarOpen ? 'translateX(0)' : 'translateX(-100%)',
                transition: 'transform 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                color: '#e2e8f0'
            }}
        >
            <div className="sidebar-header" style={{
                padding: '24px',
                borderBottom: '1px solid rgba(255,255,255,0.05)',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center'
            }}>
                <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>
                    {cityData.name}
                </h2>
                <button
                    onClick={onClose}
                    style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}
                >
                    ×
                </button>
            </div>

            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto' }}>
                <GlobalIntelligence cityData={cityData} onSelect={selectBuilding} />
            </div>
        </div>
    )
}

function GlobalIntelligence({ cityData, onSelect }) {
    const [tab, setTab] = React.useState('issues') // 'issues' | 'patterns'
    const files = cityData.buildings || []

    // ISSUE DETECTION LOGIC (Client-Side)
    const issues = React.useMemo(() => {
        return [
            {
                id: 'arch',
                title: 'Architecture Violations',
                files: files.filter(f => f.path.includes('util') && f.metrics?.dependencies_out > 5),
                color: '#ef4444'
            },
            {
                id: 'circular',
                title: 'Circular Dependencies',
                files: cityData.stats?.circular_dependencies || [],
                color: '#f97316'
            },
            {
                id: 'coupling',
                title: 'Highly Coupled Files',
                files: files.filter(f => f.metrics?.dependencies_out > 10),
                color: '#eab308'
            },
            {
                id: 'dupes',
                title: 'Duplicate Files',
                files: files.filter(f => f.metrics?.churn > 20),
                color: '#8b5cf6'
            },
            {
                id: 'large',
                title: 'Large Files (>300 lines)',
                files: files.filter(f => f.metrics?.loc > 300),
                color: '#3b82f6'
            }
        ]
    }, [files, cityData.stats])

    // PATTERN DETECTION LOGIC (Mock/Heuristic)
    const patterns = React.useMemo(() => {
        return [
            { title: 'Factories', count: files.filter(f => f.name.includes('Factory')).length },
            { title: 'Observers', count: files.filter(f => f.name.includes('Observer') || f.name.includes('Listener')).length },
            { title: 'Singletons', count: files.filter(f => f.name.includes('Instance') || f.name.includes('Manager')).length },
            { title: 'Adapters', count: files.filter(f => f.name.includes('Adapter')).length },
            { title: 'React Hooks', count: files.filter(f => f.name.startsWith('use')).length },
        ]
    }, [files])

    return (
        <div style={{ padding: '0 16px 24px 16px' }}>
            {/* TABS */}
            <div style={{
                display: 'flex',
                background: '#18181b',
                padding: '4px',
                borderRadius: '8px',
                marginBottom: '16px',
                border: '1px solid #27272a'
            }}>
                {['Issues', 'Patterns'].map(t => (
                    <button
                        key={t}
                        onClick={() => setTab(t.toLowerCase())}
                        style={{
                            flex: 1,
                            padding: '8px',
                            borderRadius: '6px',
                            background: tab === t.toLowerCase() ? '#27272a' : 'transparent',
                            color: tab === t.toLowerCase() ? 'white' : '#a1a1aa',
                            border: 'none',
                            fontSize: '0.85rem',
                            fontWeight: 600,
                            cursor: 'pointer',
                            transition: 'all 0.2s'
                        }}
                    >
                        {t}
                    </button>
                ))}
            </div>

            {/* CONTENT */}
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                {tab === 'issues' ? (
                    issues.map(issue => (
                        <ExpandableCard
                            key={issue.id}
                            title={issue.title}
                            count={issue.files.length}
                            color={issue.color}
                            items={issue.files}
                            onSelect={onSelect}
                        />
                    ))
                ) : (
                    patterns.map((pat, i) => (
                        <div key={i} style={{
                            background: '#18181b',
                            border: '1px solid #27272a',
                            padding: '16px',
                            borderRadius: '12px',
                            display: 'flex', justifyContent: 'space-between', alignItems: 'center'
                        }}>
                            <span style={{ color: '#e4e4e7', fontWeight: 500 }}>{pat.title}</span>
                            <span style={{
                                background: 'rgba(255,255,255,0.1)',
                                padding: '2px 8px',
                                borderRadius: '12px',
                                fontSize: '0.75rem',
                                color: '#a1a1aa'
                            }}>{pat.count}</span>
                        </div>
                    ))
                )}
            </div>
        </div>
    )
}

function ExpandableCard({ title, count, color, items, onSelect }) {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <div style={{
            background: '#18181b',
            border: '1px solid #27272a',
            borderRadius: '12px',
            overflow: 'hidden'
        }}>
            <button
                onClick={() => setExpanded(!expanded)}
                style={{
                    width: '100%',
                    padding: '16px',
                    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                    background: 'transparent',
                    border: 'none',
                    cursor: 'pointer'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    {/* Icon placeholder based on color */}
                    <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color }} />
                    <span style={{ color: '#e4e4e7', fontSize: '0.9rem', fontWeight: 500 }}>{title}</span>
                </div>
                <span style={{
                    color: count > 0 ? color : '#52525b',
                    fontWeight: 700,
                    opacity: count > 0 ? 1 : 0.5
                }}>{count}</span>
            </button>

            {expanded && items.length > 0 && (
                <div style={{ borderTop: '1px solid #27272a', maxHeight: '300px', overflowY: 'auto' }}>
                    {items.map((file, i) => (
                        <div
                            key={i}
                            onClick={() => onSelect(file)}
                            style={{
                                padding: '8px 16px',
                                borderBottom: '1px solid #27272a',
                                cursor: 'pointer',
                                display: 'flex', justifyContent: 'space-between',
                                fontSize: '0.8rem',
                                color: '#a1a1aa',
                                background: '#18181b' // Hover effect via CSS suggested
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = '#27272a'}
                            onMouseLeave={e => e.currentTarget.style.background = '#18181b'}
                        >
                            <span style={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                                {file.name}
                            </span>
                            <span style={{ color: '#52525b' }}>{file.metrics?.loc}L</span>
                        </div>
                    ))}
                </div>
            )}
        </div>
    )
}
