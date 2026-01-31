import React from 'react'
import { AlertTriangle, RefreshCw, Home, Bug } from 'lucide-react'

/**
 * ErrorBoundary
 *
 * World-class error handling with:
 * - Clean, professional error display
 * - Error reporting capability
 * - Recovery options
 * - Development mode details
 */
export class ErrorBoundary extends React.Component {
    constructor(props) {
        super(props)
        this.state = {
            hasError: false,
            error: null,
            errorInfo: null,
            errorId: null
        }
    }

    static getDerivedStateFromError(error) {
        // Generate unique error ID for tracking
        const errorId = `ERR-${Date.now().toString(36).toUpperCase()}`
        return { hasError: true, error, errorId }
    }

    componentDidCatch(error, errorInfo) {
        console.error("[ErrorBoundary] Caught error:", error)
        console.error("[ErrorBoundary] Component stack:", errorInfo?.componentStack)

        this.setState({ errorInfo })

        // Report to error tracking service (Sentry, etc.)
        this.reportError(error, errorInfo)
    }

    reportError = (error, errorInfo) => {
        // Would integrate with Sentry/DataDog/etc. in production
        if (typeof window !== 'undefined' && window.Sentry) {
            window.Sentry.captureException(error, {
                extra: {
                    componentStack: errorInfo?.componentStack,
                    errorId: this.state.errorId
                }
            })
        }
    }

    handleReload = () => {
        window.location.reload()
    }

    handleGoHome = () => {
        window.location.href = '/'
    }

    handleReset = () => {
        this.setState({ hasError: false, error: null, errorInfo: null })
    }

    render() {
        if (this.state.hasError) {
            const isDev = import.meta.env?.DEV

            return (
                <div className="error-boundary">
                    <style>{`
                        .error-boundary {
                            min-height: 100vh;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            background: linear-gradient(135deg, #0f0f11 0%, #1a1a2e 100%);
                            padding: 2rem;
                            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
                        }
                        .error-card {
                            max-width: 600px;
                            background: rgba(15, 15, 17, 0.95);
                            border: 1px solid rgba(239, 68, 68, 0.2);
                            border-radius: 16px;
                            padding: 2.5rem;
                            box-shadow: 0 25px 50px -12px rgba(0, 0, 0, 0.5),
                                        0 0 100px rgba(239, 68, 68, 0.1);
                        }
                        .error-icon {
                            width: 64px;
                            height: 64px;
                            background: rgba(239, 68, 68, 0.1);
                            border-radius: 16px;
                            display: flex;
                            align-items: center;
                            justify-content: center;
                            margin-bottom: 1.5rem;
                        }
                        .error-icon svg {
                            width: 32px;
                            height: 32px;
                            color: #ef4444;
                        }
                        .error-title {
                            font-size: 1.5rem;
                            font-weight: 600;
                            color: #fafafa;
                            margin: 0 0 0.5rem;
                        }
                        .error-message {
                            font-size: 1rem;
                            color: #a1a1aa;
                            margin: 0 0 1.5rem;
                            line-height: 1.6;
                        }
                        .error-id {
                            font-family: 'SF Mono', Monaco, monospace;
                            font-size: 0.75rem;
                            color: #71717a;
                            background: rgba(255, 255, 255, 0.05);
                            padding: 0.25rem 0.5rem;
                            border-radius: 4px;
                            margin-bottom: 1.5rem;
                            display: inline-block;
                        }
                        .error-actions {
                            display: flex;
                            gap: 0.75rem;
                            flex-wrap: wrap;
                        }
                        .error-btn {
                            display: inline-flex;
                            align-items: center;
                            gap: 0.5rem;
                            padding: 0.75rem 1.25rem;
                            border-radius: 8px;
                            font-size: 0.875rem;
                            font-weight: 500;
                            cursor: pointer;
                            transition: all 0.2s;
                            border: none;
                        }
                        .error-btn-primary {
                            background: #3b82f6;
                            color: white;
                        }
                        .error-btn-primary:hover {
                            background: #2563eb;
                        }
                        .error-btn-secondary {
                            background: rgba(255, 255, 255, 0.05);
                            color: #d4d4d8;
                            border: 1px solid rgba(255, 255, 255, 0.1);
                        }
                        .error-btn-secondary:hover {
                            background: rgba(255, 255, 255, 0.1);
                        }
                        .error-details {
                            margin-top: 1.5rem;
                            padding: 1rem;
                            background: rgba(0, 0, 0, 0.3);
                            border-radius: 8px;
                            border: 1px solid rgba(255, 255, 255, 0.05);
                        }
                        .error-details summary {
                            cursor: pointer;
                            color: #71717a;
                            font-size: 0.875rem;
                            display: flex;
                            align-items: center;
                            gap: 0.5rem;
                        }
                        .error-details pre {
                            margin: 1rem 0 0;
                            padding: 1rem;
                            background: rgba(0, 0, 0, 0.3);
                            border-radius: 6px;
                            font-size: 0.75rem;
                            color: #a1a1aa;
                            overflow-x: auto;
                            white-space: pre-wrap;
                            word-break: break-word;
                        }
                    `}</style>

                    <div className="error-card" role="alert" aria-live="assertive">
                        <div className="error-icon">
                            <AlertTriangle />
                        </div>

                        <h1 className="error-title">Something went wrong</h1>
                        <p className="error-message">
                            We encountered an unexpected error. The issue has been logged
                            and we're working to fix it. Please try refreshing the page.
                        </p>

                        {this.state.errorId && (
                            <div className="error-id">
                                Error ID: {this.state.errorId}
                            </div>
                        )}

                        <div className="error-actions">
                            <button
                                className="error-btn error-btn-primary"
                                onClick={this.handleReload}
                            >
                                <RefreshCw size={16} />
                                Refresh Page
                            </button>

                            <button
                                className="error-btn error-btn-secondary"
                                onClick={this.handleGoHome}
                            >
                                <Home size={16} />
                                Go Home
                            </button>

                            {this.props.fallback !== undefined && (
                                <button
                                    className="error-btn error-btn-secondary"
                                    onClick={this.handleReset}
                                >
                                    Try Again
                                </button>
                            )}
                        </div>

                        {isDev && this.state.error && (
                            <details className="error-details">
                                <summary>
                                    <Bug size={14} />
                                    Developer Details
                                </summary>
                                <pre>{this.state.error.toString()}</pre>
                                {this.state.errorInfo?.componentStack && (
                                    <pre>{this.state.errorInfo.componentStack}</pre>
                                )}
                            </details>
                        )}
                    </div>
                </div>
            )
        }

        return this.props.children
    }
}
