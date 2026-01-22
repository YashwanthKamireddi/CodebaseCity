/**
 * App.jsx
 *
 * Main application - clean, practical, no gimmicks
 * Focus: Fast load, useful features, developer workflow
 */

import React, { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Preload } from '@react-three/drei'
import CityScene from './components/CityScene'
import Sidebar from './components/Sidebar'
import BuildingPanel from './components/BuildingPanel'
import LegendPanel from './components/LegendPanel'
import ControlsPanel from './components/ControlsPanel'
import LoadingScreen from './components/LoadingScreen'
import TimelineSlider from './components/TimelineSlider'
import CommandPalette from './components/ui/CommandPalette'
import FileTable from './components/FileTable'
import FloatingDock from './components/FloatingDock'
import AnalyzeModal from './components/AnalyzeModal'
import './components/FloatingDock.css'
import { TimeTravelStats } from './components/AnimatedBuilding'
import { useVSCodeSync } from './hooks/useVSCodeSync'
import useStore from './store/useStore'

// Design tokens
import './styles/design-tokens.css'
import './styles/ProfessionalUI.css'
import './App.css'

function App() {
    const {
        cityData,
        selectedBuilding,
        loading,
        theme,
        isAnimating,
        vscodeConnected,
        fetchDemo,
        selectBuilding
    } = useStore()

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [view, setView] = useState('3d') // '3d' or 'table'
    const { analyzeModalOpen, setAnalyzeModalOpen } = useStore()

    // VS Code integration
    const { notifyBuildingSelected } = useVSCodeSync()

    // Load data on mount
    useEffect(() => {
        fetchDemo()
    }, [fetchDemo])

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    // Sync with VS Code
    useEffect(() => {
        if (selectedBuilding) {
            notifyBuildingSelected(selectedBuilding)
        }
    }, [selectedBuilding, notifyBuildingSelected])

    // Keyboard shortcuts - practical ones only
    const { toggleRoads, toggleLabels, clearSelection, stopTimeTravel } = useStore()

    useEffect(() => {
        const handleKeyDown = (e) => {
            // Skip if in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') e.target.blur()
                return
            }

            switch (e.key.toLowerCase()) {
                case 'escape':
                    if (isAnimating) {
                        stopTimeTravel()
                    } else {
                        clearSelection()
                    }
                    break
                case '/':
                    e.preventDefault()
                    document.querySelector('input[placeholder*="Search"]')?.focus()
                    break
                case 'l':
                    toggleLabels()
                    break
                case 'd':
                    toggleRoads()
                    break
                case 'v':
                    setView(v => v === '3d' ? 'table' : '3d')
                    break
                default:
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [clearSelection, toggleLabels, toggleRoads, isAnimating, stopTimeTravel])

    return (
        <div className="app-layout">
            {/* VS Code indicator */}
            {vscodeConnected && (
                <div className="vscode-indicator">
                    <span className="vscode-indicator-dot" />
                    VS Code Connected
                </div>
            )}

            <div className="main-content">
                <div className="canvas-wrapper">
                    {view === '3d' ? (
                        <>
                            {/* 3D View */}
                            <Canvas
                                shadows
                                dpr={[1, 1.5]}
                                gl={{
                                    antialias: true,
                                    alpha: false,
                                    powerPreference: 'high-performance',
                                    stencil: false,
                                }}
                            >
                                <PerspectiveCamera
                                    makeDefault
                                    position={[80, 50, 80]}
                                    fov={45}
                                    near={1}
                                    far={500}
                                />

                                <OrbitControls
                                    enablePan={true}
                                    enableZoom={true}
                                    enableRotate={true}
                                    minDistance={20}
                                    maxDistance={250}
                                    maxPolarAngle={Math.PI / 2.2}
                                    minPolarAngle={0.2}
                                    dampingFactor={0.08}
                                    enableDamping={true}
                                    target={[0, 0, 0]}
                                />

                                <Suspense fallback={null}>
                                    <CityScene data={cityData} />
                                    <Preload all />
                                </Suspense>
                            </Canvas>

                            {/* 3D-only Overlays */}
                            {cityData && (
                                <LegendPanel
                                    districts={cityData.districts}
                                    buildings={cityData.buildings}
                                />
                            )}

                            <ControlsPanel
                                sidebarOpen={sidebarOpen}
                                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                            />
                        </>
                    ) : (
                        /* Table View */
                        <div style={{
                            padding: '80px 20px 20px 20px',
                            height: '100vh',
                            boxSizing: 'border-box',
                            background: 'var(--color-bg-primary)',
                            overflow: 'hidden'
                        }}>
                            <FileTable
                                buildings={cityData?.buildings || []}
                                onSelectFile={(file) => {
                                    selectBuilding(file)
                                    // Keep in table view but show panel
                                }}
                            />
                        </div>
                    )}

                    {/* Common Overlays */}

                    {/* Floating Navigation Dock - World Class UX */}
                    <FloatingDock
                        view={view}
                        onViewChange={setView}
                        onAnalyze={() => setAnalyzeModalOpen(true)}
                    />

                    {selectedBuilding && (
                        <BuildingPanel building={selectedBuilding} />
                    )}

                    {view === '3d' && <TimelineSlider />}
                </div>
            </div>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {/* Command Palette - ⌘K */}
            <CommandPalette />

            {/* Analyze Repo Modal */}
            <AnalyzeModal open={analyzeModalOpen} onOpenChange={setAnalyzeModalOpen} />

            {/* Loading - simple, fast */}
            {loading && <LoadingScreen />}
        </div>
    )
}

export default App
