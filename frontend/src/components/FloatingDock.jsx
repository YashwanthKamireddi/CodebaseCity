/**
 * FloatingDock.jsx
 *
 * A world-class, macOS-inspired floating dock navigation.
 * Uses Framer Motion for magnetic hover effects.
 */
import React, { useRef } from 'react'
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion'
import {
    LayoutGrid,
    Search,
    BarChart2,
    Github,
    Settings,
    Box,
    Table2,
    Home,
    FolderSearch,
    Signpost
} from 'lucide-react'
import useStore from '../store/useStore'
import { CommandPaletteTrigger } from './ui/CommandPalette'

export default function FloatingDock({ view, onViewChange, onAnalyze }) {
    const mouseX = useMotionValue(null)
    const { analyzeRepo, loading, setCommandPaletteOpen, toggleRoads, showRoads } = useStore()

    return (
        <div style={{
            position: 'fixed',
            bottom: '32px',
            left: '50%',
            transform: 'translateX(-50%)',
            zIndex: 1000,
            display: 'flex',
            gap: '12px',
            alignItems: 'end',
            marginBottom: 'safe-area-inset-bottom'
        }}>
            {/* Main Dock */}
            <motion.div
                className="glass-dock"
                onMouseMove={(e) => mouseX.set(e.pageX)}
                onMouseLeave={() => mouseX.set(Infinity)}
                style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px 16px',
                    borderRadius: '24px',
                    background: 'rgba(20, 20, 23, 0.75)',
                    backdropFilter: 'blur(40px) saturate(180%)',
                    WebkitBackdropFilter: 'blur(40px) saturate(180%)',
                    border: '1px solid rgba(255, 255, 255, 0.08)',
                    boxShadow: '0 24px 48px -12px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.06) inset',
                    height: '64px',
                    alignItems: 'center'
                }}
            >
                {/* View Toggles */}
                <DockIcon
                    mouseX={mouseX}
                    onClick={() => onViewChange('3d')}
                    active={view === '3d'}
                    title="3D City View"
                >
                    <Box size={20} />
                </DockIcon>

                <DockIcon
                    mouseX={mouseX}
                    onClick={() => onViewChange('table')}
                    active={view === 'table'}
                    title="Metrics Dashboard"
                >
                    <BarChart2 size={20} />
                </DockIcon>

                <div className="dock-divider" />

                {/* Actions */}
                <DockIcon
                    mouseX={mouseX}
                    onClick={() => setCommandPaletteOpen(true)}
                    title="Search (Cmd+K)"
                >
                    <Search size={20} />
                </DockIcon>

                <DockIcon
                    mouseX={mouseX}
                    onClick={onAnalyze}
                    title="Analyze Repo"
                    loading={loading}
                >
                    <FolderSearch size={20} />
                </DockIcon>

                <div className="dock-divider" />

                {/* Toggles */}
                <DockIcon
                    mouseX={mouseX}
                    onClick={toggleRoads}
                    active={showRoads}
                    title="Toggle Connections"
                >
                    <Signpost size={20} />
                </DockIcon>

                <div className="dock-divider" />

                <DockIcon
                    mouseX={mouseX}
                    onClick={() => window.open('https://github.com/YashwanthKamireddi/CodebaseCity', '_blank')}
                    title="GitHub"
                >
                    <Github size={20} />
                </DockIcon>

            </motion.div>
        </div>
    )
}

function DockIcon({ mouseX, children, onClick, active, title, loading }) {
    const ref = useRef()

    const distance = useTransform(mouseX, (val) => {
        const bounds = ref.current?.getBoundingClientRect() ?? { x: 0, width: 0 }
        return val - bounds.x - bounds.width / 2
    })

    const widthSync = useTransform(distance, [-150, 0, 150], [40, 60, 40])
    const width = useSpring(widthSync, { mass: 0.1, stiffness: 150, damping: 12 })

    return (
        <motion.button
            ref={ref}
            onClick={onClick}
            title={title}
            style={{
                width,
                height: width,
                borderRadius: '12px',
                background: active ? 'var(--color-accent)' : 'rgba(255,255,255,0.05)',
                color: active ? 'white' : 'var(--color-text-secondary)',
                border: '1px solid rgba(255,255,255,0.1)',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                cursor: 'pointer',
                position: 'relative'
            }}
            whileTap={{ scale: 0.9 }}
        >
            {loading ? (
                <motion.div
                    animate={{ rotate: 360 }}
                    transition={{ repeat: Infinity, duration: 1, ease: 'linear' }}
                >
                    {children}
                </motion.div>
            ) : children}

            {active && (
                <motion.div
                    layoutId="active-dot"
                    style={{
                        position: 'absolute',
                        bottom: '-8px',
                        width: '4px',
                        height: '4px',
                        borderRadius: '50%',
                        background: 'white'
                    }}
                />
            )}
        </motion.button>
    )
}
