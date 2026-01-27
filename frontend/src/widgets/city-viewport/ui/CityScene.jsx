import React, { useMemo, useLayoutEffect, useRef } from 'react'
import { ContactShadows } from '@react-three/drei'
import gsap from 'gsap'
import useStore from '../../../store/useStore'
import AvatarSprites from '../../../features/timeline/ui/AvatarSprites'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import InstancedTrace from './InstancedTrace'
import HolographicXRay from './HolographicXRay'
import CameraController from './CameraController'
import Ground from './Ground'

export default function CityScene() {
    const { cityData } = useStore()
    const groupRef = useRef()

    // Growth Animation moved to InstancedCity (Digital Materialization)
    // No global group scale animation needed anymore.

    return (
        <group>
            {/* ENVIRONMENT */}
            <ambientLight intensity={1.5} />
            <directionalLight
                position={[50, 80, 50]}
                intensity={2.0}
            />

            {/* CONTENT */}
            <group ref={groupRef} position={[0, 0, 0]}>
                <InstancedCity />
                <InstancedTrace />
                <HolographicXRay />

                {/* Gource Mode: Social Avatars */}
                <AvatarSprites />

                <Roads />
                <Ground />
            </group>

            {/* SHADOWS */}
            <ContactShadows
                position={[0, 0.01, 0]}
                resolution={1024}
                scale={500}
                blur={2}
                opacity={0.5}
                far={10}
                color="#000000"
            />

            {/* FOG */}
            <fog attach="fog" args={['#09090b', 20, 500]} />
            <color attach="background" args={['#09090b']} />

            <CameraController />
        </group>
    )
}
