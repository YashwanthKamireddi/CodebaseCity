import React, { useCallback, useState } from 'react'
import useStore from '../store/useStore'
import {
    GitGraph,
    Type,
    Moon,
    Sun,
    Download,
    RotateCcw,
    MessageSquare
} from 'lucide-react'
import '../styles/ProfessionalUI.css'

export default function ControlsPanel({ sidebarOpen, onToggleSidebar }) {
    const { toggleRoads, showRoads, toggleNightMode, nightMode, cityData, showLabels, toggleLabels } = useStore()
    const [hoveredBtn, setHoveredBtn] = useState(null)

    const handleExportPNG = useCallback(() => {
        const canvas = document.querySelector('canvas')
        if (!canvas) {
            alert('No canvas found to export')
            return
        }

        try {
            const dataUrl = canvas.toDataURL('image/png', 1.0)
            const link = document.createElement('a')
            link.download = `codebase-city-${cityData?.name || 'export'}-${Date.now()}.png`
            link.href = dataUrl
            link.click()
        } catch (err) {
            console.error('Export failed:', err)
        }
    }, [cityData])

    const ToolButton = ({ id, active, onClick, icon, label, shortcut }) => (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setHoveredBtn(id)}
            onMouseLeave={() => setHoveredBtn(null)}
        >
            <button
                className={`p-icon-btn ${active ? 'active' : ''}`}
                onClick={onClick}
                style={{
                    background: active ? 'var(--color-bg-hover)' : 'transparent',
                    color: active ? 'var(--color-accent)' : 'var(--color-text-secondary)',
                    width: '36px',
                    height: '36px'
                }}
            >
                {icon}
            </button>
            {hoveredBtn === id && (
                <div style={{
                    position: 'absolute',
                    bottom: '100%',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    marginBottom: '8px',
                    padding: '4px 8px',
                    background: 'var(--color-bg-secondary)',
                    border: '1px solid var(--border-default)',
                    borderRadius: '4px',
                    fontSize: '11px',
                    whiteSpace: 'nowrap',
                    boxShadow: 'var(--shadow-lg)',
                    zIndex: 1000,
                    pointerEvents: 'none',
                    color: 'var(--color-text-primary)'
                }}>
                    {label}
                    {shortcut && <span style={{ marginLeft: '6px', opacity: 0.5 }}>{shortcut}</span>}
                </div>
            )}
        </div>
    )

    return (
        <div style={{
            position: 'fixed',
            bottom: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '4px',
            padding: '4px',
            background: 'var(--color-bg-secondary)',
            border: '1px solid var(--border-default)',
            borderRadius: '12px',
            boxShadow: 'var(--shadow-xl)',
            zIndex: 500
        }}>
            <ToolButton
                id="roads"
                active={showRoads}
                onClick={toggleRoads}
                label="Dependencies"
                shortcut="D"
                icon={<GitGraph size={18} />}
            />

            <ToolButton
                id="labels"
                active={showLabels}
                onClick={toggleLabels}
                label="Labels"
                shortcut="L"
                icon={<Type size={18} />}
            />

            <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '4px 2px' }} />

            <ToolButton
                id="night"
                active={nightMode}
                onClick={toggleNightMode}
                label={nightMode ? "Day Mode" : "Night Mode"}
                shortcut="N"
                icon={nightMode ? <Sun size={18} /> : <Moon size={18} />}
            />

            <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '4px 2px' }} />

            <ToolButton
                id="export"
                active={false}
                onClick={handleExportPNG}
                label="Export PNG"
                shortcut="E"
                icon={<Download size={18} />}
            />

            <ToolButton
                id="reset"
                active={false}
                onClick={() => window.location.reload()}
                label="Reset View"
                shortcut="R"
                icon={<RotateCcw size={18} />}
            />

            <div style={{ width: '1px', background: 'var(--border-subtle)', margin: '4px 2px' }} />

            <ToolButton
                id="chat"
                active={sidebarOpen}
                onClick={onToggleSidebar}
                label="Assistant"
                shortcut="G"
                icon={<MessageSquare size={18} />}
            />
        </div>
    )
}
