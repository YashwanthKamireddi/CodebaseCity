import React, { useMemo } from 'react'
import useStore from '../../../store/useStore'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import CameraController from './CameraController'
import Ground from './Ground'
import HologramPanel from './HologramPanel'
import NeonDistrictBorders from './NeonDistrictBorders'
import DistrictLabels from './DistrictLabels'
import MothershipCore from './MothershipCore'
import HolographicCityName from './HolographicCityName'
import EnergyCoreReactor from './EnergyCoreReactor'
import HeroLandmarks from './HeroLandmarks'


/**
 * CityScene - Premium Cinematic City Environment
 */
export default function CityScene() {
    const cityData = useStore(s => s.cityData)

    const cityRadius = useMemo(() => {
        if (!cityData?.buildings?.length) return 100
        let maxR = 0
        for (const b of cityData.buildings) {
            const r = Math.sqrt(b.position.x ** 2 + (b.position.z || 0) ** 2)
            if (r > maxR) maxR = r
        }
        return Math.max(100, maxR + 50)
    }, [cityData])

    return (
        <group>
            {/* Cinematic 5-light rig — key, fill, rim, ambient, hemisphere */}
            <ambientLight intensity={0.55} color="#90a0c0" />
            <hemisphereLight color="#b0d0ff" groundColor="#101828" intensity={0.6} />
            <directionalLight position={[100, 150, 80]} intensity={1.4} color="#e8f0ff" />
            <directionalLight position={[-80, 60, -50]} intensity={0.5} color="#90b0ff" />
            <directionalLight position={[0, 40, -120]} intensity={0.35} color="#7090d0" />

            <group>
                <InstancedCity />
                <Roads />
                <Ground />
                <HologramPanel />
                <NeonDistrictBorders />
                <DistrictLabels />
                <EnergyCoreReactor />
                <MothershipCore />
                <HolographicCityName />
                <HeroLandmarks buildings={cityData?.buildings} />
            </group>

            <fog attach="fog" args={['#0a1020', cityRadius * 1.5, cityRadius * 6]} />
            <color attach="background" args={['#0c1222']} />
            <CameraController />
        </group>
    )
}
