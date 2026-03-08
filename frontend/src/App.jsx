/**
 * App.jsx
 *
 * Main application - clean, practical, no gimmicks
 * Focus: Fast load, useful features, developer workflow
 */

import React, { useState, useEffect, Suspense, useCallback, lazy, startTransition } from 'react'
import { Canvas, invalidate } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Preload } from '@react-three/drei'
import { EffectComposer, Bloom, Vignette } from '@react-three/postprocessing'
import CityScene from './widgets/city-viewport/ui/CityScene'
import { CanvasErrorBoundary } from './widgets/layout/ui/CanvasErrorBoundary'
import Sidebar from './widgets/layout/ui/Sidebar'
import { motion, AnimatePresence } from 'framer-motion'
import LoadingScreen from './shared/ui/LoadingScreen'
import { ErrorBoundary } from './shared/ui/ErrorBoundary'
import { ToastContainer } from './shared/ui/Toast'

// Lazy-loaded heavy panels (only loaded when needed)
const TimelineController = lazy(() => import('./features/timeline/ui/TimelineController'))
const CommandPalette = lazy(() => import('./features/search/ui/CommandPalette'))
const FileTable = lazy(() => import('./features/explorer/ui/FileTable'))
const ChatInterface = lazy(() => import('./features/ai-architect/ui/ChatInterface'))
const ExportReport = lazy(() => import('./features/analysis/ui/ExportReport'))
const CodeViewer = lazy(() => import('./entities/building/ui/CodeViewer'))
const CodePage = lazy(() => import('./features/explorer/ui/CodePage'))

import FloatingDock from './widgets/layout/ui/FloatingDock'
import CityBuilderLoader from './features/onboarding/ui/CityBuilderLoader'
import EmptyCityHero from './features/onboarding/ui/EmptyCityHero'
import ViewControl from './widgets/layout/ui/ViewControl'
import CanvasUI from './widgets/layout/ui/CanvasUI'
import useStore from './store/useStore'

// Design tokens
import './styles/design-tokens.css'
import './styles/ProfessionalUI.css'
import './App.css'
import './styles/mobile.css'

/**
 * useKeyboardShortcuts — Extracted hook for keyboard event handling.
 * Reads from store snapshot to avoid stale closures.
 */
function useKeyboardShortcuts(setView) {
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Read fresh state on every keypress — no stale closures
            const state = useStore.getState()

            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') e.target.blur()
                return
            }

            // ESC always works for deselection, even on landing
            if (e.key === 'Escape') {
                if (state.isAnimating) {
                    state.stopTimeTravel()
                } else if (state.selectedBuilding) {
                    state.clearSelection()
                }
                return
            }

            // Other shortcuts blocked on landing
            if (state.isLandingOverlayActive) return

            if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
                e.preventDefault()
                document.querySelector('[data-command-palette-trigger]')?.click()
                return
            }

            switch (e.key.toLowerCase()) {
                case '/':
                    e.preventDefault()
                    document.querySelector('input[placeholder*="Search"]')?.focus()
                    break
                case 'd':
                    state.toggleRoads()
                    break
                case 'v':
                    startTransition(() => {
                        setView(v => v === '3d' ? 'table' : '3d')
                    })
                    break
                default:
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [setView])
}

function App() {
    // Simple Client-Side Routing for Standalone Code View
    const isCodePage = window.location.pathname === '/code'

    // Granular selectors — prevent full re-render on unrelated state changes
    const cityData = useStore(s => s.cityData)
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const loading = useStore(s => s.loading)
    const theme = useStore(s => s.theme)
    const isAnimating = useStore(s => s.isAnimating)
    const selectBuilding = useStore(s => s.selectBuilding)
    const error = useStore(s => s.error)
    const codeViewerOpen = useStore(s => s.codeViewerOpen)
    const setCodeViewerOpen = useStore(s => s.setCodeViewerOpen)
    const isLandingOverlayActive = useStore(s => s.isLandingOverlayActive)

    const [sidebarOpen, setSidebarOpen] = useState(true)
    const [view, setView] = useState('3d') // '3d' or 'table'
    const [showExportReport, setShowExportReport] = useState(false)

    // Performance tier detection
    const isMobileDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
    const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth <= 768
    const isMobile = isMobileDevice && isNarrowScreen
    const isLowEnd = isMobileDevice || (typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4)
    const dprRange = isLowEnd ? [0.75, 1] : [1, 1.5]

    // Close sidebar by default on mobile
    useEffect(() => {
        if (isMobile) {
            setSidebarOpen(false)
            useStore.setState({ sidebarOpen: false })
        }
    }, []) // Run once on mount

    // Apply theme
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    // Mobile viewport height fix (100vh issue on iOS Safari)
    useEffect(() => {
        const setVH = () => {
            const vh = window.innerHeight * 0.01
            document.documentElement.style.setProperty('--vh', `${vh}px`)
        }
        setVH()
        window.addEventListener('resize', setVH)
        window.addEventListener('orientationchange', setVH)
        return () => {
            window.removeEventListener('resize', setVH)
            window.removeEventListener('orientationchange', setVH)
        }
    }, [])

    // Extracted keyboard shortcuts — reads fresh state, no stale closures
    useKeyboardShortcuts(setView)

    if (isCodePage) {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <CodePage />
            </Suspense>
        )
    }

    return (
        <div className="app-layout">
            <div className="main-content">
                <div className="canvas-wrapper">
                    {view === '3d' ? (
                        <>
                            {/* 3D View — ALWAYS rendered (demo city loads for landing page) */}
                            <CanvasErrorBoundary>
                                <Canvas
                                    frameloop="demand"
                                    shadows={!isLowEnd}
                                    dpr={dprRange}
                                    gl={{
                                        antialias: !isLowEnd,
                                        alpha: false,
                                        powerPreference: isLowEnd ? 'low-power' : 'high-performance',
                                        stencil: false,
                                        depth: true,
                                        failIfMajorPerformanceCaveat: false,
                                    }}
                                >
                                    <PerspectiveCamera
                                        makeDefault
                                        position={[120, 80, 120]}
                                        fov={45}
                                        near={0.5}
                                        far={20000}
                                    />

                                    {/* Camera Controls - Optimized for touch */}
                                    <OrbitControls
                                        makeDefault
                                        enablePan={true}
                                        enableZoom={true}
                                        enableRotate={true}
                                        minDistance={10}
                                        maxDistance={15000}
                                        maxPolarAngle={Math.PI / 2}
                                        minPolarAngle={0.05}
                                        dampingFactor={isMobile ? 0.08 : 0.12}
                                        enableDamping={true}
                                        rotateSpeed={isMobile ? 0.5 : 0.8}
                                        zoomSpeed={isMobile ? 0.6 : 1.0}
                                        panSpeed={isMobile ? 0.5 : 0.8}
                                        touches={{
                                            ONE: 1,  // ROTATE
                                            TWO: 2   // DOLLY_PAN
                                        }}
                                        autoRotate={!cityData || !selectedBuilding}
                                        autoRotateSpeed={0.3}
                                        target={[0, 0, 0]}
                                        onChange={() => invalidate()}
                                    />

                                    <Suspense fallback={null}>
                                        <CityScene data={cityData} />
                                        <Preload all />

                                        {!isLowEnd && (
                                            <EffectComposer disableNormalPass>
                                                <Bloom
                                                    luminanceThreshold={0.2}
                                                    luminanceSmoothing={0.9}
                                                    intensity={1.5}
                                                    mipmapBlur
                                                />
                                                <Vignette eskil={false} offset={0.1} darkness={1.1} />
                                            </EffectComposer>
                                        )}
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
                            <Suspense fallback={null}>
                                <FileTable
                                    buildings={cityData?.buildings || []}
                                    onSelectFile={(file) => {
                                        selectBuilding(file)
                                    }}
                                />
                            </Suspense>
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
                                onViewChange={(nextView) => {
                                    startTransition(() => {
                                        setView(nextView)
                                    })
                                }}
                                onShowExport={() => {
                                    startTransition(() => {
                                        setShowExportReport(true)
                                    })
                                }}
                            />

                            {view === '3d' && (
                                <Suspense fallback={null}>
                                    <TimelineController />
                                </Suspense>
                            )}

                            {view === '3d' && <ViewControl />}
                            {view === '3d' && <CanvasUI />}
                            <Suspense fallback={null}>
                                <ChatInterface />
                            </Suspense>
                            {/* ROOT LEVEL CODE VIEWER */}
                            {codeViewerOpen && selectedBuilding && (
                                <Suspense fallback={null}>
                                    <CodeViewer
                                        building={selectedBuilding}
                                        onClose={() => {
                                            startTransition(() => {
                                                setCodeViewerOpen(false)
                                            })
                                        }}
                                    />
                                </Suspense>
                            )}
                        </>
                    )}
                </div>
            </div>

            {cityData && !isLandingOverlayActive && <Sidebar />}

            {/* Building detail panel — now rendered as 3D hologram inside CityScene */}

            {/* Command Palette - ⌘K */}
            {cityData && (
                <Suspense fallback={null}>
                    <CommandPalette />
                </Suspense>
            )}

            {/* Export Report Modal */}
            <Suspense fallback={null}>
                <ExportReport
                    isOpen={showExportReport}
                    onClose={() => {
                        startTransition(() => {
                            setShowExportReport(false)
                        })
                    }}
                />
            </Suspense>

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

            {/* Toast Notifications */}
            <ToastContainer />
        </div>
    )
}

export default App
