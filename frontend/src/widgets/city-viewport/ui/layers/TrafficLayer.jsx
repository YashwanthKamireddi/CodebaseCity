import React, { useMemo, useRef, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../../store/useStore'

const PACKET_COUNT = 100
const SPEED = 1.5

export default function TrafficLayer() {
    const { cityData, showTraffic } = useStore() // We will add showTraffic to store
    const meshRef = useRef()

    // Position Lookup Map
    const buildingMap = useMemo(() => {
        if (!cityData?.buildings) return new Map()
        const map = new Map()
        cityData.buildings.forEach(b => {
            const h = b.dimensions?.height || 10
            map.set(b.id, new THREE.Vector3(b.position.x, h, b.position.z))
        })
        return map
    }, [cityData])

    // Packet Pool
    const packets = useRef([])
    useMemo(() => {
        packets.current = new Array(PACKET_COUNT).fill(0).map(() => ({
            active: false,
            progress: 0,
            start: new THREE.Vector3(),
            end: new THREE.Vector3(),
            mid: new THREE.Vector3(),
        }))
    }, [])

    const dummy = useMemo(() => new THREE.Object3D(), [])
    const color = useMemo(() => new THREE.Color('#4ade80'), []) // Neon Green

    useFrame((state, delta) => {
        if (!meshRef.current || !showTraffic || !cityData?.roads) return

        // 1. Spawn Logic (Simulated Traffic)
        // Try to spawn a few packets per frame
        for (let i = 0; i < 2; i++) {
            if (Math.random() > 0.8) { // Spawn rate
                const idlePacket = packets.current.find(p => !p.active)
                if (idlePacket) {
                    // Pick a random edge (road)
                    const road = cityData.roads[Math.floor(Math.random() * cityData.roads.length)]

                    const startPos = buildingMap.get(road.source)
                    const endPos = buildingMap.get(road.target)

                    if (startPos && endPos) {
                        idlePacket.active = true
                        idlePacket.progress = 0
                        idlePacket.start.copy(startPos)
                        idlePacket.end.copy(endPos)

                        // Calculate mid point for arc
                        idlePacket.mid.copy(startPos).lerp(endPos, 0.5)
                        const dist = startPos.distanceTo(endPos)
                        idlePacket.mid.y += Math.min(dist * 0.5, 50) // Arch height
                    }
                }
            }
        }

        // 2. Update & Render
        let activeCount = 0
        packets.current.forEach((packet, i) => {
            if (packet.active) {
                packet.progress += SPEED * delta

                if (packet.progress >= 1) {
                    packet.active = false
                    dummy.position.set(0, -10000, 0)
                } else {
                    // Quadratic Bezier Calculation
                    const t = packet.progress

                    // (1-t)^2 * P0 + 2(1-t)t * P1 + t^2 * P2
                    const pos = new THREE.Vector3()
                    pos.x = (1 - t) * (1 - t) * packet.start.x + 2 * (1 - t) * t * packet.mid.x + t * t * packet.end.x
                    pos.y = (1 - t) * (1 - t) * packet.start.y + 2 * (1 - t) * t * packet.mid.y + t * t * packet.end.y
                    pos.z = (1 - t) * (1 - t) * packet.start.z + 2 * (1 - t) * t * packet.mid.z + t * t * packet.end.z

                    dummy.position.copy(pos)

                    // Scale based on lifecycle (fade in/out)
                    const scale = Math.sin(t * Math.PI) * 1.5
                    dummy.scale.setScalar(Math.max(0.1, scale))

                    dummy.updateMatrix()
                    meshRef.current.setMatrixAt(i, dummy.matrix)
                    activeCount++
                }
            } else {
                // Keep hidden
                dummy.position.set(0, -10000, 0)
                dummy.updateMatrix()
                meshRef.current.setMatrixAt(i, dummy.matrix)
            }
        })

        meshRef.current.instanceMatrix.needsUpdate = true
    })

    if (!showTraffic) return null

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, PACKET_COUNT]}
        >
            <sphereGeometry args={[1, 8, 8]} />
            <meshBasicMaterial color="#4ade80" toneMapped={false} />
        </instancedMesh>
    )
}
