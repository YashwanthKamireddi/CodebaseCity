import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'
import { Network, Layers, Activity, FileCode, Sliders, Camera, Flame } from 'lucide-react'

export default function ViewControl() {
    const { layoutMode, setLayoutMode, colorMode, setColorMode } = useStore()

    const colors = [
        { id: 'default', icon: <FileCode size={16} />, label: 'Structure' },
        { id: 'layer', icon: <Layers size={16} />, label: 'Layer' },
        { id: 'churn', icon: <Activity size={16} />, label: 'Churn' },
        { id: 'complexity', icon: <Flame size={16} />, label: 'Complexity' },
        { id: 'language', icon: <Sliders size={16} />, label: 'Language' },
        { id: 'author', icon: <Activity size={16} style={{ transform: 'rotate(90deg)' }} />, label: 'Social' }
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
        <>
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

            {/* Dynamic Legend for Language Mode */}
            {
                colorMode === 'language' && (
                    <div style={{
                        position: 'fixed',
                        top: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '16px',
                        padding: '8px 16px',
                        background: 'rgba(9, 9, 11, 0.6)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '50px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        zIndex: 1900,
                        pointerEvents: 'none', // Pass through clicks
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <LegendItem color="#3178c6" label="TS" />
                        <LegendItem color="#f7df1e" label="JS" />
                        <LegendItem color="#3572a5" label="Py" />
                        <LegendItem color="#e34c26" label="HTML" />
                        <LegendItem color="#563d7c" label="CSS" />
                        <LegendItem color="#41b883" label="Vue" />
                        <LegendItem color="#64748b" label="Other" />
                    </div>
                )
            }

            {/* Dynamic Legend for Complexity Mode */}
            {
                colorMode === 'complexity' && (
                    <div style={{
                        position: 'fixed',
                        top: '80px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '16px',
                        padding: '8px 16px',
                        background: 'rgba(9, 9, 11, 0.6)',
                        backdropFilter: 'blur(12px)',
                        borderRadius: '50px',
                        border: '1px solid rgba(255,255,255,0.05)',
                        zIndex: 1900,
                        pointerEvents: 'none',
                        animation: 'fadeIn 0.3s ease'
                    }}>
                        <LegendItem color="#10b981" label="Safe" />
                        <LegendItem color="#facc15" label="Low" />
                        <LegendItem color="#f59e0b" label="Medium" />
                        <LegendItem color="#9333ea" label="High" />
                        <LegendItem color="#db2777" label="Extreme" />
                    </div>
                )
            }
        </>
    )
}

function LegendItem({ color, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: color, boxShadow: `0 0 8px ${color}` }} />
            <span style={{ fontSize: '0.75rem', color: 'rgba(255,255,255,0.8)', fontWeight: 500 }}>{label}</span>
        </div>
    )
}



// ... existing ViewControl code ...

// ... existing LegendItem code ...

function Option({ active, onClick, icon, label }) {
    const [isHovered, setIsHovered] = React.useState(false)

    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                onClick={onClick}
                // Removed native title to prevent double tooltip
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

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 12, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            top: '100%',
                            left: '50%',
                            transform: 'translateX(-50%)', // Note: motion handles x/y separate from transform string often, but sticking to style is safe if x not used prop
                            backgroundColor: 'rgba(9, 9, 11, 0.9)',
                            backdropFilter: 'blur(8px)',
                            color: 'white',
                            padding: '6px 10px',
                            borderRadius: '6px',
                            fontSize: '0.75rem',
                            fontWeight: 500,
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            pointerEvents: 'none',
                            zIndex: 100,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                            // Fix Framer Motion centering override
                            x: "-50%"
                        }}
                    >
                        {label}
                        {/* Little Arrow */}
                        <div style={{
                            position: 'absolute',
                            top: '-4px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '8px',
                            height: '8px',
                            background: 'rgba(9, 9, 11, 0.9)',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>
        </div>
    )
}
