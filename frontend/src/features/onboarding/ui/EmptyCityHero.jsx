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
                        radial-gradient(ellipse 65% 50% at 50% 50%,
                            rgba(5,5,8,0.15) 0%,
                            rgba(5,5,8,0.55) 50%,
                            rgba(5,5,8,0.95) 100%
                        );
                }

                /* ── Topbar ─── */
                .lp-topbar {
                    position: absolute; top: 0; left: 0; right: 0;
                    padding: 20px 28px;
                    display: flex; align-items: center; justify-content: space-between;
                    pointer-events: auto;
                }
                .lp-wordmark {
                    font-size: 0.78rem; font-weight: 700;
                    letter-spacing: 0.12em; text-transform: uppercase;
                    color: rgba(255,255,255,0.75);
                    font-family: var(--font-display);
                }
                .lp-ver {
                    font-size: 0.6rem; font-family: var(--font-mono);
                    color: rgba(255,255,255,0.2); letter-spacing: 0.05em;
                }

                /* ── Center ─── */
                .lp-center {
                    position: relative; z-index: 2;
                    pointer-events: auto;
                    display: flex; flex-direction: column;
                    align-items: center; text-align: center;
                    max-width: 600px; padding: 0 28px;
                }

                .lp-kicker {
                    margin: 0 0 16px;
                    font-size: 0.65rem; font-family: var(--font-mono);
                    text-transform: uppercase; letter-spacing: 0.16em;
                    color: rgba(255,255,255,0.3); font-weight: 500;
                }

                .lp-heading {
                    margin: 0 0 20px;
                    font-family: var(--font-display);
                    font-size: clamp(2.4rem, 6vw, 4.2rem);
                    font-weight: 700;
                    line-height: 1.05;
                    letter-spacing: -0.035em;
                    color: #ffffff;
                    text-shadow: 0 2px 32px rgba(0,0,0,0.7);
                }

                .lp-desc {
                    margin: 0 0 28px;
                    font-size: 0.85rem; line-height: 1.6;
                    color: rgba(255,255,255,0.35);
                    font-weight: 400;
                }

                /* ── CTAs ─── */
                .lp-cta {
                    display: flex; gap: 8px; flex-wrap: wrap;
                    justify-content: center;
                }
                .lp-btn {
                    display: inline-flex; align-items: center; gap: 6px;
                    padding: 9px 18px; border-radius: 6px;
                    font-size: 0.78rem; font-weight: 500;
                    font-family: var(--font-body);
                    cursor: pointer; white-space: nowrap;
                    transition: all 0.18s ease;
                    border: 1px solid transparent;
                    text-decoration: none;
                }
                .lp-btn--solid {
                    background: #fff; color: #0a0a0a;
                    font-weight: 600;
                }
                .lp-btn--solid:hover {
                    background: rgba(255,255,255,0.88);
                    box-shadow: 0 0 20px rgba(255,255,255,0.15),
                                0 6px 20px rgba(0,0,0,0.3);
                    transform: translateY(-1px);
                }
                .lp-arrow { transition: transform 0.15s; }
                .lp-btn--solid:hover .lp-arrow { transform: translateX(3px); }

                .lp-btn--outline {
                    background: rgba(255,255,255,0.04);
                    border-color: rgba(255,255,255,0.12);
                    color: rgba(255,255,255,0.6);
                }
                .lp-btn--outline:hover {
                    background: rgba(255,255,255,0.08);
                    border-color: rgba(255,255,255,0.2);
                    color: rgba(255,255,255,0.85);
                }

                .lp-btn--text {
                    background: none; border: none;
                    color: rgba(255,255,255,0.28);
                    padding: 9px 14px;
                }
                .lp-btn--text:hover { color: rgba(255,255,255,0.55); }

                /* ── GitHub input ─── */
                .lp-gh-wrap {
                    width: 100%; max-width: 380px; overflow: hidden;
                }
                .lp-gh-row {
                    display: flex; align-items: center; gap: 8px;
                    padding: 4px 5px 4px 12px;
                    background: rgba(255,255,255,0.04);
                    border: 1px solid rgba(255,255,255,0.10);
                    border-radius: 6px;
                }
                .lp-gh-icon { color: rgba(255,255,255,0.25); flex-shrink: 0; }
                .lp-gh-input {
                    flex: 1; min-width: 0; border: none; outline: none;
                    background: transparent; padding: 7px 0;
                    color: #fff; font-size: 0.76rem;
                    font-family: var(--font-mono);
                }
                .lp-gh-input::placeholder { color: rgba(255,255,255,0.2); }
                .lp-gh-go {
                    width: 30px; height: 30px; flex-shrink: 0;
                    display: flex; align-items: center; justify-content: center;
                    background: rgba(255,255,255,0.08); border: none;
                    border-radius: 4px; color: rgba(255,255,255,0.6);
                    cursor: pointer; transition: background 0.15s;
                }
                .lp-gh-go:hover { background: rgba(255,255,255,0.15); }
                .lp-gh-go:disabled { opacity: 0.25; cursor: not-allowed; }
                .lp-gh-hint {
                    margin: 5px 0 0; text-align: center;
                    font-size: 0.58rem; color: rgba(255,255,255,0.16);
                    font-family: var(--font-mono);
                }

                .lp-err {
                    margin-top: 10px;
                    font-size: 0.7rem; color: #f87171;
                    font-family: var(--font-mono);
                }

                /* ── Footer ─── */
                .lp-footer {
                    position: absolute; bottom: 0; left: 0; right: 0;
                    padding: 16px 28px;
                    display: flex; align-items: center; justify-content: center;
                    gap: 10px; pointer-events: none;
                    font-size: 0.6rem; color: rgba(255,255,255,0.16);
                    font-family: var(--font-mono); letter-spacing: 0.03em;
                }
                .lp-dot {
                    width: 2px; height: 2px; border-radius: 50%;
                    background: rgba(255,255,255,0.15);
                }
                .lp-footer kbd {
                    padding: 1px 4px;
                    background: rgba(255,255,255,0.05);
                    border: 1px solid rgba(255,255,255,0.07);
                    border-radius: 3px;
                    font-size: 0.58rem; font-family: var(--font-mono);
                    color: rgba(255,255,255,0.22);
                }
            `}</style>
        </motion.div>
    )
}
