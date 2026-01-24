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
import LoadingScreen from './components/LoadingScreen'
import TimelineSlider from './components/TimelineSlider'
import CommandPalette from './components/ui/CommandPalette'
import FileTable from './components/FileTable'
import FloatingDock from './components/FloatingDock'
import AnalyzeModal from './components/AnalyzeModal'
import DiagnosticsHUD from './components/DiagnosticsHUD'
import ViewControl from './components/ViewControl'
import CanvasUI from './components/CanvasUI'
import ChatInterface from './components/ChatInterface'
import WelcomeOverlay from './components/WelcomeOverlay'
import './components/FloatingDock.css'
import { TimeTravelStats } from './components/AnimatedBuilding'
import { useVSCodeSync } from './hooks/useVSCodeSync'
import useStore from './store/useStore'
import CodeViewer from './components/CodeViewer'

// Design tokens
import './styles/design-tokens.css'
import './styles/ProfessionalUI.css'
import './App.css'

import CodePage from './components/CodePage'

function App() {
    // Simple Client-Side Routing for Standalone Code View
    if (window.location.pathname === '/code') {
        return <CodePage />
    }

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

    // Load data on mount - DISABLED (User wants to analyze directly)
    // useEffect(() => {
    //     fetchDemo()
    // }, [fetchDemo])

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
                                    makeDefault
                                    enablePan={true}
                                    enableZoom={true}
                                    enableRotate={true}
                                    minDistance={5} // Allow close-ups (Street View)
                                    maxDistance={300}
                                    maxPolarAngle={Math.PI / 2} // Allow ground level view
                                    minPolarAngle={0.1}
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
                            {/* Compass/Legend removed as requested */}


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

                    {view === '3d' && <DiagnosticsHUD />}
                    {view === '3d' && <ViewControl />}
                    {view === '3d' && <CanvasUI />}
                    <ChatInterface />
                    {/* ROOT LEVEL CODE VIEWER */}
                    {useStore.getState().codeViewerOpen && selectedBuilding && (
                        <div style={{ position: 'fixed', inset: 0, zIndex: 99999 }}>
                            <CodeViewer
                                building={selectedBuilding}
                                onClose={() => useStore.getState().setCodeViewerOpen(false)}
                            />
                        </div>
                    )}
                </div>
            </div>

            <Sidebar />

            {/* Command Palette - ⌘K */}
            <CommandPalette />

            {/* Analyze Repo Modal */}
            <AnalyzeModal open={analyzeModalOpen} onOpenChange={setAnalyzeModalOpen} />

            {/* Loading - simple, fast */}
            {loading && <LoadingScreen />}

            {/* Error Toast - Moved to Top Center to avoid overlap */}
            {useStore.getState().error && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#ef4444',
                    color: 'white',
                    padding: '12px 24px',
                    borderRadius: '30px',
                    boxShadow: '0 10px 30px -10px rgba(239, 68, 68, 0.5)',
                    zIndex: 10001,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'slideDown 0.3s ease-out',
                    maxWidth: '80vw',
                    fontSize: '0.9rem',
                    fontWeight: 500
                }}>
                    <span>⚠️ {useStore.getState().error}</span>
                    <button
                        onClick={() => useStore.getState().setError(null)}
                        style={{
                            background: 'rgba(255,255,255,0.2)',
                            border: 'none',
                            borderRadius: '50%',
                            width: '24px',
                            height: '24px',
                            cursor: 'pointer',
                            color: 'white'
                        }}
                    >✕</button>
                </div>
            )}

            {/* Onboarding */}
            <WelcomeOverlay />
        </div>
    )
}

export default App
