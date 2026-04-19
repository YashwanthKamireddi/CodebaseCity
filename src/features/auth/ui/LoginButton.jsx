import { Github, LogOut, AlertCircle } from 'lucide-react'
import { useAuth } from '../AuthProvider'
import './LoginButton.css'

export default function LoginButton() {
  const { user, loading, login, logout, isAuthenticated, error, clearError } = useAuth()

  if (loading) {
    return <div className="login-button loading" aria-label="Signing in">...</div>
  }

  if (isAuthenticated) {
    return (
      <div className="user-menu">
        {user.avatar_url ? (
          <img src={user.avatar_url} alt="" className="user-avatar" />
        ) : null}
        <span className="user-name">{user.login}</span>
        <button onClick={logout} className="logout-btn" title="Sign out">
          <LogOut size={16} />
        </button>
      </div>
    )
  }

  return (
    <div className="login-button-wrap">
      <button onClick={login} className="login-button">
        <Github size={18} />
        <span>Sign in with GitHub</span>
      </button>
      {error && (
        <div className="login-button-error" role="alert">
          <AlertCircle size={14} />
          <span>{error}</span>
          <button onClick={clearError} className="login-button-error-close" aria-label="Dismiss">✕</button>
        </div>
      )}
    </div>
  )
}
