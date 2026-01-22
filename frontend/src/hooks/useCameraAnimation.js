/**
 * useCameraAnimation.js
 *
 * Smooth camera animations using GSAP for world-class transitions
 * Inspired by Bruno Simon and award-winning 3D sites
 */

import { useCallback, useRef } from 'react'
import { useThree } from '@react-three/fiber'
import gsap from 'gsap'
import * as THREE from 'three'

/**
 * Hook for smooth camera animations
 */
export function useCameraAnimation() {
  const { camera } = useThree()
  const controlsRef = useRef(null)

  // Store reference to orbit controls
  const setControlsRef = useCallback((controls) => {
    controlsRef.current = controls
  }, [])

  /**
   * Smoothly focus camera on a building
   */
  const focusOnBuilding = useCallback((building, options = {}) => {
    const {
      distance = 40,
      height = 25,
      duration = 1.2,
      ease = 'power2.out',
      onComplete
    } = options

    if (!building?.position) return

    const { x, z } = building.position
    const buildingHeight = building.dimensions?.height || 10

    // Calculate target position (orbit around building)
    const angle = Math.PI / 4 // 45 degrees
    const targetX = x + Math.sin(angle) * distance
    const targetY = buildingHeight * 0.5 + height
    const targetZ = z + Math.cos(angle) * distance

    // Animate camera position
    gsap.to(camera.position, {
      x: targetX,
      y: targetY,
      z: targetZ,
      duration,
      ease,
      onUpdate: () => {
        camera.updateProjectionMatrix()
      },
      onComplete
    })

    // Animate orbit controls target
    if (controlsRef.current) {
      gsap.to(controlsRef.current.target, {
        x: x,
        y: buildingHeight * 0.3,
        z: z,
        duration,
        ease,
        onUpdate: () => {
          controlsRef.current.update()
        }
      })
    }
  }, [camera])

  /**
   * Smoothly reset camera to overview position
   */
  const resetView = useCallback((options = {}) => {
    const {
      position = [80, 60, 80],
      target = [0, 0, 0],
      duration = 1.5,
      ease = 'power2.inOut',
      onComplete
    } = options

    // Animate camera position
    gsap.to(camera.position, {
      x: position[0],
      y: position[1],
      z: position[2],
      duration,
      ease,
      onUpdate: () => {
        camera.updateProjectionMatrix()
      },
      onComplete
    })

    // Animate orbit controls target
    if (controlsRef.current) {
      gsap.to(controlsRef.current.target, {
        x: target[0],
        y: target[1],
        z: target[2],
        duration,
        ease,
        onUpdate: () => {
          controlsRef.current.update()
        }
      })
    }
  }, [camera])

  /**
   * Cinematic fly-in animation for intro
   */
  const cinematicFlyIn = useCallback((options = {}) => {
    const {
      startPosition = [200, 150, 200],
      endPosition = [80, 60, 80],
      target = [0, 0, 0],
      duration = 3,
      ease = 'power3.out',
      onComplete
    } = options

    // Set start position
    camera.position.set(...startPosition)
    camera.lookAt(...target)

    // Animate to end position
    gsap.to(camera.position, {
      x: endPosition[0],
      y: endPosition[1],
      z: endPosition[2],
      duration,
      ease,
      onUpdate: () => {
        camera.lookAt(...target)
        camera.updateProjectionMatrix()
      },
      onComplete: () => {
        if (controlsRef.current) {
          controlsRef.current.target.set(...target)
          controlsRef.current.update()
        }
        onComplete?.()
      }
    })
  }, [camera])

  /**
   * Orbit around a point
   */
  const orbitAround = useCallback((center, options = {}) => {
    const {
      radius = 60,
      height = 40,
      duration = 20,
      loops = -1, // -1 for infinite
      ease = 'none',
      onComplete
    } = options

    const angle = { value: 0 }
    const [cx, cy, cz] = center

    return gsap.to(angle, {
      value: Math.PI * 2,
      duration,
      ease,
      repeat: loops,
      onUpdate: () => {
        camera.position.x = cx + Math.sin(angle.value) * radius
        camera.position.z = cz + Math.cos(angle.value) * radius
        camera.position.y = height
        camera.lookAt(cx, cy, cz)
        camera.updateProjectionMatrix()
      },
      onComplete
    })
  }, [camera])

  /**
   * Shake camera (for impact effects)
   */
  const shake = useCallback((options = {}) => {
    const {
      intensity = 0.5,
      duration = 0.5,
      onComplete
    } = options

    const originalPosition = camera.position.clone()

    gsap.to(camera.position, {
      x: `+=${Math.random() * intensity - intensity / 2}`,
      y: `+=${Math.random() * intensity - intensity / 2}`,
      z: `+=${Math.random() * intensity - intensity / 2}`,
      duration: 0.05,
      repeat: Math.floor(duration / 0.05),
      yoyo: true,
      onComplete: () => {
        camera.position.copy(originalPosition)
        onComplete?.()
      }
    })
  }, [camera])

  return {
    setControlsRef,
    focusOnBuilding,
    resetView,
    cinematicFlyIn,
    orbitAround,
    shake
  }
}

export default useCameraAnimation
