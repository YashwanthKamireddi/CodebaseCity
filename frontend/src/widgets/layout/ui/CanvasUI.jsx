import React from 'react'
import { Plus, Minus, Maximize, Crosshair, RefreshCw } from 'lucide-react'
import { useThree } from '@react-three/fiber'
import useStore from '../../../store/useStore'

// This component must be inside Canvas to access useThree,
// OR use a specialized store subscriber if outside.
// For overlay UI, it's easier to keep it outside Canvas and communicate via Store/Events.
// However, accurate camera manipulation requires Three context.
// Let's make a bridging component or use the store to trigger camera actions.

// Actually, we can just make a UI component that dispatches events to the store,
// and have a logic component inside the canvas listening for them.
// OR, simpler: Just absolute position this over the canvas.

export default function CanvasUI() {
    const { setCameraAction, selectedBuilding, sidebarOpen } = useStore() // Added sidebarOpen

    return (
        <div style={{
            position: 'fixed',
            bottom: '32px',
            left: sidebarOpen ? '344px' : '24px', // Dodge Left Sidebar
            transition: 'left 0.4s cubic-bezier(0.16, 1, 0.3, 1)',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 2000
        }}>
            {/* Zoom Group */}
            < div style={{
                display: 'flex', flexDirection: 'column',
                background: 'rgba(9, 9, 11, 0.9)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '4px',
                gap: '2px'
            }}>
                <ControlButton icon={<Plus size={20} />} onClick={() => setCameraAction('ZOOM_IN')} title="Zoom In" />
                <ControlButton icon={<Minus size={20} />} onClick={() => setCameraAction('ZOOM_OUT')} title="Zoom Out" />
            </div >

            {/* View Group */}
            < div style={{
                display: 'flex', flexDirection: 'column',
                background: 'rgba(9, 9, 11, 0.9)',
                backdropFilter: 'blur(12px)',
                borderRadius: '12px',
                border: '1px solid rgba(255,255,255,0.1)',
                padding: '4px',
                gap: '2px'
            }}>
                <ControlButton icon={<Maximize size={20} />} onClick={() => setCameraAction('FIT')} title="Reset View" />
                <ControlButton icon={<Crosshair size={20} />} onClick={() => setCameraAction('CENTER')} title="Center Origin" />
            </div >
        </div >
    )
}

function ControlButton({ icon, onClick, title }) {
    return (
        <button
            onClick={onClick}
            title={title}
            style={{
                width: '40px',
                height: '40px',
                borderRadius: '8px',
                background: 'transparent', // Transparent by default
                border: 'none',
                color: '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                transition: 'all 0.2s'
            }}
            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255, 255, 255, 0.1)'}
            onMouseLeave={e => e.currentTarget.style.background = 'rgba(9, 9, 11, 0.8)'}
        >
            {icon}
        </button>
    )
}
