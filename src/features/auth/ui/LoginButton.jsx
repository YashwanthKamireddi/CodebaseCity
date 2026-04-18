import React from 'react'
import { Github, LogOut } from 'lucide-react'
import { useAuth } from '../AuthProvider'
import './LoginButton.css'

export default function LoginButton() {
  const { user, loading, login, logout, isAuthenticated } = useAuth()

  if (loading) {
    return <div className="login-button loading">...</div>
  }

  if (isAuthenticated) {
    return (
      <div className="user-menu">
        <img src={user.avatar_url} alt={user.login} className="user-avatar" />
        <span className="user-name">{user.login}</span>
        <button onClick={logout} className="logout-btn" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    )
  }

  return (
    <button onClick={login} className="login-button">
      <Github size={18} />
      <span>Sign in with GitHub</span>
    </button>
  )
}
