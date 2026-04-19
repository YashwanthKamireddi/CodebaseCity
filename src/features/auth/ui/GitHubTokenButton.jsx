/**
 * GitHubTokenButton — floating chip + modal for managing the GitHub PAT.
 *
 * Visible everywhere (landing + city view + universe). Shows current auth
 * state and rate-limit class. Click opens a modal where users can paste
 * a PAT, test it against /user, and save. Token is stored in sessionStorage
 * (per githubApi.js) — never sent to any server other than api.github.com.
 */
import { useState, useEffect, useCallback } from 'react'
import { KeyRound, Github, ExternalLink, Check, X, Loader2, AlertCircle, Info } from 'lucide-react'
import useStore from '../../../store/useStore'
import './GitHubTokenButton.css'

const PAT_DOCS_URL = 'https://github.com/settings/tokens/new?description=Codebase%20City&scopes=public_repo'

export default function GitHubTokenButton() {
    const githubToken = useStore(s => s.githubToken)
    const setGithubToken = useStore(s => s.setGithubToken)

    const [open, setOpen] = useState(false)
    const [draft, setDraft] = useState(githubToken || '')
    const [testState, setTestState] = useState('idle') // 'idle' | 'testing' | 'ok' | 'fail'
    const [testUser, setTestUser] = useState(null)
    const [testError, setTestError] = useState(null)
    const [rateLimit, setRateLimit] = useState(null)

    // Keep draft synced with store value when modal opens
    useEffect(() => {
        if (open) {
            setDraft(githubToken || '')
            setTestState('idle')
            setTestError(null)
            setTestUser(null)
        }
    }, [open, githubToken])

    // Fetch current rate limit when modal opens
    useEffect(() => {
        if (!open) return
        let cancelled = false
        const headers = { Accept: 'application/vnd.github.v3+json' }
        if (githubToken) headers.Authorization = `Bearer ${githubToken}`
        fetch('https://api.github.com/rate_limit', { headers })
            .then(r => r.ok ? r.json() : null)
            .then(data => {
                if (cancelled || !data) return
                setRateLimit({
                    limit: data.rate.limit,
                    remaining: data.rate.remaining,
                    resetAt: data.rate.reset * 1000,
                })
            })
            .catch(() => {})
        return () => { cancelled = true }
    }, [open, githubToken])

    const validate = useCallback(async () => {
        const candidate = draft.trim()
        if (!candidate) {
            setTestState('fail')
            setTestError('Token is empty.')
            setTestUser(null)
            return
        }
        setTestState('testing')
        setTestError(null)
        try {
            const res = await fetch('https://api.github.com/user', {
                headers: {
                    Accept: 'application/vnd.github.v3+json',
                    Authorization: `Bearer ${candidate}`,
                },
            })
            if (res.status === 401) throw new Error('Invalid or revoked token.')
            if (res.status === 403) throw new Error('Token rejected by GitHub (403).')
            if (!res.ok) throw new Error(`GitHub returned ${res.status}.`)
            const user = await res.json()
            if (!user?.login) throw new Error('Unexpected response from GitHub.')
            setTestUser(user)
            setTestState('ok')
        } catch (err) {
            setTestState('fail')
            setTestError(err?.message || 'Token check failed.')
            setTestUser(null)
        }
    }, [draft])

    const save = useCallback(() => {
        setGithubToken(draft.trim())
        setOpen(false)
    }, [draft, setGithubToken])

    const clear = useCallback(() => {
        setGithubToken('')
        setDraft('')
        setTestUser(null)
        setTestState('idle')
        setRateLimit(null)
    }, [setGithubToken])

    const isAuthed = !!githubToken
    const limitClass = isAuthed ? '5,000 req/hr' : '60 req/hr'
    const remaining = rateLimit?.remaining ?? null
    const lowOnQuota = remaining !== null && remaining < (isAuthed ? 500 : 10)

    return (
        <>
            {/* Floating chip in top-right corner */}
            <button
                className={`gh-tok-chip${isAuthed ? ' is-active' : ''}${lowOnQuota ? ' is-low' : ''}`}
                onClick={() => setOpen(true)}
                title={isAuthed ? 'GitHub token active — click to manage' : 'Add a GitHub token to unlock 5,000 req/hr'}
            >
                {isAuthed ? <KeyRound size={13} /> : <Github size={13} />}
                <span className="gh-tok-chip-label">{limitClass}</span>
                {isAuthed && <Check size={11} className="gh-tok-chip-check" />}
            </button>

            {/* Modal */}
            {open && (
                <div className="gh-tok-overlay anim-fade-in" onClick={() => setOpen(false)}>
                    <div className="gh-tok-modal anim-scale-in" onClick={e => e.stopPropagation()} role="dialog" aria-label="GitHub Token Settings">
                        <header className="gh-tok-header">
                            <div className="gh-tok-icon">
                                <KeyRound size={16} />
                            </div>
                            <div className="gh-tok-title-wrap">
                                <h2 className="gh-tok-title">GitHub Personal Access Token</h2>
                                <p className="gh-tok-subtitle">
                                    Lifts your GitHub API limit from 60 to 5,000 requests per hour.
                                </p>
                            </div>
                            <button className="gh-tok-close" onClick={() => setOpen(false)} aria-label="Close">
                                <X size={16} />
                            </button>
                        </header>

                        {/* Rate limit panel */}
                        {rateLimit && (
                            <div className={`gh-tok-rate${lowOnQuota ? ' is-low' : ''}`}>
                                <Info size={12} />
                                <span>
                                    Currently <strong>{remaining?.toLocaleString()}</strong> / {rateLimit.limit.toLocaleString()} requests remaining
                                    {lowOnQuota && (
                                        <em>
                                            {' '}· resets {timeUntil(rateLimit.resetAt)}
                                        </em>
                                    )}
                                </span>
                            </div>
                        )}

                        {/* Input */}
                        <label className="gh-tok-field">
                            <span className="gh-tok-label">Token</span>
                            <div className="gh-tok-input-row">
                                <input
                                    type="password"
                                    value={draft}
                                    onChange={e => { setDraft(e.target.value); setTestState('idle') }}
                                    onKeyDown={e => {
                                        if (e.key === 'Enter' && draft.trim()) validate()
                                    }}
                                    placeholder="ghp_… or github_pat_…"
                                    className="gh-tok-input"
                                    autoFocus
                                    autoComplete="off"
                                    spellCheck={false}
                                />
                                <button
                                    type="button"
                                    className="gh-tok-test-btn"
                                    onClick={validate}
                                    disabled={!draft.trim() || testState === 'testing'}
                                >
                                    {testState === 'testing' ? <Loader2 size={13} className="anim-spin" /> : 'Test'}
                                </button>
                            </div>
                        </label>

                        {/* Test result */}
                        {testState === 'ok' && testUser && (
                            <div className="gh-tok-result is-ok">
                                <Check size={13} />
                                <span>
                                    Verified as <strong>{testUser.login}</strong>
                                    {testUser.name ? ` (${testUser.name})` : ''}
                                </span>
                            </div>
                        )}
                        {testState === 'fail' && (
                            <div className="gh-tok-result is-fail">
                                <AlertCircle size={13} />
                                <span>{testError}</span>
                            </div>
                        )}

                        {/* Help */}
                        <div className="gh-tok-help">
                            <a href={PAT_DOCS_URL} target="_blank" rel="noopener noreferrer" className="gh-tok-link">
                                Create a token on GitHub
                                <ExternalLink size={11} />
                            </a>
                            <p className="gh-tok-help-text">
                                Use the <code>public_repo</code> scope (or no scopes for public-only access).
                                Tokens are stored in your browser's <strong>session storage</strong> only —
                                never sent to any server other than api.github.com.
                            </p>
                        </div>

                        {/* Actions */}
                        <footer className="gh-tok-footer">
                            {isAuthed && (
                                <button type="button" className="gh-tok-clear" onClick={clear}>
                                    Remove token
                                </button>
                            )}
                            <div className="gh-tok-footer-actions">
                                <button type="button" className="gh-tok-cancel" onClick={() => setOpen(false)}>
                                    Cancel
                                </button>
                                <button
                                    type="button"
                                    className="gh-tok-save"
                                    onClick={save}
                                    disabled={!draft.trim() || (testState === 'fail')}
                                >
                                    Save token
                                </button>
                            </div>
                        </footer>
                    </div>
                </div>
            )}
        </>
    )
}

function timeUntil(ts) {
    const ms = ts - Date.now()
    if (ms <= 0) return 'now'
    const min = Math.ceil(ms / 60000)
    if (min < 60) return `in ${min}m`
    const hr = Math.ceil(min / 60)
    return `in ${hr}h`
}
