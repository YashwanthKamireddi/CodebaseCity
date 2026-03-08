/**
 * EmptyCityHero.jsx
 *
 * Landing overlay — minimalist, editorial design.
 * Renders over the live 3D demo city with a clean vignette.
 * No scanlines, no cyan, no gimmicks — just typography and clarity.
 */
import React, { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { FolderOpen, ArrowRight, Github } from 'lucide-react'
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
    const [repoUrl, setRepoUrl] = useState('')
    const [showGithubInput, setShowGithubInput] = useState(false)

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
        <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.8 }}
            className="lp-root"
        >
            {/* Vignette — clean radial, dark edges */}
            <div className="lp-vignette" />

            {/* Top bar */}
            <motion.header
                className="lp-topbar"
                initial={{ opacity: 0, y: -6 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.3, duration: 0.6 }}
            >
                <span className="lp-wordmark">Code City</span>
                <span className="lp-ver">v2.0</span>
            </motion.header>

            {/* Center content */}
            <div className="lp-center">
                <motion.p
                    className="lp-kicker"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.4, duration: 0.6 }}
                >
                    3D Codebase Visualization
                </motion.p>

                <motion.h1
                    className="lp-heading"
                    initial={{ opacity: 0, y: 18 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.5, duration: 0.7 }}
                >
                    See your codebase<br />as a living city
                </motion.h1>

                <motion.p
                    className="lp-desc"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.65, duration: 0.6 }}
                >
                    Architecture maps, complexity heat, git history —<br />
                    everything in one interactive 3D view.
                </motion.p>

                <motion.div
                    className="lp-cta"
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.8, duration: 0.6 }}
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
                </motion.div>

                <AnimatePresence>
                    {showGithubInput && (
                        <motion.div
                            initial={{ opacity: 0, height: 0, marginTop: 0 }}
                            animate={{ opacity: 1, height: 'auto', marginTop: 14 }}
                            exit={{ opacity: 0, height: 0, marginTop: 0 }}
                            transition={{ duration: 0.25 }}
                            className="lp-gh-wrap"
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
                        </motion.div>
                    )}
                </AnimatePresence>

                <AnimatePresence>
                    {error && (
                        <motion.p
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="lp-err"
                        >
                            {error}
                        </motion.p>
                    )}
                </AnimatePresence>
            </div>

            {/* Footer hints */}
            <motion.footer
                className="lp-footer"
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ delay: 1.1, duration: 0.6 }}
            >
                <span><kbd>⌘K</kbd> command palette</span>
                <span className="lp-dot" />
                <span><kbd>D</kbd> toggle roads</span>
                <span className="lp-dot" />
                <span>scroll to orbit</span>
            </motion.footer>

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
                            rgba(0,0,0,0.3) 0%,
                            rgba(0,0,0,0.65) 45%,
                            rgba(0,0,0,0.88) 100%
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
                    max-width: 640px; padding: 0 32px;
                }

                .lp-kicker {
                    margin: 0 0 20px;
                    font-size: 0.7rem; font-family: var(--font-mono);
                    text-transform: uppercase; letter-spacing: 0.2em;
                    color: rgba(255,255,255,0.5); font-weight: 500;
                    padding: 6px 14px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.08);
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
                    color: rgba(255,255,255,0.65);
                    font-weight: 400;
                    text-shadow: 0 2px 10px rgba(0,0,0,0.5);
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
                    width: 100%; max-width: 400px; overflow: hidden;
                }
                .lp-gh-row {
                    display: flex; align-items: center; gap: 10px;
                    padding: 6px 6px 6px 16px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.12);
                    border-radius: 10px;
                    backdrop-filter: blur(12px);
                    -webkit-backdrop-filter: blur(12px);
                }
                .lp-gh-icon { color: rgba(255,255,255,0.4); flex-shrink: 0; }
                .lp-gh-input {
                    flex: 1; min-width: 0; border: none; outline: none;
                    background: transparent; padding: 10px 0;
                    color: #fff; font-size: 0.875rem;
                    font-family: var(--font-mono);
                }
                .lp-gh-input::placeholder { color: rgba(255,255,255,0.35); }
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
                    font-size: 0.7rem; color: rgba(255,255,255,0.35);
                    font-family: var(--font-mono);
                }

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
                    font-size: 0.7rem; color: rgba(255,255,255,0.35);
                    font-family: var(--font-mono); letter-spacing: 0.02em;
                }
                .lp-dot {
                    width: 3px; height: 3px; border-radius: 50%;
                    background: rgba(255,255,255,0.2);
                }
                .lp-footer kbd {
                    padding: 3px 7px;
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 4px;
                    font-size: 0.65rem; font-family: var(--font-mono);
                    color: rgba(255,255,255,0.5);
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
                        padding: 0 24px;
                        max-width: 100%;
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
                        color: rgba(255,255,255,0.6);
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
        </motion.div>
    )
}
