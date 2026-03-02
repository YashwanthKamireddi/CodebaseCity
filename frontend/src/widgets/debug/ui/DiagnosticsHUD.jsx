import React, { useState, useMemo } from 'react'
import useStore from '../../../store/useStore'
import { AlertTriangle, Shield, Layers, Copy, GitMerge, Activity, X, Zap, ChevronRight, Gauge } from 'lucide-react'
import './DiagnosticsHUD.css'

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

    const stats = useMemo(() => {
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

    if (!cityData) return null

    const healthLevel = stats.health.score >= 90 ? 'excellent' : stats.health.score >= 70 ? 'warning' : 'critical'

    const handleIssueClick = (type, items) => {
        if (highlightedIssue?.type === type) {
            setHighlightedIssue(null)
        } else {
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
            <div className="diag-mini" onClick={() => setExpanded(true)}>
                <div className="diag-mini-fps">
                    <div className={`diag-fps-dot ${fps > 50 ? 'good' : fps > 30 ? 'warn' : 'bad'}`} />
                    <span className="diag-fps-label">{fps} FPS</span>
                </div>

                <div className={`diag-mini-grade ${healthLevel}`}>
                    {stats.health.grade}
                </div>
                <div className="diag-mini-info">
                    <div className="diag-mini-sublabel">System Health</div>
                    <div className="diag-mini-score">{stats.health.score}%</div>
                </div>
            </div>
        )
    }

    // Expanded Dashboard
    return (
        <div className="diag-panel">
            {/* Header */}
            <div className="diag-panel-header">
                <div className="diag-panel-title-row">
                    <Activity size={16} className={`diag-health-icon ${healthLevel}`} />
                    <span className="diag-panel-title">System Diagnostics</span>
                </div>
                <button className="diag-close-btn" onClick={() => setExpanded(false)}>
                    <X size={18} />
                </button>
            </div>

            {/* Health Big Stat */}
            <div className="diag-health-section">
                <div className="diag-health-ring">
                    <svg width="60" height="60" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                        <circle cx="28" cy="28" r="24" className="diag-ring-track" />
                        <circle cx="28" cy="28" r="24" className={`diag-ring-progress ${healthLevel}`}
                            strokeDasharray="150.8"
                            strokeDashoffset={150.8 * (1 - stats.health.score / 100)}
                            strokeLinecap="round"
                        />
                    </svg>
                    <div className="diag-ring-label">{stats.health.grade}</div>
                </div>
                <div>
                    <div className="diag-health-score">{stats.health.score}</div>
                    <div className={`diag-health-status ${healthLevel}`}>
                        {stats.health.score >= 80 ? 'System Stable' : 'Attention Needed'}
                    </div>
                </div>
            </div>

            {/* Issue List */}
            <div className="diag-issue-list">
                <DiagnosticRow
                    label="Architecture"
                    count={stats.violations.count}
                    severity="critical"
                    icon={<Layers size={14} />}
                    active={highlightedIssue?.type === 'violations'}
                    onClick={() => handleIssueClick('violations', stats.violations.items)}
                />
                <DiagnosticRow
                    label="Circular Deps"
                    count={stats.circular.count}
                    severity="poor"
                    icon={<Activity size={14} />}
                    active={highlightedIssue?.type === 'circular'}
                    onClick={() => handleIssueClick('circular', stats.circular.items)}
                />
                <DiagnosticRow
                    label="God Objects"
                    count={stats.godObjects.count}
                    severity="moderate"
                    icon={<AlertTriangle size={14} />}
                    active={highlightedIssue?.type === 'godObjects'}
                    onClick={() => handleIssueClick('godObjects', stats.godObjects.items)}
                />
                <DiagnosticRow
                    label="Large Files"
                    count={stats.heavyFiles.count}
                    severity="info"
                    icon={<Copy size={14} />}
                    active={highlightedIssue?.type === 'heavyFiles'}
                    onClick={() => handleIssueClick('heavyFiles', stats.heavyFiles.items)}
                />
            </div>
        </div>
    )
}

function DiagnosticRow({ label, count, severity, icon, active, onClick }) {
    return (
        <div
            onClick={count > 0 ? onClick : undefined}
            className={`diag-row ${active ? 'active' : ''} ${count > 0 ? 'clickable' : 'disabled'} severity-${severity}`}
        >
            <div className="diag-row-left">
                <span className="diag-row-icon">{icon}</span>
                <span className="diag-row-label">{label}</span>
            </div>
            {count > 0 && (
                <span className="diag-row-badge">{count}</span>
            )}
        </div>
    )
}
