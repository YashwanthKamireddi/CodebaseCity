import React, { useCallback } from 'react'
import useStore from '../store/useStore'

export default function ControlsPanel({ sidebarOpen, onToggleSidebar }) {
    const { toggleRoads, showRoads, toggleNightMode, nightMode, cityData, showLabels, toggleLabels } = useStore()

    const handleExportPNG = useCallback(() => {
        // Find the canvas element
        const canvas = document.querySelector('canvas')
        if (!canvas) {
            alert('No canvas found to export')
            return
        }

        // Get the WebGL context and render
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        if (gl) {
            gl.finish()
        }

        // Convert to data URL and download
        try {
            const dataUrl = canvas.toDataURL('image/png', 1.0)
            const link = document.createElement('a')
            link.download = `codebase-city-${cityData?.name || 'export'}-${Date.now()}.png`
            link.href = dataUrl
            link.click()
        } catch (err) {
            console.error('Export failed:', err)
            alert('Export failed - try refreshing the page')
        }
    }, [cityData])

    const btnStyle = (active) => ({
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        width: '40px',
        height: '40px',
        background: active ? 'linear-gradient(135deg, #818cf8, #6366f1)' : 'rgba(255, 255, 255, 0.08)',
        border: active ? 'none' : '1px solid rgba(255, 255, 255, 0.1)',
        borderRadius: '8px',
        color: active ? '#fff' : 'rgba(255, 255, 255, 0.7)',
        cursor: 'pointer',
        transition: 'all 0.15s ease',
        boxShadow: active ? '0 4px 12px rgba(99, 102, 241, 0.4)' : 'none'
    })

    return (
        <div style={{
            position: 'fixed',
            bottom: '20px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'inline-flex',
            alignItems: 'center',
            gap: '8px',
            padding: '10px 14px',
            background: 'rgba(20, 20, 30, 0.95)',
            backdropFilter: 'blur(12px)',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            boxShadow: '0 4px 24px rgba(0, 0, 0, 0.4)',
            zIndex: 500
        }}>
            {/* Toggle Dependencies */}
            <button
                style={btnStyle(showRoads)}
                onClick={toggleRoads}
                title="Toggle Dependencies"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M7 16l4-8 4 8 4-12" />
                </svg>
            </button>

            {/* Night Mode */}
            <button
                style={btnStyle(nightMode)}
                onClick={toggleNightMode}
                title="Toggle Night Mode"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            </button>

            {/* Labels Toggle */}
            <button
                style={btnStyle(showLabels)}
                onClick={toggleLabels}
                title="Toggle Labels"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M4 7V4h16v3" />
                    <path d="M9 20h6" />
                    <path d="M12 4v16" />
                </svg>
            </button>

            {/* Export PNG */}
            <button
                style={btnStyle(false)}
                onClick={handleExportPNG}
                title="Export as PNG"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                    <polyline points="7 10 12 15 17 10" />
                    <line x1="12" y1="15" x2="12" y2="3" />
                </svg>
            </button>

            {/* Reset View */}
            <button
                style={btnStyle(false)}
                onClick={() => window.location.reload()}
                title="Reset View"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
            </button>

            {/* AI Chat Toggle */}
            <button
                style={btnStyle(sidebarOpen)}
                onClick={onToggleSidebar}
                title="Toggle AI Guide"
            >
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>
        </div>
    )
}
