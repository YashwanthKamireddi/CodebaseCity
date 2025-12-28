import React from 'react'

function Legend({ districts }) {
    if (!districts || districts.length === 0) return null

    return (
        <div className="legend">
            <div className="legend-title">Districts</div>
            {districts.map(district => (
                <div key={district.id} className="legend-item">
                    <div
                        className="legend-color"
                        style={{ backgroundColor: district.color }}
                    />
                    <span>{district.name}</span>
                    <span style={{ color: 'var(--text-muted)', marginLeft: 'auto' }}>
                        {district.building_count}
                    </span>
                </div>
            ))}

            <div className="legend-title" style={{ marginTop: '12px' }}>Visual Indicators</div>
            <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#22c55e' }} />
                <span>Healthy Code</span>
            </div>
            <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#84cc16', opacity: 0.6 }} />
                <span>Moss = Old Code</span>
            </div>
            <div className="legend-item">
                <div className="legend-color" style={{ backgroundColor: '#ef4444' }} />
                <span>🔥 = Hotspot</span>
            </div>
        </div>
    )
}

export default Legend
