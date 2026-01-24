import React from 'react'
import useStore from '../store/useStore'
import { LayoutGrid, Network, GitGraph, Layers, Activity, FileCode, Sliders, Camera } from 'lucide-react'

export default function ViewControl() {
    const { layoutMode, setLayoutMode, colorMode, setColorMode } = useStore()

    const layouts = [
        { id: 'city', icon: <LayoutGrid size={16} />, label: 'City Grid' },
        { id: 'galaxy', icon: <Network size={16} />, label: 'Galaxy' },
        // { id: 'tree', icon: <GitGraph size={16} />, label: 'Tree' } // Coming soon
    ]

    const colors = [
        { id: 'default', icon: <FileCode size={16} />, label: 'Structure' },
        { id: 'layer', icon: <Layers size={16} />, label: 'Layer' },
        { id: 'churn', icon: <Activity size={16} />, label: 'Churn' },
        { id: 'language', icon: <Sliders size={16} />, label: 'Language' }
    ]

    const handleSnapshot = () => {
        const canvas = document.querySelector('canvas')
        if (canvas) {
            const link = document.createElement('a')
            link.download = 'code-city-snapshot.png'
            link.href = canvas.toDataURL('image/png')
            link.click()
        }
    }

    return (
        <div style={{
            position: 'fixed',
            top: '24px',
            left: '50%',
            transform: 'translateX(-50%)',
            display: 'flex',
            gap: '12px',
            background: 'rgba(9, 9, 11, 0.8)',
            backdropFilter: 'blur(12px)',
            padding: '8px',
            borderRadius: '12px',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            zIndex: 2000,
            boxShadow: '0 8px 32px rgba(0,0,0,0.3)'
        }}>
            {/* Layouts */}
            <div style={{ display: 'flex', gap: '4px', borderRight: '1px solid rgba(255,255,255,0.1)', paddingRight: '8px' }}>
                {layouts.map(l => (
                    <Option
                        key={l.id}
                        active={layoutMode === l.id}
                        onClick={() => setLayoutMode(l.id)}
                        icon={l.icon}
                        label={l.label}
                    />
                ))}
            </div>

            {/* Colors */}
            <div style={{ display: 'flex', gap: '4px' }}>
                {colors.map(c => (
                    <Option
                        key={c.id}
                        active={colorMode === c.id}
                        onClick={() => setColorMode(c.id)}
                        icon={c.icon}
                        label={c.label}
                    />
                ))}
            </div>

            {/* Separator */}
            <div style={{ width: '1px', background: 'rgba(255,255,255,0.1)' }}></div>

            {/* Actions */}
            <Option
                active={false}
                onClick={handleSnapshot}
                icon={<Camera size={16} />}
                label="Take Snapshot"
            />
        </div>
    )
}

function Option({ active, onClick, icon, label }) {
    return (
        <button
            onClick={onClick}
            title={label}
            style={{
                background: active ? 'rgba(255, 255, 255, 0.15)' : 'transparent',
                border: 'none',
                borderRadius: '8px',
                width: '32px',
                height: '32px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                color: active ? 'white' : '#94a3b8',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
            }}
        >
            {icon}
        </button>
    )
}
