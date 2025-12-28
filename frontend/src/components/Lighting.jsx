import React from 'react'

function Lighting() {
    return (
        <>
            {/* Ambient light for base visibility */}
            <ambientLight intensity={0.3} color="#6080a0" />

            {/* Main directional light (sun) */}
            <directionalLight
                position={[50, 100, 50]}
                intensity={1}
                color="#ffffff"
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
                shadow-camera-far={300}
                shadow-camera-left={-150}
                shadow-camera-right={150}
                shadow-camera-top={150}
                shadow-camera-bottom={-150}
            />

            {/* Fill light from opposite side */}
            <directionalLight
                position={[-30, 50, -30]}
                intensity={0.4}
                color="#4080c0"
            />

            {/* Rim light from behind */}
            <directionalLight
                position={[0, 30, -80]}
                intensity={0.3}
                color="#00d4ff"
            />

            {/* Ground bounce light */}
            <hemisphereLight
                color="#87CEEB"
                groundColor="#0a0a0f"
                intensity={0.4}
            />

            {/* Point light at city center for emphasis */}
            <pointLight
                position={[0, 20, 0]}
                intensity={0.5}
                color="#00d4ff"
                distance={100}
                decay={2}
            />
        </>
    )
}

export default Lighting
