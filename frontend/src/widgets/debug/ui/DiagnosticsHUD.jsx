import React, { useState, useMemo } from 'react'
import useStore from '../../../store/useStore'
import { AlertTriangle, Shield, Layers, Copy, GitMerge, Activity, X, Zap, ChevronRight, Gauge } from 'lucide-react'

// FPS Hook
function useFps() {
    const [fps, setFps] = useState(60)
    React.useEffect(() => {
        let frameCount = 0
        let lastTime = performance.now()
        let rafId

        const loop = () => {
            const now = performance.now()
            frameCount++
            if (now - lastTime >= 1000) {
                setFps(Math.round((frameCount * 1000) / (now - lastTime)))
                frameCount = 0
                lastTime = now
            }
            rafId = requestAnimationFrame(loop)
        }
        loop()
        return () => cancelAnimationFrame(rafId)
    }, [])
    return fps
}

export default function DiagnosticsHUD() {
    const { cityData, setHighlightedIssue, highlightedIssue } = useStore()
    const [expanded, setExpanded] = useState(false)
    const fps = useFps()

    // MOVED: Conditional return MUST be after hooks
    // if (!cityData) return null <--- This was the bug

    const stats = useMemo(() => {
        // Handle null cityData gracefully inside the hook
        if (!cityData) return {
            health: { score: 0, grade: '-' },
            violations: { count: 0, items: [] },
            circular: { count: 0, items: [] },
            godObjects: { count: 0, items: [] },
            heavyFiles: { count: 0, items: [] },
            duplicates: { count: 0, items: [] }
        }

        const metadata = cityData.metadata || {}
        const issues = metadata.issues || {}

        // Safe access to backend data
        const violations = metadata.layer_violations || []
        const circular = issues.circular_dependencies || []
        const godObjects = issues.god_objects || []
        const heavyFiles = issues.large_files || []
        const duplicates = metadata.duplicates || []

        const health = metadata.health || { score: 85, grade: 'B' }

        return {
            health,
            violations: { count: violations.length, items: violations },
            circular: { count: circular.length, items: circular },
            godObjects: { count: godObjects.length, items: godObjects },
            heavyFiles: { count: heavyFiles.length, items: heavyFiles },
            duplicates: { count: duplicates.length, items: duplicates }
        }
    }, [cityData])

    // NOW it is safe to return null if we want to stop rendering
    if (!cityData) return null

    const healthColor = stats.health.score >= 90 ? '#4ade80' : stats.health.score >= 70 ? '#facc15' : '#ef4444'

    const handleIssueClick = (type, items) => {
        if (highlightedIssue?.type === type) {
            setHighlightedIssue(null)
        } else {
            // Extract paths similar to Sidebar logic
            let paths = []
            if (type === 'violations') paths = items.flatMap(i => [i.source, i.target])
            else if (type === 'duplicates') paths = items.flatMap(i => [i.original, i.duplicate])
            else if (type === 'circular') paths = items.flatMap(i => i)
            else paths = items

            paths = paths.map(p => typeof p === 'string' ? p : p.path || p)
            setHighlightedIssue({ type, paths })
        }
    }

    // Minified Widget
    if (!expanded) {
        return (
            <div
                onClick={() => setExpanded(true)}
                className="surface-glass text-primary" // Use utility classes
                style={{
                    position: 'fixed',
                    top: 'var(--space-6)',
                    right: 'var(--space-6)',
                    zIndex: 'var(--z-hud)',
                    // background handled by surface-glass
                    // border handled by surface-glass
                    borderRadius: 'var(--radius-lg)',
                    padding: 'var(--space-2) var(--space-4)',
                    cursor: 'pointer',
                    display: 'flex', alignItems: 'center', gap: 'var(--space-3)',
                    boxShadow: '0 8px 32px rgba(0,0,0,0.3)',
                    transition: 'all 0.2s ease'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '12px' }}>
                    <div style={{
                        width: '8px', height: '8px', borderRadius: '50%',
                        background: fps > 50 ? '#4ade80' : fps > 30 ? '#facc15' : '#ef4444',
                        boxShadow: `0 0 8px ${fps > 50 ? '#4ade80' : '#ef4444'}`
                    }} />
                    <span style={{ fontFamily: 'monospace', fontWeight: 700, fontSize: '0.85rem', color: '#e2e8f0' }}>{fps} FPS</span>
                </div>

                <div style={{
                    width: '32px', height: '32px', borderRadius: '50%',
                    border: `3px solid ${healthColor}`, color: healthColor,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    fontWeight: 800, fontSize: '0.9rem'
                }}>
                    {stats.health.grade}
                </div>
                <div>
                    <div style={{ fontSize: '0.7rem', color: '#a1a1aa', textTransform: 'uppercase' }}>System Health</div>
                    <div style={{ fontSize: '0.9rem', fontWeight: 700, color: 'white' }}>{stats.health.score}%</div>
                </div>
            </div>
        )
    }

    // Expanded Dashboard
    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            right: '24px',
            width: '300px',
            zIndex: 800,
            background: '#09090b',
            border: '1px solid #27272a',
            borderRadius: '16px',
            boxShadow: '0 20px 50px rgba(0,0,0,0.5)',
            display: 'flex', flexDirection: 'column',
            animation: 'fadeIn 0.2s ease-out'
        }}>
            {/* Header */}
            <div style={{
                padding: '16px',
                borderBottom: '1px solid #27272a',
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                background: '#0c0c0e',
                borderRadius: '16px 16px 0 0'
            }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <Activity size={16} color={healthColor} />
                    <span style={{ fontWeight: 700, color: 'white' }}>System Diagnostics</span>
                </div>
                <button onClick={() => setExpanded(false)} style={{ background: 'transparent', border: 'none', color: '#52525b', cursor: 'pointer' }}>
                    <X size={18} />
                </button>
            </div>

            {/* Health Big Stat */}
            <div style={{ padding: '20px', display: 'flex', alignItems: 'center', gap: '16px', borderBottom: '1px solid #27272a' }}>
                <div style={{ position: 'relative', width: '60px', height: '60px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg width="60" height="60" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="28" cy="28" r="24" stroke="#27272a" strokeWidth="4" fill="none" />
                        <circle cx="28" cy="28" r="24" stroke={healthColor} strokeWidth="4" fill="none"
                            strokeDasharray="150.8"
                            strokeDashoffset={150.8 * (1 - stats.health.score / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div style={{ position: 'absolute', fontSize: '1.2rem', fontWeight: 800, color: 'white' }}>{stats.health.grade}</div>
                </div>
                <div>
                    <div style={{ fontSize: '1.5rem', fontWeight: 700, color: 'white' }}>{stats.health.score}</div>
                    <div style={{ fontSize: '0.75rem', color: healthColor }}>
                        {stats.health.score >= 80 ? 'System Stable' : 'Attention Needed'}
                    </div>
                </div>
            </div>

            {/* Issue List */}
            <div style={{ padding: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                <DiagnosticRow
                    label="Architecture"
                    count={stats.violations.count}
                    color="#ef4444"
                    icon={<Layers size={14} />}
                    active={highlightedIssue?.type === 'violations'}
                    onClick={() => handleIssueClick('violations', stats.violations.items)}
                />
                <DiagnosticRow
                    label="Circular Deps"
                    count={stats.circular.count}
                    color="#f97316"
                    icon={<Activity size={14} />}
                    active={highlightedIssue?.type === 'circular'}
                    onClick={() => handleIssueClick('circular', stats.circular.items)}
                />
                <DiagnosticRow
                    label="God Objects"
                    count={stats.godObjects.count}
                    color="#eab308"
                    icon={<AlertTriangle size={14} />}
                    active={highlightedIssue?.type === 'godObjects'}
                    onClick={() => handleIssueClick('godObjects', stats.godObjects.items)}
                />
                <DiagnosticRow
                    label="Large Files"
                    count={stats.heavyFiles.count}
                    color="#3b82f6"
                    icon={<Copy size={14} />}
                    active={highlightedIssue?.type === 'heavyFiles'}
                    onClick={() => handleIssueClick('heavyFiles', stats.heavyFiles.items)}
                />
            </div>
        </div>
    )
}

function DiagnosticRow({ label, count, color, icon, active, onClick }) {
    return (
        <div
            onClick={count > 0 ? onClick : undefined}
            style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 12px',
                borderRadius: '8px',
                background: active ? `${color}15` : 'transparent',
                border: active ? `1px solid ${color}40` : '1px solid transparent',
                cursor: count > 0 ? 'pointer' : 'default',
                opacity: count > 0 ? 1 : 0.5,
                transition: 'all 0.1s'
            }}
            onMouseEnter={(e) => count > 0 && !active && (e.currentTarget.style.background = '#18181b')}
            onMouseLeave={(e) => count > 0 && !active && (e.currentTarget.style.background = 'transparent')}
        >
            <div style={{ display: 'flex', alignItems: 'center', gap: '10px', color: active ? 'white' : '#a1a1aa' }}>
                <span style={{ color: active ? color : '#71717a' }}>{icon}</span>
                <span style={{ fontSize: '0.85rem', fontWeight: 500 }}>{label}</span>
            </div>
            {count > 0 && (
                <span style={{
                    fontSize: '0.75rem', fontWeight: 700,
                    color: active ? 'white' : color,
                    background: active ? color : `${color}15`,
                    padding: '2px 8px', borderRadius: '6px'
                }}>{count}</span>
            )}
        </div>
    )
}
