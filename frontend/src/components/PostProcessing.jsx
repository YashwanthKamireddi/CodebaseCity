/**
 * PostProcessing.jsx
 *
 * Minimal post-processing - only what adds value
 * Removed: chromatic aberration, heavy vignette, SSAO
 * Kept: subtle bloom for hotspot visibility
 */

import {
    EffectComposer,
    Bloom,
    SMAA
} from '@react-three/postprocessing'

export default function PostProcessing({ enabled = true }) {
    if (!enabled) return null

    return (
        <EffectComposer multisampling={0}>
            {/* SMAA for clean edges */}
            <SMAA />

            {/* Subtle bloom - makes hotspots and selections stand out */}
            <Bloom
                intensity={0.15} // Reduced from 0.3 for clarity
                luminanceThreshold={0.7}
                luminanceSmoothing={0.9}
                radius={0.4} // Reduced spread
            />
        </EffectComposer>
    )
}
