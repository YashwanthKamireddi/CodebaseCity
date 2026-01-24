import React, { useMemo } from 'react'
import useStore from '../store/useStore'
import { Folder, File, Code, Hash, Link as LinkIcon, ChevronRight, ChevronDown, Activity, AlertTriangle, CheckCircle, BarChart2, Layers } from 'lucide-react'
import { detectPattern } from './BuildingLabel'

export default function Sidebar() {
    const { cityData, selectBuilding, selectedBuilding, sidebarOpen, setSidebarOpen } = useStore()
    const onClose = () => setSidebarOpen(false)

    // Advanced Health Logic (Ported from HealthDashboard)
    const stats = useMemo(() => {
        if (!cityData?.buildings) return null
        const buildings = cityData.buildings

        // Pattern counts
        const patterns = { god_class: 0, data_class: 0, lazy_class: 0, brain_class: 0, blob: 0 }
        let totalLoc = 0
        let totalComplexity = 0
        let hotspots = 0

        buildings.forEach(b => {
            totalLoc += b.metrics?.loc || 0
            totalComplexity += b.metrics?.complexity || 0
            if (b.is_hotspot) hotspots++
            const p = detectPattern(b)
            if (p) patterns[p.type] = (patterns[p.type] || 0) + 1
        })

        const patternPenalty = (patterns.god_class * 10 + patterns.blob * 8 + patterns.brain_class * 5)
        const hotspotPenalty = hotspots * 3
        const healthScore = Math.max(0, Math.min(100, 100 - patternPenalty - hotspotPenalty))

        return {
            healthScore,
            hotspots,
            patterns,
            violations: cityData.metadata?.layer_violations?.length || 0,
            duplicates: cityData.metadata?.duplicates?.length || 0,
            circles: cityData.metadata?.issues?.circular_dependencies?.length || 0,
            large: buildings.filter(b => (b.metrics?.loc || 0) > 300).length
        }
    }, [cityData])

    if (!cityData || !stats) return null

    const healthColor = stats.healthScore >= 70 ? '#4ade80' : stats.healthScore >= 40 ? '#facc15' : '#ef4444'

    return (
        <div
            style={{
                position: 'fixed',
                top: 0, left: 0, width: '320px', height: '100vh', zIndex: 900,
                background: '#09090b',
                borderRight: '1px solid #27272a',
                boxShadow: '30px 0 100px rgba(0,0,0,0.8)',
                display: 'flex', flexDirection: 'column',
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
                <h2 style={{ fontSize: '1.2rem', margin: 0, fontWeight: 700, letterSpacing: '-0.02em', color: 'white' }}>{cityData.name}</h2>
                <button onClick={onClose} style={{ background: 'transparent', border: 'none', color: '#94a3b8', fontSize: '1.5rem', cursor: 'pointer' }}>×</button>
            </div>

            <div className="sidebar-content" style={{ flex: 1, overflowY: 'auto', padding: '16px' }}>

                {/* HEALTH RING WIDGET */}
                <div style={{
                    display: 'flex', alignItems: 'center', gap: '16px',
                    marginBottom: '24px', padding: '20px',
                    background: '#18181b', borderRadius: '16px',
                    border: '1px solid #27272a',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.2)'
                }}>
                    <div style={{ position: 'relative', width: '64px', height: '64px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                        <svg width="64" height="64" viewBox="0 0 56 56" style={{ transform: 'rotate(-90deg)' }}>
                            <circle cx="28" cy="28" r="24" stroke="#27272a" strokeWidth="4" fill="none" />
                            <circle cx="28" cy="28" r="24" stroke={healthColor} strokeWidth="4" fill="none"
                                strokeDasharray="150.8"
                                strokeDashoffset={150.8 * (1 - stats.healthScore / 100)}
                                strokeLinecap="round"
                            />
                        </svg>
                        <div style={{ position: 'absolute', fontSize: '1.1rem', fontWeight: 800, color: 'white' }}>{stats.healthScore}</div>
                    </div>
                    <div>
                        <div style={{ fontSize: '0.75rem', color: '#a1a1aa', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '4px' }}>Health Score</div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 700, color: healthColor }}>
                            {stats.healthScore >= 80 ? 'Excellent' : stats.healthScore >= 50 ? 'Moderate' : 'Critical'}
                        </div>
                    </div>
                </div>

                {/* ISSUES LIST */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    <div style={{ fontSize: '0.75rem', fontWeight: 600, color: '#52525b', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '8px' }}>
                        Issues Detected
                    </div>

                    <IssueItem icon={<Layers size={16} color="#ef4444" />} label="Architecture Violations" count={stats.violations} color="#ef4444" />
                    <IssueItem icon={<Activity size={16} color="#f97316" />} label="Circular Dependencies" count={stats.circles} color="#f97316" />
                    <IssueItem icon={<AlertTriangle size={16} color="#eab308" />} label="Hotspots & God Classes" count={stats.hotspots + stats.patterns.god_class} color="#eab308" />
                    <IssueItem icon={<Activity size={16} color="#3b82f6" />} label="Large Files (>300 lines)" count={stats.large} color="#3b82f6" />
                </div>
            </div>
        </div>
    )
}

function IssueItem({ icon, label, count, color }) {
    const active = count > 0
    return (
        <div style={{
            display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            padding: '12px 16px',
            background: active ? `${color}10` : '#18181b', // 10 = alpha ~6%
            border: active ? `1px solid ${color}40` : '1px solid #27272a',
            borderRadius: '12px',
            cursor: 'pointer',
            transition: 'all 0.2s'
        }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                {icon}
                <span style={{ fontSize: '0.9rem', color: active ? '#e4e4e7' : '#71717a', fontWeight: active ? 500 : 400 }}>{label}</span>
            </div>
            {active && (
                <span style={{
                    background: color, color: 'white',
                    fontSize: '0.75rem', fontWeight: 700,
                    padding: '2px 8px', borderRadius: '12px'
                }}>
                    {count}
                </span>
            )}
        </div>
    )
}
