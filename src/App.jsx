/**
 * App.jsx
 *
 * Main application - clean, practical, no gimmicks
 * Focus: Fast load, useful features, developer workflow
 */

import React, { useState, useEffect, useMemo, Suspense, useCallback, lazy, startTransition } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera, Preload } from '@react-three/drei'
import * as THREE from 'three'

import CityScene from './widgets/city-viewport/ui/CityScene'
import { CanvasErrorBoundary } from './widgets/layout/ui/CanvasErrorBoundary'
import Sidebar from './widgets/layout/ui/Sidebar'
import { useExitAnimation } from './shared/animations/useExitAnimation'
import LoadingScreen from './shared/ui/LoadingScreen'
import { ErrorBoundary } from './shared/ui/ErrorBoundary'
import { ToastContainer } from './shared/ui/Toast'
import { AchievementToast } from './features/achievements'
import { useAuth, LoginGate } from './features/auth'


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
import UfoOverlay from './widgets/layout/ui/UfoOverlay'
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

            // Do not override keys when exploring (flying the game mode ufo)
            if (state.ufoMode && /^[a-zA-Z0-9]$/.test(e.key)) return

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

    // Auth state
    const { isAuthenticated, user } = useAuth()

    // Granular selectors — prevent full re-render on unrelated state changes
    const cityData = useStore(s => s.cityData)
    const selectedBuilding = useStore(s => s.selectedBuilding)
    const loading = useStore(s => s.loading)
    const [renderLoader, loaderExiting] = useExitAnimation(loading, 300)
    const theme = useStore(s => s.theme)
    const selectBuilding = useStore(s => s.selectBuilding)
    const error = useStore(s => s.error)
    const codeViewerOpen = useStore(s => s.codeViewerOpen)
    const setCodeViewerOpen = useStore(s => s.setCodeViewerOpen)
    const exportReportOpen = useStore(s => s.exportReportOpen)
    const setExportReportOpen = useStore(s => s.setExportReportOpen)
    const isGenesisPlaying = useStore(s => s.isGenesisPlaying)
    const isLandingOverlayActive = useStore(s => s.isLandingOverlayActive)

    // Achievement state
    const achievementNewUnlock = useStore(s => s.achievementNewUnlock)
    const dismissAchievementToast = useStore(s => s.dismissAchievementToast)
    const checkAchievements = useStore(s => s.checkAchievements)
    const reloadAchievementsForUser = useStore(s => s.reloadAchievementsForUser)

    const [view, setView] = useState('3d') // '3d' or 'table'

    // Reload achievements when auth state changes
    useEffect(() => {
        reloadAchievementsForUser()
    }, [isAuthenticated, user?.id, reloadAchievementsForUser])

    // Performance tier detection — computed once, not on every render
    const { isMobile, isLowEnd } = useMemo(() => {
        const isMobileDevice = typeof navigator !== 'undefined' && navigator.maxTouchPoints > 0
        const isNarrowScreen = typeof window !== 'undefined' && window.innerWidth <= 768
        return {
            isMobile: isMobileDevice && isNarrowScreen,
            isLowEnd: isMobileDevice || (typeof navigator !== 'undefined' && navigator.hardwareConcurrency <= 4),
        }
    }, [])
    const dprRange = isLowEnd ? [0.75, 1] : [1, 1.25]

    // Handle Shareable URLs (?repo=owner/repo)
    useEffect(() => {
        if (isCodePage) return
        const urlParams = new URLSearchParams(window.location.search)
        const repo = urlParams.get('repo')
        if (repo) {
            // Slight delay to ensure Zustand store map is initialized
            // and Demo background doesn't overwrite our loading state.
            setTimeout(() => {
                useStore.getState().analyzeRepo(repo)
            }, 100)
        }
    }, [isCodePage])

    // Close sidebar by default on mobile
    useEffect(() => {
        if (isMobile) {
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

    // Track achievements when city data loads
    useEffect(() => {
        if (cityData && !loading) {
            const buildings = cityData.buildings || []
            const fileCount = buildings.length
            const complexities = buildings.map(b => b.metrics?.complexity || 0)
            const maxComplexity = Math.max(0, ...complexities)
            const avgComplexity = cityData.stats?.avgComplexity || 0
            const testFiles = buildings.filter(b => /\.(test|spec)\./.test(b.name || '')).length
            const testRatio = fileCount > 0 ? testFiles / fileCount : 0

            // Increment repos analyzed counter
            const prevAnalyzed = parseInt(localStorage.getItem('cc_repos_analyzed') || '0', 10)
            const totalAnalyzed = prevAnalyzed + 1
            localStorage.setItem('cc_repos_analyzed', String(totalAnalyzed))

            checkAchievements({
                totalAnalyzed,
                fileCount,
                avgComplexity,
                maxComplexity,
                testRatio,
                totalDistricts: cityData.stats?.total_districts || 0,
            })
        }
    }, [cityData, loading, checkAchievements])

    if (isCodePage) {
        return (
            <Suspense fallback={<LoadingScreen />}>
                <CodePage />
            </Suspense>
        )
    }

    // Auth is now optional - users can explore without signing in
    // Premium features (Universe Mode, higher rate limits) require auth

    return (
        <div className="app-layout">
            <div className="main-content">
                <div className="canvas-wrapper">
                    {view === '3d' ? (
                        <>
                            {/* 3D View — ALWAYS rendered (demo city loads for landing page) */}
                            <CanvasErrorBoundary>
                                <Canvas
                                    style={isLandingOverlayActive ? { pointerEvents: 'none' } : undefined}
                                    shadows={false}
                                    camera={{ fov: 50, near: 1, far: 80000 }} // Support massive repos perfectly
                                    frameloop={isLandingOverlayActive ? "always" : "demand"}
                                    dpr={dprRange}
                                    gl={{
                                        antialias: !isLowEnd,
                                        alpha: false,
                                        powerPreference: isLowEnd ? 'low-power' : 'high-performance',
                                        stencil: false,
                                        depth: true,
                                        logarithmicDepthBuffer: true,
                                        preserveDrawingBuffer: false,
                                        failIfMajorPerformanceCaveat: false,
                                    }}
                                >
                                    <PerspectiveCamera
                                        makeDefault
                                        position={[250, 150, 250]}
                                        fov={45}
                                        near={1}
                                        far={500000}
                                    />

                                    {/* Camera Controls - World-class trackpad/touch/mouse */}
                                    <OrbitControls
                                        makeDefault
                                        enabled={!isGenesisPlaying}
                                        enablePan={true}
                                        enableZoom={true}
                                        zoomSpeed={3.0}
                                        enableRotate={true}
                                        screenSpacePanning={true}
                                        minDistance={1}
                                        maxDistance={500000}
                                        maxPolarAngle={Math.PI / 2 - 0.05}
                                        minPolarAngle={0.05}
                                        enableDamping={true}
                                        dampingFactor={isMobile ? 0.12 : 0.18}
                                        rotateSpeed={isMobile ? 0.7 : 1.0}
                                        panSpeed={isMobile ? 0.8 : 1.2}
                                        zoomToCursor={true}
                                        enableKeys={true}
                                        mouseButtons={{
                                            LEFT: THREE.MOUSE.ROTATE,
                                            MIDDLE: THREE.MOUSE.DOLLY,
                                            RIGHT: THREE.MOUSE.PAN,
                                        }}
                                        touches={{
                                            ONE: THREE.TOUCH.ROTATE,
                                            TWO: THREE.TOUCH.DOLLY_PAN,
                                        }}
                                        target={[0, 0, 0]}
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
                                        setExportReportOpen(true)
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
                            <UfoOverlay />
                        </>
                    )}
                </div>
            </div>

            {cityData && !isLandingOverlayActive && view === '3d' && <Sidebar />}

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
                    isOpen={exportReportOpen}
                    onClose={() => {
                        startTransition(() => {
                            setExportReportOpen(false)
                        })
                    }}
                />
            </Suspense>

            {/* Loading - Clean minimal loader */}
            {renderLoader && (
                <div
                    style={{
                        position: 'fixed', inset: 0, zIndex: 99999,
                        animation: loaderExiting ? 'anim-fade-out 0.3s ease forwards' : undefined,
                    }}
                >
                    <CityBuilderLoader />
                </div>
            )}

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

            {/* Achievement Unlock Toast — only for authenticated users */}
            {isAuthenticated && achievementNewUnlock && (
                <AchievementToast
                    achievement={achievementNewUnlock}
                    onDismiss={dismissAchievementToast}
                />
            )}

            {/* Universe Mode — Multi-repo view (now built into unified city) */}
        </div>
    )
}

export default App
