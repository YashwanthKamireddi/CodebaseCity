/**
 * AdaptiveDPR — dynamic pixel-ratio throttling driven by real frame health.
 *
 * Wraps drei's PerformanceMonitor and uses its incline/decline signals to
 * gently adjust the WebGL renderer's pixel ratio. If frames consistently
 * dip below the fps window (45–60 by default), pixel ratio drops one step
 * (≈ 40 % fewer fragments). When frames are healthy again, it climbs back
 * up. All steps happen inside the Canvas — zero React re-renders.
 *
 * Mount inside <Canvas> as a sibling of your scene.
 */
import { useThree } from '@react-three/fiber'
import { PerformanceMonitor } from '@react-three/drei'
import { useRef, useEffect, useCallback } from 'react'

export default function AdaptiveDPR({ min = 0.8, max = 1.6, step = 0.15 }) {
    const { gl } = useThree()
    const currentRef = useRef(max)

    // Initialize to max on mount
    useEffect(() => {
        gl.setPixelRatio(Math.min(max, window.devicePixelRatio || 1))
        currentRef.current = gl.getPixelRatio()
    }, [gl, max])

    const adjust = useCallback((delta) => {
        const next = Math.max(min, Math.min(max, currentRef.current + delta))
        if (Math.abs(next - currentRef.current) < 0.01) return
        currentRef.current = next
        gl.setPixelRatio(next)
    }, [gl, min, max])

    return (
        <PerformanceMonitor
            bounds={() => [45, 60]}
            flipflops={3}
            onDecline={() => adjust(-step)}
            onIncline={() => adjust(+step)}
            onFallback={() => adjust(-step)}
        />
    )
}
