import React, { useMemo, useRef } from 'react'
import { useFrame } from '@react-three/fiber'
import * as THREE from 'three'
import useStore from '../../../../store/useStore'

const PACKET_COUNT = 250 // Increased density
const BASE_SPEED = 2.0
const COLORS = [
    new THREE.Color('#22d3ee'), // Cyan
    new THREE.Color('#34d399'), // Emerald
    new THREE.Color('#f472b6'), // Pink
    new THREE.Color('#818cf8'), // Indigo
]

export default function TrafficLayer() {
    const { cityData, showTraffic } = useStore()
    const meshRef = useRef()

    // Position Lookup Map
    const buildingMap = useMemo(() => {
        if (!cityData?.buildings) return new Map()
        const map = new Map()
        cityData.buildings.forEach(b => {
            const h = (b.dimensions?.height || 10)
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
            speed: 1,
            colorIndex: 0,
            start: new THREE.Vector3(),
            end: new THREE.Vector3(),
            mid: new THREE.Vector3(),
        }))
    }, [])

    const dummy = useMemo(() => new THREE.Object3D(), [])

    useFrame((state, delta) => {
        if (!meshRef.current || !showTraffic || !cityData?.roads?.length) {
            if (meshRef.current) {
                meshRef.current.visible = false
            }
            return
        }
        meshRef.current.visible = true

        // 1. Spawn Logic
        for (let i = 0; i < 3; i++) {
            if (Math.random() > 0.85) {
                const idlePacket = packets.current.find(p => !p.active)
                if (idlePacket) {
                    const road = cityData.roads[Math.floor(Math.random() * cityData.roads.length)]
                    const startPos = buildingMap.get(road.source)
                    const endPos = buildingMap.get(road.target)

                    if (startPos && endPos) {
                        idlePacket.active = true
                        idlePacket.progress = 0
                        idlePacket.speed = BASE_SPEED * (0.8 + Math.random() * 0.4)
                        idlePacket.colorIndex = Math.floor(Math.random() * COLORS.length)
                        idlePacket.start.copy(startPos)
                        idlePacket.end.copy(endPos)

                        idlePacket.mid.copy(startPos).lerp(endPos, 0.5)
                        const dist = startPos.distanceTo(endPos)
                        idlePacket.mid.y += Math.min(dist * 0.3, 30) // Arch
                    }
                }
            }
        }

        // 2. Update Instanced Positions
        packets.current.forEach((packet, i) => {
            if (packet.active) {
                packet.progress += packet.speed * delta

                if (packet.progress >= 1) {
                    packet.active = false
                    dummy.position.set(0, -1000, 0)
                } else {
                    const t = packet.progress
                    // Quadratic Bezier
                    const pos = new THREE.Vector3()
                    pos.x = (1 - t) * (1 - t) * packet.start.x + 2 * (1 - t) * t * packet.mid.x + t * t * packet.end.x
                    pos.y = (1 - t) * (1 - t) * packet.start.y + 2 * (1 - t) * t * packet.mid.y + t * t * packet.end.y
                    pos.z = (1 - t) * (1 - t) * packet.start.z + 2 * (1 - t) * t * packet.mid.z + t * t * packet.end.z

                    dummy.position.copy(pos)

                    // Look toward destination
                    dummy.lookAt(packet.end)

                    // Stretching effect "data slug"
                    const scale = Math.sin(t * Math.PI)
                    dummy.scale.set(0.15 * scale, 0.15 * scale, 1.2 * scale)

                    dummy.updateMatrix()
                    meshRef.current.setMatrixAt(i, dummy.matrix)
                    meshRef.current.setColorAt(i, COLORS[packet.colorIndex])
                }
            } else {
                dummy.position.set(0, -1000, 0)
                dummy.updateMatrix()
                meshRef.current.setMatrixAt(i, dummy.matrix)
            }
        })

        meshRef.current.instanceMatrix.needsUpdate = true
        if (meshRef.current.instanceColor) meshRef.current.instanceColor.needsUpdate = true
    })

    return (
        <instancedMesh
            ref={meshRef}
            args={[null, null, PACKET_COUNT]}
            frustumCulled={false}
        >
            <boxGeometry args={[1, 1, 1]} />
            <meshBasicMaterial toneMapped={false} />
        </instancedMesh>
    )
}
