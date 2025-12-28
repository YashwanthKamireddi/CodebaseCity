import React from 'react'

function Controls({ onToggleSidebar, showSidebar }) {
    return (
        <div className="controls-overlay">
            <button
                className="control-btn"
                title="Reset View"
                onClick={() => {
                    // Could reset camera position
                    console.log('Reset view')
                }}
            >
                🏠
            </button>

            <button
                className="control-btn"
                title="Toggle Grid"
                onClick={() => console.log('Toggle grid')}
            >
                ⊞
            </button>

            <button
                className="control-btn"
                title="Toggle Roads"
                onClick={() => console.log('Toggle roads')}
            >
                🛤️
            </button>

            <button
                className={`control-btn ${showSidebar ? 'active' : ''}`}
                title="Toggle City Guide"
                onClick={onToggleSidebar}
            >
                💬
            </button>
        </div>
    )
}

export default Controls
