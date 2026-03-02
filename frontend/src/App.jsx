/**
 * App.jsx
 *
 * Main application - clean, practical, no gimmicks
 * Focus: Fast load, useful features, developer workflow
 */

import React, { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Preload } from '@react-three/drei'
import CityScene from './widgets/city-viewport/ui/CityScene'
import { CanvasErrorBoundary } from './widgets/layout/ui/CanvasErrorBoundary'
import Sidebar from './widgets/layout/ui/Sidebar'
import BuildingPanel from './entities/building/ui/BuildingPanel'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingScreen from './shared/ui/LoadingScreen'
import { ErrorBoundary } from './shared/ui/ErrorBoundary'
import { ToastContainer } from './shared/ui/Toast'


import TimelineController from './features/timeline/ui/TimelineController'
import CommandPalette from './features/search/ui/CommandPalette'
import FileTable from './features/explorer/ui/FileTable'
import FloatingDock from './widgets/layout/ui/FloatingDock'
import AnalyzeModal from './features/analysis/ui/AnalyzeModal'
import DiagnosticsHUD from './widgets/debug/ui/DiagnosticsHUD'
import CityBuilderLoader from './features/onboarding/ui/CityBuilderLoader'
import EmptyCityHero from './features/onboarding/ui/EmptyCityHero'
import ViewControl from './widgets/layout/ui/ViewControl'
import CanvasUI from './widgets/layout/ui/CanvasUI'
import ChatInterface from './features/ai-architect/ui/ChatInterface'
import WelcomeOverlay from './widgets/layout/ui/WelcomeOverlay'
import DependencyGraph from './features/architect/ui/DependencyGraph'
import ExportReport from './features/analysis/ui/ExportReport'
import IntelligenceDashboard from './components/IntelligenceDashboard'
import ImpactVisualization from './components/ImpactVisualization'
import './features/FloatingDock.css'
import { useVSCodeSync } from './hooks/useVSCodeSync'
import useStore from './store/useStore'
import CodeViewer from './entities/building/ui/CodeViewer'

// Design tokens
import './styles/design-tokens.css'
import './styles/ProfessionalUI.css'
import './App.css'

import CodePage from './features/explorer/ui/CodePage'

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
        layoutMode,
        vscodeConnected,
        selectBuilding,
        activeIntelligencePanel,
        error
    } = useStore()

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [view, setView] = useState('3d') // '3d' or 'table'
    const [showDependencyGraph, setShowDependencyGraph] = useState(false)
    const [showExportReport, setShowExportReport] = useState(false)
    const { analyzeModalOpen, setAnalyzeModalOpen } = useStore()

    // DEBUG: Trace loading state
    console.log('[App] Render. Loading:', loading, 'CityData:', !!cityData)

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
                            <CanvasErrorBoundary>
                                <Canvas
                                    shadows
                                    dpr={[1, 1.5]}
                                    gl={{
                                        antialias: true,
                                        alpha: false,
                                        powerPreference: 'high-performance',
                                        stencil: false,
                                        preserveDrawingBuffer: true // ENABLE SNAPSHOTS
                                    }}
                                >
                                    <PerspectiveCamera
                                        makeDefault
                                        position={[80, 50, 80]}
                                        fov={45}
                                        near={0.01} // FIX: Prevent clipping when getting extremely close
                                        far={3000} // Expanded render distance
                                    />

                                    <OrbitControls
                                        makeDefault
                                        enablePan={true}
                                        enableZoom={true}
                                        enableRotate={true}
                                        minDistance={0.1} // Allow extreme close-ups without freezing
                                        maxDistance={2500}
                                        // Constrain to hemisphere (0 to PI/2)
                                        maxPolarAngle={Math.PI / 2}
                                        minPolarAngle={0}
                                        dampingFactor={0.08}
                                        enableDamping={true}
                                        target={[0, 0, 0]}
                                    />

                                    <Suspense fallback={null}>
                                        <CityScene data={cityData} />
                                        <Preload all />
                                    </Suspense>
                                </Canvas>
                            </CanvasErrorBoundary>

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

                    {/* Common Overlays - ONLY SHOW IF PROJECT LOADED */}
                    {cityData ? (
                        <>
                            {/* Floating Navigation Dock - World Class UX */}
                            <FloatingDock
                                view={view}
                                onViewChange={setView}
                                onAnalyze={() => setAnalyzeModalOpen(true)}
                                onShowGraph={() => setShowDependencyGraph(true)}
                                onShowExport={() => setShowExportReport(true)}
                            />

                            {selectedBuilding && (
                                <BuildingPanel building={selectedBuilding} />
                            )}

                            {view === '3d' && <TimelineController />}

                            {view === '3d' && <DiagnosticsHUD />}
                            {view === '3d' && <ViewControl />}
                            {view === '3d' && <CanvasUI />}
                            <ChatInterface />
                            {/* ROOT LEVEL CODE VIEWER */}
                            {useStore.getState().codeViewerOpen && selectedBuilding && (
                                <CodeViewer
                                    building={selectedBuilding}
                                    onClose={() => useStore.getState().setCodeViewerOpen(false)}
                                />
                            )}
                        </>
                    ) : (
                        view === '3d' && <EmptyCityHero />
                    )}
                </div>
            </div>

            {cityData && <Sidebar />}

            {/* Intelligence Dashboard */}
            {cityData && activeIntelligencePanel && (
                <IntelligenceDashboard />
            )}

            {/* Impact Visualization */}
            {cityData && <ImpactVisualization />}

            {/* Command Palette - ⌘K */}
            {cityData && <CommandPalette />}

            {/* Analyze Repo Modal */}
            <AnalyzeModal open={analyzeModalOpen} onOpenChange={setAnalyzeModalOpen} />

            {/* 2D Dependency Graph Modal */}
            <DependencyGraph
                isOpen={showDependencyGraph}
                onClose={() => setShowDependencyGraph(false)}
            />

            {/* Export Report Modal */}
            <ExportReport
                isOpen={showExportReport}
                onClose={() => setShowExportReport(false)}
            />

            {/* Loading - Clean minimal loader */}
            <AnimatePresence>
                {loading && (
                    <motion.div
                        key="loader"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 0.3 }}
                        style={{ position: 'fixed', inset: 0, zIndex: 99999 }}
                    >
                        <CityBuilderLoader />
                    </motion.div>
                )}
            </AnimatePresence>

            {/* Error Toast - Moved to Top Center to avoid overlap */}
            {error && (
                <div style={{
                    position: 'fixed',
                    top: '24px',
                    left: '50%',
                    transform: 'translateX(-50%)',
                    background: '#050505',
                    color: '#ffffff',
                    border: '1px solid rgba(255, 255, 255, 0.1)',
                    padding: '12px 24px',
                    borderRadius: '8px',
                    boxShadow: '0 20px 40px rgba(0, 0, 0, 0.5), 0 0 0 1px rgba(255, 255, 255, 0.05) inset',
                    zIndex: 10001,
                    display: 'flex',
                    alignItems: 'center',
                    gap: '12px',
                    animation: 'slideDown 0.3s cubic-bezier(0.16, 1, 0.3, 1)',
                    maxWidth: '80vw',
                    fontSize: '0.9rem',
                    fontWeight: 500,
                    fontFamily: 'var(--font-sans)'
                }}>
                    <span style={{ color: '#ef4444' }}>⚠️</span>
                    <span>{error}</span>
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

            {/* Onboarding - Replaced by EmptyCityHero */}
            {/* <WelcomeOverlay /> */}

            {/* Toast Notifications */}
            <ToastContainer />
        </div>
    )
}

export default App
