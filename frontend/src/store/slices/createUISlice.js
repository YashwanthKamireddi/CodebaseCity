/**
 * UI Slice
 * Handles application interface state: Sidebars, Modals, Themes, View Modes, and Camera Actions.
 */

// Helper: Get initial theme
const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('codebase-city-theme')
        if (stored) return stored
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return 'dark'
}

export const createUISlice = (set, get) => ({
    // State
    sidebarOpen: true,
    viewMode: 'orbit', // orbit | street | overview
    colorMode: 'default', // default | layer | churn | language
    showRoads: false,
    showLabels: true,
    nightMode: false,
    theme: getInitialTheme(),

    // Modals & Panels
    commandPaletteOpen: false,
    analyzeModalOpen: true, // Open by default
    codeViewerOpen: false,

    // Highlights
    highlightedCategory: null, // { type: 'language' | 'health' | 'district', value: string }
    highlightedIssue: null, // { type: 'string', paths: string[] }

    // Camera
    cameraAction: null, // { type: 'ZOOM_IN' | 'ZOOM_OUT' | 'FIT' | 'RESET' | 'CENTER', timestamp: number }

    // Actions
    setViewMode: (mode) => set({ viewMode: mode }),
    setColorMode: (mode) => set({ colorMode: mode }),

    toggleRoads: () => set((state) => ({ showRoads: !state.showRoads })),
    toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
    toggleNightMode: () => set((state) => ({ nightMode: !state.nightMode })),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    // Mutually Exclusive Modals
    setCommandPaletteOpen: (open) => set((state) => ({
        commandPaletteOpen: open,
        analyzeModalOpen: open ? false : state.analyzeModalOpen
    })),

    setAnalyzeModalOpen: (open) => set((state) => ({
        analyzeModalOpen: open,
        commandPaletteOpen: open ? false : state.commandPaletteOpen
    })),

    setCodeViewerOpen: (open) => set({ codeViewerOpen: open }),

    // Highlighting
    setHighlightedCategory: (category) => set({ highlightedCategory: category }),
    setHighlightedIssue: (issue) => set({ highlightedIssue: issue }),

    // Camera
    setCameraAction: (type) => set({ cameraAction: { type, timestamp: Date.now() } }),

    // Theme Logic
    toggleTheme: () => set((state) => {
        const newTheme = state.theme === 'dark' ? 'light' : 'dark'
        localStorage.setItem('codebase-city-theme', newTheme)
        document.documentElement.setAttribute('data-theme', newTheme)
        return { theme: newTheme }
    }),

    setTheme: (theme) => {
        localStorage.setItem('codebase-city-theme', theme)
        document.documentElement.setAttribute('data-theme', theme)
        set({ theme })
    }
})
