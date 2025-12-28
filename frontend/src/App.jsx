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
import useStore from './store/useStore'

function App() {
    const { cityData, selectedBuilding, loading, error, fetchDemo } = useStore()
    const [sidebarOpen, setSidebarOpen] = useState(true)

    useEffect(() => {
        fetchDemo()
    }, [fetchDemo])

    return (
        <div className="app-layout">
            <div className="main-content">
                <div className="canvas-wrapper">
                    <Canvas
                        shadows
                        dpr={[1, 2]}
                        gl={{
                            antialias: true,
                            alpha: false,
                            powerPreference: 'high-performance'
                        }}
                    >
                        <PerspectiveCamera
                            makeDefault
                            position={[120, 100, 120]}
                            fov={45}
                            near={1}
                            far={1000}
                        />

                        <OrbitControls
                            enablePan={true}
                            enableZoom={true}
                            enableRotate={true}
                            minDistance={30}
                            maxDistance={400}
                            maxPolarAngle={Math.PI / 2.2}
                            minPolarAngle={0.2}
                            dampingFactor={0.05}
                            enableDamping={true}
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
