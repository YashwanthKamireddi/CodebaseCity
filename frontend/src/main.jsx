import React from 'react'
import ReactDOM from 'react-dom/client'
import * as Sentry from '@sentry/react'
import App from './App'
import './index.css'
import './shared/animations/animations.css'
import { ErrorBoundary } from './shared/ui/ErrorBoundary'

function initAnalytics() {
    const analyticsDomain = import.meta.env.VITE_ANALYTICS_DOMAIN
    if (!analyticsDomain || document.querySelector('script[data-codebase-analytics="plausible"]')) return

    const script = document.createElement('script')
    script.defer = true
    script.dataset.domain = analyticsDomain
    script.dataset.codebaseAnalytics = 'plausible'
    script.src = 'https://plausible.io/js/script.js'
    document.head.appendChild(script)
}

// Initialize Sentry only when a DSN is provided via VITE_SENTRY_DSN env variable.
// Set the variable in .env.production (never commit the DSN to source control).
if (import.meta.env.VITE_SENTRY_DSN) {
    Sentry.init({
        dsn: import.meta.env.VITE_SENTRY_DSN,
        environment: import.meta.env.MODE,
        // Capture 10% of traces — keep free-tier quota headroom
        tracesSampleRate: 0.1,
        // Disable session replays (privacy-first)
        replaysSessionSampleRate: 0,
        replaysOnErrorSampleRate: 0,
        // Ignore known harmless errors
        ignoreErrors: [
            'ResizeObserver loop limit exceeded',
            'ResizeObserver loop completed with undelivered notifications',
        ],
    })
}

initAnalytics()

ReactDOM.createRoot(document.getElementById('root')).render(
    <React.StrictMode>
        <ErrorBoundary>
            <App />
        </ErrorBoundary>
    </React.StrictMode>,
)
