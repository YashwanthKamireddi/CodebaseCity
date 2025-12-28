import React from 'react'
import useStore from '../store/useStore'

export default function ControlsPanel({ sidebarOpen, onToggleSidebar }) {
    const { toggleRoads, showRoads, toggleNightMode, nightMode } = useStore()

    return (
        <div className="controls-panel">
            <button
                className={`control-btn ${showRoads ? 'active' : ''}`}
                onClick={toggleRoads}
                title="Toggle dependencies"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 3v18h18" />
                    <path d="M7 16l4-8 4 8 4-12" />
                </svg>
            </button>

            <button
                className={`control-btn ${nightMode ? 'active' : ''}`}
                onClick={toggleNightMode}
                title="Toggle night mode"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
                </svg>
            </button>

            <button
                className="control-btn"
                onClick={() => window.location.reload()}
                title="Reset view"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
                    <path d="M3 3v5h5" />
                </svg>
            </button>

            <button
                className={`control-btn ${sidebarOpen ? 'active' : ''}`}
                onClick={onToggleSidebar}
                title="Toggle AI Guide"
            >
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
                </svg>
            </button>
        </div>
    )
}
