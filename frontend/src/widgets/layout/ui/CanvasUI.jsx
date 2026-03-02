import React from 'react'
import { Plus, Minus, Maximize, Crosshair } from 'lucide-react'
import useStore from '../../../store/useStore'

/**
 * CanvasUI — Camera control overlay
 * Positioned outside the Canvas for reliable HTML rendering.
 * Communicates via store actions that CameraController listens to.
 */
export default function CanvasUI() {
    const { setCameraAction } = useStore()

    return (
        <div className="canvas-ui-controls">
            {/* Zoom Group */}
            <div className="canvas-ui-group">
                <ControlButton icon={<Plus size={18} />} onClick={() => setCameraAction('ZOOM_IN')} title="Zoom In" />
                <ControlButton icon={<Minus size={18} />} onClick={() => setCameraAction('ZOOM_OUT')} title="Zoom Out" />
            </div>

            {/* View Group */}
            <div className="canvas-ui-group">
                <ControlButton icon={<Maximize size={18} />} onClick={() => setCameraAction('FIT')} title="Reset View" />
                <ControlButton icon={<Crosshair size={18} />} onClick={() => setCameraAction('CENTER')} title="Center Origin" />
            </div>
        </div>
    )
}

function ControlButton({ icon, onClick, title }) {
    return (
        <button
            onClick={onClick}
            title={title}
            className="canvas-ui-btn"
        >
            {icon}
        </button>
    )
}
