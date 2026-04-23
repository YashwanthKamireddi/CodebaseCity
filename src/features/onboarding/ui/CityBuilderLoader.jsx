/**
 * CityBuilderLoader — cinematic loading screen.
 *
 * Design language: single focal point, deep-space backdrop, one animated
 * orb, one progress rail. No noise, no fun facts, no fake counters.
 * Apple-level restraint; every element earns its place.
 */
import React, { useEffect, useState, useRef } from 'react'
import useStore from '../../../store/useStore'

const STAGES = [
    { from: 0,  label: 'Initializing' },
    { from: 8,  label: 'Reading files' },
    { from: 25, label: 'Parsing source' },
    { from: 45, label: 'Building graph' },
    { from: 65, label: 'Laying out districts' },
    { from: 85, label: 'Finalizing scene' },
    { from: 99, label: 'Ready' },
]

export default function CityBuilderLoader() {
    const real = useStore(s => s.analysisProgress) || 0
    const [sim, setSim] = useState(0)
    const [elapsed, setElapsed] = useState(0)
    const started = useRef(Date.now())

    // Simulated progress so the bar keeps moving even when the backend pauses.
    // Always lags behind `real`; catches up as real advances.
    useEffect(() => {
        if (real >= 99) return
        const t = setInterval(() => {
            setSim(p => Math.min(Math.max(real, p) + (p > 70 ? 0.2 : p > 40 ? 0.5 : 0.9), 95))
        }, 250)
        return () => clearInterval(t)
    }, [real])

    useEffect(() => {
        const t = setInterval(() => {
            setElapsed(Math.floor((Date.now() - started.current) / 1000))
        }, 1000)
        return () => clearInterval(t)
    }, [])

    const shown = Math.max(real, sim)
    const stage = [...STAGES].reverse().find(s => shown >= s.from) || STAGES[0]
    const seconds = elapsed % 60
    const minutes = Math.floor(elapsed / 60)
    const timeText = minutes > 0 ? `${minutes}m ${seconds}s` : `${seconds}s`

    return (
        <div className="cbl-root">
            {/* Backdrop — deep radial, extremely soft */}
            <div className="cbl-bg" />
            <div className="cbl-grid" />

            <div className="cbl-stage">
                {/* Orb — the only moving element */}
                <div className="cbl-orb-wrap">
                    <div className="cbl-orb cbl-orb--outer" />
                    <div className="cbl-orb cbl-orb--mid" />
                    <div className="cbl-orb cbl-orb--core" />
                </div>

                {/* Title + stage */}
                <div className="cbl-text">
                    <h1 className="cbl-title">Building your city</h1>
                    <p className="cbl-stage-label" aria-live="polite">{stage.label}</p>
                </div>

                {/* Progress rail */}
                <div className="cbl-rail">
                    <div className="cbl-rail-fill" style={{ width: `${Math.round(shown)}%` }} />
                </div>

                {/* Meta row — percent + elapsed, mono, muted */}
                <div className="cbl-meta">
                    <span>{Math.round(shown)}%</span>
                    <span className="cbl-meta-sep" />
                    <span>{timeText}</span>
                </div>
            </div>

            <style>{`
                .cbl-root {
                    position: fixed;
                    inset: 0;
                    z-index: 99999;
                    background: #000000;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                    overflow: hidden;
                    font-family: var(--font-body, -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif);
                    color: #ffffff;
                    animation: cbl-in 0.5s cubic-bezier(0.22, 1, 0.36, 1) both;
                }
                @keyframes cbl-in { from { opacity: 0 } to { opacity: 1 } }

                .cbl-bg {
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse 60% 50% at 50% 50%, rgba(30, 50, 120, 0.25) 0%, transparent 60%),
                        radial-gradient(ellipse 100% 100% at 50% 100%, rgba(12, 18, 40, 0.5) 0%, transparent 70%),
                        #000000;
                }
                .cbl-grid {
                    position: absolute; inset: 0;
                    background-image:
                        linear-gradient(rgba(255,255,255,0.025) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(255,255,255,0.025) 1px, transparent 1px);
                    background-size: 60px 60px;
                    mask-image: radial-gradient(ellipse 70% 50% at 50% 50%, black 0%, transparent 70%);
                    -webkit-mask-image: radial-gradient(ellipse 70% 50% at 50% 50%, black 0%, transparent 70%);
                    opacity: 0.6;
                }

                .cbl-stage {
                    position: relative;
                    z-index: 2;
                    display: flex;
                    flex-direction: column;
                    align-items: center;
                    gap: 40px;
                    width: 100%;
                    max-width: 360px;
                    padding: 40px 24px;
                }

                /* ── Orb ── */
                .cbl-orb-wrap {
                    position: relative;
                    width: 120px;
                    height: 120px;
                    display: flex;
                    align-items: center;
                    justify-content: center;
                }
                .cbl-orb {
                    position: absolute;
                    border-radius: 50%;
                }
                .cbl-orb--outer {
                    inset: 0;
                    border: 1px solid rgba(255, 255, 255, 0.08);
                    animation: cbl-outer-pulse 3.5s ease-in-out infinite;
                }
                .cbl-orb--mid {
                    inset: 20px;
                    background: radial-gradient(
                        circle,
                        rgba(100, 140, 255, 0.25) 0%,
                        rgba(100, 140, 255, 0.05) 60%,
                        transparent 100%
                    );
                    animation: cbl-mid-pulse 2.2s ease-in-out infinite;
                }
                .cbl-orb--core {
                    width: 14px; height: 14px;
                    background: radial-gradient(circle, #ffffff 0%, #7faaff 40%, transparent 100%);
                    box-shadow:
                        0 0 20px rgba(127, 170, 255, 0.8),
                        0 0 50px rgba(127, 170, 255, 0.4);
                    animation: cbl-core-pulse 1.6s ease-in-out infinite;
                }
                @keyframes cbl-outer-pulse {
                    0%, 100% { transform: scale(1); opacity: 0.5; }
                    50%      { transform: scale(1.08); opacity: 0.9; }
                }
                @keyframes cbl-mid-pulse {
                    0%, 100% { transform: scale(0.9); opacity: 0.7; }
                    50%      { transform: scale(1.1); opacity: 1; }
                }
                @keyframes cbl-core-pulse {
                    0%, 100% { transform: scale(1); }
                    50%      { transform: scale(1.4); }
                }

                /* ── Text ── */
                .cbl-text {
                    text-align: center;
                    display: flex;
                    flex-direction: column;
                    gap: 6px;
                }
                .cbl-title {
                    margin: 0;
                    font-size: 1.1rem;
                    font-weight: 500;
                    letter-spacing: -0.01em;
                    color: rgba(255, 255, 255, 0.95);
                }
                .cbl-stage-label {
                    margin: 0;
                    font-size: 0.8rem;
                    font-weight: 400;
                    color: rgba(255, 255, 255, 0.5);
                    letter-spacing: 0.01em;
                    min-height: 1.2em;
                    transition: opacity 0.3s ease;
                }

                /* ── Progress rail ── */
                .cbl-rail {
                    width: 100%;
                    height: 2px;
                    background: rgba(255, 255, 255, 0.08);
                    border-radius: 2px;
                    overflow: hidden;
                    position: relative;
                }
                .cbl-rail-fill {
                    height: 100%;
                    background: linear-gradient(90deg,
                        rgba(127, 170, 255, 0.8) 0%,
                        #ffffff 100%
                    );
                    border-radius: 2px;
                    transition: width 0.25s cubic-bezier(0.22, 1, 0.36, 1);
                    box-shadow: 0 0 12px rgba(127, 170, 255, 0.5);
                }

                /* ── Meta ── */
                .cbl-meta {
                    display: flex;
                    align-items: center;
                    gap: 12px;
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 0.7rem;
                    color: rgba(255, 255, 255, 0.4);
                    letter-spacing: 0.04em;
                    font-variant-numeric: tabular-nums;
                }
                .cbl-meta-sep {
                    width: 3px; height: 3px;
                    border-radius: 50%;
                    background: rgba(255, 255, 255, 0.25);
                }

                @media (prefers-reduced-motion: reduce) {
                    .cbl-orb--outer, .cbl-orb--mid, .cbl-orb--core {
                        animation: none !important;
                    }
                }
            `}</style>
        </div>
    )
}
