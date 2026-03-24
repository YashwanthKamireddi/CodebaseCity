import React, { useMemo } from 'react'
import useStore from '../../../store/useStore'
import {
    Building2,
    Layers,
    GitCommit,
    Flame,
    Code2,
    Users,
    Camera
} from 'lucide-react'

// Legend data for each view mode
const LEGENDS = {
    language: [
        { color: '#3178c6', label: 'TS' },
        { color: '#f7df1e', label: 'JS' },
        { color: '#3572a5', label: 'Py' },
        { color: '#00add8', label: 'Go' },
        { color: '#dea584', label: 'Rs' },
        { color: '#e34c26', label: 'HTML' },
        { color: '#563d7c', label: 'CSS' },
        { color: '#64748b', label: '...' }
    ],
    complexity: [
        { color: '#22c55e', label: 'Safe' },
        { color: '#84cc16', label: 'Low' },
        { color: '#f59e0b', label: 'Mid' },
        { color: '#e11d48', label: 'High' },
    ],
    churn: [
        { color: '#38bdf8', label: 'Stable' },
        { color: '#84cc16', label: 'Active' },
        { color: '#eab308', label: 'Busy' },
        { color: '#ef4444', label: 'Hot' }
    ],
    layer: [
        { color: '#ffffff', label: 'UI' },
        { color: '#ff6d00', label: 'Service' },
        { color: '#40c4ff', label: 'Data' },
        { color: '#00e676', label: 'Utils' },
        { color: '#ffc400', label: 'DB' }
    ],
    default: [
        { color: '#3b9eff', label: 'Small' },
        { color: '#00e676', label: 'Mid' },
        { color: '#ffc400', label: 'Large' },
        { color: '#ff1744', label: 'Huge' }
    ],
    author: []  // populated dynamically
}

function stringToColor(str) {
    let hash = 0
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash)
    }
    const h = Math.abs(hash % 360)
    return `hsl(${h}, 65%, 55%)`
}

export default function ViewControl() {
    const colorMode = useStore(s => s.colorMode)
    const setColorMode = useStore(s => s.setColorMode)
    const cityData = useStore(s => s.cityData)

    // Build dynamic author legend from actual data
    const authorLegend = useMemo(() => {
        if (!cityData?.buildings) return []
        const authors = new Set()
        for (const b of cityData.buildings) {
            const name = typeof b.author === 'object' ? b.author?.author : b.author
            if (name) authors.add(name)
        }
        return [...authors].map(name => ({
            color: stringToColor(name),
            label: name.split(' ')[0]
        }))
    }, [cityData])

    const colors = [
        { id: 'default', icon: <Building2 size={16} />, label: 'Structure', description: 'Default architectural view' },
        { id: 'layer', icon: <Layers size={16} />, label: 'Architecture', description: 'UI, Service, Data, Util layers' },
        { id: 'churn', icon: <GitCommit size={16} />, label: 'Git Churn', description: 'Files changed frequently' },
        { id: 'complexity', icon: <Flame size={16} />, label: 'Complexity', description: 'Cyclomatic complexity heatmap' },
        { id: 'language', icon: <Code2 size={16} />, label: 'Language', description: 'Color by programming language' },
        { id: 'author', icon: <Users size={16} />, label: 'Authors', description: 'Primary code owners' }
    ]

    const screenshotRequest = useStore(s => s.screenshotRequest)
    const setScreenshotRequest = useStore(s => s.setScreenshotRequest)

    const handleSnapshot = () => {
        setScreenshotRequest(Date.now())
    }

    const activeLegend = LEGENDS[colorMode] || null

    return (
        <div className="view-control-container">
            {/* Main Control Bar */}
            <div className="view-control-bar">
                <span className="view-control-label">View Mode</span>
                <div className="view-control-group">
                    {colors.map(c => (
                        <ViewOption
                            key={c.id}
                            active={colorMode === c.id}
                            onClick={() => setColorMode(c.id)}
                            icon={c.icon}
                            label={c.label}
                            description={c.description}
                        />
                    ))}
                </div>
                <div className="view-control-separator" />
                <ViewOption
                    active={false}
                    onClick={handleSnapshot}
                    icon={<Camera size={16} />}
                    label="Screenshot"
                    description="Save city as PNG image"
                />
            </div>

            {/* Inline Legend — slides out below the bar */}
            {activeLegend && (
                    <div
                        className="view-legend-inline anim-fade-in"
                    >
                        {activeLegend.map((item, i) => (
                            <div key={i} className="view-legend-chip">
                                <span
                                    className="view-legend-dot"
                                    style={{
                                        background: item.color,
                                        boxShadow: `0 0 6px ${item.color}40`
                                    }}
                                />
                                <span className="view-legend-chip-label">{item.label}</span>
                            </div>
                        ))}
                    </div>
                )}
        </div>
    )
}

function ViewOption({ active, onClick, icon, label, description }) {
    const [isHovered, setIsHovered] = React.useState(false)

    return (
        <div className="view-option-wrapper"
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}>
            <button
                onClick={onClick}
                aria-label={label}
                className={`view-option-btn ${active ? 'active' : ''}`}
            >
                {icon}
            </button>

            {isHovered && (
                    <div
                        className="view-option-tooltip anim-fade-in"
                    >
                        <div className="view-option-tooltip-label">{label}</div>
                        {description && (
                            <div className="view-option-tooltip-desc">{description}</div>
                        )}
                        <div className="view-option-tooltip-arrow" />
                    </div>
                )}
        </div>
    )
}
