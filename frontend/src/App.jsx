import React, { useState, useEffect, Suspense } from 'react'
import { Canvas } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import CityScene from './components/CityScene'
import Header from './components/Header'
import Sidebar from './components/Sidebar'
import BuildingPanel from './components/BuildingPanel'
import LegendPanel from './components/LegendPanel'
import ControlsPanel from './components/ControlsPanel'
import LoadingScreen from './components/LoadingScreen'
import HealthDashboard from './components/HealthDashboard'
import TimelineSlider from './components/TimelineSlider'
import useStore from './store/useStore'

function App() {
    const { cityData, selectedBuilding, loading, error, fetchDemo, setSelectedBuilding, theme } = useStore()
    const [sidebarOpen, setSidebarOpen] = useState(true)

    useEffect(() => {
        fetchDemo()
    }, [fetchDemo])

    // Apply theme on mount
    useEffect(() => {
        document.documentElement.setAttribute('data-theme', theme)
    }, [theme])

    // Get store actions for shortcuts
    const { toggleRoads, toggleLabels, toggleNightMode, clearSelection } = useStore()

    // Keyboard shortcuts
    useEffect(() => {
        const handleKeyDown = (e) => {
            // Ignore if typing in an input
            if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
                if (e.key === 'Escape') {
                    e.target.blur()
                }
                return
            }

            switch (e.key.toLowerCase()) {
                case 'escape':
                    // Deselect building
                    clearSelection()
                    break
                case '/':
                    // Focus search bar
                    e.preventDefault()
                    const searchInput = document.querySelector('input[placeholder*="Search"]')
                    if (searchInput) searchInput.focus()
                    break
                case 'n':
                    // Toggle night mode
                    toggleNightMode()
                    break
                case 'l':
                    // Toggle labels
                    toggleLabels()
                    break
                case 'd':
                    // Toggle dependencies
                    toggleRoads()
                    break
                case 'r':
                    // Reset view (reload)
                    window.location.reload()
                    break
                default:
                    break
            }
        }

        window.addEventListener('keydown', handleKeyDown)
        return () => window.removeEventListener('keydown', handleKeyDown)
    }, [clearSelection, toggleNightMode, toggleLabels, toggleRoads])

    return (
        <div className="app-layout">
            <div className="main-content">
                <div className="canvas-wrapper">
                    <Canvas
                        shadows
                        dpr={[1, 1.5]}
                        gl={{
                            antialias: true,
                            alpha: false,
                            powerPreference: 'high-performance',
                            preserveDrawingBuffer: true
                        }}
                    >
                        <PerspectiveCamera
                            makeDefault
                            position={[80, 60, 80]}
                            fov={50}
                            near={0.1}
                            far={1000}
                        />

                        <OrbitControls
                            enablePan={true}
                            enableZoom={true}
                            enableRotate={true}
                            minDistance={20}
                            maxDistance={300}
                            maxPolarAngle={Math.PI / 2.1}
                            minPolarAngle={0.1}
                            dampingFactor={0.05}
                            enableDamping={true}
                            target={[0, 0, 0]}
                        />

                        <Suspense fallback={null}>
                            <CityScene data={cityData} />
                        </Suspense>
                    </Canvas>

                    <Header />

                    {selectedBuilding && (
                        <BuildingPanel building={selectedBuilding} />
                    )}

                    {cityData && (
                        <LegendPanel districts={cityData.districts} buildings={cityData.buildings} />
                    )}

                    {cityData && sidebarOpen && <HealthDashboard />}

                    <TimelineSlider />

                    <ControlsPanel
                        sidebarOpen={sidebarOpen}
                        onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                    />
                </div>
            </div>

            <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />

            {loading && <LoadingScreen />}
        </div>
    )
}

export default App
