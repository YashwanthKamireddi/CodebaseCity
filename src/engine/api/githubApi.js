/**
 * GitHub API Service Layer
 *
 * Centralizes all GitHub REST API calls with:
 * - Optional personal access token (PAT) for 5 000 req/hr (vs 60 unauthenticated)
 * - In-memory + sessionStorage response cache with TTL
 * - ETag-based conditional requests (304s don't count against rate limit)
 * - Automatic retry with exponential backoff on 429 / 403
 * - Concurrency throttle to prevent flooding
 */

import logger from '../../utils/logger'

// ── Token management ────────────────────────────────────────────────
const TOKEN_KEY = 'codebase_city_github_token'
const OAUTH_USER_KEY = 'codebase_city_user'

/**
 * Get the best available GitHub token.
 * Priority: 1) OAuth token from logged-in user, 2) Manual PAT token
 */
export function getGitHubToken() {
    // First check for OAuth token from GitHub login
    try {
        const userJson = localStorage.getItem(OAUTH_USER_KEY)
        if (userJson) {
            const user = JSON.parse(userJson)
            if (user?.token) return user.token
        }
    } catch { /* ignore parse errors */ }
    
    // Fallback to manually set PAT token
    return sessionStorage.getItem(TOKEN_KEY) || ''
}

/**
 * Check if user is authenticated via GitHub OAuth
 */
export function isOAuthAuthenticated() {
    try {
        const userJson = localStorage.getItem(OAUTH_USER_KEY)
        if (userJson) {
            const user = JSON.parse(userJson)
            return !!user?.token
        }
    } catch { /* ignore */ }
    return false
}

/**
 * Get the current authenticated user info (if OAuth logged in)
 */
export function getAuthenticatedUser() {
    try {
        const userJson = localStorage.getItem(OAUTH_USER_KEY)
        if (userJson) {
            return JSON.parse(userJson)
        }
    } catch { /* ignore */ }
    return null
}

export function setGitHubToken(token) {
    if (token) {
        sessionStorage.setItem(TOKEN_KEY, token)
    } else {
        sessionStorage.removeItem(TOKEN_KEY)
    }
}

// ── In-memory cache with ETag support ───────────────────────────────
const _cache = new Map()        // url → { data, etag, ts }
const MAX_CACHE = 200
const DEFAULT_TTL = 5 * 60_000  // 5 minutes

function cacheGet(url, ttl = DEFAULT_TTL) {
    const entry = _cache.get(url)
    if (!entry) return null
    if (Date.now() - entry.ts > ttl) return { expired: true, etag: entry.etag, data: entry.data }
    return { expired: false, etag: entry.etag, data: entry.data }
}

function cacheSet(url, data, etag) {
    if (_cache.size >= MAX_CACHE) {
        // Evict oldest 25%
        const keys = [..._cache.keys()]
        for (let i = 0; i < keys.length * 0.25; i++) _cache.delete(keys[i])
    }
    _cache.set(url, { data, etag: etag || null, ts: Date.now() })
}

// Also persist critical responses in sessionStorage for tab-refresh resilience
function sessionGet(url) {
    try {
        const raw = sessionStorage.getItem(`ghcache:${url}`)
        if (!raw) return null
        const entry = JSON.parse(raw)
        if (Date.now() - entry.ts > DEFAULT_TTL * 2) {
            sessionStorage.removeItem(`ghcache:${url}`)
            return null
        }
        return entry
    } catch { return null }
}

function sessionSet(url, data, etag) {
    try {
        // Only cache small-to-medium responses in sessionStorage (< 500 KB)
        const json = JSON.stringify({ data, etag, ts: Date.now() })
        if (json.length < 500_000) {
            sessionStorage.setItem(`ghcache:${url}`, json)
        }
    } catch {
        // sessionStorage full — silently ignore
    }
}

// ── Concurrency throttle ────────────────────────────────────────────
let _inflight = 0
const MAX_CONCURRENT = 6
const _queue = []

// Combine multiple AbortSignals into one — aborted if any source aborts.
// Polyfill for AbortSignal.any() which isn't supported in all browsers.
function anySignal(signals) {
    if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.any === 'function') {
        return AbortSignal.any(signals)
    }
    const ctrl = new AbortController()
    const onAbort = () => ctrl.abort()
    for (const s of signals) {
        if (s.aborted) { ctrl.abort(); break }
        s.addEventListener('abort', onAbort, { once: true })
    }
    return ctrl.signal
}

function enqueue() {
    return new Promise(resolve => {
        if (_inflight < MAX_CONCURRENT) {
            _inflight++
            resolve()
        } else {
            _queue.push(resolve)
        }
    })
}

function dequeue() {
    _inflight--
    if (_queue.length > 0) {
        _inflight++
        _queue.shift()()
    }
}

// ── Rate-limit state ────────────────────────────────────────────────
let _rateLimitRemaining = Infinity
let _rateLimitReset = 0 // Unix seconds

export function getRateLimitInfo() {
    return {
        remaining: _rateLimitRemaining,
        resetsAt: _rateLimitReset ? new Date(_rateLimitReset * 1000) : null,
    }
}

// ── Core fetch with cache, auth, retry ──────────────────────────────
/**
 * Fetch a GitHub API endpoint with full caching, auth, and retry.
 *
 * @param {string} url - Full GitHub API URL
 * @param {object} [opts]
 * @param {number} [opts.ttl] - Cache TTL in ms (default 5 min)
 * @param {boolean} [opts.skipCache] - Bypass cache for this request
 * @param {AbortSignal} [opts.signal] - AbortController signal
 * @returns {Promise<{data: any, status: number, fromCache: boolean}>}
 */
export async function ghFetch(url, opts = {}) {
    const { ttl = DEFAULT_TTL, skipCache = false, signal } = opts

    // 1. Check in-memory cache
    if (!skipCache) {
        const cached = cacheGet(url, ttl)
        if (cached && !cached.expired) {
            return { data: cached.data, status: 200, fromCache: true }
        }

        // Check sessionStorage fallback
        if (!cached) {
            const sess = sessionGet(url)
            if (sess) {
                cacheSet(url, sess.data, sess.etag)
                return { data: sess.data, status: 200, fromCache: true }
            }
        }
    }

    // 2. Wait for concurrency slot
    await enqueue()

    try {
        // 3. Pre-flight rate limit check — if we know we're exhausted, fail
        // fast with a helpful message. Waiting up to 2 minutes silently is
        // awful UX; the user needs to see the error and add a PAT.
        if (_rateLimitRemaining <= 1 && _rateLimitReset > Date.now() / 1000) {
            const isAuthd = !!getGitHubToken()
            throw new Error(
                `GitHub API rate limit exhausted. ` +
                (isAuthd
                    ? `Resets at ${new Date(_rateLimitReset * 1000).toLocaleTimeString()}.`
                    : `Add a GitHub token (key icon, top-right) for 5,000 requests/hour instead of 60.`)
            )
        }

        // 4. Build headers
        const headers = { Accept: 'application/vnd.github+json' }
        const token = getGitHubToken()
        if (token) {
            headers.Authorization = `Bearer ${token}`
        }

        // ETag conditional request (returns 304 if unchanged — free!)
        const cachedEntry = cacheGet(url, Infinity) // get even expired for etag
        if (cachedEntry?.etag) {
            headers['If-None-Match'] = cachedEntry.etag
        }

        // 5. Fetch with retry — fail-fast on prod so the loading screen never
        //    hangs for minutes on rate-limit. Max wait ≈ 4s, 2 attempts total.
        let lastError = null
        for (let attempt = 0; attempt < 2; attempt++) {
            try {
                // Hard 30s timeout per attempt so the network layer never hangs.
                const timeoutCtrl = new AbortController()
                const timeoutId = setTimeout(() => timeoutCtrl.abort(), 30_000)
                const mergedSignal = signal
                    ? anySignal([signal, timeoutCtrl.signal])
                    : timeoutCtrl.signal

                let res
                try {
                    res = await fetch(url, { headers, signal: mergedSignal })
                } finally {
                    clearTimeout(timeoutId)
                }

                // Update rate-limit tracking
                const remaining = res.headers.get('x-ratelimit-remaining')
                const reset = res.headers.get('x-ratelimit-reset')
                if (remaining != null) _rateLimitRemaining = parseInt(remaining, 10)
                if (reset != null) _rateLimitReset = parseInt(reset, 10)

                // 304 Not Modified — cache hit (free request!)
                if (res.status === 304 && cachedEntry) {
                    cacheSet(url, cachedEntry.data, cachedEntry.etag)
                    return { data: cachedEntry.data, status: 304, fromCache: true }
                }

                // Rate limited — short retry, then fail fast with clear msg.
                if (res.status === 403 || res.status === 429) {
                    const retryAfter = res.headers.get('retry-after')
                    const waitSec = Math.min(4, retryAfter ? parseInt(retryAfter, 10) : 2)
                    if (attempt === 0 && _rateLimitRemaining > 0) {
                        logger.warn(`GitHub ${res.status} — retrying once in ${waitSec}s`)
                        await new Promise(r => setTimeout(r, waitSec * 1000))
                        continue
                    }
                    const isAuthd = !!token
                    throw new Error(
                        `GitHub API rate limit exceeded (${_rateLimitRemaining} remaining). ` +
                        (isAuthd
                            ? 'Limit resets at ' + new Date(_rateLimitReset * 1000).toLocaleTimeString() + '.'
                            : 'Add a GitHub token (key icon, top-right) for 5,000 requests/hour instead of 60.')
                    )
                }

                if (!res.ok) {
                    if (res.status === 404) throw new Error('not_found')
                    throw new Error(`GitHub API error: ${res.status}`)
                }

                const data = await res.json()
                const etag = res.headers.get('etag')
                cacheSet(url, data, etag)
                sessionSet(url, data, etag)

                return { data, status: res.status, fromCache: false }

            } catch (err) {
                if (err.name === 'AbortError') throw err
                lastError = err
                if (err.message === 'not_found') throw err
                if (attempt === 2) throw lastError
            }
        }
        throw lastError
    } finally {
        dequeue()
    }
}

/**
 * Fetch raw file content from raw.githubusercontent.com.
 * Not cached (too large), but benefits from auth token.
 */
export async function ghFetchRaw(url, opts = {}) {
    const { signal } = opts
    const headers = {}
    const token = getGitHubToken()
    if (token) {
        headers.Authorization = `Bearer ${token}`
    }
    return fetch(url, { headers, signal })
}

/**
 * Batch fetch multiple URLs with concurrency throttling.
 * Returns array of results in same order. Failed fetches return null.
 */
export async function ghFetchBatch(urls, opts = {}) {
    return Promise.all(urls.map(url =>
        ghFetch(url, opts)
            .then(r => r.data)
            .catch(() => null)
    ))
}

/**
 * Clear all cached data (useful when switching repos or tokens).
 */
export function clearCache() {
    _cache.clear()
    try {
        const keys = []
        for (let i = 0; i < sessionStorage.length; i++) {
            const k = sessionStorage.key(i)
            if (k?.startsWith('ghcache:')) keys.push(k)
        }
        keys.forEach(k => sessionStorage.removeItem(k))
    } catch { /* ignore */ }
}

/**
 * World-Class Implementation: Ingests a complete repo branch as a Zipball buffer.
 * Bypasses JSON/Tree parsing limitations by downloading everything iteratively in C++ style Streams.
 */
export async function fetchGitHubZipball(owner, repo, branch = 'main', opts = {}) {
    // Fetch directly via Vercel proxy to keep CORS clean. Cache-bust the
    // CDN per request so we never serve a stale ACAO header.
    const url = `/codeload/${encodeURIComponent(owner)}/${encodeURIComponent(repo)}/legacy.zip/refs/heads/${encodeURIComponent(branch)}?t=${Date.now()}`;
    const token = getGitHubToken();
    const headers = {};
    if (token) headers.Authorization = `Bearer ${token}`;

    // Hard 55s timeout — Vercel proxy itself will kill at 60s, so we abort
    // sooner and surface a clean error before that hits.
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 55_000);

    let response;
    try {
        response = await fetch(url, { headers, signal: ctrl.signal });
    } catch (err) {
        clearTimeout(timeoutId);
        if (err?.name === 'AbortError') {
            throw new Error(
                'Repository download timed out (>55s). The repo may be very large or GitHub is throttling. ' +
                'Try again, or add a GitHub token (key icon, top-right) for higher priority.'
            );
        }
        throw err;
    }

    if (!response.ok) {
        clearTimeout(timeoutId);
        throw new Error(`Failed to fetch repository (HTTP ${response.status}). It may be very large or GitHub is throttling.`);
    }

    // Stream the download so we can report progress instead of sitting
    // silent until the whole zip lands. Reports byte count via opts.onProgress.
    const total = parseInt(response.headers.get('content-length') || '0', 10) || 0;
    const reader = response.body?.getReader?.();
    if (!reader) {
        // Fallback when streaming isn't available (very old browsers / extensions)
        clearTimeout(timeoutId);
        return await response.arrayBuffer();
    }

    const chunks = [];
    let received = 0;
    try {
        while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            chunks.push(value);
            received += value.byteLength;
            if (opts.onProgress) opts.onProgress({ received, total });
        }
    } finally {
        clearTimeout(timeoutId);
    }

    // Concatenate chunks into a single ArrayBuffer for zero-copy transfer
    // into the VFS worker.
    const buf = new Uint8Array(received);
    let pos = 0;
    for (const c of chunks) {
        buf.set(c, pos);
        pos += c.byteLength;
    }
    return buf.buffer;
}

// ── Universe Mode: Multi-repo fetching ──────────────────────────────

/**
 * Fetch all public repositories for a GitHub user.
 * Handles pagination automatically, returns up to 300 repos.
 * 
 * @param {string} username - GitHub username
 * @param {object} [opts]
 * @param {number} [opts.maxRepos=300] - Maximum repos to fetch
 * @param {string} [opts.sort='updated'] - Sort by: updated, created, pushed, full_name
 * @param {AbortSignal} [opts.signal] - AbortController signal
 * @returns {Promise<Array<{
 *   name: string,
 *   full_name: string,
 *   description: string,
 *   language: string,
 *   stargazers_count: number,
 *   forks_count: number,
 *   size: number,
 *   default_branch: string,
 *   updated_at: string,
 *   html_url: string,
 *   private: boolean
 * }>>}
 */
export async function fetchUserRepos(username, opts = {}) {
    const { maxRepos = 300, sort = 'updated', signal } = opts
    const repos = []
    let page = 1
    const perPage = 100 // GitHub max
    
    while (repos.length < maxRepos) {
        const url = `https://api.github.com/users/${encodeURIComponent(username)}/repos?per_page=${perPage}&page=${page}&sort=${sort}&direction=desc`
        
        try {
            const { data } = await ghFetch(url, { signal })
            
            if (!data || data.length === 0) break
            
            // Extract relevant fields
            const pageRepos = data.map(repo => ({
                name: repo.name,
                full_name: repo.full_name,
                description: repo.description || '',
                language: repo.language || 'Unknown',
                stargazers_count: repo.stargazers_count || 0,
                forks_count: repo.forks_count || 0,
                size: repo.size || 0,
                default_branch: repo.default_branch || 'main',
                updated_at: repo.updated_at,
                html_url: repo.html_url,
                private: repo.private || false
            }))
            
            repos.push(...pageRepos)
            
            // If we got less than perPage, we've reached the end
            if (data.length < perPage) break
            
            page++
        } catch (err) {
            if (err.message === 'not_found') {
                throw new Error(`User "${username}" not found`, { cause: err })
            }
            throw err
        }
    }
    
    return repos.slice(0, maxRepos)
}

/**
 * Fetch GitHub user profile info
 */
export async function fetchUserProfile(username, opts = {}) {
    const { signal } = opts
    const url = `https://api.github.com/users/${encodeURIComponent(username)}`
    
    try {
        const { data } = await ghFetch(url, { signal })
        return {
            login: data.login,
            name: data.name || data.login,
            avatar_url: data.avatar_url,
            bio: data.bio || '',
            public_repos: data.public_repos,
            followers: data.followers,
            following: data.following,
            html_url: data.html_url
        }
    } catch (err) {
        if (err.message === 'not_found') {
            throw new Error(`User "${username}" not found`, { cause: err })
        }
        throw err
    }
}
