/**
 * LoadingScreen — AAA cinematic analysis screen.
 *
 * Layered frame:
 *   · Void gradient + perspective scan grid + scanline overlay
 *   · HUD corner brackets
 *   · Scan-reticle (rotating double ring) around a stage icon
 *   · Stage list with active highlight
 *   · Glowing progress rail with percentage
 *   · Mono status line below (ticker-style, changes per stage)
 */
import React from 'react'
import { createPortal } from 'react-dom'
import useStore from '../../store/useStore'

const STAGES = [
    { label: 'Scanning repository',   detail: 'Walking the tree · filtering source files' },
    { label: 'Parsing source',         detail: 'Tokenizing · reading AST nodes' },
    { label: 'Building graph',         detail: 'Resolving imports · computing edges' },
    { label: 'Detecting patterns',     detail: 'Community detection · dependency analysis' },
    { label: 'Generating layout',      detail: 'Spiral treemap · anti-collision passes' },
    { label: 'Finalizing city',        detail: 'Assembling districts · committing geometry' },
]

export default function LoadingScreen() {
    const analysisProgress = useStore(s => s.analysisProgress)
    const pct = Math.round(analysisProgress || 0)

    // Stage index from progress (0..STAGES.length-1)
    const stageIdx = Math.min(
        Math.floor((analysisProgress || 0) / (100 / STAGES.length)),
        STAGES.length - 1
    )
    const stage = STAGES[stageIdx]

    const progressWidth = analysisProgress > 0 ? analysisProgress : 6

    return createPortal(
        <div className="lz-root" role="status" aria-label="Analyzing repository">
            {/* Background layers */}
            <div className="lz-bg" />
            <div className="lz-grid" />
            <div className="lz-scanline" />

            {/* HUD brackets */}
            <div className="lz-bracket lz-bracket--tl" />
            <div className="lz-bracket lz-bracket--tr" />
            <div className="lz-bracket lz-bracket--bl" />
            <div className="lz-bracket lz-bracket--br" />

            {/* Top status strip */}
            <div className="lz-status-strip">
                <span className="lz-dot" />
                <span className="lz-status-label">Codebase City · Analysis in progress</span>
            </div>

            {/* Center content */}
            <div className="lz-center">
                {/* Reticle — two counter-rotating rings with a pulsing core */}
                <div className="lz-reticle">
                    <div className="lz-ring lz-ring--1" />
                    <div className="lz-ring lz-ring--2" />
                    <div className="lz-ring lz-ring--3" />
                    <div className="lz-core" />
                </div>

                <h1 className="lz-title">BUILDING YOUR CITY</h1>
                <p className="lz-stage-active">{stage.label}</p>
                <p className="lz-stage-detail">{stage.detail}</p>

                {/* Progress rail */}
                <div className="lz-rail">
                    <div className="lz-rail-fill" style={{ width: `${progressWidth}%` }}>
                        <div className="lz-rail-head" />
                    </div>
                    <div className="lz-rail-ticks">
                        {STAGES.map((_, i) => (
                            <span
                                key={i}
                                className={`lz-tick${i <= stageIdx ? ' lz-tick--done' : ''}`}
                                style={{ left: `${(i / (STAGES.length - 1)) * 100}%` }}
                            />
                        ))}
                    </div>
                </div>

                <div className="lz-pct-row">
                    <span className="lz-pct">{String(pct).padStart(3, '0')}%</span>
                    <span className="lz-pct-sep" />
                    <span className="lz-pct-label">STAGE {stageIdx + 1} / {STAGES.length}</span>
                </div>
            </div>

            {/* Bottom stage list */}
            <div className="lz-stagelist">
                {STAGES.map((s, i) => {
                    const state = i < stageIdx ? 'done' : i === stageIdx ? 'active' : 'pending'
                    return (
                        <div key={i} className={`lz-stagerow lz-stagerow--${state}`}>
                            <span className="lz-stagerow-marker" />
                            <span className="lz-stagerow-label">{s.label}</span>
                        </div>
                    )
                })}
            </div>

            <style>{`
                .lz-root {
                    position: fixed; inset: 0;
                    z-index: 999999;
                    display: flex; align-items: center; justify-content: center;
                    overflow: hidden;
                    font-family: 'Inter', -apple-system, sans-serif;
                    color: #e4ecf4;
                    user-select: none;
                }
                .lz-bg {
                    position: absolute; inset: 0;
                    background:
                        radial-gradient(ellipse 70% 55% at 50% 60%, rgba(0, 60, 90, 0.35) 0%, transparent 60%),
                        radial-gradient(ellipse 80% 60% at 50% 50%, rgba(3, 8, 18, 0.92) 0%, rgba(0, 0, 0, 1) 100%);
                }
                .lz-grid {
                    position: absolute; bottom: 0; left: -25%; right: -25%;
                    height: 55%;
                    background-image:
                        linear-gradient(rgba(0, 200, 255, 0.08) 1px, transparent 1px),
                        linear-gradient(90deg, rgba(0, 200, 255, 0.08) 1px, transparent 1px);
                    background-size: 50px 50px;
                    transform: perspective(500px) rotateX(62deg);
                    transform-origin: center top;
                    mask-image: linear-gradient(to top, rgba(0,0,0,0.8), transparent 75%);
                    -webkit-mask-image: linear-gradient(to top, rgba(0,0,0,0.8), transparent 75%);
                    animation: lz-grid-scroll 6s linear infinite;
                }
                @keyframes lz-grid-scroll { 100% { background-position: 0 50px; } }
                .lz-scanline {
                    position: absolute; inset: 0; pointer-events: none;
                    background: repeating-linear-gradient(
                        0deg,
                        transparent 0, transparent 2px,
                        rgba(255,255,255,0.015) 2px, rgba(255,255,255,0.015) 3px
                    );
                    mix-blend-mode: overlay;
                }

                /* Corner brackets */
                .lz-bracket {
                    position: absolute; width: 42px; height: 42px;
                    border-color: rgba(0, 220, 255, 0.55);
                    border-style: solid; border-width: 0;
                    pointer-events: none;
                }
                .lz-bracket--tl { top: 28px; left: 28px; border-top-width: 2px; border-left-width: 2px; }
                .lz-bracket--tr { top: 28px; right: 28px; border-top-width: 2px; border-right-width: 2px; }
                .lz-bracket--bl { bottom: 28px; left: 28px; border-bottom-width: 2px; border-left-width: 2px; }
                .lz-bracket--br { bottom: 28px; right: 28px; border-bottom-width: 2px; border-right-width: 2px; }

                /* Top status strip */
                .lz-status-strip {
                    position: absolute; top: 40px; left: 50%;
                    transform: translateX(-50%);
                    display: flex; align-items: center; gap: 10px;
                    padding: 6px 16px 6px 12px;
                    background: rgba(0, 30, 50, 0.55);
                    border: 1px solid rgba(0, 220, 255, 0.22);
                    border-radius: 40px;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 11px; letter-spacing: 0.18em;
                    text-transform: uppercase;
                    color: rgba(255,255,255,0.75);
                }
                .lz-dot {
                    width: 7px; height: 7px; border-radius: 50%;
                    background: #00ffcc;
                    box-shadow: 0 0 8px #00ffcc, 0 0 16px rgba(0,255,204,0.6);
                    animation: lz-pulse 2s ease-in-out infinite;
                }
                @keyframes lz-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.45; transform: scale(0.85); }
                }

                /* Center */
                .lz-center {
                    position: relative; z-index: 2;
                    display: flex; flex-direction: column; align-items: center;
                    text-align: center;
                    max-width: 520px; padding: 0 32px;
                }

                /* Reticle */
                .lz-reticle {
                    position: relative;
                    width: 128px; height: 128px;
                    margin-bottom: 28px;
                    display: flex; align-items: center; justify-content: center;
                }
                .lz-ring {
                    position: absolute; inset: 0;
                    border-radius: 50%;
                    border-style: solid;
                    pointer-events: none;
                }
                .lz-ring--1 {
                    border: 1px dashed rgba(0, 220, 255, 0.55);
                    animation: lz-spin 8s linear infinite;
                }
                .lz-ring--2 {
                    inset: 16px;
                    border: 2px solid rgba(0, 220, 255, 0.25);
                    border-top-color: #00ffcc;
                    animation: lz-spin 1.6s linear infinite reverse;
                }
                .lz-ring--3 {
                    inset: 32px;
                    border: 1px solid rgba(0, 255, 204, 0.4);
                    border-left-color: #00ffcc;
                    border-right-color: transparent;
                    animation: lz-spin 3s linear infinite;
                }
                @keyframes lz-spin { 100% { transform: rotate(360deg); } }
                .lz-core {
                    width: 24px; height: 24px; border-radius: 50%;
                    background: radial-gradient(circle, #ffffff 0%, #00ffcc 45%, transparent 75%);
                    box-shadow: 0 0 24px rgba(0,255,204,0.75), 0 0 48px rgba(0,255,204,0.35);
                    animation: lz-core-pulse 1.8s ease-in-out infinite;
                }
                @keyframes lz-core-pulse {
                    0%, 100% { transform: scale(1); opacity: 1; }
                    50% { transform: scale(0.75); opacity: 0.7; }
                }

                /* Title + stage */
                .lz-title {
                    margin: 0 0 10px;
                    font-size: clamp(1.8rem, 4vw, 2.6rem);
                    font-weight: 800;
                    letter-spacing: 0.12em;
                    background: linear-gradient(135deg, #ffffff 0%, #7fffe6 50%, #00ffcc 100%);
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    color: transparent;
                    filter: drop-shadow(0 0 40px rgba(0, 255, 204, 0.25));
                }
                .lz-stage-active {
                    margin: 0 0 2px;
                    font-size: 0.95rem;
                    font-weight: 600;
                    color: #c8e9f5;
                    letter-spacing: 0.02em;
                }
                .lz-stage-detail {
                    margin: 0 0 26px;
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 11px;
                    color: rgba(255,255,255,0.46);
                    letter-spacing: 0.06em;
                }

                /* Progress rail */
                .lz-rail {
                    position: relative;
                    width: 100%;
                    height: 4px;
                    background: rgba(0, 220, 255, 0.08);
                    border-radius: 2px;
                    overflow: visible;
                }
                .lz-rail-fill {
                    position: relative;
                    height: 100%;
                    background: linear-gradient(90deg, #0077aa, #00ffcc);
                    border-radius: 2px;
                    box-shadow: 0 0 16px rgba(0, 255, 204, 0.55), 0 0 4px rgba(0, 255, 204, 0.9);
                    transition: width 0.3s cubic-bezier(0.22, 1, 0.36, 1);
                }
                .lz-rail-head {
                    position: absolute; right: -6px; top: 50%;
                    transform: translateY(-50%);
                    width: 12px; height: 12px;
                    border-radius: 50%;
                    background: #00ffcc;
                    box-shadow: 0 0 12px rgba(0,255,204,0.9), 0 0 24px rgba(0,255,204,0.5);
                }
                .lz-rail-ticks {
                    position: absolute; inset: 0;
                    pointer-events: none;
                }
                .lz-tick {
                    position: absolute; top: 50%;
                    transform: translate(-50%, -50%);
                    width: 2px; height: 10px;
                    background: rgba(255, 255, 255, 0.15);
                    border-radius: 1px;
                }
                .lz-tick--done { background: rgba(0, 255, 204, 0.9); box-shadow: 0 0 6px rgba(0,255,204,0.6); }

                /* Percentage row */
                .lz-pct-row {
                    display: flex; align-items: center; gap: 12px;
                    margin-top: 20px;
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    letter-spacing: 0.12em;
                }
                .lz-pct {
                    font-size: 1.4rem; font-weight: 700;
                    color: #00ffcc;
                    text-shadow: 0 0 12px rgba(0,255,204,0.55);
                }
                .lz-pct-sep {
                    width: 28px; height: 1px;
                    background: rgba(255,255,255,0.2);
                }
                .lz-pct-label {
                    font-size: 10px;
                    color: rgba(255,255,255,0.5);
                }

                /* Bottom stage list */
                .lz-stagelist {
                    position: absolute; bottom: 60px; left: 50%;
                    transform: translateX(-50%);
                    display: flex; gap: 18px;
                    padding: 10px 18px;
                    background: rgba(0, 30, 50, 0.35);
                    border: 1px solid rgba(0, 220, 255, 0.15);
                    border-radius: 14px;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    font-family: 'JetBrains Mono', ui-monospace, monospace;
                    font-size: 10.5px; letter-spacing: 0.06em;
                    flex-wrap: wrap;
                    justify-content: center;
                    max-width: 90vw;
                }
                .lz-stagerow {
                    display: flex; align-items: center; gap: 7px;
                    color: rgba(255,255,255,0.28);
                    transition: color 0.3s ease;
                    white-space: nowrap;
                }
                .lz-stagerow-marker {
                    width: 6px; height: 6px; border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                    transition: background 0.3s ease, box-shadow 0.3s ease, transform 0.3s ease;
                }
                .lz-stagerow--done { color: rgba(0, 255, 204, 0.75); }
                .lz-stagerow--done .lz-stagerow-marker {
                    background: #00ffcc;
                    box-shadow: 0 0 8px rgba(0,255,204,0.6);
                }
                .lz-stagerow--active { color: #ffffff; }
                .lz-stagerow--active .lz-stagerow-marker {
                    background: #ffffff;
                    box-shadow: 0 0 10px #ffffff, 0 0 18px rgba(0,255,204,0.8);
                    transform: scale(1.35);
                }
                .lz-stagerow--active .lz-stagerow-label {
                    font-weight: 600;
                }

                @media (max-width: 640px) {
                    .lz-stagelist { bottom: 32px; gap: 10px; font-size: 9.5px; padding: 8px 14px; }
                    .lz-reticle { width: 100px; height: 100px; }
                    .lz-title { font-size: 1.5rem; }
                }
            `}</style>
        </div>,
        document.body
    )
}
