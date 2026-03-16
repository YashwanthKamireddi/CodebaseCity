import React, { useEffect, useState } from 'react'
import { X, CheckCircle, AlertCircle, Info, AlertTriangle } from 'lucide-react'
import './Toast.css'

const ICONS = {
    success: CheckCircle,
    error: AlertCircle,
    warning: AlertTriangle,
    info: Info
}

export function Toast({
    id,
    type = 'info',
    title,
    message,
    duration = 5000,
    onDismiss
}) {
    const [isExiting, setIsExiting] = useState(false)
    const Icon = ICONS[type] || Info

    useEffect(() => {
        if (duration > 0) {
            const timer = setTimeout(() => {
                setIsExiting(true)
            }, duration)
            return () => clearTimeout(timer)
        }
    }, [duration])

    useEffect(() => {
        if (isExiting) {
            const timer = setTimeout(() => {
                onDismiss?.(id)
            }, 200)
            return () => clearTimeout(timer)
        }
    }, [isExiting, id, onDismiss])

    const handleDismiss = () => {
        setIsExiting(true)
    }

    return (
        <div
            className={`toast toast--${type} ${isExiting ? 'toast--exiting' : 'toast--entering'}`}
            role="alert"
            aria-live="polite"
        >
            <div className="toast__icon">
                <Icon size={20} />
            </div>

            <div className="toast__content">
                {title && <div className="toast__title">{title}</div>}
                {message && <div className="toast__message">{message}</div>}
            </div>

            <button
                className="toast__close"
                onClick={handleDismiss}
                aria-label="Dismiss notification"
            >
                <X size={16} />
            </button>

            {duration > 0 && (
                <div
                    className="toast__progress"
                    style={{ animationDuration: `${duration}ms` }}
                />
            )}
        </div>
    )
}
