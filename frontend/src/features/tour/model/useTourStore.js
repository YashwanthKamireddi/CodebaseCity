import { create } from 'zustand'

export const useTourStore = create((set, get) => ({
    isTourActive: false,
    currentStepIndex: 0,
    tourData: [], // [{ target: [x,y,z], position: [x,y,z], text: "..." }]
    message: null,

    startTour: (cityData) => {
        if (!cityData?.buildings) return

        // Generate dynamic waypoints based on city data
        const waypoints = []

        // 1. Intro (High View)
        waypoints.push({
            position: [200, 200, 200],
            target: [0, 0, 0],
            text: "Welcome to Code City. This is a 3D visualization of your software architecture.",
            duration: 5000
        })

        // 2. The Core (Largest Building)
        const sorted = [...cityData.buildings].sort((a, b) => (b.dimensions?.height || 0) - (a.dimensions?.height || 0))
        const tallest = sorted[0]
        if (tallest) {
            waypoints.push({
                position: [tallest.position.x + 40, tallest.dimensions.height + 40, tallest.position.z + 40],
                target: [tallest.position.x, tallest.dimensions.height/2, tallest.position.z],
                text: `This is ${tallest.name}, the tallest structure in the city. Height represents lines of code or complexity.`,
                duration: 6000
            })
        }

        // 3. The "Busy" District (Most Connections)
        // Mock heuristic: finding a central point
        waypoints.push({
            position: [50, 80, 50],
            target: [0, 0, 0],
            text: "Dependencies form roads between buildings. A dense web of roads indicates high coupling.",
            duration: 5000
        })

        // 4. Outro
        waypoints.push({
            position: [-100, 150, -100],
            target: [0, 0, 0],
            text: "Explore freely. Use the Command Palette (Cmd+K) to access advanced analysis tools.",
            duration: 4000
        })

        set({
            isTourActive: true,
            currentStepIndex: 0,
            tourData: waypoints,
            message: waypoints[0].text
        })
    },

    stopTour: () => {
        set({ isTourActive: false, currentStepIndex: 0, message: null })
    },

    nextStep: () => {
        const { currentStepIndex, tourData } = get()
        if (currentStepIndex < tourData.length - 1) {
            const next = currentStepIndex + 1
            set({
                currentStepIndex: next,
                message: tourData[next].text
            })
        } else {
            get().stopTour()
        }
    }
}))
