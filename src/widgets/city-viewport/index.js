/**
 * @fileoverview City Viewport widget barrel export
 * 3D city visualization components
 * @module @widgets/city-viewport
 */

// Core scene
export { default as CityScene } from './ui/CityScene'
export { default as CameraController } from './ui/CameraController'
export { default as InstancedCity } from './ui/InstancedCity'

// Buildings & Landmarks
export { default as HeroLandmarks } from './ui/HeroLandmarks'
export { default as MothershipCore } from './ui/MothershipCore'
export { default as EnergyCoreReactor } from './ui/EnergyCoreReactor'

// Districts
export { default as DistrictFloors } from './ui/DistrictFloors'
export { default as DistrictLabels } from './ui/DistrictLabels'
export { default as NeonDistrictBorders } from './ui/NeonDistrictBorders'

// Environment
export { default as Ground } from './ui/Ground'
export { default as Roads } from './ui/Roads'
export { default as StreetLamps } from './ui/StreetLamps'
export { default as AtmosphericParticles } from './ui/AtmosphericParticles'

// Effects & Holograms
export { default as EnergyShieldDome } from './ui/EnergyShieldDome'
export { default as DataStreams } from './ui/DataStreams'
export { default as HologramPanel } from './ui/HologramPanel'
export { default as HolographicCityName } from './ui/HolographicCityName'
export { default as LandmarkPanel } from './ui/LandmarkPanel'
export { default as UfoAvatar } from './ui/UfoAvatar'
export { default as BuildingCrowns } from './ui/BuildingCrowns'

// Shaders
export { PulseMaterial } from './shaders/PulseMaterial'
