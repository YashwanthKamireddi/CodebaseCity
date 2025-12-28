import React from 'react'

// VSCode-like language colors
const LANGUAGE_COLORS = {
    python: '#3572A5',
    javascript: '#F7DF1E',
    typescript: '#3178C6',
    java: '#B07219',
    go: '#00ADD8',
    rust: '#DEA584',
    cpp: '#F34B7D',
    c: '#555555',
    ruby: '#CC342D',
    php: '#777BB4',
    swift: '#FA7343',
    kotlin: '#A97BFF',
    scala: '#C22D40',
    csharp: '#178600',
    default: '#6B7280'
}

// Language display names
const LANGUAGE_NAMES = {
    python: 'Python',
    javascript: 'JavaScript',
    typescript: 'TypeScript',
    java: 'Java',
    go: 'Go',
    rust: 'Rust',
    cpp: 'C++',
    c: 'C',
    ruby: 'Ruby',
    php: 'PHP',
    swift: 'Swift',
    kotlin: 'Kotlin',
    scala: 'Scala',
    csharp: 'C#',
    html: 'HTML',
    css: 'CSS'
}

export default function LegendPanel({ districts, buildings }) {
    // Count files by language
    const languageCounts = {}
    buildings?.forEach(b => {
        const lang = b.language?.toLowerCase() || 'default'
        languageCounts[lang] = (languageCounts[lang] || 0) + 1
    })

    // Sort by count
    const languages = Object.entries(languageCounts)
        .filter(([lang]) => lang !== 'default' && lang !== 'unknown')
        .sort((a, b) => b[1] - a[1])
        .slice(0, 8)

    return (
        <div className="legend-panel panel">
            <div className="panel-content" style={{ padding: 'var(--space-3)' }}>
                {/* Languages Section */}
                <div className="legend-section">
                    <div className="legend-heading">Languages</div>
                    {languages.map(([lang, count]) => (
                        <div key={lang} className="legend-item">
                            <div
                                className="legend-color"
                                style={{ backgroundColor: LANGUAGE_COLORS[lang] || LANGUAGE_COLORS.default }}
                            />
                            <span>{LANGUAGE_NAMES[lang] || lang}</span>
                            <span className="legend-count">{count}</span>
                        </div>
                    ))}
                </div>

                {/* Districts Section */}
                {districts && districts.length > 0 && (
                    <div className="legend-section">
                        <div className="legend-heading">Districts</div>
                        {districts.slice(0, 6).map(district => (
                            <div key={district.id} className="legend-item">
                                <div
                                    className="legend-color"
                                    style={{ backgroundColor: district.color }}
                                />
                                <span>{district.name}</span>
                                <span className="legend-count">{district.building_count}</span>
                            </div>
                        ))}
                    </div>
                )}

                {/* Health Indicators */}
                <div className="legend-section">
                    <div className="legend-heading">Health Status</div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#22c55e' }} />
                        <span>Healthy</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#eab308' }} />
                        <span>Needs Review</span>
                    </div>
                    <div className="legend-item">
                        <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
                        <span>Critical</span>
                    </div>
                </div>
            </div>
        </div>
    )
}
