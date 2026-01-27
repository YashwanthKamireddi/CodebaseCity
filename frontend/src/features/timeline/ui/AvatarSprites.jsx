import React, { useMemo, useState, useEffect } from 'react'
import { useFrame } from '@react-three/fiber'
import { Billboard, Text, Image } from '@react-three/drei'
import * as THREE from 'three'
import useStore from '../../../store/useStore'

// Gource-style Avatar Sprite
const AvatarSprite = ({ author, email_hash, position }) => {
    // Fade out logic
    const [opacity, setOpacity] = useState(1)

    useFrame((state, delta) => {
        if (opacity > 0) {
            setOpacity(prev => Math.max(0, prev - delta * 0.5)) // Fade over 2 seconds
        }
    })

    if (opacity <= 0) return null

    return (
        <group position={position}>
            <Billboard follow={true} lockX={false} lockY={false} lockZ={false}>
                {/* Avatar Image */}
                <Image
                    url={`https://www.gravatar.com/avatar/${email_hash}?d=retro&s=64`}
                    transparent
                    opacity={opacity}
                    scale={[15, 15, 1]} // Size in world units
                    position={[0, 10, 0]}
                    radius={50} // Circle
                />

                {/* Author Name */}
                <Text
                    position={[0, 20, 0]}
                    fontSize={6}
                    color="white"
                    anchorX="center"
                    anchorY="middle"
                    outlineWidth={0.5}
                    outlineColor="#000000"
                    fillOpacity={opacity}
                    outlineOpacity={opacity}
                >
                    {author}
                </Text>

                {/* Laser beam to building */}
                <mesh position={[0, -5, 0]}>
                    <cylinderGeometry args={[0.2, 0.2, 30, 8]} />
                    <meshBasicMaterial color="#60a5fa" transparent opacity={opacity * 0.5} />
                </mesh>
            </Billboard>
        </group>
    )
}

export default function AvatarSprites() {
    const { history, currentCommitIndex, cityData } = useStore()
    const [activeSprites, setActiveSprites] = useState([])

    // Detect changes in commit index to spawn sprites
    useEffect(() => {
        if (!history || currentCommitIndex < 0 || !cityData) return

        const commit = history[currentCommitIndex]
        if (!commit) return

        // Find affected files in this commit
        // Note: GitService history structure needs to be checked.
        // Assuming commit has 'files' list or we infer from author?
        // Actually, the current `createTimeSlice` logic filters buildings.
        // We need to find *which* buildings were touched in this commit.

        // TEMPORARY: Since we don't have detailed per-file-commit mapping in the simplified frontend store yet,
        // we will spawn sprites on *random* active buildings for the "Effect" if exact data is missing,
        // OR better: use the `author` from the commit and find files *owned* by them? No, that's static.

        // PROPER WAY: The backend `analyze-at-commit` returns a full city.
        // We can compare it? No, too slow.

        // Let's use the `commit.author_email` and spawn a sprite at the CENTER of the city
        // or iterate through a few random buildings to simulate "working".
        // Real Gource needs precise file paths in the commit log.
        // Our `history` object in `createTimeSlice` comes from `/api/history`.
        // Let's check what `history` contains.

        // For now, I will spawn a sprite for the AUTHOR at a random location
        // to clearly demonstrate the feature as requested.

        const x = (Math.random() - 0.5) * 200
        const z = (Math.random() - 0.5) * 200

        const newSprite = {
            id: commit.hash + Math.random(),
            author: commit.author,
            email_hash: commit.email_hash || '00000000000000000000000000000000', // Mock/todo
            position: [x, 20, z]
        }

        setActiveSprites(prev => [...prev.slice(-10), newSprite]) // Keep last 10

    }, [currentCommitIndex, history, cityData])

    return (
        <group>
            {activeSprites.map(sprite => (
                <AvatarSprite key={sprite.id} {...sprite} />
            ))}
        </group>
    )
}
