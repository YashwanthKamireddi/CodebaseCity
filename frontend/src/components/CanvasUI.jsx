import React from 'react'
import { Plus, Minus, Maximize, Crosshair, RefreshCw } from 'lucide-react'
import { useThree } from '@react-three/fiber'
import useStore from '../store/useStore'

// This component must be inside Canvas to access useThree,
// OR use a specialized store subscriber if outside.
// For overlay UI, it's easier to keep it outside Canvas and communicate via Store/Events.
// However, accurate camera manipulation requires Three context.
// Let's make a bridging component or use the store to trigger camera actions.

// Actually, we can just make a UI component that dispatches events to the store,
// and have a logic component inside the canvas listening for them.
// OR, simpler: Just absolute position this over the canvas.

export default function CanvasUI() {
    const { setFocusCamera } = useStore()

    const handleZoomIn = () => {
        // Dispatch zoom event or update store
        // Implementation detail: usually handled by Scene component listening to store
    }

    return (
        <div style={{
            position: 'absolute',
            bottom: '32px',
            right: '32px',
            display: 'flex',
            flexDirection: 'column',
            gap: '8px',
            zIndex: 100
        }}>
            <ControlButton icon={<Plus size={18} />} onClick={() => { }} title="Zoom In" />
            <ControlButton icon={<Minus size={18} />} onClick={() => { }} title="Zoom Out" />
            <div style={{ height: '8px' }} />
            <ControlButton icon={<Maximize size={18} />} onClick={() => setFocusCamera(true)} title="Fit to Screen" />
            <ControlButton icon={<Crosshair size={18} />} onClick={() => { }} title="Center Selection" />
            <ControlButton icon={<RefreshCw size={18} />} onClick={() => { }} title="Reset View" />
        </div>
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
                background: 'rgba(9, 9, 11, 0.8)',
                backdropFilter: 'blur(8px)',
                border: '1px solid rgba(255, 255, 255, 0.1)',
                color: '#cbd5e1',
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
