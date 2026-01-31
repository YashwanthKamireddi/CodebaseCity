import React from 'react'
import { AnimatePresence } from 'framer-motion'
import { Toast } from './Toast'
import { useToastStore } from './useToast'
import './ToastContainer.css'

export function ToastContainer() {
    const { toasts, dismiss } = useToastStore()

    return (
        <div
            className="toast-container"
            role="region"
            aria-label="Notifications"
        >
            <AnimatePresence mode="popLayout">
                {toasts.map((toast) => (
                    <Toast
                        key={toast.id}
                        {...toast}
                        onDismiss={dismiss}
                    />
                ))}
            </AnimatePresence>
        </div>
    )
}
