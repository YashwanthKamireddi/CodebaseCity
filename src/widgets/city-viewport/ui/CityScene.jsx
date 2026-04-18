import React, { useMemo, useEffect, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import useStore from '../../../store/useStore'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import CameraController from './CameraController'
import Ground from './Ground'
import HologramPanel from './HologramPanel'
import MothershipCore from './MothershipCore'
import HolographicCityName from './HolographicCityName'
import EnergyCoreReactor from './EnergyCoreReactor'
import HeroLandmarks from './HeroLandmarks'
import LandmarkPanel from './LandmarkPanel'
import DistrictLabels from './DistrictLabels'
import StreetLamps from './StreetLamps'
import DataStreams from './DataStreams'
import AtmosphericParticles from './AtmosphericParticles'
import CitySpawnBurst from './CitySpawnBurst'
import { Stars } from '@react-three/drei'

import UfoAvatar from './UfoAvatar'
import BuildingCrowns from './BuildingCrowns'
import BuildingShadows from './BuildingShadows'
import { extend } from '@react-three/fiber'
import { Sparkles, Sky } from '@react-three/drei'


/**
 * AnimationPump — In frameloop="demand" mode, periodically invalidates
 * to drive shader-time uniforms and subtle rotations. Runs at a low 10fps
 * idle rate since decorative animations are slow/subtle. Camera controls
 * handle high-fps invalidation during user interaction independently.
 */
function AnimationPump() {
    const invalidate = useThree(s => s.invalidate)
    const lastRef = useRef(0)
    useEffect(() => {
        let raf
        const tick = (t) => {
            if (t - lastRef.current >= 200) {
                lastRef.current = t
                invalidate()
            }
            raf = requestAnimationFrame(tick)
        }
        raf = requestAnimationFrame(tick)
        return () => cancelAnimationFrame(raf)
    }, [invalidate])
    return null
}

function ScreenshotHandler() {
    const { gl, scene, camera } = useThree()
    const screenshotRequest = useStore(s => s.screenshotRequest)

    useEffect(() => {
        if (!screenshotRequest) return

        // Force synchronous render to ensure buffer is full even with preserveDrawingBuffer=false
        gl.render(scene, camera)

        const dataUrl = gl.domElement.toDataURL('image/png')
        const link = document.createElement('a')
        link.download = `codebase-city-snapshot-${Date.now()}.png`
        link.href = dataUrl
        link.click()
    }, [screenshotRequest, gl, scene, camera])

    return null
}


/**
 * CityScene - Premium Cinematic City Environment
 */
const CityScene = React.memo(function CityScene() {
    const cityData = useStore(s => s.cityData)
    const clearSelection = useStore(s => s.clearSelection)
    const showRoads = useStore(s => s.showRoads)

    const buildingCount = cityData?.buildings?.length || 0

    const cityRadius = useMemo(() => {
        if (!buildingCount) return 100
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(100, maxR + 50)
    }, [cityData, buildingCount])

    return (
        <group>
            <AnimationPump />
            <ScreenshotHandler />

            {/* Cinematic Sunset Lighting for AAA Obsidian Glass reflections */}
            <ambientLight intensity={0.8} color="#663377" />
            <directionalLight position={[0, 40, -100]} intensity={3.5} color="#ff9955" castShadow />
            <directionalLight position={[100, -20, 100]} intensity={1.5} color="#ff11bb" />

            <group onPointerMissed={clearSelection}>
                <InstancedCity />
                <BuildingShadows />
                {showRoads && <Roads />}
                <Ground />
                <HologramPanel />
                <LandmarkPanel />
                <DistrictLabels />
                <StreetLamps />
                <DataStreams />
                <AtmosphericParticles count={100} spread={cityRadius * 1.5} />
                <EnergyCoreReactor />
                <MothershipCore />
                <HolographicCityName />
                <HeroLandmarks buildings={cityData?.buildings} />
                <BuildingCrowns />
                <CitySpawnBurst />

                {/* ── Gamified Interactive Avatar ── */}
                <UfoAvatar />

                {/* ── World-Class Sunset Skyline ── */}
                <Sky 
                    distance={400000} 
                    sunPosition={[0, -0.01, -1]} // A massive sun sinking just below the horizon
                    mieCoefficient={0.025} // Large, soft glowing atmospheric halo
                    mieDirectionalG={0.9} // Blindingly bright near the horizon center
                    rayleigh={6} // High scattering for deep, rich orange/magenta hues
                    turbidity={15} // Thick, hazy cyberpunk smog for smooth gradient
                />
                
                {/* Subtle early evening stars peaking through the upper sky */}
                <Stars radius={400} depth={150} count={3000} factor={4} saturation={1} fade speed={1} />
            </group>

            {/* A warm, rich sunset violet/magenta volumetric fog to blend the buildings into the deep sky horizon */}
            <fog attach="fog" args={['#2f0a2a', Math.max(cityRadius * 2, 2000), Math.max(cityRadius * 8, 40000)]} />
            <CameraController />
        </group>
    )
})

export default CityScene
