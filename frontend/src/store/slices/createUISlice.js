/**
 * UI Slice
 * Handles application interface state: Sidebars, Modals, Themes, View Modes, and Camera Actions.
 */

// Theme is always dark — this is a 3D city visualization
const getInitialTheme = () => 'dark'

export const createUISlice = (set, get) => ({
    // State
    sidebarOpen: true,
    viewMode: 'orbit', // orbit | street | overview
    colorMode: 'default', // default | layer | churn | language | author
    renderMode: 'lod2', // 'instanced' (fast) | 'lod2' (realistic CityGML)
    showRoads: false,
    theme: getInitialTheme(),
    ufoMode: false,

    // Modals & Panels
    commandPaletteOpen: false,
    codeViewerOpen: false,
    exportReportOpen: false,
    ufoIntroOpen: false,

    // Highlights
    highlightedCategory: null, // { type: 'language' | 'health' | 'district', value: string }
    highlightedIssue: null, // { type: 'string', paths: string[] }

    // Camera
    cameraAction: null, // { type: 'ZOOM_IN' | 'ZOOM_OUT' | 'FIT' | 'RESET' | 'CENTER', timestamp: number }
    screenshotRequest: 0,

    // Actions
    setViewMode: (mode) => set({ viewMode: mode }),
    setColorMode: (mode) => set({ colorMode: mode }),
    setRenderMode: (mode) => set({ renderMode: mode }),

    toggleRoads: () => set((state) => ({ showRoads: !state.showRoads })),

    setSidebarOpen: (open) => set({ sidebarOpen: open }),

    // Sidebar Resizing
    sidebarWidth: 280,
    setSidebarWidth: (width) => set({ sidebarWidth: width }),

    // Mutually Exclusive Modals
    setCommandPaletteOpen: (open) => set({
        commandPaletteOpen: open,
    }),

    setCodeViewerOpen: (open) => set({ codeViewerOpen: open }),
    setExportReportOpen: (open) => set({ exportReportOpen: open }),

    // Highlighting
    setHighlightedCategory: (category) => set({ highlightedCategory: category }),
    setHighlightedIssue: (issue) => set({ highlightedIssue: issue }),

    // Camera
    setCameraAction: (type) => set({ cameraAction: { type, timestamp: Date.now() } }),
    setScreenshotRequest: (timestamp) => set({ screenshotRequest: timestamp }),

    // UFO Mode
    setUfoMode: (enabled) => set({ ufoMode: enabled, ufoIntroOpen: enabled }),
    closeUfoIntro: () => set({ ufoIntroOpen: false }),

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
