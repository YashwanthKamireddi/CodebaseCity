
import React, { useState } from 'react'
import { motion, AnimatePresence, useDragControls, useReducedMotion } from 'framer-motion'
import { X, HelpCircle, Box, Circle, Square, Hexagon, Layers, Activity, Code2, Database, Layout } from 'lucide-react'
import useStore from '../../../store/useStore'
import { getReducedMotionVariants, fadeIn, slideUp } from '../../../shared/animations/variants'
import './CityLegend.css'

export default function CityLegend() {
    const { showLegend, setShowLegend, colorMode } = useStore()
    const [expanded, setExpanded] = useState(false)
    const dragControls = useDragControls()
    const shouldReduceMotion = useReducedMotion()

    const [activeTab, setActiveTab] = useState('shapes')

    return (
        <AnimatePresence mode="wait">
            {!expanded ? (
                <motion.button
                    className="legend-pill"
                    variants={getReducedMotionVariants(slideUp, shouldReduceMotion)}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    whileHover={shouldReduceMotion ? {} : { scale: 1.05 }}
                    whileTap={shouldReduceMotion ? {} : { scale: 0.95 }}
                    onClick={() => setExpanded(true)}
                >
                    <div className="legend-pill-icon">
                        <HelpCircle size={14} color="white" strokeWidth={2.5} />
                    </div>
                    <span>City Guide</span>
                </motion.button>
            ) : (
                <motion.div
                    className="legend-panel"
                    drag={!shouldReduceMotion}
                    dragControls={dragControls}
                    dragListener={false}
                    dragMomentum={false}
                    initial={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95, x: shouldReduceMotion ? 0 : -20 }}
                    animate={{ opacity: 1, scale: 1, x: 0 }}
                    exit={{ opacity: 0, scale: shouldReduceMotion ? 1 : 0.95, x: shouldReduceMotion ? 0 : -20 }}
                    transition={{ type: 'spring', damping: 25, stiffness: 300, duration: shouldReduceMotion ? 0.01 : undefined }}
                >
                    {/* Header */}
                    <div
                        className="legend-header"
                        onPointerDown={(e) => dragControls.start(e)}
                    >
                        <div className="legend-header-left">
                            <HelpCircle size={18} className="legend-header-icon" />
                            <span className="legend-header-title">City Guide</span>
                        </div>
                        <button className="legend-close-btn" onClick={() => setExpanded(false)}>
                            <X size={16} />
                        </button>
                    </div>

                    {/* Tabs */}
                    <div className="legend-tabs">
                        <LegendTab active={activeTab === 'shapes'} onClick={() => setActiveTab('shapes')} label="Shapes" />
                        <LegendTab active={activeTab === 'colors'} onClick={() => setActiveTab('colors')} label="Colors" />
                        <LegendTab active={activeTab === 'metrics'} onClick={() => setActiveTab('metrics')} label="Metrics" />
                    </div>

                    {/* Content Area */}
                    <div className="legend-content">
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={activeTab}
                                variants={getReducedMotionVariants(fadeIn, shouldReduceMotion)}
                                initial="initial"
                                animate="animate"
                                exit="exit"
                                transition={{ duration: 0.15 }}
                            >
                                {activeTab === 'shapes' && <ShapesContent />}
                                {activeTab === 'colors' && <ColorsContent mode={colorMode} />}
                                {activeTab === 'metrics' && <MetricsContent />}
                            </motion.div>
                        </AnimatePresence>
                    </div>
                </motion.div>
            )}
        </AnimatePresence>
    )
}

function LegendTab({ active, onClick, label }) {
    return (
        <button
            className={`legend-tab ${active ? 'active' : ''}`}
            onClick={onClick}
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
    if (mode === 'structure') {
        return (
            <div className="legend-color-section">
                <div className="legend-color-desc">
                    Colors represent <strong>File Height (LOC)</strong>.
                </div>
                <ColorRow color="#ffffff" label="Tiny (< 20 lines)" />
                <ColorRow color="#8b5cf6" label="Small (< 40 lines)" />
                <ColorRow color="#d946ef" label="Medium (< 60 lines)" />
                <ColorRow color="#f43f5e" label="Large (60+ lines)" />
            </div>
        )
    }

    if (mode === 'churn') {
        return (
            <div className="legend-color-section">
                <div className="legend-color-desc">
                    Colors represent <strong>Edit Frequency (Hotspots)</strong>.
                </div>
                <ColorRow color="#ff0040" label="Critical (50+ edits)" />
                <ColorRow color="#ff5e00" label="High (20+ edits)" />
                <ColorRow color="#ffaa00" label="Medium (10+ edits)" />
                <ColorRow color="#a3ff00" label="Low (< 5 edits)" />
                <ColorRow color="#00b8ff" label="Stable (Cold)" />
            </div>
        )
    }

    return (
        <div className="legend-color-section">
            <div className="legend-color-desc">
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
        <div className="legend-metrics-section">
            <LegendItem
                icon={<ArrowUp size={24} color="var(--color-text-secondary)" />}
                title="Height = Scale"
                subtitle="Lines of Code (LOC)"
                description="Taller buildings contain more code lines."
            />
            <LegendItem
                icon={<Square size={24} color="var(--color-text-secondary)" />}
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
        <div className="legend-item">
            <div className="legend-item-icon">
                {icon}
            </div>
            <div>
                <div className="legend-item-title">{title}</div>
                <div className="legend-item-subtitle">{subtitle}</div>
                <div className="legend-item-desc">{description}</div>
            </div>
        </div>
    )
}

function ColorRow({ color, label }) {
    return (
        <div className="legend-color-row">
            <div
                className="legend-color-swatch"
                style={{ background: color, boxShadow: `0 0 12px ${color}40` }}
            />
            <div className="legend-color-label">{label}</div>
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
