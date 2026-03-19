/**
 * EmptyCityHero.jsx
 *
 * Landing overlay — minimalist, editorial design.
 * Renders over the live 3D demo city with a clean vignette.
 * No scanlines, no cyan, no gimmicks — just typography and clarity.
 */
import React, { useEffect, useState } from 'react'
import { FolderOpen, ArrowRight, Github, KeyRound } from 'lucide-react'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'

export default function EmptyCityHero() {
    const analyzeLocal = useStore(s => s.analyzeLocal)
    const analyzeRepo = useStore(s => s.analyzeRepo)
    const error = useStore(s => s.error)
    const setCityData = useStore(s => s.setCityData)
    const cityData = useStore(s => s.cityData)
    const isLandingOverlayActive = useStore(s => s.isLandingOverlayActive)
    const setLandingOverlayActive = useStore(s => s.setLandingOverlayActive)
    const githubToken = useStore(s => s.githubToken)
    const setGithubToken = useStore(s => s.setGithubToken)
    const [repoUrl, setRepoUrl] = useState('')
    const [showGithubInput, setShowGithubInput] = useState(false)
    const [showTokenInput, setShowTokenInput] = useState(false)
    const [tokenDraft, setTokenDraft] = useState(githubToken || '')

    useEffect(() => {
        if (!cityData) {
            fetch('/demo-city.json')
                .then(res => res.json())
                .then(data => { setCityData(data) })
                .catch(err => logger.error("Failed to load demo city", err))
        }
    }, [])

    const handleExploreDemoCity = () => setLandingOverlayActive(false)
    const handleAnalyzeRepo = () => { if (repoUrl.trim()) analyzeRepo(repoUrl.trim()) }
    const handleKeyDown = (e) => { if (e.key === 'Enter') handleAnalyzeRepo() }

    if (!isLandingOverlayActive) return null

    return (
        <div
            className="lp-root anim-fade-in"
        >
            {/* Vignette — clean radial, dark edges */}
            <div className="lp-vignette" />

            {/* Top bar */}
            <header
                className="lp-topbar anim-slide-down"
            >
                <span className="lp-wordmark">Codebase City</span>
                <span className="lp-ver">v2.0</span>
            </header>

            {/* Center content */}
            <div className="lp-center">
                <p
                    className="lp-kicker anim-slide-up"
                >
                    3D Codebase Visualization
                </p>

                <h1
                    className="lp-heading anim-slide-up"
                >
                    See your codebase<br />as a living city
                </h1>

                <p
                    className="lp-desc anim-slide-up"
                >
                    Architecture maps, complexity heat, git history —<br />
                    everything in one interactive 3D view.
                </p>

                <div
                    className="lp-cta anim-slide-up"
                >
                    <button onClick={analyzeLocal} className="lp-btn lp-btn--solid">
                        <FolderOpen size={14} />
                        Open Folder
                        <ArrowRight size={12} className="lp-arrow" />
                    </button>
                    <button onClick={() => setShowGithubInput(v => !v)} className="lp-btn lp-btn--outline">
                        <Github size={14} />
                        GitHub Repo
                    </button>
                    <button onClick={handleExploreDemoCity} className="lp-btn lp-btn--text">
                        Explore Demo
                    </button>
                </div>

                {showGithubInput && (
                        <div
                            className="lp-gh-wrap anim-slide-up"
                        >
                            <div className="lp-gh-row">
                                <Github size={13} className="lp-gh-icon" />
                                <input
                                    type="text"
                                    value={repoUrl}
                                    onChange={e => setRepoUrl(e.target.value)}
                                    onKeyDown={handleKeyDown}
                                    placeholder="owner/repo or full URL"
                                    className="lp-gh-input"
                                    autoFocus
                                />
                                <button
                                    onClick={handleAnalyzeRepo}
                                    disabled={!repoUrl.trim()}
                                    className="lp-gh-go"
                                >
                                    <ArrowRight size={13} />
                                </button>
                            </div>
                            <p className="lp-gh-hint">Any public repository</p>
                            <button
                                onClick={() => setShowTokenInput(v => !v)}
                                className="lp-token-toggle"
                            >
                                <KeyRound size={11} />
                                {githubToken ? 'Token set — 5 000 req/hr' : 'Add token for 5 000 req/hr'}
                            </button>
                            {showTokenInput && (
                                    <div
                                        className="lp-token-wrap anim-fade-in"
                                    >
                                        <div className="lp-gh-row">
                                            <KeyRound size={13} className="lp-gh-icon" />
                                            <input
                                                type="password"
                                                value={tokenDraft}
                                                onChange={e => setTokenDraft(e.target.value)}
                                                onKeyDown={e => {
                                                    if (e.key === 'Enter') {
                                                        setGithubToken(tokenDraft.trim())
                                                        setShowTokenInput(false)
                                                    }
                                                }}
                                                placeholder="ghp_... (personal access token)"
                                                className="lp-gh-input"
                                            />
                                            <button
                                                onClick={() => {
                                                    setGithubToken(tokenDraft.trim())
                                                    setShowTokenInput(false)
                                                }}
                                                className="lp-gh-go"
                                            >
                                                {tokenDraft.trim() ? '✓' : '✕'}
                                            </button>
                                        </div>
                                        <p className="lp-gh-hint">
                                            Optional. Create at{' '}
                                            <a href="https://github.com/settings/tokens" target="_blank" rel="noopener noreferrer" className="lp-link">
                                                github.com/settings/tokens
                                            </a>
                                            {' '}— no scopes needed for public repos. Stored locally only.
                                        </p>
                                    </div>
                                )}
                        </div>
                    )}

                {error && (
                        <p className="lp-err anim-fade-in">{error}</p>
                    )}
            </div>



            <style>{`
                .lp-root {
                    position: absolute; inset: 0; z-index: 50;
                    display: flex; flex-direction: column;
                    align-items: center; justify-content: center;
                    pointer-events: none;
                }

                .lp-vignette {
                    position: absolute; inset: 0; pointer-events: none;
                    background:
                        radial-gradient(ellipse 80% 60% at 50% 50%,
                            rgba(3,5,10,0.56) 0%,
                            rgba(4,6,12,0.78) 45%,
                            rgba(0,0,0,0.93) 100%
                        );
                }

                /* ── Topbar ─── */
                .lp-topbar {
                    position: absolute; top: 0; left: 0; right: 0;
                    padding: 24px 32px;
                    display: flex; align-items: center; justify-content: space-between;
                    pointer-events: auto;
                }
                .lp-wordmark {
                    font-size: 0.85rem; font-weight: 600;
                    letter-spacing: 0.08em; text-transform: uppercase;
                    color: rgba(255,255,255,0.9);
                    font-family: var(--font-display);
                }
                .lp-ver {
                    font-size: 0.65rem; font-family: var(--font-mono);
                    color: rgba(255,255,255,0.35); letter-spacing: 0.05em;
                    padding: 3px 8px;
                    background: rgba(255,255,255,0.06);
                    border-radius: 4px;
                }

                /* ── Center ─── */
                .lp-center {
                    position: relative; z-index: 2;
                    pointer-events: auto;
                    display: flex; flex-direction: column;
                    align-items: center; text-align: center;
                    max-width: 680px; padding: 40px 32px;
                }

                .lp-kicker {
                    margin: 0 0 20px;
                    font-size: 0.7rem; font-family: var(--font-mono);
                    text-transform: uppercase; letter-spacing: 0.2em;
                    color: rgba(255,255,255,0.76); font-weight: 600;
                    padding: 6px 14px;
                    background: rgba(255,255,255,0.1);
                    border: 1px solid rgba(255,255,255,0.14);
                    border-radius: 20px;
                }

                .lp-heading {
                    margin: 0 0 24px;
                    font-family: var(--font-display);
                    font-size: clamp(2.6rem, 6vw, 4.5rem);
                    font-weight: 700;
                    line-height: 1.08;
                    letter-spacing: -0.03em;
                    color: #ffffff;
                    text-shadow:
                        0 2px 20px rgba(0,0,0,0.8),
                        0 4px 40px rgba(0,0,0,0.6);
                }

                .lp-desc {
                    margin: 0 0 36px;
                    font-size: 1rem; line-height: 1.7;
                    color: rgba(255,255,255,0.82);
                    font-weight: 400;
                    text-shadow: 0 2px 14px rgba(0,0,0,0.55);
                    max-width: 480px;
                }

                /* ── CTAs - MNC Grade Premium Buttons ─── */
                .lp-cta {
                    display: flex; gap: 12px; flex-wrap: wrap;
                    justify-content: center;
                }
                .lp-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 12px 24px; border-radius: 8px;
                    font-size: 0.875rem; font-weight: 500;
                    font-family: var(--font-body);
                    cursor: pointer; white-space: nowrap;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    border: none;
                    text-decoration: none;
                }
                .lp-btn--solid {
                    background: #ffffff;
                    color: #0a0a0a;
                    font-weight: 600;
                    box-shadow: 0 1px 2px rgba(0,0,0,0.1);
                }
                .lp-btn--solid:hover {
                    background: #f4f4f5;
                    transform: translateY(-2px);
                    box-shadow:
                        0 4px 12px rgba(0,0,0,0.15),
                        0 8px 24px rgba(0,0,0,0.1);
                }
                .lp-btn--solid:active {
                    transform: translateY(0);
                }
                .lp-arrow {
                    transition: transform 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    opacity: 0.6;
                }
                .lp-btn--solid:hover .lp-arrow {
                    transform: translateX(4px);
                    opacity: 1;
                }

                .lp-btn--outline {
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.15);
                    color: rgba(255,255,255,0.9);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .lp-btn--outline:hover {
                    background: rgba(255,255,255,0.12);
                    border-color: rgba(255,255,255,0.25);
                    transform: translateY(-2px);
                    box-shadow: 0 4px 16px rgba(0,0,0,0.2);
                }
                .lp-btn--outline:active {
                    transform: translateY(0);
                }

                .lp-btn--text {
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.08);
                    color: rgba(255,255,255,0.7);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .lp-btn--text:hover {
                    color: rgba(255,255,255,0.95);
                    background: rgba(255,255,255,0.1);
                    border-color: rgba(255,255,255,0.15);
                    transform: translateY(-2px);
                }
                .lp-btn--text:active {
                    transform: translateY(0);
                }

                /* ── GitHub input ─── */
                .lp-gh-wrap {
                    width: 100%; max-width: 420px; overflow: hidden;
                    margin-top: 16px;
                }
                .lp-gh-row {
                    display: flex; align-items: center; gap: 10px;
                    padding: 6px 6px 6px 16px;
                    background: rgba(9, 14, 26, 0.82);
                    border: 1px solid rgba(255,255,255,0.2);
                    border-radius: 10px;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                    box-shadow: 0 10px 24px rgba(0,0,0,0.28);
                }
                .lp-gh-icon { color: rgba(255,255,255,0.72); flex-shrink: 0; }
                .lp-gh-input {
                    flex: 1; min-width: 0; border: none; outline: none;
                    background: transparent; padding: 10px 0;
                    color: rgba(255,255,255,0.98); font-size: 0.92rem;
                    font-family: var(--font-mono);
                }
                .lp-gh-input::placeholder { color: rgba(255,255,255,0.62); }
                .lp-gh-go {
                    width: 36px; height: 36px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: #ffffff; border: none;
                    border-radius: 6px; color: #0a0a0a;
                    cursor: pointer;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                }
                .lp-gh-go:hover {
                    transform: scale(1.05);
                    box-shadow: 0 2px 8px rgba(255,255,255,0.2);
                }
                .lp-gh-go:disabled {
                    opacity: 0.3;
                    cursor: not-allowed;
                    transform: none;
                }
                .lp-gh-hint {
                    margin: 8px 0 0; text-align: center;
                    font-size: 0.72rem; color: rgba(255,255,255,0.72);
                    font-family: var(--font-mono);
                    line-height: 1.5;
                }
                .lp-token-toggle {
                    display: flex; align-items: center; gap: 6px;
                    justify-content: center;
                    margin: 6px auto 0; padding: 4px 10px;
                    background: none; border: none;
                    font-size: 0.65rem; font-family: var(--font-mono);
                    color: rgba(255,255,255,0.7); cursor: pointer;
                    transition: color 0.2s;
                }
                .lp-token-toggle:hover { color: rgba(255,255,255,0.92); }
                .lp-token-wrap { overflow: hidden; margin-top: 8px; }
                .lp-link {
                    color: rgba(255,255,255,0.9);
                    text-decoration: underline;
                    text-underline-offset: 2px;
                }
                .lp-link:hover { color: #ffffff; }

                /* ── Error Message - Premium Styling ─── */
                .lp-err {
                    margin-top: 16px;
                    padding: 12px 20px;
                    font-size: 0.8rem;
                    color: #fca5a5;
                    font-family: var(--font-mono);
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.2);
                    border-radius: 8px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    max-width: 400px;
                    text-align: center;
                }

                /* ── Footer ─── */
                .lp-footer {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    padding: 20px 32px;
                    display: flex; align-items: center; justify-content: center;
                    gap: 16px; pointer-events: none;
                    font-size: 0.7rem; color: rgba(255,255,255,0.62);
                    font-family: var(--font-mono); letter-spacing: 0.02em;
                }
                .lp-dot {
                    width: 3px; height: 3px; border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                }
                .lp-footer kbd {
                    padding: 3px 7px;
                    background: rgba(255,255,255,0.14);
                    border: 1px solid rgba(255,255,255,0.18);
                    border-radius: 4px;
                    font-size: 0.65rem; font-family: var(--font-mono);
                    color: rgba(255,255,255,0.86);
                }

                /* ── Mobile Responsive ─── */
                @media (max-width: 768px) {
                    .lp-root {
                        padding: env(safe-area-inset-top, 0) 0 env(safe-area-inset-bottom, 0) 0;
                    }
                    .lp-topbar {
                        padding: calc(env(safe-area-inset-top, 0) + 16px) 20px 16px;
                    }
                    .lp-center {
                        padding: 28px 22px;
                        max-width: 100%;
                        margin: 0 16px;
                        border-radius: 24px;
                    }
                    .lp-heading {
                        font-size: clamp(1.8rem, 8vw, 2.8rem);
                        line-height: 1.12;
                    }
                    .lp-heading br {
                        display: none;
                    }
                    .lp-desc {
                        font-size: 0.9rem;
                        line-height: 1.6;
                        color: rgba(255,255,255,0.8);
                    }
                    .lp-desc br {
                        display: none;
                    }
                    .lp-cta {
                        flex-direction: column;
                        width: 100%;
                        max-width: 300px;
                        gap: 10px;
                    }
                    .lp-btn {
                        width: 100%;
                        justify-content: center;
                        padding: 14px 24px;
                        font-size: 0.9rem;
                        min-height: 52px;
                    }
                    .lp-gh-wrap {
                        max-width: 100%;
                    }
                    .lp-gh-input {
                        font-size: 16px; /* Prevents iOS zoom */
                    }
                    .lp-footer {
                        padding: 16px 20px calc(env(safe-area-inset-bottom, 0) + 16px);
                        flex-wrap: wrap;
                        gap: 10px;
                    }
                    /* Hide keyboard shortcuts on mobile */
                    .lp-footer kbd,
                    .lp-footer span:has(kbd) {
                        display: none;
                    }
                }

                @media (max-width: 480px) {
                    .lp-heading {
                        font-size: clamp(1.5rem, 9vw, 2.2rem);
                    }
                    .lp-kicker {
                        font-size: 0.6rem;
                        padding: 5px 12px;
                    }
                    .lp-desc {
                        font-size: 0.85rem;
                    }
                    .lp-btn {
                        padding: 13px 20px;
                        font-size: 0.85rem;
                    }
                }
            `}</style>
        </div>
    )
}
