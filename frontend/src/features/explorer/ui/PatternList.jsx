import React from 'react'
import { AlertTriangle, Repeat, Ghost, AlertOctagon, Sparkles, Box } from 'lucide-react'
import useStore from '../../../store/useStore'

export default function PatternList({ issues, buildings }) {
    const { selectBuilding, cityData } = useStore()

    // 1. Aggregate Good Patterns from Files
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

    // Helper to find building object by path/name
    const findBuilding = (name) => {
        return cityData?.buildings?.find(b => b.name === name || b.path === name)
    }

    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

            {/* --- BAD PATTERNS (RISKS) --- */}

            {/* God Objects */}
            {issues.god_objects?.length > 0 && (
                <PatternCard
                    title="God Objects"
                    count={issues.god_objects.length}
                    icon={<AlertOctagon size={16} />}
                    color="#ef4444"
                    description="Files with too many responsibilities (>20 connections). High coupling risk."
                >
                    {issues.god_objects.map((name, i) => (
                        <div key={i} className="pattern-item" onClick={() => selectBuilding(findBuilding(name))}>
                            {name}
                        </div>
                    ))}
                </PatternCard>
            )}

            {/* Circular Dependencies */}
            {issues.circular_dependencies?.length > 0 && (
                <PatternCard
                    title="Circular Dependencies"
                    count={issues.circular_dependencies.length}
                    icon={<Repeat size={16} />}
                    color="#f59e0b"
                    description="Modules that import each other. Causes infinite loops and tight coupling."
                >
                    {issues.circular_dependencies.map((cycle, i) => (
                        <div key={i} className="pattern-item" style={{ fontSize: '0.7rem' }}>
                            Cycle {i + 1}: {cycle.join(' → ')}
                        </div>
                    ))}
                </PatternCard>
            )}

            {/* Orphans */}
            {issues.orphans?.length > 0 && (
                <PatternCard
                    title="Orphan Files"
                    count={issues.orphans.length}
                    icon={<Ghost size={16} />}
                    color="#64748b"
                    description="Files with 0 dependencies and 0 dependents. Likely dead code."
                >
                    {issues.orphans.map((name, i) => (
                        <div key={i} className="pattern-item" onClick={() => selectBuilding(findBuilding(name))}>
                            {name}
                        </div>
                    ))}
                </PatternCard>
            )}

            {/* --- GOOD PATTERNS (ARCHITECTURE) --- */}
            <div style={{ height: '1px', background: 'rgba(255,255,255,0.1)', margin: '8px 0' }} />

            {/* Custom Hooks */}
            {patterns.hooks.length > 0 && (
                <PatternCard
                    title="Custom Hooks"
                    count={patterns.hooks.length}
                    icon={<Sparkles size={16} />}
                    color="#3b82f6"
                    description="Reusable logic abstractions (use...)."
                >
                    {patterns.hooks.map((b, i) => (
                        <div key={i} className="pattern-item" onClick={() => selectBuilding(b)}>
                            {b.name}
                        </div>
                    ))}
                </PatternCard>
            )}

            {/* Factories */}
            {patterns.factories.length > 0 && (
                <PatternCard
                    title="Factories"
                    count={patterns.factories.length}
                    icon={<Box size={16} />}
                    color="#10b981"
                    description="Object creation patterns."
                >
                    {patterns.factories.map((b, i) => (
                        <div key={i} className="pattern-item" onClick={() => selectBuilding(b)}>
                            {b.name}
                        </div>
                    ))}
                </PatternCard>
            )}

            <style>{`
                .pattern-item {
                    padding: 6px 8px;
                    background: rgba(255,255,255,0.05);
                    border-radius: 4px;
                    margin-bottom: 4px;
                    font-family: var(--font-mono);
                    font-size: 0.8rem;
                    cursor: pointer;
                    transition: background 0.2s;
                }
                .pattern-item:hover {
                    background: rgba(255,255,255,0.1);
                    color: white;
                }
            `}</style>
        </div>
    )
}

function PatternCard({ title, count, icon, color, description, children }) {
    const [expanded, setExpanded] = React.useState(false)

    return (
        <div style={{
            background: 'rgba(0,0,0,0.3)',
            border: `1px solid ${color}30`,
            borderRadius: '8px',
            overflow: 'hidden'
        }}>
            <div
                onClick={() => setExpanded(!expanded)}
                style={{
                    padding: '12px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    cursor: 'pointer',
                    background: expanded ? `${color}10` : 'transparent'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <div style={{ color: color }}>{icon}</div>
                    <span style={{ fontWeight: 600, color: '#e2e8f0', fontSize: '0.9rem' }}>{title}</span>
                </div>
                <div style={{
                    padding: '2px 8px',
                    background: color,
                    borderRadius: '12px',
                    fontSize: '0.75rem',
                    fontWeight: 700,
                    color: '#000'
                }}>
                    {count}
                </div>
            </div>

            {expanded && (
                <div style={{ padding: '12px', borderTop: `1px solid ${color}20` }}>
                    <div style={{ fontSize: '0.75rem', color: '#94a3b8', marginBottom: '12px', fontStyle: 'italic' }}>
                        {description}
                    </div>
                    <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                        {children}
                    </div>
                </div>
            )}
        </div>
    )
}
