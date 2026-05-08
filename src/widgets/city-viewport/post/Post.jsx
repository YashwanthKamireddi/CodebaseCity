import React from 'react'
import {
    EffectComposer,
    SelectiveBloom,
    Vignette,
    N8AO,
} from '@react-three/postprocessing'

/**
 * Bloom layer — meshes with `mesh.layers.enable(BLOOM_LAYER)` set get
 * picked up by the SelectiveBloom pass. Default render still happens
 * on layer 0; the bloom layer is render-twice + composite.
 */
export const BLOOM_LAYER = 10

/**
 * Post — tier-gated postprocessing pipeline.
 *
 *   high  → N8AO + SelectiveBloom + Vignette
 *   mid   → Vignette only
 *   low   → null
 *
 * No tonemapping. ACES Filmic was desaturating the building palette;
 * the user explicitly wants the original vibrant colours preserved.
 * The PulseMaterial output already lives in [0,1] so there's no HDR
 * clipping to manage.
 */
export default function Post({ tier }) {
    if (tier === 'low') return null

    if (tier === 'mid') {
        return (
            <EffectComposer multisampling={0}>
                <Vignette eskil={false} offset={0.32} darkness={0.45} />
            </EffectComposer>
        )
    }

    // high tier
    return (
        <EffectComposer multisampling={0} disableNormalPass={false}>
            <N8AO
                halfRes
                aoRadius={14}
                distanceFalloff={0.6}
                intensity={1.4}
                quality="medium"
            />
            <SelectiveBloom
                selectionLayer={BLOOM_LAYER}
                intensity={0.7}
                luminanceThreshold={0.7}
                luminanceSmoothing={0.4}
                mipmapBlur
            />
            <Vignette eskil={false} offset={0.32} darkness={0.45} />
        </EffectComposer>
    )
}
