import React, { useMemo } from 'react'
import useStore from '../../../store/useStore'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import CameraController from './CameraController'
import Ground from './Ground'
import HologramPanel from './HologramPanel'
import NeonDistrictBorders from './NeonDistrictBorders'
import DistrictLabels from './DistrictLabels'


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
            {/* Clean lighting — 2 directional + ambient + hemisphere */}
            <ambientLight intensity={0.4} color="#b0c4e0" />
            <hemisphereLight color="#c0d8ff" groundColor="#080810" intensity={0.5} />
            <directionalLight position={[80, 120, 60]} intensity={1.0} color="#e8f0ff" />
            <directionalLight position={[-60, 80, -40]} intensity={0.3} color="#c0d0ff" />

            <group>
                <InstancedCity />
                <Roads />
                <Ground />
                <HologramPanel />
                <NeonDistrictBorders />
                <DistrictLabels />
            </group>

            <fog attach="fog" args={['#080c14', cityRadius * 0.8, cityRadius * 5.0]} />
            <color attach="background" args={['#0a0e18']} />
            <CameraController />
        </group>
    )
}
