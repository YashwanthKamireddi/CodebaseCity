import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID
// Must match the Authorization callback URL registered on the GitHub OAuth App
// (https://github.com/settings/applications). Falls back to current origin.
const REDIRECT_URI_OVERRIDE = import.meta.env.VITE_GITHUB_REDIRECT_URI
const STORAGE_KEY = 'codebase_city_user'

function resolveRedirectUri() {
  if (REDIRECT_URI_OVERRIDE) return REDIRECT_URI_OVERRIDE
  return `${window.location.origin}/`
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  // Load user from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    const returnedState = params.get('state')
    const oauthErr = params.get('error')
    if (oauthErr) {
      const desc = params.get('error_description') || oauthErr
      let msg = decodeURIComponent(desc.replace(/\+/g, ' '))
      if (oauthErr === 'redirect_uri_mismatch') {
        msg = `GitHub rejected the redirect URL. Add "${resolveRedirectUri()}" to your OAuth App's "Authorization callback URL" on github.com/settings/developers.`
      }
      setError(msg)
      sessionStorage.removeItem('oauth_state')
      window.history.replaceState({}, '', window.location.pathname)
      return
    }
    if (code) {
      const expected = sessionStorage.getItem('oauth_state')
      sessionStorage.removeItem('oauth_state')
      if (expected && returnedState && expected !== returnedState) {
        setError('Sign-in aborted: state mismatch. Please try again.')
        window.history.replaceState({}, '', window.location.pathname)
        return
      }
      exchangeCodeForToken(code)
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const exchangeCodeForToken = async (code) => {
    try {
      setLoading(true)
      setError(null)
      const res = await fetch('/api/auth/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })

      if (!res.ok) {
        let msg = `Sign-in failed (${res.status})`
        try {
          const body = await res.json()
          if (body?.error) msg = body.error
        } catch {
          // fall back to status-based message
        }
        throw new Error(msg)
      }

      const { user: userData, token } = await res.json()
      if (!userData || !token) throw new Error('Sign-in response missing user or token')

      const userWithToken = { ...userData, token }
      setUser(userWithToken)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithToken))
    } catch (err) {
      console.error('GitHub auth error:', err)
      setError(err?.message || 'Could not sign you in. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const login = useCallback(() => {
    if (!GITHUB_CLIENT_ID) {
      setError('GitHub sign-in is not configured (missing VITE_GITHUB_CLIENT_ID).')
      return
    }
    setError(null)
    const redirectUri = resolveRedirectUri()
    const scope = 'read:user'
    const state = Math.random().toString(36).slice(2) + Date.now().toString(36)
    sessionStorage.setItem('oauth_state', state)
    const authUrl =
      `https://github.com/login/oauth/authorize` +
      `?client_id=${encodeURIComponent(GITHUB_CLIENT_ID)}` +
      `&redirect_uri=${encodeURIComponent(redirectUri)}` +
      `&scope=${encodeURIComponent(scope)}` +
      `&state=${encodeURIComponent(state)}`
    window.location.href = authUrl
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    setError(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  const clearError = useCallback(() => setError(null), [])

  return (
    <AuthContext.Provider value={{ user, loading, error, login, logout, clearError, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
