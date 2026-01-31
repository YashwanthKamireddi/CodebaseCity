import React from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'
import {
    // Semantic Icons for each mode
    Building2,      // Structure mode - architectural icon
    Layers,         // Layer mode - stacked layers
    GitCommit,      // Churn mode - git/version control
    Flame,          // Complexity mode - heat/intensity
    Code2,          // Language mode - programming
    Users,          // Social/Author mode - people
    Camera,         // Snapshot action
    Download        // Export action
} from 'lucide-react'

export default function ViewControl() {
    const { layoutMode, setLayoutMode, colorMode, setColorMode } = useStore()

    // Color modes with SEMANTIC icons that actually represent their function
    const colors = [
        {
            id: 'default',
            icon: <Building2 size={16} />,
            label: 'Structure',
            description: 'Default architectural view'
        },
        {
            id: 'layer',
            icon: <Layers size={16} />,
            label: 'Architecture',
            description: 'UI, Service, Data, Util layers'
        },
        {
            id: 'churn',
            icon: <GitCommit size={16} />,
            label: 'Git Churn',
            description: 'Files changed frequently'
        },
        {
            id: 'complexity',
            icon: <Flame size={16} />,
            label: 'Complexity',
            description: 'Cyclomatic complexity heatmap'
        },
        {
            id: 'language',
            icon: <Code2 size={16} />,
            label: 'Language',
            description: 'Color by programming language'
        },
        {
            id: 'author',
            icon: <Users size={16} />,
            label: 'Authors',
            description: 'Primary code owners'
        }
    ]

    const handleSnapshot = () => {
        const canvas = document.querySelector('canvas')
        if (canvas) {
            const link = document.createElement('a')
            link.download = `code-city-${Date.now()}.png`
            link.href = canvas.toDataURL('image/png')
            link.click()
        }
    }

    return (
        <>
            {/* Main Control Bar */}
            <div style={{
                position: 'fixed',
                top: '24px',
                left: '50%',
                transform: 'translateX(-50%)',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
                background: 'rgba(9, 9, 11, 0.85)',
                backdropFilter: 'blur(20px) saturate(180%)',
                padding: '6px 10px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.08)',
                zIndex: 2000,
                boxShadow: '0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.02) inset'
            }}>
                {/* Section Label */}
                <span style={{
                    fontSize: '0.65rem',
                    fontWeight: 600,
                    textTransform: 'uppercase',
                    letterSpacing: '0.08em',
                    color: '#52525b',
                    padding: '0 8px 0 4px'
                }}>
                    View Mode
                </span>

                {/* Color Mode Buttons */}
                <div style={{
                    display: 'flex',
                    gap: '2px',
                    background: 'rgba(255,255,255,0.03)',
                    borderRadius: '10px',
                    padding: '3px'
                }}>
                    {colors.map(c => (
                        <Option
                            key={c.id}
                            active={colorMode === c.id}
                            onClick={() => setColorMode(c.id)}
                            icon={c.icon}
                            label={c.label}
                            description={c.description}
                        />
                    ))}
                </div>

                {/* Separator */}
                <div style={{
                    width: '1px',
                    height: '20px',
                    background: 'rgba(255,255,255,0.08)',
                    margin: '0 4px'
                }} />

                {/* Actions */}
                <Option
                    active={false}
                    onClick={handleSnapshot}
                    icon={<Camera size={16} />}
                    label="Screenshot"
                    description="Save city as PNG image"
                />
            </div>

            {/* Dynamic Legend for Language Mode */}
            <AnimatePresence>
            {colorMode === 'language' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        top: '76px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '12px',
                        padding: '8px 16px',
                        background: 'rgba(9, 9, 11, 0.7)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        zIndex: 1900,
                        pointerEvents: 'none'
                    }}
                >
                    <LegendItem color="#3178c6" label="TypeScript" short="TS" />
                    <LegendItem color="#f7df1e" label="JavaScript" short="JS" />
                    <LegendItem color="#3572a5" label="Python" short="Py" />
                    <LegendItem color="#00add8" label="Go" short="Go" />
                    <LegendItem color="#dea584" label="Rust" short="Rs" />
                    <LegendItem color="#e34c26" label="HTML" short="HTML" />
                    <LegendItem color="#563d7c" label="CSS" short="CSS" />
                    <LegendItem color="#64748b" label="Other" short="..." />
                </motion.div>
            )}
            </AnimatePresence>

            {/* Dynamic Legend for Complexity Mode */}
            <AnimatePresence>
            {colorMode === 'complexity' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        top: '76px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '12px',
                        padding: '8px 16px',
                        background: 'rgba(9, 9, 11, 0.7)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        zIndex: 1900,
                        pointerEvents: 'none'
                    }}
                >
                    <LegendItem color="#10b981" label="Safe (1-5)" />
                    <LegendItem color="#facc15" label="Low (5-10)" />
                    <LegendItem color="#f59e0b" label="Medium (10-20)" />
                    <LegendItem color="#9333ea" label="High (20-30)" />
                    <LegendItem color="#db2777" label="Extreme (30+)" />
                </motion.div>
            )}
            </AnimatePresence>

            {/* Dynamic Legend for Churn Mode */}
            <AnimatePresence>
            {colorMode === 'churn' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        top: '76px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '12px',
                        padding: '8px 16px',
                        background: 'rgba(9, 9, 11, 0.7)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        zIndex: 1900,
                        pointerEvents: 'none'
                    }}
                >
                    <LegendItem color="#3b82f6" label="Stable (0-2 commits)" />
                    <LegendItem color="#fbbf24" label="Active (2-5 commits)" />
                    <LegendItem color="#f97316" label="Busy (5+ commits)" />
                    <LegendItem color="#ef4444" label="🔥 Hotspot" />
                </motion.div>
            )}
            </AnimatePresence>

            {/* Dynamic Legend for Layer Mode */}
            <AnimatePresence>
            {colorMode === 'layer' && (
                <motion.div
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                    transition={{ duration: 0.2 }}
                    style={{
                        position: 'fixed',
                        top: '76px',
                        left: '50%',
                        transform: 'translateX(-50%)',
                        display: 'flex',
                        gap: '12px',
                        padding: '8px 16px',
                        background: 'rgba(9, 9, 11, 0.7)',
                        backdropFilter: 'blur(16px)',
                        borderRadius: '12px',
                        border: '1px solid rgba(255,255,255,0.06)',
                        zIndex: 1900,
                        pointerEvents: 'none'
                    }}
                >
                    <LegendItem color="#3b82f6" label="UI/Components" />
                    <LegendItem color="#8b5cf6" label="Services/API" />
                    <LegendItem color="#06b6d4" label="State/Data" />
                    <LegendItem color="#10b981" label="Utils/Helpers" />
                    <LegendItem color="#f59e0b" label="Database" />
                </motion.div>
            )}
            </AnimatePresence>
        </>
    )
}

function LegendItem({ color, label, short }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
            <div style={{
                width: '10px',
                height: '10px',
                borderRadius: '3px',
                background: color,
                boxShadow: `0 0 10px ${color}40`
            }} />
            <span style={{
                fontSize: '0.7rem',
                color: 'rgba(255,255,255,0.85)',
                fontWeight: 500,
                fontFamily: 'var(--font-mono)'
            }}>
                {short || label}
            </span>
        </div>
    )
}

function Option({ active, onClick, icon, label, description }) {
    const [isHovered, setIsHovered] = React.useState(false)

    return (
        <div
            style={{ position: 'relative' }}
            onMouseEnter={() => setIsHovered(true)}
            onMouseLeave={() => setIsHovered(false)}
        >
            <button
                onClick={onClick}
                aria-label={label}
                role="button"
                style={{
                    background: active
                        ? 'linear-gradient(135deg, rgba(99, 102, 241, 0.3), rgba(99, 102, 241, 0.15))'
                        : 'transparent',
                    border: active ? '1px solid rgba(99, 102, 241, 0.4)' : '1px solid transparent',
                    borderRadius: '8px',
                    width: '34px',
                    height: '34px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    color: active ? '#a5b4fc' : '#71717a',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    outline: 'none'
                }}
                onFocus={(e) => e.target.style.boxShadow = '0 0 0 2px rgba(99, 102, 241, 0.5)'}
                onBlur={(e) => e.target.style.boxShadow = 'none'}
            >
                {icon}
            </button>

            <AnimatePresence>
                {isHovered && (
                    <motion.div
                        initial={{ opacity: 0, y: 4, scale: 0.95 }}
                        animate={{ opacity: 1, y: 0, scale: 1 }}
                        exit={{ opacity: 0, y: 4, scale: 0.95 }}
                        transition={{ duration: 0.15, ease: "easeOut" }}
                        style={{
                            position: 'absolute',
                            top: 'calc(100% + 8px)',
                            left: '50%',
                            transform: 'translateX(-50%)',
                            backgroundColor: 'rgba(15, 15, 20, 0.95)',
                            backdropFilter: 'blur(12px)',
                            color: 'white',
                            padding: '8px 12px',
                            borderRadius: '8px',
                            whiteSpace: 'nowrap',
                            border: '1px solid rgba(255, 255, 255, 0.1)',
                            pointerEvents: 'none',
                            zIndex: 100,
                            boxShadow: '0 8px 24px rgba(0,0,0,0.5)',
                            textAlign: 'center'
                        }}
                    >
                        <div style={{
                            fontSize: '0.8rem',
                            fontWeight: 600,
                            marginBottom: description ? '2px' : 0
                        }}>
                            {label}
                        </div>
                        {description && (
                            <div style={{
                                fontSize: '0.65rem',
                                color: '#a1a1aa',
                                fontWeight: 400
                            }}>
                                {description}
                            </div>
                        )}
                        {/* Arrow */}
                        <div style={{
                            position: 'absolute',
                            top: '-4px',
                            left: '50%',
                            transform: 'translateX(-50%) rotate(45deg)',
                            width: '8px',
                            height: '8px',
                            background: 'rgba(15, 15, 20, 0.95)',
                            borderLeft: '1px solid rgba(255, 255, 255, 0.1)',
                            borderTop: '1px solid rgba(255, 255, 255, 0.1)',
                        }} />
                    </motion.div>
                )}
            </AnimatePresence>

            <style>{`
                button:hover {
                    background: ${active ? '' : 'rgba(255,255,255,0.05)'} !important;
                    color: ${active ? '' : '#d4d4d8'} !important;
                }
            `}</style>
        </div>
    )
}
