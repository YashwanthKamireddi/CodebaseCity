
import React, { useMemo } from 'react'
import { ContactShadows } from '@react-three/drei'
import useStore from '../store/useStore'
import Ground from './Ground'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import InstancedTrace from './InstancedTrace'
import HolographicXRay from './HolographicXRay'
import DataBlock from './DataBlock'
import CameraController from './CameraController'

export default function CityScene() {
    const { cityData } = useStore()

    const buildings = useMemo(() => {
        // Fallback if data is missing
        if (!cityData || !cityData.buildings) return null
        return cityData.buildings
    }, [cityData])

    return (
        <group>
            {/* LIGHTING - Studio Setup */}
            <ambientLight intensity={1.5} />
            <directionalLight position={[50, 80, 50]} intensity={2.0} />

            {/* CONTENT */}
            <group position={[0, 0, 0]}>
                <InstancedCity />
                <InstancedTrace />
                <HolographicXRay />

                {/* Legacy Fallback for X-Ray interactions (Only render selected/hovered as real meshes if needed) */}
                {/* For now, InstancedCity handles everything visually */}
                <Roads />
                <Ground />
            </group>

            {/* SHADOWS */}
            {/* SHADOWS - Lifted slightly above ground, Expanded */}
            <ContactShadows
                position={[0, 0.01, 0]}
                resolution={1024}
                scale={500}
                blur={2}
                opacity={0.5}
                far={10}
                color="#000000"
            />

            {/* FOG (Attach to parent scene) */}
            <fog attach="fog" args={['#09090b', 20, 500]} />
            <color attach="background" args={['#09090b']} />

            <CameraController />
        </group>
    )
}
