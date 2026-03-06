import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import useStore from '../../../store/useStore'
import logger from '../../../utils/logger'

/**
 * Handles the redirect callback from the FastAPI GitHub OAuth flow.
 * Extracts the token query parameter, saves it to Zustand/localStorage, and redirects.
 */
export default function AuthCallback() {
    const { setAuthToken } = useStore()

    useEffect(() => {
        // Parse the JWT token from the URL injected by FastAPI RedirectResponse
        const urlParams = new URLSearchParams(window.location.search)
        const token = urlParams.get('token')

        if (token) {
            setAuthToken(token)
            // Clean up the URL securely without reloading the page
            window.history.replaceState({}, document.title, '/')
        } else {
            logger.error("No token found in callback URL")
            window.location.replace('/')
        }
    }, [setAuthToken])

    return (
        <div style={{
            width: '100vw',
            height: '100vh',
            display: 'flex',
            flexDirection: 'column',
            justifyContent: 'center',
            alignItems: 'center',
            backgroundColor: 'var(--color-bg)',
            color: 'var(--color-text-active)'
        }}>
            <motion.div
                animate={{ rotate: 360 }}
                transition={{ duration: 1.5, repeat: Infinity, ease: 'linear' }}
                style={{
                    width: 48,
                    height: 48,
                    border: '3px solid rgba(0, 242, 255, 0.2)',
                    borderTop: '3px solid var(--color-accent-primary)',
                    borderRadius: '50%',
                    marginBottom: 24
                }}
            />
            <h2 style={{ fontFamily: 'var(--font-mono)', fontSize: '1.2rem', textShadow: 'var(--glow-accent)' }}>
                ESTABLISHING SECURE SESSION
            </h2>
            <p style={{ opacity: 0.6, marginTop: 8 }}>Exchanging cryptographic tokens with GitHub...</p>
        </div>
    )
}
