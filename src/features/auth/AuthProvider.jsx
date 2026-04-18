import React, { createContext, useContext, useState, useEffect, useCallback } from 'react'

const AuthContext = createContext(null)

const GITHUB_CLIENT_ID = import.meta.env.VITE_GITHUB_CLIENT_ID
const STORAGE_KEY = 'codebase_city_user'

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  // Load user from storage on mount
  useEffect(() => {
    const stored = localStorage.getItem(STORAGE_KEY)
    if (stored) {
      try {
        setUser(JSON.parse(stored))
      } catch (e) {
        localStorage.removeItem(STORAGE_KEY)
      }
    }
    setLoading(false)
  }, [])

  // Handle OAuth callback
  useEffect(() => {
    const params = new URLSearchParams(window.location.search)
    const code = params.get('code')
    if (code) {
      exchangeCodeForToken(code)
      // Clean URL
      window.history.replaceState({}, '', window.location.pathname)
    }
  }, [])

  const exchangeCodeForToken = async (code) => {
    try {
      setLoading(true)
      // Call our serverless function to exchange code for token
      const res = await fetch('/api/auth/github', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code })
      })
      
      if (!res.ok) throw new Error('Auth failed')
      
      const { user: userData, token } = await res.json()
      const userWithToken = { ...userData, token }
      
      setUser(userWithToken)
      localStorage.setItem(STORAGE_KEY, JSON.stringify(userWithToken))
    } catch (err) {
      console.error('GitHub auth error:', err)
    } finally {
      setLoading(false)
    }
  }

  const login = useCallback(() => {
    const redirectUri = `${window.location.origin}/`
    const scope = 'read:user'
    window.location.href = `https://github.com/login/oauth/authorize?client_id=${GITHUB_CLIENT_ID}&redirect_uri=${encodeURIComponent(redirectUri)}&scope=${scope}`
  }, [])

  const logout = useCallback(() => {
    setUser(null)
    localStorage.removeItem(STORAGE_KEY)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, isAuthenticated: !!user }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be inside AuthProvider')
  return ctx
}
