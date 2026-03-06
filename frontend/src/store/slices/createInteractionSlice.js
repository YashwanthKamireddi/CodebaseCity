import logger from '../../utils/logger'

/**
 * Interaction Slice
 * Handles user interactions: Selection, Hovering, and Graph Tracing.
 * Fully client-side — BFS on in-memory road graph.
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

    traceDependency: (sourceQuery, targetQuery) => {
        const { cityData } = get()
        if (!cityData) return

        const findId = (q) => cityData.buildings.find(b => b.name.toLowerCase().includes(q.toLowerCase()))?.id

        const sourceId = findId(sourceQuery)
        const targetId = findId(targetQuery)

        if (!sourceId || !targetId) {
            logger.warn("Could not resolve trace IDs", { sourceQuery, targetQuery })
            return
        }

        // BFS shortest path through roads
        const adj = new Map()
        ;(cityData.roads || []).forEach(r => {
            if (!adj.has(r.source)) adj.set(r.source, [])
            adj.get(r.source).push(r.target)
        })

        const queue = [[sourceId]]
        const visited = new Set([sourceId])

        while (queue.length > 0) {
            const path = queue.shift()
            const current = path[path.length - 1]

            if (current === targetId) {
                const edges = []
                for (let i = 0; i < path.length - 1; i++) {
                    edges.push({ source: path[i], target: path[i + 1] })
                }
                set({
                    activeTrace: { source: sourceId, target: targetId, path, edges },
                    highlightedIssue: { type: 'trace', paths: path }
                })
                return
            }

            for (const neighbor of (adj.get(current) || [])) {
                if (!visited.has(neighbor)) {
                    visited.add(neighbor)
                    queue.push([...path, neighbor])
                }
            }
        }

        // No path found
        set({ activeTrace: null, highlightedIssue: null })
    }
})
