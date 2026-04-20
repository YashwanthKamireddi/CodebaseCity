/**
 * Device performance tier detection.
 *
 * One-shot computation at app start. We intentionally read multiple signals
 * instead of trusting any single one:
 *   · navigator.deviceMemory — coarse "GB of RAM" bucket (not always available)
 *   · navigator.hardwareConcurrency — CPU cores (proxy for overall HW age)
 *   · touch + narrow screen — phone class
 *   · WebGL max texture size — probe the GPU capability
 *
 * Tiers:
 *   'low'  → ≤2 GB RAM, or ≤2 cores, or tiny GPU. Old laptops, entry phones.
 *            Drop most decorations. Simplify sky + stars. Conservative DPR.
 *   'mid'  → typical laptop / modern phone. Most decorations kept but trimmed.
 *   'high' → desktop / gaming laptop / high-end workstation. Full fidelity.
 */

function probeGpu() {
    if (typeof document === 'undefined') return 'unknown'
    try {
        const canvas = document.createElement('canvas')
        const gl = canvas.getContext('webgl2') || canvas.getContext('webgl')
        if (!gl) return 'none'
        const debugInfo = gl.getExtension('WEBGL_debug_renderer_info')
        const renderer = debugInfo ? gl.getParameter(debugInfo.UNMASKED_RENDERER_WEBGL) : ''
        const maxTex = gl.getParameter(gl.MAX_TEXTURE_SIZE) || 0
        return { renderer: String(renderer).toLowerCase(), maxTex }
    } catch {
        return { renderer: '', maxTex: 0 }
    }
}

let _cached = null

export function detectDeviceTier() {
    if (_cached) return _cached
    if (typeof navigator === 'undefined') {
        _cached = { tier: 'mid', isLowEnd: false, isMobile: false, ram: null, cores: null, gpu: null }
        return _cached
    }

    const ram = navigator.deviceMemory || null        // GB, granular: 0.25, 0.5, 1, 2, 4, 8
    const cores = navigator.hardwareConcurrency || 4
    const touch = navigator.maxTouchPoints > 0
    const narrow = typeof window !== 'undefined' && window.innerWidth <= 768
    const isMobile = touch && narrow
    const gpu = probeGpu()

    // GPU hint: common integrated/low-end keywords
    const integratedGpu = typeof gpu.renderer === 'string' && (
        gpu.renderer.includes('intel') ||
        gpu.renderer.includes('swiftshader') ||
        gpu.renderer.includes('mesa') ||
        gpu.renderer.includes('adreno 5') ||  // mid-range Android
        gpu.renderer.includes('mali-g5') ||
        gpu.renderer.includes('powervr')
    )

    // Low-end triggers (ANY of these):
    //   - deviceMemory ≤ 2 GB
    //   - cores ≤ 2
    //   - mobile + cores ≤ 4
    //   - GPU probe failed (browser refused WebGL)
    //   - max texture size < 4096
    const lowSignals =
        (ram != null && ram <= 2) ||
        cores <= 2 ||
        (isMobile && cores <= 4) ||
        gpu === 'none' ||
        (gpu.maxTex > 0 && gpu.maxTex < 4096)

    // High-end triggers (ALL must hold):
    //   - cores ≥ 8
    //   - RAM ≥ 8 (if reported) or unknown
    //   - not mobile
    //   - not integrated GPU
    const highSignals =
        cores >= 8 &&
        (ram == null || ram >= 8) &&
        !isMobile &&
        !integratedGpu

    const tier = lowSignals ? 'low' : highSignals ? 'high' : 'mid'

    _cached = {
        tier,
        isLowEnd: tier === 'low',
        isMobile,
        ram,
        cores,
        gpu: gpu === 'none' ? null : gpu,
    }
    return _cached
}

/** True when tier is 'low' OR 'mid'. Use for decoration gating. */
export function isModestDevice() {
    const { tier } = detectDeviceTier()
    return tier !== 'high'
}
