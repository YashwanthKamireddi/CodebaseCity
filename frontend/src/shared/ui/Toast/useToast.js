import { create } from 'zustand'

let toastId = 0

export const useToastStore = create((set, get) => ({
    toasts: [],

    add: (toast) => {
        const id = ++toastId
        const newToast = { id, ...toast }

        set((state) => ({
            toasts: [...state.toasts, newToast]
        }))

        return id
    },

    dismiss: (id) => {
        set((state) => ({
            toasts: state.toasts.filter((t) => t.id !== id)
        }))
    },

    dismissAll: () => {
        set({ toasts: [] })
    }
}))

// Convenience functions for direct usage
export const toast = {
    success: (title, message, options = {}) =>
        useToastStore.getState().add({ type: 'success', title, message, ...options }),

    error: (title, message, options = {}) =>
        useToastStore.getState().add({ type: 'error', title, message, ...options }),

    warning: (title, message, options = {}) =>
        useToastStore.getState().add({ type: 'warning', title, message, ...options }),

    info: (title, message, options = {}) =>
        useToastStore.getState().add({ type: 'info', title, message, ...options }),

    dismiss: (id) => useToastStore.getState().dismiss(id),

    dismissAll: () => useToastStore.getState().dismissAll()
}

// Hook for components
export function useToast() {
    const { add, dismiss, dismissAll, toasts } = useToastStore()

    return {
        toasts,
        toast: {
            success: (title, message, options) => add({ type: 'success', title, message, ...options }),
            error: (title, message, options) => add({ type: 'error', title, message, ...options }),
            warning: (title, message, options) => add({ type: 'warning', title, message, ...options }),
            info: (title, message, options) => add({ type: 'info', title, message, ...options })
        },
        dismiss,
        dismissAll
    }
}
