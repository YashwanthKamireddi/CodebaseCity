import { create } from 'zustand'

const API_BASE = '/api'

// Get initial theme from localStorage or system preference
const getInitialTheme = () => {
    if (typeof window !== 'undefined') {
        const stored = localStorage.getItem('codebase-city-theme')
        if (stored) return stored
        return window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark'
    }
    return 'dark'
}

const useStore = create((set, get) => ({
    // City Data State
    cityData: null,
    loading: false,
    error: null,
    analysisProgress: 0,

    // Selection State
    selectedBuilding: null,
    hoveredBuilding: null,
    focusedDistrict: null,

    // UI State
    viewMode: 'orbit', // orbit | street | overview
    showRoads: true,
    showLabels: true,
    nightMode: false,
    theme: getInitialTheme(), // 'light' | 'dark'

    // Chat State
    messages: [],
    chatLoading: false,

    // Actions
    setLoading: (loading) => set({ loading }),
    setError: (error) => set({ error, loading: false }),
    setProgress: (progress) => set({ analysisProgress: progress }),

    setCityData: (data) => set({
        cityData: data,
        loading: false,
        error: null,
        analysisProgress: 100
    }),

    selectBuilding: (building) => set({ selectedBuilding: building }),
    clearSelection: () => set({ selectedBuilding: null }),
    setHoveredBuilding: (building) => set({ hoveredBuilding: building }),
    focusDistrict: (district) => set({ focusedDistrict: district }),

    setViewMode: (mode) => set({ viewMode: mode }),
    toggleRoads: () => set((state) => ({ showRoads: !state.showRoads })),
    toggleLabels: () => set((state) => ({ showLabels: !state.showLabels })),
    toggleNightMode: () => set((state) => ({ nightMode: !state.nightMode })),

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
    },

    // API Actions
    fetchDemo: async () => {
        const { setLoading, setCityData, setError } = get()
        setLoading(true)

        try {
            const response = await fetch(`${API_BASE}/demo`)
            if (!response.ok) throw new Error('Failed to load demo')
            const data = await response.json()
            setCityData(data)
        } catch (error) {
            console.warn('API unavailable, using built-in demo data')
            setCityData(createDemoCity())
        }
    },

    analyzeRepo: async (path) => {
        const { setLoading, setCityData, setError, setProgress } = get()
        setLoading(true)
        setProgress(0)
        setError(null)

        try {
            setProgress(10)
            const response = await fetch(`${API_BASE}/analyze`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ path, max_files: 5000 })
            })

            setProgress(80)

            if (!response.ok) {
                // Parse error details from backend
                const errorData = await response.json().catch(() => ({}))
                const errorMessage = errorData.detail || `Analysis failed (${response.status})`
                throw new Error(errorMessage)
            }

            const data = await response.json()
            setCityData(data)
        } catch (error) {
            setError(error.message)
            setLoading(false)
        }
    },

    sendMessage: async (content) => {
        const { messages, cityData, selectedBuilding } = get()

        const userMessage = { role: 'user', content }
        set({
            messages: [...messages, userMessage],
            chatLoading: true
        })

        try {
            const response = await fetch(`${API_BASE}/chat`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    message: content,
                    context: {
                        current_building: selectedBuilding?.id,
                        city_stats: cityData?.stats
                    },
                    history: messages.slice(-6)
                })
            })

            if (!response.ok) throw new Error('Chat failed')

            const data = await response.json()
            set((state) => ({
                messages: [...state.messages, { role: 'assistant', content: data.message }],
                chatLoading: false
            }))
        } catch (error) {
            set((state) => ({
                messages: [...state.messages, {
                    role: 'assistant',
                    content: 'Unable to connect to the AI assistant. Please ensure the backend server is running.'
                }],
                chatLoading: false
            }))
        }
    }
}))

// Demo city with realistic data
function createDemoCity() {
    const districts = [
        { id: 'api', name: 'API Layer', color: '#3b82f6', center: { x: -60, y: 0 }, building_count: 5 },
        { id: 'services', name: 'Business Services', color: '#8b5cf6', center: { x: 0, y: 0 }, building_count: 8 },
        { id: 'data', name: 'Data Access', color: '#06b6d4', center: { x: 60, y: 0 }, building_count: 4 },
        { id: 'utils', name: 'Utilities', color: '#22c55e', center: { x: 0, y: 60 }, building_count: 5 },
        { id: 'auth', name: 'Authentication', color: '#f59e0b', center: { x: 0, y: -60 }, building_count: 4 }
    ]

    const buildings = [
        // API Layer
        createBuilding('api/routes.ts', 'api', -80, -15, 180, 14, 0.1, 'routing'),
        createBuilding('api/middleware.ts', 'api', -60, -15, 90, 8, 0.2, 'middleware'),
        createBuilding('api/validators.ts', 'api', -40, -15, 120, 7, 0.15, 'validation'),
        createBuilding('api/controllers.ts', 'api', -70, 10, 150, 11, 0.25, 'controller'),
        createBuilding('api/handlers.ts', 'api', -50, 10, 85, 6, 0.1, 'handler'),

        // Services
        createBuilding('services/UserService.ts', 'services', -20, -35, 320, 22, 0.3, 'service', true),
        createBuilding('services/OrderService.ts', 'services', 10, -35, 280, 18, 0.15, 'service'),
        createBuilding('services/PaymentService.ts', 'services', -20, -5, 240, 19, 0.2, 'service'),
        createBuilding('services/NotificationService.ts', 'services', 10, -5, 140, 10, 0.4, 'service'),
        createBuilding('services/AnalyticsService.ts', 'services', -20, 25, 180, 12, 0.1, 'service'),
        createBuilding('services/CacheService.ts', 'services', 10, 25, 95, 7, 0.35, 'service'),
        createBuilding('services/QueueService.ts', 'services', -5, 40, 110, 8, 0.2, 'service'),
        createBuilding('services/LegacyBilling.ts', 'services', 25, 40, 520, 28, 0.85, 'service', true),

        // Data Access
        createBuilding('data/UserRepository.ts', 'data', 45, -15, 160, 11, 0.2, 'repository'),
        createBuilding('data/OrderRepository.ts', 'data', 70, -15, 190, 13, 0.15, 'repository'),
        createBuilding('data/models/User.ts', 'data', 45, 10, 80, 5, 0.1, 'model'),
        createBuilding('data/models/Order.ts', 'data', 70, 10, 95, 6, 0.1, 'model'),

        // Utils
        createBuilding('utils/helpers.ts', 'utils', -15, 55, 380, 24, 0.7, 'utility'),
        createBuilding('utils/validators.ts', 'utils', 10, 55, 90, 6, 0.4, 'utility'),
        createBuilding('utils/formatters.ts', 'utils', -15, 75, 70, 4, 0.5, 'utility'),
        createBuilding('utils/constants.ts', 'utils', 10, 75, 45, 2, 0.2, 'config'),
        createBuilding('utils/logger.ts', 'utils', -2, 90, 110, 7, 0.3, 'utility'),

        // Auth
        createBuilding('auth/login.ts', 'auth', -15, -75, 170, 13, 0.2, 'auth'),
        createBuilding('auth/register.ts', 'auth', 10, -75, 145, 11, 0.2, 'auth'),
        createBuilding('auth/jwt.ts', 'auth', -15, -55, 100, 9, 0.35, 'auth'),
        createBuilding('auth/permissions.ts', 'auth', 10, -55, 130, 10, 0.25, 'auth')
    ]

    const roads = generateRoads(buildings)

    return {
        name: 'Demo Application',
        buildings,
        districts,
        roads,
        stats: {
            total_files: buildings.length,
            total_loc: buildings.reduce((sum, b) => sum + b.metrics.loc, 0),
            total_districts: districts.length,
            total_dependencies: roads.length,
            hotspots: buildings.filter(b => b.is_hotspot).length,
            avg_complexity: Math.round(buildings.reduce((sum, b) => sum + b.metrics.complexity, 0) / buildings.length)
        }
    }
}

function createBuilding(path, districtId, x, z, loc, complexity, decay, type, isHotspot = false) {
    const name = path.split('/').pop()
    const height = Math.max(3, complexity * 0.8)
    const width = Math.max(4, Math.sqrt(loc) * 0.4)

    return {
        id: path,
        name,
        path,
        district_id: districtId,
        type,
        position: { x, y: 0, z },
        dimensions: { width, height, depth: width },
        metrics: {
            loc,
            complexity,
            churn: isHotspot ? 18 : Math.floor(Math.random() * 8),
            age_days: Math.floor(decay * 700),
            dependencies_in: Math.floor(Math.random() * 12) + 1,
            dependencies_out: Math.floor(Math.random() * 6) + 1
        },
        language: 'typescript',
        decay_level: decay,
        is_hotspot: isHotspot
    }
}

function generateRoads(buildings) {
    const roads = []
    const servicePaths = buildings.filter(b => b.type === 'service').map(b => b.id)
    const apiPaths = buildings.filter(b => b.district_id === 'api').map(b => b.id)
    const dataPaths = buildings.filter(b => b.district_id === 'data').map(b => b.id)

    // API to Services
    apiPaths.forEach(api => {
        const targets = servicePaths.slice(0, 3)
        targets.forEach(target => {
            roads.push({ source: api, target, weight: 1, is_cross_district: true })
        })
    })

    // Services to Data
    servicePaths.forEach(service => {
        const targets = dataPaths.slice(0, 2)
        targets.forEach(target => {
            roads.push({ source: service, target, weight: 1, is_cross_district: true })
        })
    })

    // Utils dependencies
    const utilsPath = 'utils/helpers.ts'
    buildings.slice(0, 10).forEach(b => {
        if (b.id !== utilsPath) {
            roads.push({ source: b.id, target: utilsPath, weight: 1, is_cross_district: true })
        }
    })

    return roads
}

export default useStore
