import React, { useEffect, useState } from 'react'
import { Html } from '@react-three/drei'
import mermaid from 'mermaid'
import { motion, AnimatePresence } from 'framer-motion'
import useStore from '../../../store/useStore'
import { User, GitCommit, Calendar, Mail, FileCode2 } from 'lucide-react'
import './HolographicXRay.css'

// Initialize Mermaid
mermaid.initialize({
    startOnLoad: false,
    theme: 'base',
    themeVariables: {
        darkMode: true,
        background: '#09090b',
        primaryColor: '#3b82f6',
        secondaryColor: '#2563eb',
        tertiaryColor: '#09090b',
        primaryBorderColor: '#3b82f6',
        lineColor: '#52525b',
        textColor: '#e2e8f0'
    },
    securityLevel: 'loose',
    fontFamily: 'Inter, monospace'
})

// Hash string to HSL color (same logic as colorUtils.js)
function stringToColor(str) {
    let hash = 0;
    for (let i = 0; i < str.length; i++) {
        hash = str.charCodeAt(i) + ((hash << 5) - hash);
    }
    const h = Math.abs(hash % 360);
    return `hsl(${h}, 70%, 60%)`;
}

export default function HolographicXRay() {
    const { selectedBuilding, cityData, colorMode } = useStore()
    const [chartSvg, setChartSvg] = useState(null)
    const [loading, setLoading] = useState(false)
    const [visible, setVisible] = useState(false)

    const isSocialMode = colorMode === 'author'

    useEffect(() => {
        if (!selectedBuilding) {
            setVisible(false)
            setChartSvg(null)
            return
        }
        setVisible(true)
    }, [selectedBuilding, cityData, isSocialMode])

    if (!selectedBuilding || !visible) return null
    const { x, z } = selectedBuilding.position
    // Building top is at height + 8.2 (higher up to avoid clipping)
    const y = (selectedBuilding.dimensions?.height || 10) + 8.2

    const author = selectedBuilding.author || 'Unknown'
    const email = selectedBuilding.email || ''
    const authorColor = stringToColor(author)

    return (
        <group position={[x, y, z]}>
            <Html transform occlude distanceFactor={25} style={{ pointerEvents: 'none' }}>
                <AnimatePresence>
                    {visible && (
                        <motion.div
                            className="holo-wrapper"
                            initial={{ opacity: 0, scale: 0.8, y: 10 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.8, y: 10 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                        >
                            {/* THE NEURAL LINK (Glass Card) */}
                            <div
                                className={`holo-card ${isSocialMode ? 'holo-card--social' : 'holo-card--default'}`}
                            >
                                {/* Top Glow Line */}
                                <div
                                    className="holo-glow-line"
                                    style={{
                                        background: isSocialMode
                                            ? `linear-gradient(90deg, transparent, ${authorColor}, transparent)`
                                            : undefined
                                    }}
                                />

                                {/* Header */}
                                <div className="holo-header">
                                    <div className="holo-header-info">
                                        <span className="holo-header-label">
                                            {isSocialMode ? 'Owner' : 'Logic Core'}
                                        </span>
                                        <span className="holo-header-name">
                                            {selectedBuilding.name}
                                        </span>
                                    </div>
                                    <div
                                        className="holo-status-badge"
                                        style={{
                                            background: isSocialMode ? `${authorColor}20` : undefined,
                                            borderColor: isSocialMode ? `${authorColor}40` : undefined
                                        }}
                                    >
                                        <div
                                            className="holo-status-dot"
                                            style={isSocialMode ? {
                                                background: authorColor,
                                                boxShadow: `0 0 8px ${authorColor}`
                                            } : undefined}
                                        />
                                        <span
                                            className="holo-status-text"
                                            style={isSocialMode ? { color: authorColor } : undefined}
                                        >
                                            {isSocialMode ? 'SOCIAL' : 'LIVE'}
                                        </span>
                                    </div>
                                </div>

                                {/* Content: Social Mode vs Flowchart */}
                                {isSocialMode ? (
                                    <div className="holo-social">
                                        {/* Author Avatar & Name */}
                                        <div className="holo-author-row">
                                            <div
                                                className="holo-avatar"
                                                style={{
                                                    background: `linear-gradient(135deg, ${authorColor}, ${authorColor}80)`,
                                                    boxShadow: `0 0 20px ${authorColor}40`
                                                }}
                                            >
                                                {(selectedBuilding.email || selectedBuilding.author) ? (
                                                    <img
                                                        src={`https://unavatar.io/${selectedBuilding.email || selectedBuilding.author}?fallback=false`}
                                                        alt={author}
                                                        className="holo-avatar-img"
                                                        onError={(e) => { e.target.style.display = 'none'; e.target.nextSibling.style.display = 'flex' }}
                                                    />
                                                ) : null}
                                                <div
                                                    className="holo-avatar-fallback"
                                                    style={{ display: (selectedBuilding.email || selectedBuilding.author) ? 'none' : 'flex' }}
                                                >
                                                    {typeof author === 'string' ? author.charAt(0).toUpperCase() : '?'}
                                                </div>
                                            </div>
                                            <div>
                                                <div className="holo-author-name">{author}</div>
                                                {email && (
                                                    <div className="holo-author-email">
                                                        <Mail size={10} /> {email}
                                                    </div>
                                                )}
                                            </div>
                                        </div>

                                        {/* Stats Row */}
                                        <div className="holo-stats-row">
                                            <div className="holo-stat-card">
                                                <div className="holo-stat-value">
                                                    {selectedBuilding.metrics?.churn || 0}
                                                </div>
                                                <div className="holo-stat-label">Commits</div>
                                            </div>
                                            <div className="holo-stat-card">
                                                <div className="holo-stat-value">
                                                    {selectedBuilding.metrics?.loc || 0}
                                                </div>
                                                <div className="holo-stat-label">Lines</div>
                                            </div>
                                        </div>
                                    </div>
                                ) : (
                                    <div className="holo-minimal">
                                        <div className="holo-minimal-content">
                                            <FileCode2 size={14} />
                                            <span>{selectedBuilding.language || 'File'}</span>
                                        </div>
                                    </div>
                                )}
                            </div>

                            {/* THE TETHER (Laser Beam) */}
                            <motion.div
                                className="holo-tether"
                                initial={{ height: 0, opacity: 0 }}
                                animate={{ height: 120, opacity: 1 }}
                                transition={{ delay: 0.2, duration: 0.5 }}
                                style={{
                                    background: `linear-gradient(to bottom, ${isSocialMode ? authorColor : 'rgba(255, 255, 255, 0.5)'}, transparent)`,
                                    boxShadow: `0 0 10px ${isSocialMode ? authorColor : 'rgba(255, 255, 255, 0.4)'}`
                                }}
                            />

                            {/* Anchor Point on Roof */}
                            <motion.div
                                className="holo-anchor"
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.6 }}
                                style={{
                                    background: isSocialMode ? authorColor : undefined,
                                    boxShadow: `0 0 15px ${isSocialMode ? authorColor : '#ffffff'}`
                                }}
                            />
                        </motion.div>
                    )}
                </AnimatePresence>
            </Html>
        </group>
    )
}
