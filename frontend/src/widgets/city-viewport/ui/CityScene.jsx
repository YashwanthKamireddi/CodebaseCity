import React, { useMemo, useLayoutEffect, useRef } from 'react'
import { ContactShadows, Environment } from '@react-three/drei'
import { useFrame, invalidate } from '@react-three/fiber'
import useStore from '../../../store/useStore'
import Roads from './Roads'
import InstancedCity from './InstancedCity'
import CameraController from './CameraController'
import Ground from './Ground'
import HologramPanel from './HologramPanel'
import AtmosphericParticles from './AtmosphericParticles'
import HeroLandmarks from './HeroLandmarks'
import MothershipCore from './MothershipCore'
import OrbitalSatellites from './OrbitalSatellites'
import EnergyShieldDome from './EnergyShieldDome'
import NeonDistrictBorders from './NeonDistrictBorders'
import AuroraBorealis from './AuroraBorealis'
import PulseWaves from './PulseWaves'
import EmergencyBeacons from './EmergencyBeacons'
import DistrictLabels from './DistrictLabels'
import LandingPads from './LandingPads'
import CommTowers from './CommTowers'
import SkyBridges from './SkyBridges'
import Starfield from './Starfield'
import EnergyCoreReactor from './EnergyCoreReactor'
import DataStreams from './DataStreams'
import HolographicCityName from './HolographicCityName'
import { EffectComposer, Bloom } from '@react-three/postprocessing'

/**
 * AutoInvalidate — Keeps the render loop alive for continuous animations.
 * With frameloop="demand", this ensures PulseMaterial, particles, and
 * traffic all animate smoothly. Cost is negligible — just schedules frames.
 */
function AutoInvalidate() {
    useFrame(() => {
        invalidate()
    })

    return null
}

/**
 * CityScene - Premium Cinematic City Environment
 */
export default function CityScene() {
    const cityData = useStore(s => s.cityData)
    const groupRef = useRef()

    // Performance tier
    const isLowEnd = typeof navigator !== 'undefined' &&
        (navigator.maxTouchPoints > 0 || navigator.hardwareConcurrency <= 4)

    // Dynamic fog: compute bounds from buildings
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
            {/* ═══════════════════════════════════════════════════════════════
                CINEMATIC LIGHTING SETUP
                Three-point lighting with atmospheric enhancement
            ═══════════════════════════════════════════════════════════════ */}

            {/* Ambient base - very subtle, prevents pure black shadows */}
            <ambientLight intensity={0.25} color="#1a1a2e" />

            {/* Hemisphere - creates natural sky/ground gradient */}
            <hemisphereLight
                color="#1e3a5f"        // Cool sky blue
                groundColor="#0a0a12"  // Dark ground
                intensity={0.5}
            />

            {/* KEY LIGHT - Main directional (moonlight/citylight feel) */}
            <directionalLight
                position={[80, 120, 60]}
                intensity={1.2}
                color="#e0f0ff"
                castShadow={!isLowEnd}
                shadow-mapSize={isLowEnd ? [512, 512] : [1024, 1024]}
                shadow-camera-far={400}
                shadow-camera-left={-200}
                shadow-camera-right={200}
                shadow-camera-top={200}
                shadow-camera-bottom={-200}
                shadow-bias={-0.0001}
                shadow-normalBias={0.02}
            />

            {/* FILL LIGHT - Cool, from opposite side */}
            <directionalLight
                position={[-100, 80, -80]}
                intensity={0.4}
                color="#c0d8ff"
            />

            {/* RIM LIGHT - Back lighting for depth separation */}
            <directionalLight
                position={[0, 50, -150]}
                intensity={0.5}
                color="#ffffff"        // Cyan accent (neon signs feel)
            />

            {/* ACCENT LIGHT - Top-down for roof definition */}
            <directionalLight
                position={[0, 200, 0]}
                intensity={0.2}
                color="#ffffff"
            />

            {/* POINT LIGHTS - Subtle cool accents only */}
            <pointLight
                position={[-120, 25, -80]}
                intensity={0.15}
                color="#4488ff"
                distance={150}
                decay={2}
            />
            <pointLight
                position={[80, 20, -120]}
                intensity={0.1}
                color="#8844ff"
                distance={120}
                decay={2}
            />

            {/* ═══════════════════════════════════════════════════════════════
                CITY CONTENT
            ═══════════════════════════════════════════════════════════════ */}
            <group ref={groupRef} position={[0, 0, 0]}>
                {/* Core city structure */}
                <InstancedCity />
                <Roads />
                <Ground />

                {/* Atmospheric anchors */}
                <MothershipCore />
                <OrbitalSatellites />
                <Starfield />
                <AuroraBorealis />

                {/* City features */}
                <HologramPanel />
                <HeroLandmarks buildings={cityData?.buildings} />
                <NeonDistrictBorders />
                <DistrictLabels />
                <EnergyCoreReactor />
                <PulseWaves />

                {/* Building details */}
                <LandingPads />
                <CommTowers />
                <EmergencyBeacons />
                <SkyBridges />

                {/* Connectivity visualization */}
                <DataStreams />

                {/* Branding */}
                <HolographicCityName />

                {/* Shield */}
                {!isLowEnd && <EnergyShieldDome />}
            </group>

            {/* ═══════════════════════════════════════════════════════════════
                SHADOWS & ATMOSPHERE
            ═══════════════════════════════════════════════════════════════ */}

            {/* Soft contact shadows for grounding */}
            {!isLowEnd && (
                <ContactShadows
                    position={[0, 0.01, 0]}
                    resolution={256}
                    scale={400}
                    blur={3}
                    opacity={0.35}
                    far={15}
                    color="#000010"
                />
            )}

            {/* Atmospheric fog - thick dark volume for scale and mood */}
            <fog attach="fog" args={['#010204', cityRadius * 0.5, cityRadius * 4.0]} />

            {/* Background color - deep space blue */}
            <color attach="background" args={['#020408']} />

            {/* Bloom Post Processing — balanced, not explosive */}
            {!isLowEnd && (
                <EffectComposer disableNormalPass>
                    <Bloom
                        luminanceThreshold={0.4}
                        mipmapBlur
                        luminanceSmoothing={0.6}
                        intensity={0.6}
                    />
                </EffectComposer>
            )}

            <CameraController />
            <AutoInvalidate />
        </group>
    )
}
