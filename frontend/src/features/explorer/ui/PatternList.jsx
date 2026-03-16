import React from 'react'
import { AlertTriangle, Repeat, Ghost, AlertOctagon, Sparkles, Box, ChevronRight } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function PatternList({ issues, buildings }) {
    const selectBuilding = useStore(s => s.selectBuilding)
    const cityData = useStore(s => s.cityData)

    const patterns = React.useMemo(() => {
        const acc = { factories: [], singletons: [], hooks: [] }
        if (!buildings) return acc
        buildings.forEach(b => {
            if (!b.patterns) return
            if (b.patterns.includes('Factory')) acc.factories.push(b)
            if (b.patterns.includes('Singleton')) acc.singletons.push(b)
            if (b.patterns.includes('Custom Hook')) acc.hooks.push(b)
        })
        return acc
    }, [buildings])

    if (!issues) return null

    // O(1) lookup map instead of O(N) .find() per click
    const buildingMap = React.useMemo(() => {
        const map = new Map()
        if (!cityData?.buildings) return map
        for (const b of cityData.buildings) {
            map.set(b.name, b)
            map.set(b.path, b)
        }
        return map
    }, [cityData])

    const findBuilding = (name) => buildingMap.get(name) || null

    return (
        <div className="pl-root">
            {/* RISKS */}
            {issues.god_objects?.length > 0 && (
                <PatternCard title="God Objects" count={issues.god_objects.length}
                    icon={<AlertOctagon size={16} />} variant="danger"
                    description="Files with too many responsibilities (>20 connections). High coupling risk.">
                    {issues.god_objects.map((name, i) => (
                        <div key={i} className="pl-item" onClick={() => selectBuilding(findBuilding(name))}>{name}</div>
                    ))}
                </PatternCard>
            )}
            {issues.circular_dependencies?.length > 0 && (
                <PatternCard title="Circular Dependencies" count={issues.circular_dependencies.length}
                    icon={<Repeat size={16} />} variant="warning"
                    description="Modules that import each other. Causes tight coupling.">
                    {issues.circular_dependencies.map((cycle, i) => (
                        <div key={i} className="pl-item pl-item--small">Cycle {i + 1}: {cycle.join(' → ')}</div>
                    ))}
                </PatternCard>
            )}
            {issues.orphans?.length > 0 && (
                <PatternCard title="Orphan Files" count={issues.orphans.length}
                    icon={<Ghost size={16} />} variant="muted"
                    description="Files with 0 dependencies and 0 dependents. Likely dead code.">
                    {issues.orphans.map((name, i) => (
                        <div key={i} className="pl-item" onClick={() => selectBuilding(findBuilding(name))}>{name}</div>
                    ))}
                </PatternCard>
            )}

            <div className="pl-divider" />

            {/* GOOD PATTERNS */}
            {patterns.hooks.length > 0 && (
                <PatternCard title="Custom Hooks" count={patterns.hooks.length}
                    icon={<Sparkles size={16} />} variant="info"
                    description="Reusable logic abstractions (use...).">
                    {patterns.hooks.map((b, i) => (
                        <div key={i} className="pl-item" onClick={() => selectBuilding(b)}>{b.name}</div>
                    ))}
                </PatternCard>
            )}
            {patterns.factories.length > 0 && (
                <PatternCard title="Factories" count={patterns.factories.length}
                    icon={<Box size={16} />} variant="success"
                    description="Object creation patterns.">
                    {patterns.factories.map((b, i) => (
                        <div key={i} className="pl-item" onClick={() => selectBuilding(b)}>{b.name}</div>
                    ))}
                </PatternCard>
            )}

            <style>{`
                .pl-root { display: flex; flex-direction: column; gap: var(--space-3); }
                .pl-divider {
                    height: 1px; margin: var(--space-2) 0;
                    background: linear-gradient(90deg, transparent, var(--border-default), transparent);
                }
                .pl-card {
                    border-radius: var(--radius-lg); overflow: hidden;
                    border: 1px solid var(--border-subtle);
                    background: var(--glass-bg);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    transition: border-color 0.2s;
                }
                .pl-card:hover { border-color: var(--border-default); }
                .pl-card-head {
                    padding: var(--space-3) var(--space-4);
                    display: flex; align-items: center; justify-content: space-between;
                    cursor: pointer; user-select: none;
                    transition: background 0.15s;
                }
                .pl-card-head:hover { background: rgba(255,255,255,0.02); }
                .pl-card-head-left { display: flex; align-items: center; gap: var(--space-2-5); }
                .pl-card-title {
                    font-weight: var(--font-semibold); color: var(--color-text-primary);
                    font-size: var(--text-sm);
                }
                .pl-card-badge {
                    padding: 2px 8px; border-radius: var(--radius-full);
                    font-size: var(--text-xs); font-weight: var(--font-bold);
                    min-width: 24px; text-align: center;
                }
                .pl-card-badge--danger  { background: rgba(239,68,68,0.15); color: var(--color-error); }
                .pl-card-badge--warning { background: rgba(245,158,11,0.15); color: var(--color-warning); }
                .pl-card-badge--muted   { background: var(--color-bg-tertiary); color: var(--color-text-muted); }
                .pl-card-badge--info    { background: rgba(56,189,248,0.15); color: var(--color-info); }
                .pl-card-badge--success { background: rgba(34,197,94,0.15); color: var(--color-success); }
                .pl-card-icon--danger  { color: var(--color-error); }
                .pl-card-icon--warning { color: var(--color-warning); }
                .pl-card-icon--muted   { color: var(--color-text-muted); }
                .pl-card-icon--info    { color: var(--color-info); }
                .pl-card-icon--success { color: var(--color-success); }
                .pl-card-chevron {
                    color: var(--color-text-muted); transition: transform 0.2s;
                }
                .pl-card-chevron--open { transform: rotate(90deg); }
                .pl-card-body {
                    padding: 0 var(--space-4) var(--space-4);
                    border-top: 1px solid var(--border-subtle);
                }
                .pl-card-desc {
                    font-size: var(--text-xs); color: var(--color-text-muted);
                    margin: var(--space-3) 0; line-height: var(--leading-normal);
                }
                .pl-card-list { max-height: 200px; overflow-y: auto; }
                .pl-item {
                    padding: var(--space-1-5) var(--space-2-5);
                    background: var(--color-bg-tertiary); border-radius: var(--radius-sm);
                    margin-bottom: var(--space-1);
                    font-family: var(--font-mono); font-size: var(--text-sm);
                    cursor: pointer; transition: background 0.15s;
                    color: var(--color-text-secondary);
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .pl-item:hover { background: var(--color-bg-hover); color: var(--color-text-primary); }
                .pl-item--small { font-size: var(--text-xs); }
                .pl-card-list::-webkit-scrollbar { width: 3px; }
                .pl-card-list::-webkit-scrollbar-track { background: transparent; }
                .pl-card-list::-webkit-scrollbar-thumb { background: var(--border-default); border-radius: 2px; }
            `}</style>
        </div>
    )
}

function PatternCard({ title, count, icon, variant, description, children }) {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <div className="pl-card">
            <div className="pl-card-head" onClick={() => setExpanded(!expanded)}>
                <div className="pl-card-head-left">
                    <span className={`pl-card-icon--${variant}`}>{icon}</span>
                    <span className="pl-card-title">{title}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 'var(--space-2)' }}>
                    <span className={`pl-card-badge pl-card-badge--${variant}`}>{count}</span>
                    <ChevronRight size={14} className={`pl-card-chevron ${expanded ? 'pl-card-chevron--open' : ''}`} />
                </div>
            </div>
            {expanded && (
                <div className="pl-card-body">
                    <p className="pl-card-desc">{description}</p>
                    <div className="pl-card-list">{children}</div>
                </div>
            )}
        </div>
    )
}
