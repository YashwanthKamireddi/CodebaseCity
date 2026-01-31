
import React, { useState } from 'react'
import { motion, AnimatePresence, useDragControls } from 'framer-motion'
import { X, HelpCircle, Box, Circle, Square, Hexagon, Layers, Activity, Code2, Database, Layout } from 'lucide-react'
import useStore from '../../../store/useStore'
import '../../../features/search/ui/CommandPalette.css' // Reuse glass styles

export default function CityLegend() {
    const { showLegend, setShowLegend, colorMode } = useStore()
    const [expanded, setExpanded] = useState(false)
    const dragControls = useDragControls()

    // Tab state: 'shapes' | 'colors' | 'metrics'
    const [activeTab, setActiveTab] = useState('shapes')

    // Always render (toggle visibility via expansion)
    // if (!showLegend) return null <--- Removing global toggle check to make it persistent

    return (
        <AnimatePresence mode="wait">
            {!expanded ? (
                /* Minified Widget */
                <motion.button
                    initial={{ opacity: 0, scale: 0.9, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.9, x: -20 }}
                    whileHover={{ scale: 1.05 }}
                    whileTap={{ scale: 0.95 }}
                    onClick={() => setExpanded(true)}
                    style={{
                        position: 'fixed',
                        top: '24px',
                        left: '24px',
                        zIndex: 2000,
                        background: 'var(--glass-surface)',
                        backdropFilter: 'var(--glass-backdrop)',
                        WebkitBackdropFilter: 'var(--glass-backdrop)',
                        border: '1px solid var(--glass-border)',
                        borderRadius: '50px', // Pill shape
                        padding: '10px 16px',
                        display: 'flex', alignItems: 'center', gap: '8px',
                        cursor: 'pointer',
                        boxShadow: '0 8px 32px rgba(0,0,0,0.2)',
                        color: 'white',
                        fontFamily: 'var(--font-sans)',
                        fontSize: '0.9rem',
                        fontWeight: 600
                    }}
                >
                    <div style={{
                        width: '24px', height: '24px', borderRadius: '50%',
                        background: 'linear-gradient(135deg, var(--color-accent), #2563eb)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <HelpCircle size={14} color="white" strokeWidth={2.5} />
                    </div>
                    <span>City Guide</span>
                </motion.button>
            ) : (
                /* Expanded Panel */
                <motion.div
                    drag
                    dragControls={dragControls}
                    dragListener={false}
                    dragMomentum={false}
                    initial={{ opacity: 0, scale: 0.95, x: -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: 0.95, x: -20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                    style={{
                        position: 'fixed',
                        top: '80px', // Below the pill position
                        left: '24px',
                        width: '360px',
                        maxHeight: 'calc(100vh - 140px)',
                        background: 'var(--glass-surface)',
                        backdropFilter: 'var(--glass-backdrop)',
                        WebkitBackdropFilter: 'var(--glass-backdrop)',
                        border: '1px solid transparent',
                        backgroundClip: 'padding-box, border-box',
                        backgroundImage: 'linear-gradient(var(--glass-surface), var(--glass-surface)), var(--glass-edge)',
                        borderRadius: '24px',
                        boxShadow: '0 40px 80px -20px rgba(0,0,0,0.6)',
                        display: 'flex',
                        flexDirection: 'column',
                        zIndex: 2000,
                        overflow: 'hidden',
                        fontFamily: 'var(--font-sans)'
                    }}
                >
                    {/* Header */}
                    <div
                        className="drag-handle"
                        onPointerDown={(e) => dragControls.start(e)}
                        style={{
                            padding: '16px 20px',
                            borderBottom: '1px solid var(--glass-border-subtle)',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'space-between',
                            background: 'rgba(255,255,255,0.02)',
                            cursor: 'grab',
                            touchAction: 'none'
                        }}
                    >
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            <HelpCircle size={18} color="var(--color-accent)" />
                            <span style={{ fontWeight: 600, color: 'white', fontSize: '0.95rem' }}>City Guide</span>
                        </div>
                        <button
                            onClick={() => setExpanded(false)} // Close to minify
                            style={{
                                background: 'transparent', border: 'none', color: 'rgba(255,255,255,0.4)',
                                cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center',
                                width: '24px', height: '24px', borderRadius: '50%'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                        >
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div style={{
                        display: 'flex',
                        padding: '4px',
                        margin: '12px 12px 0 12px',
                        background: 'rgba(0,0,0,0.2)',
                        borderRadius: '12px',
                        gap: '2px'
                    }}>
                        <LegendTab active={activeTab === 'shapes'} onClick={() => setActiveTab('shapes')} label="Shapes" />
                        <LegendTab active={activeTab === 'colors'} onClick={() => setActiveTab('colors')} label="Colors" />
                        <LegendTab active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} label="Metrics" />
                    </div>

                    {/* Content Area */}
                    <div style={{
                        flex: 1,
                        overflowY: 'auto',
                        padding: '20px',
                        display: 'flex',
                        flexDirection: 'column',
                        gap: '24px'
                    }}>

                        {activeTab === 'shapes' && <ShapesContent />}
                        {activeTab === 'colors' && <ColorsContent mode={colorMode} />}
                        {activeTab === 'metrics' && <MetricsContent />}

                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function LegendTab({ active, onClick, label }) {
    return (
        <button
            onClick={onClick}
            style={{
                flex: 1,
                padding: '8px',
                borderRadius: '8px',
                background: active ? 'rgba(255,255,255,0.1)' : 'transparent',
                border: 'none',
                color: active ? 'white' : 'rgba(255,255,255,0.5)',
                fontSize: '0.85rem',
                fontWeight: active ? 600 : 500,
                cursor: 'pointer',
                transition: 'all 0.2s',
            }}
        >
            {label}
        </button>
    )
}

function ShapesContent() {
    return (
        <>
            <LegendItem
                icon={<Box size={24} color="#c084fc" />}
                title="Logic Towers"
                subtitle="Controllers, Services, Utilities"
                description="Rectangular prisms representing functional logic and processing units."
            />
            <LegendItem
                icon={<Database size={24} color="#fbbf24" />}
                title="Data Silos"
                subtitle="Databases, Models, Schemas"
                description="Cylindrical vaults storing state and data definitions."
            />
            <LegendItem
                icon={<Layout size={24} color="#22d3ee" />}
                title="Interface Panels"
                subtitle="Components, Pages, UI"
                description="Floating thin glass panels representing visual elements."
            />
            <LegendItem
                icon={<Hexagon size={24} color="#94a3b8" />}
                title="Config Nodes"
                subtitle="ENV, JSON, Configs"
                description="Small floating satellites for configuration files."
            />
        </>
    )
}

function ColorsContent({ mode }) {
    // Mode-specific content
    if (mode === 'structure') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                    Colors represent <strong style={{ color: 'white' }}>File Height (LOC)</strong>.
                </div>
                <ColorRow color="#06b6d4" label="Tiny (< 20 lines)" />
                <ColorRow color="#8b5cf6" label="Small (< 40 lines)" />
                <ColorRow color="#d946ef" label="Medium (< 60 lines)" />
                <ColorRow color="#f43f5e" label="Large (60+ lines)" />
            </div>
        )
    }

    if (mode === 'churn') {
        return (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                <div style={{ fontSize: '0.9rem', color: '#a1a1aa' }}>
                    Colors represent <strong style={{ color: 'white' }}>Edit Frequency (Hotspots)</strong>.
                </div>
                <ColorRow color="#ff0040" label="Critical (50+ edits)" />
                <ColorRow color="#ff5e00" label="High (20+ edits)" />
                <ColorRow color="#ffaa00" label="Medium (10+ edits)" />
                <ColorRow color="#a3ff00" label="Low (< 5 edits)" />
                <ColorRow color="#00b8ff" label="Stable (Cold)" />
            </div>
        )
    }

    // Default: Language/Layer Mode mappings
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            <div style={{ fontSize: '0.9rem', color: '#a1a1aa', marginBottom: '8px' }}>
                Standard file type mappings.
            </div>
            <ColorRow color="#facc15" label="JavaScript / JS" />
            <ColorRow color="#38bdf8" label="TypeScript / TS" />
            <ColorRow color="#22d3ee" label="React Components" />
            <ColorRow color="#f472b6" label="Styles (CSS/SCSS)" />
            <ColorRow color="#fbbf24" label="Data / JSON" />
            <ColorRow color="#c084fc" label="Logic / Services" />
            <ColorRow color="#fb923c" label="HTML / Templates" />
        </div>
    )
}

function MetricsContent() {
    return (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
            <LegendItem
                icon={<ArrowUp size={24} color="#e4e4e7" />}
                title="Height = Scale"
                subtitle="Lines of Code (LOC)"
                description="Taller buildings contain more code lines."
            />
            <LegendItem
                icon={<Square size={24} color="#e4e4e7" />}
                title="Footprint = Complexity"
                subtitle="Cyclomatic Complexity"
                description="Wider buildings have more complex logic or more dependencies."
            />
        </div>
    )
}

// Sub-components
function LegendItem({ icon, title, subtitle, description }) {
    return (
        <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{
                width: '48px', height: '48px', borderRadius: '12px',
                background: 'rgba(255,255,255,0.05)',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                flexShrink: 0,
                border: '1px solid rgba(255,255,255,0.05)'
            }}>
                {icon}
            </div>
            <div>
                <div style={{ color: 'white', fontWeight: 600, fontSize: '0.95rem' }}>{title}</div>
                <div style={{ color: 'var(--color-accent)', fontSize: '0.8rem', fontWeight: 500, marginTop: '2px' }}>{subtitle}</div>
                <div style={{ color: '#a1a1aa', fontSize: '0.8rem', marginTop: '4px', lineHeight: 1.5 }}>
                    {description}
                </div>
            </div>
        </div>
    )
}

function ColorRow({ color, label }) {
    return (
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
            <div style={{
                width: '24px', height: '24px', borderRadius: '6px',
                background: color,
                boxShadow: `0 0 12px ${color}40`, // Glow
                border: '1px solid rgba(255,255,255,0.1)'
            }} />
            <div style={{ color: '#e4e4e7', fontSize: '0.9rem' }}>{label}</div>
        </div>
    )
}

function ArrowUp({ size, color }) {
    return (
        <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" fill="none" stroke={color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M12 19V5" />
            <path d="M5 12l7-7 7 7" />
            <path d="M6 19h12" />
        </svg>
    )
}
