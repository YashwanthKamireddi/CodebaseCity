/**
 * API Client
 *
 * Enterprise-grade API client with:
 * - Request/response interceptors
 * - Automatic retry with exponential backoff
 * - Request deduplication
 * - Response caching
 * - Error normalization
 * - Timeout handling
 */

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000'
const DEFAULT_TIMEOUT = 30000
const MAX_RETRIES = 3

// In-flight request deduplication
const pendingRequests = new Map()

// Simple response cache
const responseCache = new Map()
const CACHE_TTL = 5 * 60 * 1000 // 5 minutes

/**
 * Normalized API Error
 */
export class ApiError extends Error {
    constructor(message, status, code, details = null) {
        super(message)
        this.name = 'ApiError'
        this.status = status
        this.code = code
        this.details = details
        this.timestamp = new Date().toISOString()
    }

    static fromResponse(response, body) {
        const message = body?.message || body?.detail || response.statusText || 'Unknown error'
        const code = body?.code || `HTTP_${response.status}`
        return new ApiError(message, response.status, code, body)
    }

    static fromError(error) {
        if (error instanceof ApiError) return error
        if (error.name === 'AbortError') {
            return new ApiError('Request was cancelled', 0, 'CANCELLED')
        }
        if (error.name === 'TypeError' && error.message.includes('fetch')) {
            return new ApiError('Network error - server may be offline', 0, 'NETWORK_ERROR')
        }
        return new ApiError(error.message || 'Unknown error', 0, 'UNKNOWN')
    }

    get isNetworkError() {
        return this.code === 'NETWORK_ERROR'
    }

    get isServerError() {
        return this.status >= 500
    }

    get isClientError() {
        return this.status >= 400 && this.status < 500
    }

    get isRetryable() {
        return this.isNetworkError || this.isServerError || this.status === 429
    }
}

/**
 * Sleep helper for retry delays
 */
const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms))

/**
 * Generate cache key from request config
 */
const getCacheKey = (url, options) => {
    return `${options?.method || 'GET'}:${url}:${JSON.stringify(options?.body || '')}`
}

/**
 * Check if cached response is still valid
 */
const getCachedResponse = (key) => {
    const cached = responseCache.get(key)
    if (!cached) return null
    if (Date.now() - cached.timestamp > CACHE_TTL) {
        responseCache.delete(key)
        return null
    }
    return cached.data
}

/**
 * Main fetch wrapper with all enterprise features
 */
async function fetchWithRetry(url, options = {}, retryCount = 0) {
    const {
        timeout = DEFAULT_TIMEOUT,
        cache = false,
        dedupe = true,
        retries = MAX_RETRIES,
        ...fetchOptions
    } = options

    const fullUrl = url.startsWith('http') ? url : `${API_BASE}${url}`
    const cacheKey = getCacheKey(fullUrl, fetchOptions)

    // Check cache for GET requests
    if (cache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
        const cached = getCachedResponse(cacheKey)
        if (cached) {
            console.debug('[API] Cache hit:', url)
            return cached
        }
    }

    // Deduplicate identical in-flight requests
    if (dedupe && pendingRequests.has(cacheKey)) {
        console.debug('[API] Deduping request:', url)
        return pendingRequests.get(cacheKey)
    }

    // Create abort controller for timeout
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), timeout)

    // Create the request promise
    const requestPromise = (async () => {
        try {
            const response = await fetch(fullUrl, {
                ...fetchOptions,
                signal: controller.signal,
                headers: {
                    'Content-Type': 'application/json',
                    ...fetchOptions.headers
                }
            })

            clearTimeout(timeoutId)

            // Parse response body
            let body
            const contentType = response.headers.get('content-type')
            if (contentType?.includes('application/json')) {
                body = await response.json()
            } else {
                body = await response.text()
            }

            // Handle error responses
            if (!response.ok) {
                const error = ApiError.fromResponse(response, body)

                // Retry on retryable errors
                if (error.isRetryable && retryCount < retries) {
                    const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
                    console.warn(`[API] Retrying request (${retryCount + 1}/${retries}) after ${delay}ms:`, url)
                    await sleep(delay)
                    return fetchWithRetry(url, options, retryCount + 1)
                }

                throw error
            }

            // Cache successful GET responses
            if (cache && (!fetchOptions.method || fetchOptions.method === 'GET')) {
                responseCache.set(cacheKey, {
                    data: body,
                    timestamp: Date.now()
                })
            }

            return body
        } catch (error) {
            clearTimeout(timeoutId)

            if (error instanceof ApiError) throw error

            const apiError = ApiError.fromError(error)

            // Retry on network errors
            if (apiError.isRetryable && retryCount < retries) {
                const delay = Math.min(1000 * Math.pow(2, retryCount), 10000)
                console.warn(`[API] Retrying request (${retryCount + 1}/${retries}) after ${delay}ms:`, url)
                await sleep(delay)
                return fetchWithRetry(url, options, retryCount + 1)
            }

            throw apiError
        } finally {
            pendingRequests.delete(cacheKey)
        }
    })()

    // Store pending request for deduplication
    if (dedupe) {
        pendingRequests.set(cacheKey, requestPromise)
    }

    return requestPromise
}

/**
 * API Client with method shortcuts
 */
export const api = {
    get: (url, options = {}) =>
        fetchWithRetry(url, { ...options, method: 'GET' }),

    post: (url, data, options = {}) =>
        fetchWithRetry(url, {
            ...options,
            method: 'POST',
            body: JSON.stringify(data)
        }),

    put: (url, data, options = {}) =>
        fetchWithRetry(url, {
            ...options,
            method: 'PUT',
            body: JSON.stringify(data)
        }),

    patch: (url, data, options = {}) =>
        fetchWithRetry(url, {
            ...options,
            method: 'PATCH',
            body: JSON.stringify(data)
        }),

    delete: (url, options = {}) =>
        fetchWithRetry(url, { ...options, method: 'DELETE' }),

    // Cache management
    clearCache: () => responseCache.clear(),
    invalidateCache: (pattern) => {
        for (const key of responseCache.keys()) {
            if (key.includes(pattern)) {
                responseCache.delete(key)
            }
        }
    }
}

/**
 * Typed API endpoints for Code City
 */
export const codeCity = {
    // Health check
    health: () => api.get('/health', { cache: true }),

    // Analysis
    analyze: (projectPath) =>
        api.post('/analyze', { project_path: projectPath }),

    analyzeGithub: (repoUrl, options = {}) =>
        api.post('/analyze/github', { repo_url: repoUrl, ...options }),

    // Search
    search: (query, cityData) =>
        api.post('/search', { query, city_data: cityData }),

    // AI Chat
    chat: (message, context = {}) =>
        api.post('/chat', { message, ...context }),

    // File operations
    readFile: (filePath) =>
        api.get(`/files/read?path=${encodeURIComponent(filePath)}`),

    // History
    getHistory: () =>
        api.get('/history', { cache: true }),

    addToHistory: (entry) =>
        api.post('/history', entry),

    clearHistory: () =>
        api.delete('/history')
}

export default api
