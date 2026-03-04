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
import './features/FloatingDock.css'
import { useVSCodeSync } from './hooks/useVSCodeSync'
import useStore from './store/useStore'
import CodeViewer from './entities/building/ui/CodeViewer'
import ExplorationMode from './widgets/city-viewport/ui/ExplorationMode'
import ExplorationHUD from './widgets/layout/ui/ExplorationHUD'

// Design tokens
import './styles/design-tokens.css'
import './styles/ProfessionalUI.css'
import './App.css'

import CodePage from './features/explorer/ui/CodePage'
import AuthCallback from './features/onboarding/ui/AuthCallback'

function App() {
    // Simple Client-Side Routing for Standalone Code View
    if (window.location.pathname === '/code') {
        return <CodePage />
    }

    // Auth Callback Route
    if (window.location.pathname === '/auth/callback') {
        return <AuthCallback />
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
        error,
        codeViewerOpen,
        setCodeViewerOpen,
        explorationMode,
        setExplorationMode,
        toggleExplorationMode,
        isLandingOverlayActive
    } = useStore()

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [view, setView] = useState('3d') // '3d' or 'table'
    const [showDependencyGraph, setShowDependencyGraph] = useState(false)
    const [showExportReport, setShowExportReport] = useState(false)

    // Mobile performance detection
    const isMobile = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
    const dprRange = isMobile ? [0.75, 1] : [1, 1.5]
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
            // Block hotkeys on the landing page
            const state = useStore.getState()
            if (state.isLandingOverlayActive) return;
            // Skip if in input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') e.target.blur()
                return
            }

            // Ctrl+K / Cmd+K for command palette
            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                document.querySelector('[data-command-palette-trigger]')?.click()
                return
            }

            switch (e.key.toLowerCase()) {
                case 'escape':
                    if (explorationMode) {
                        setExplorationMode(false)
                    } else if (isAnimating) {
                        stopTimeTravel()
                    } else {
                        clearSelection()
                    }
                    break
                case '/':
                    e.preventDefault()
                    document.querySelector('input[placeholder*="Search"]')?.focus()
                    break
                case 'f':
                    if (cityData) toggleExplorationMode()
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
    }, [clearSelection, toggleLabels, toggleRoads, isAnimating, stopTimeTravel, explorationMode, setExplorationMode, toggleExplorationMode, cityData])

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
                            {/* 3D View — ALWAYS rendered (demo city loads for landing page) */}
                            <CanvasErrorBoundary>
                                <Canvas
                                    shadows={!isMobile}
                                    dpr={dprRange}
                                    gl={{
                                        antialias: !isMobile,
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
                                        near={0.1}
                                        far={3000}
                                    />

                                    {/* Camera Controls */}
                                    {!explorationMode && (
                                        <OrbitControls
                                            makeDefault
                                            enablePan={true}
                                            enableZoom={true}
                                            enableRotate={true}
                                            minDistance={1}
                                            maxDistance={2500}
                                            maxPolarAngle={Math.PI / 2}
                                            minPolarAngle={0}
                                            dampingFactor={0.08}
                                            enableDamping={true}
                                            autoRotate={!cityData || !selectedBuilding}
                                            autoRotateSpeed={0.5}
                                            target={[0, 0, 0]}
                                        />
                                    )}
                                    <ExplorationMode
                                        active={explorationMode}
                                        onExit={() => setExplorationMode(false)}
                                    />

                                    <Suspense fallback={null}>
                                        <CityScene data={cityData} />
                                        <Preload all />
                                    </Suspense>
                                </Canvas>
                            </CanvasErrorBoundary>
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
                                }}
                            />
                        </div>
                    )}

                    {/* Landing Page Hero Overlay — shown when no user-analyzed city is loaded */}
                    <EmptyCityHero />

                    {/* Common Overlays - ONLY SHOW IF PROJECT LOADED AND LANDING DISMISSED */}
                    {cityData && !isLandingOverlayActive && (
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
                            {codeViewerOpen && selectedBuilding && (
                                <CodeViewer
                                    building={selectedBuilding}
                                    onClose={() => setCodeViewerOpen(false)}
                                />
                            )}

                            {/* EXPLORATION MODE HUD */}
                            <ExplorationHUD />
                        </>
                    )}
                </div>
            </div>

            {cityData && !isLandingOverlayActive && <Sidebar />}

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
