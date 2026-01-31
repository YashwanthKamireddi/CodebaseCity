import { useRef, useCallback } from 'react'

export const useSound = () => {
    // Lazy initialize AudioContext
    const audioContextRef = useRef(null)

    const getContext = useCallback(() => {
        if (!audioContextRef.current) {
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)()
        }
        if (audioContextRef.current.state === 'suspended') {
            audioContextRef.current.resume()
        }
        return audioContextRef.current
    }, [])

    const playHover = useCallback(() => {
        const ctx = getContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // High-tech Chirp
        osc.type = 'sine'
        osc.frequency.setValueAtTime(800, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(1200, ctx.currentTime + 0.05)

        gain.gain.setValueAtTime(0.05, ctx.currentTime) // Very quiet
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.05)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start()
        osc.stop(ctx.currentTime + 0.05)
    }, [getContext])

    const playClick = useCallback(() => {
        const ctx = getContext()
        const osc = ctx.createOscillator()
        const gain = ctx.createGain()

        // Solid 'Lock-on' click
        osc.type = 'triangle'
        osc.frequency.setValueAtTime(400, ctx.currentTime)
        osc.frequency.exponentialRampToValueAtTime(100, ctx.currentTime + 0.1)

        gain.gain.setValueAtTime(0.1, ctx.currentTime)
        gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + 0.1)

        osc.connect(gain)
        gain.connect(ctx.destination)

        osc.start()
        osc.stop(ctx.currentTime + 0.1)
    }, [getContext])

    const playSuccess = useCallback(() => {
        const ctx = getContext()
        // Major Chord Arpeggio
        [440, 554, 659].forEach((freq, i) => {
            const osc = ctx.createOscillator()
            const gain = ctx.createGain()

            const start = ctx.currentTime + (i * 0.05)

            osc.frequency.value = freq
            osc.type = 'sine'

            gain.gain.setValueAtTime(0, start)
            gain.gain.linearRampToValueAtTime(0.05, start + 0.01)
            gain.gain.exponentialRampToValueAtTime(0.001, start + 0.3)

            osc.connect(gain)
            gain.connect(ctx.destination)

            osc.start(start)
            osc.stop(start + 0.3)
        })
    }, [getContext])

    return { playHover, playClick, playSuccess }
}
