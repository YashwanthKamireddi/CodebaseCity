import React from 'react'

// Compact language colors
const COLORS = {
    python: '#3572A5',
    javascript: '#F7DF1E',
    typescript: '#3178C6',
    java: '#B07219',
    go: '#00ADD8',
    rust: '#DEA584',
    default: '#6B7280'
}

export default function LegendPanel({ districts, buildings }) {
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
        .slice(0, 4)

    return (
        <div style={{
            position: 'fixed',
            bottom: '80px',
            right: '16px',
            width: '160px',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(10px)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            borderRadius: '10px',
            padding: '12px',
            zIndex: 400,
            fontSize: '12px',
            color: '#b4b4c0'
        }}>
            {/* Languages */}
            <div style={{ marginBottom: '12px' }}>
                <div style={{ fontSize: '10px', color: '#7a7a8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Languages
                </div>
                {topLangs.map(([lang, count]) => (
                    <div key={lang} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: COLORS[lang] || COLORS.default }} />
                        <span style={{ flex: 1, textTransform: 'capitalize' }}>{lang}</span>
                        <span style={{ color: '#6b7280' }}>{count}</span>
                    </div>
                ))}
            </div>

            {/* Districts - compact */}
            {districts?.length > 0 && (
                <div style={{ marginBottom: '12px' }}>
                    <div style={{ fontSize: '10px', color: '#7a7a8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                        Districts
                    </div>
                    {districts.slice(0, 3).map(d => (
                        <div key={d.id} style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '4px' }}>
                            <div style={{ width: '8px', height: '8px', borderRadius: '2px', background: d.color }} />
                            <span style={{ flex: 1 }}>{d.name}</span>
                            <span style={{ color: '#6b7280' }}>{d.building_count}</span>
                        </div>
                    ))}
                </div>
            )}

            {/* Health - very compact */}
            <div>
                <div style={{ fontSize: '10px', color: '#7a7a8c', marginBottom: '6px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    Health
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#22c55e' }} />
                        <span>OK</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#eab308' }} />
                        <span>Warn</span>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
                        <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ef4444' }} />
                        <span>Crit</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
