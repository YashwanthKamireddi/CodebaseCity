/**
 * EmptyCityHero.jsx
 *
 * Landing overlay — minimalist, editorial design.
 * Renders over the live 3D demo city with a clean vignette.
 * No scanlines, no cyan, no gimmicks — just typography and clarity.
 */
import React, { useEffect, useState } from 'react'
import { FolderOpen, ArrowRight, Github, KeyRound, Globe, LogIn, LogOut, User } from 'lucide-react'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'
import { useAuth } from '../../auth'

export default function EmptyCityHero() {
    const analyzeLocal = useStore(s => s.analyzeLocal)
    const analyzeRepo = useStore(s => s.analyzeRepo)
    const analyzeUserUniverse = useStore(s => s.analyzeUserUniverse)
    const error = useStore(s => s.error)
    const setCityData = useStore(s => s.setCityData)
    const cityData = useStore(s => s.cityData)
    const isLandingOverlayActive = useStore(s => s.isLandingOverlayActive)
    const setLandingOverlayActive = useStore(s => s.setLandingOverlayActive)
    const githubToken = useStore(s => s.githubToken)
    const setGithubToken = useStore(s => s.setGithubToken)
    const { user, isAuthenticated, login, logout, loading: authLoading, error: authError, clearError } = useAuth()
    const [repoUrl, setRepoUrl] = useState('')
    const [showGithubInput, setShowGithubInput] = useState(false)
    const [showUniverseInput, setShowUniverseInput] = useState(false)
    const [universeUsername, setUniverseUsername] = useState('')
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
    const handleEnterUniverse = () => {
        if (universeUsername.trim()) {
            analyzeUserUniverse(universeUsername.trim())
        }
    }
    const handleUniverseKeyDown = (e) => { if (e.key === 'Enter') handleEnterUniverse() }

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
                <div className="lp-topbar-left">
                    <span className="lp-wordmark">Codebase City</span>
                </div>
                <div className="lp-topbar-right">
                    {isAuthenticated ? (
                        <div className="lp-user-badge">
                            {user?.avatar_url ? (
                                <img src={user.avatar_url} alt="" className="lp-avatar" />
                            ) : (
                                <User size={14} />
                            )}
                            <span className="lp-username">{user?.login || 'User'}</span>
                            <button onClick={logout} className="lp-logout-btn" title="Sign out">
                                <LogOut size={14} />
                            </button>
                        </div>
                    ) : (
                        <button onClick={login} className="lp-signin-btn" disabled={authLoading}>
                            <Github size={14} />
                            <span>{authLoading ? 'Signing in...' : 'Sign in'}</span>
                        </button>
                    )}
                </div>
            </header>

            {/* Cinematic corner brackets — AAA HUD frame */}
            <div className="lp-bracket lp-bracket--tl" />
            <div className="lp-bracket lp-bracket--tr" />
            <div className="lp-bracket lp-bracket--bl" />
            <div className="lp-bracket lp-bracket--br" />

            {/* Center content */}
            <div className="lp-center">
                <div className="lp-kicker-wrap anim-slide-up">
                    <span className="lp-kicker-dot" />
                    <p className="lp-kicker">System online · 3D Codebase Visualization</p>
                </div>

                <h1 className="lp-heading anim-slide-up">
                    <span className="lp-heading-line">See your codebase</span>
                    <span className="lp-heading-line lp-heading-grad">as a living city</span>
                </h1>

                <p className="lp-desc anim-slide-up">
                    Architecture maps, complexity heat, git history —
                    <br />
                    everything in one interactive 3D view.
                </p>

                <div className="lp-cta anim-slide-up">
                    <button onClick={analyzeLocal} className="lp-btn lp-btn--primary">
                        <FolderOpen size={15} />
                        <span>Open Folder</span>
                    </button>
                    <button
                        onClick={() => { setShowGithubInput(v => !v); setShowUniverseInput(false) }}
                        className={`lp-btn lp-btn--primary${showGithubInput ? ' is-active' : ''}`}
                    >
                        <Github size={15} />
                        <span>GitHub Repo</span>
                    </button>
                    <button
                        onClick={() => { setShowUniverseInput(v => !v); setShowGithubInput(false) }}
                        className={`lp-btn lp-btn--primary${showUniverseInput ? ' is-active' : ''}`}
                    >
                        <Globe size={15} />
                        <span>User Universe</span>
                    </button>
                </div>
                <button onClick={handleExploreDemoCity} className="lp-demo-link">
                    Explore demo city
                    <ArrowRight size={12} />
                </button>

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

                {showUniverseInput && (
                        <div
                            className="lp-gh-wrap anim-slide-up"
                        >
                            <div className="lp-gh-row">
                                <Globe size={13} className="lp-gh-icon" style={{ color: '#63b3ed' }} />
                                <input
                                    type="text"
                                    value={universeUsername}
                                    onChange={e => setUniverseUsername(e.target.value)}
                                    onKeyDown={handleUniverseKeyDown}
                                    placeholder="GitHub username"
                                    className="lp-gh-input"
                                    autoFocus
                                />
                                <button
                                    onClick={handleEnterUniverse}
                                    disabled={!universeUsername.trim()}
                                    className="lp-gh-go"
                                    style={{ background: universeUsername.trim() ? 'linear-gradient(135deg, #63b3ed, #4fd1c5)' : undefined }}
                                >
                                    <ArrowRight size={13} />
                                </button>
                            </div>
                            <p className="lp-gh-hint">
                                Browse all public repositories from a GitHub user as a universe of cities
                            </p>
                        </div>
                    )}

                {error && (
                        <p className="lp-err anim-fade-in">{error}</p>
                    )}

                {authError && (
                        <div className="lp-err anim-fade-in" role="alert">
                            <span>{authError}</span>
                            <button onClick={clearError} className="lp-err-close" aria-label="Dismiss">✕</button>
                        </div>
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
                        radial-gradient(ellipse 70% 55% at 50% 50%,
                            rgba(3,5,10,0.35) 0%,
                            rgba(4,6,12,0.72) 50%,
                            rgba(0,0,0,0.95) 100%
                        );
                }
                .lp-vignette::after {
                    content: '';
                    position: absolute; inset: 0;
                    background:
                        repeating-linear-gradient(
                            0deg,
                            transparent 0,
                            transparent 2px,
                            rgba(255,255,255,0.012) 2px,
                            rgba(255,255,255,0.012) 3px
                        );
                    mix-blend-mode: overlay;
                    pointer-events: none;
                }

                /* AAA HUD corner brackets */
                .lp-bracket {
                    position: absolute;
                    width: 44px; height: 44px;
                    pointer-events: none;
                    opacity: 0.45;
                    border-color: rgba(0, 255, 204, 0.7);
                    border-style: solid;
                    border-width: 0;
                    transition: opacity 0.5s ease;
                }
                .lp-bracket--tl { top: 24px; left: 24px; border-top-width: 2px; border-left-width: 2px; }
                .lp-bracket--tr { top: 24px; right: 24px; border-top-width: 2px; border-right-width: 2px; }
                .lp-bracket--bl { bottom: 24px; left: 24px; border-bottom-width: 2px; border-left-width: 2px; }
                .lp-bracket--br { bottom: 24px; right: 24px; border-bottom-width: 2px; border-right-width: 2px; }

                /* ── Topbar ─── */
                .lp-topbar {
                    position: absolute; top: 0; left: 0; right: 0;
                    padding: 24px 32px;
                    display: flex; align-items: center; justify-content: space-between;
                    pointer-events: auto;
                }
                .lp-topbar-left {
                    display: flex; align-items: center; gap: 12px;
                }
                .lp-topbar-right {
                    display: flex; align-items: center; gap: 12px;
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

                /* ── Auth UI ─── */
                .lp-signin-btn {
                    display: inline-flex; align-items: center; gap: 8px;
                    padding: 8px 16px; border-radius: 8px;
                    font-size: 0.8rem; font-weight: 500;
                    font-family: var(--font-body);
                    cursor: pointer; white-space: nowrap;
                    transition: all 0.2s cubic-bezier(0.4, 0, 0.2, 1);
                    background: rgba(255,255,255,0.08);
                    border: 1px solid rgba(255,255,255,0.15);
                    color: rgba(255,255,255,0.9);
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .lp-signin-btn:hover {
                    background: rgba(255,255,255,0.12);
                    border-color: rgba(255,255,255,0.25);
                    transform: translateY(-1px);
                    box-shadow: 0 4px 12px rgba(0,0,0,0.2);
                }
                .lp-signin-btn:disabled {
                    opacity: 0.6; cursor: not-allowed; transform: none;
                }

                .lp-user-badge {
                    display: flex; align-items: center; gap: 10px;
                    padding: 6px 8px 6px 6px;
                    background: rgba(255,255,255,0.06);
                    border: 1px solid rgba(255,255,255,0.1);
                    border-radius: 24px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                }
                .lp-avatar {
                    width: 26px; height: 26px; border-radius: 50%;
                    border: 2px solid rgba(99, 179, 237, 0.5);
                }
                .lp-username {
                    font-size: 0.75rem; font-weight: 500;
                    color: rgba(255,255,255,0.9);
                    font-family: var(--font-mono);
                    max-width: 120px;
                    overflow: hidden; text-overflow: ellipsis; white-space: nowrap;
                }
                .lp-logout-btn {
                    display: flex; align-items: center; justify-content: center;
                    width: 26px; height: 26px;
                    background: rgba(255,255,255,0.08);
                    border: none; border-radius: 50%;
                    color: rgba(255,255,255,0.6);
                    cursor: pointer;
                    transition: all 0.2s;
                }
                .lp-logout-btn:hover {
                    background: rgba(239, 68, 68, 0.2);
                    color: #fca5a5;
                }

                /* ── Center ─── */
                .lp-center {
                    position: relative; z-index: 2;
                    pointer-events: auto;
                    display: flex; flex-direction: column;
                    align-items: center; text-align: center;
                    max-width: 820px; padding: 40px 32px;
                }

                .lp-kicker-wrap {
                    display: inline-flex; align-items: center; gap: 10px;
                    margin: 0 0 28px;
                    padding: 6px 16px 6px 12px;
                    background: rgba(0, 255, 204, 0.06);
                    border: 1px solid rgba(0, 255, 204, 0.22);
                    border-radius: 40px;
                    backdrop-filter: blur(10px);
                    -webkit-backdrop-filter: blur(10px);
                    box-shadow: 0 0 24px rgba(0, 255, 204, 0.08);
                }
                .lp-kicker-dot {
                    width: 7px; height: 7px;
                    background: #00ffcc;
                    border-radius: 50%;
                    box-shadow: 0 0 8px #00ffcc, 0 0 16px rgba(0, 255, 204, 0.6);
                    animation: lp-pulse 2s ease-in-out infinite;
                }
                @keyframes lp-pulse {
                    0%, 100% { opacity: 1; transform: scale(1); }
                    50% { opacity: 0.45; transform: scale(0.85); }
                }
                .lp-kicker {
                    margin: 0;
                    font-size: 0.7rem; font-family: var(--font-mono);
                    text-transform: uppercase; letter-spacing: 0.2em;
                    color: rgba(255,255,255,0.88); font-weight: 600;
                }

                .lp-heading {
                    margin: 0 0 26px;
                    font-family: var(--font-display);
                    font-size: clamp(3.0rem, 7.5vw, 6rem);
                    font-weight: 800;
                    line-height: 1.02;
                    letter-spacing: -0.045em;
                    color: #ffffff;
                }
                .lp-heading-line {
                    display: block;
                    text-shadow:
                        0 2px 20px rgba(0,0,0,0.85),
                        0 4px 60px rgba(0,0,0,0.7);
                }
                .lp-heading-grad {
                    background: linear-gradient(
                        135deg,
                        #ffffff 0%,
                        #7fffe6 35%,
                        #00ffcc 65%,
                        #5ab4ff 100%
                    );
                    -webkit-background-clip: text;
                    background-clip: text;
                    -webkit-text-fill-color: transparent;
                    color: transparent;
                    filter: drop-shadow(0 0 40px rgba(0, 255, 204, 0.25));
                }

                .lp-desc {
                    margin: 0 0 38px;
                    font-size: 1.05rem; line-height: 1.7;
                    color: rgba(255,255,255,0.82);
                    font-weight: 400;
                    text-shadow: 0 2px 14px rgba(0,0,0,0.65);
                    max-width: 520px;
                }

                /* ── Cinematic CTA buttons — glass + subtle inner glow ── */
                .lp-cta {
                    display: flex; gap: 12px; flex-wrap: wrap;
                    justify-content: center;
                }
                .lp-btn {
                    position: relative;
                    display: inline-flex; align-items: center; gap: 10px;
                    padding: 14px 26px;
                    min-height: 48px;
                    border-radius: 12px;
                    font-size: 0.92rem; font-weight: 600;
                    font-family: var(--font-body);
                    letter-spacing: 0.01em;
                    cursor: pointer; white-space: nowrap;
                    transition:
                        background-color 0.22s ease,
                        border-color 0.22s ease,
                        transform 0.2s ease,
                        box-shadow 0.25s ease;
                    text-decoration: none;
                    line-height: 1;
                    overflow: hidden;
                }
                .lp-btn--primary {
                    background: linear-gradient(
                        180deg,
                        rgba(255,255,255,0.1),
                        rgba(255,255,255,0.04)
                    );
                    border: 1px solid rgba(255,255,255,0.22);
                    color: rgba(255,255,255,0.97);
                    backdrop-filter: blur(14px);
                    -webkit-backdrop-filter: blur(14px);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,0.08),
                        0 2px 12px rgba(0,0,0,0.35);
                }
                .lp-btn--primary::after {
                    content: '';
                    position: absolute;
                    inset: 0;
                    border-radius: 12px;
                    background: linear-gradient(135deg, rgba(0,255,204,0.25), transparent 55%);
                    opacity: 0;
                    transition: opacity 0.22s ease;
                    pointer-events: none;
                }
                .lp-btn--primary:hover {
                    background: linear-gradient(
                        180deg,
                        rgba(255,255,255,0.16),
                        rgba(255,255,255,0.08)
                    );
                    border-color: rgba(0, 255, 204, 0.45);
                    transform: translateY(-2px);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,0.15),
                        0 10px 32px rgba(0, 255, 204, 0.15),
                        0 2px 12px rgba(0,0,0,0.4);
                }
                .lp-btn--primary:hover::after {
                    opacity: 1;
                }
                .lp-btn--primary:active { transform: translateY(0); }
                .lp-btn--primary.is-active {
                    background: linear-gradient(
                        180deg,
                        rgba(0, 255, 204, 0.18),
                        rgba(0, 255, 204, 0.06)
                    );
                    border-color: rgba(0, 255, 204, 0.55);
                    box-shadow:
                        inset 0 1px 0 rgba(255,255,255,0.12),
                        0 0 24px rgba(0, 255, 204, 0.2);
                }

                .lp-demo-link {
                    display: inline-flex; align-items: center; gap: 8px;
                    margin-top: 22px;
                    padding: 8px 14px;
                    background: none; border: 1px solid transparent;
                    border-radius: 20px;
                    color: rgba(255,255,255,0.58);
                    font-family: var(--font-mono);
                    font-size: 0.78rem; font-weight: 500;
                    letter-spacing: 0.05em;
                    text-transform: uppercase;
                    cursor: pointer;
                    transition: color 0.2s ease, gap 0.22s ease, border-color 0.2s ease;
                }
                .lp-demo-link:hover {
                    color: #00ffcc;
                    gap: 14px;
                    border-color: rgba(0, 255, 204, 0.28);
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
                    display: flex; align-items: center; justify-content: center; gap: 10px;
                    margin-top: 16px;
                    padding: 12px 16px;
                    font-size: 0.8rem;
                    color: #fca5a5;
                    font-family: var(--font-mono);
                    background: rgba(239, 68, 68, 0.1);
                    border: 1px solid rgba(239, 68, 68, 0.25);
                    border-radius: 8px;
                    backdrop-filter: blur(8px);
                    -webkit-backdrop-filter: blur(8px);
                    max-width: 440px;
                    text-align: center;
                }
                .lp-err-close {
                    background: none; border: none; color: inherit;
                    cursor: pointer; padding: 0; font-size: 0.9rem; line-height: 1;
                    opacity: 0.7; transition: opacity 0.15s ease;
                }
                .lp-err-close:hover { opacity: 1; }

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
