import { Github, Building2, Sparkles, Globe, Zap, AlertCircle } from 'lucide-react'
import { useAuth } from '../AuthProvider'
import './LoginGate.css'

/**
 * LoginGate — Full-screen login page shown before accessing the app.
 * Beautiful, welcoming, showcases what Codebase City offers.
 */
export default function LoginGate() {
    const { login, loading, error, clearError } = useAuth()

    return (
        <div className="login-gate">
            {/* Animated background */}
            <div className="login-gate-bg">
                <div className="login-gate-grid" />
                <div className="login-gate-glow" />
            </div>

            <div className="login-gate-content">
                {/* Logo & Title */}
                <div className="login-gate-header">
                    <div className="login-gate-logo">
                        <Building2 size={48} strokeWidth={1.5} />
                    </div>
                    <h1 className="login-gate-title">Codebase City</h1>
                    <p className="login-gate-subtitle">
                        Visualize any GitHub repository as an interactive 3D city
                    </p>
                </div>

                {/* Features */}
                <div className="login-gate-features">
                    <div className="login-gate-feature">
                        <Globe size={24} />
                        <div>
                            <h3>Universe Mode</h3>
                            <p>See all your repos as one city</p>
                        </div>
                    </div>
                    <div className="login-gate-feature">
                        <Sparkles size={24} />
                        <div>
                            <h3>AI Insights</h3>
                            <p>Get code analysis with AI</p>
                        </div>
                    </div>
                    <div className="login-gate-feature">
                        <Zap size={24} />
                        <div>
                            <h3>5,000 API calls/hr</h3>
                            <p>Full access to GitHub API</p>
                        </div>
                    </div>
                </div>

                {/* Login Button */}
                <button
                    onClick={login}
                    className="login-gate-button"
                    disabled={loading}
                >
                    <Github size={22} />
                    <span>{loading ? 'Signing in...' : 'Sign in with GitHub'}</span>
                </button>

                {error && (
                    <div className="login-gate-error" role="alert">
                        <AlertCircle size={16} />
                        <span>{error}</span>
                        <button onClick={clearError} className="login-gate-error-close" aria-label="Dismiss">✕</button>
                    </div>
                )}

                <p className="login-gate-note">
                    We only request read access to your public profile.
                    <br />
                    No repo write permissions needed.
                </p>
            </div>
        </div>
    )
}
