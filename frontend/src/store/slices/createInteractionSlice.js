const API_BASE = '/api'

/**
 * Interaction Slice
 * Handles user interactions with the 3D City: Selection, Hovering, and Graph Tracing.
 */
export const createInteractionSlice = (set, get) => ({
    // State
    selectedBuilding: null,
    hoveredBuilding: null,
    focusedDistrict: null,

    // Graph State
    graphNeighbors: { dependencies: [], dependents: [] },
    activeTrace: null, // { source, target, path: [], edges: [] }

    // Actions
    selectBuilding: (building) => {
        set({
            selectedBuilding: building,
            codeViewerOpen: false // Close code viewer on new selection (Cross-slice, acceptable)
        })
        get().calculateNeighbors(building?.id) // Trigger calculation
    },

    clearSelection: () => set({
        selectedBuilding: null,
        graphNeighbors: { dependencies: [], dependents: [] },
        activeTrace: null,
        highlightedIssue: null // Clear highlights
    }),

    setHoveredBuilding: (building) => set({ hoveredBuilding: building }),
    focusDistrict: (district) => set({ focusedDistrict: district }),

    calculateNeighbors: (buildingId) => {
        if (!buildingId) {
            set({ graphNeighbors: { dependencies: [], dependents: [] } })
            return
        }

        const { cityData } = get()
        if (!cityData) return

        const dependencies = []
        const dependents = []

        // Brute force edge check (fast enough for <10k edges in memory)
        // Optimization: Could use adjacency list if cityData provided it pre-calculated
        cityData.roads.forEach(road => {
            if (road.source === buildingId) {
                dependencies.push(road.target)
            }
            if (road.target === buildingId) {
                dependents.push(road.source)
            }
        })

        set({ graphNeighbors: { dependencies, dependents } })
    },

    traceDependency: async (sourceQuery, targetQuery) => {
        const { cityData } = get()
        if (!cityData) return

        // Simple fuzzy find for IDs
        const findId = (q) => cityData.buildings.find(b => b.name.toLowerCase().includes(q.toLowerCase()))?.id

        const sourceId = findId(sourceQuery)
        const targetId = findId(targetQuery)

        if (!sourceId || !targetId) {
             console.warn("Could not resolve trace IDs", { sourceQuery, targetQuery })
             return
        }

        try {
            const res = await fetch(`${API_BASE}/v2/graph/trace`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ city_id: cityData.name || 'default', source: sourceId, target: targetId })
            })

            if (!res.ok) throw new Error("Trace failed")
            const data = await res.json()

            if (data.found) {
                set({
                    activeTrace: { source: sourceId, target: targetId, path: data.path, edges: data.edges },
                    highlightedIssue: { type: 'trace', paths: data.path } // Cross-slice UI update
                })
            } else {
                set({ activeTrace: null, highlightedIssue: null })
            }
        } catch (e) {
            console.error("Trace error", e)
            set({ activeTrace: null })
        }
    }
})
