/**
 * @fileoverview Shared module barrel export
 * Reusable UI components, animations, and utilities
 * @module @shared
 */

// UI Components
export { default as ErrorBoundary } from './ui/ErrorBoundary'
export { default as LoadingScreen } from './ui/LoadingScreen'

// Toast System
export { Toast, ToastContainer, useToast, useToastStore, toast } from './ui/Toast'

// Animations
export { useExitAnimation } from './animations/useExitAnimation'
export { variants } from './animations/variants'
