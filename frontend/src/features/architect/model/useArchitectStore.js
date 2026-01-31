import { create } from 'zustand'

export const useArchitectStore = create((set, get) => ({
    isArchitectMode: false,
    simulatedDeletions: new Set(), // Set of Building IDs
    blastRadius: [], // List of { source, target } edges that are broken

    setArchitectMode: (enabled) => set({ isArchitectMode: enabled }),

    toggleDeletion: (buildingId, cityData) => {
        const { simulatedDeletions } = get()
        const newDeletions = new Set(simulatedDeletions)

        if (newDeletions.has(buildingId)) {
            newDeletions.delete(buildingId)
        } else {
            newDeletions.add(buildingId)
        }

        // Calculate Blast Radius
        const brokenEdges = []
        if (cityData?.roads) {
            cityData.roads.forEach(road => {
                // If target is deleted, the source is "broken" (it imports something missing)
                if (newDeletions.has(road.target)) {
                    brokenEdges.push({
                        source: road.source,
                        target: road.target,
                        type: 'BROKEN_IMPORT'
                    })
                }
            })
        }

        set({
            simulatedDeletions: newDeletions,
            blastRadius: brokenEdges
        })
    },

    resetSimulation: () => set({ simulatedDeletions: new Set(), blastRadius: [], chaosSource: null }),

    // Phase 8: Chaos Simulator
    chaosSource: null, // Building ID that "failed"

    triggerOutage: (cityData) => {
         const { buildings, roads } = cityData
         if (!buildings || buildings.length === 0) return

         // 1. Pick Patient Zero (Weighted by complexity if possible, else random)
         const patientZero = buildings[Math.floor(Math.random() * buildings.length)]

         // 2. Calculate Cascading Failure (Reverse dependencies)
         // Who depends on Patient Zero?
         const failures = new Set([patientZero.id])
         const brokenEdges = []

         // Simple Cascade (Depth 1 for visual clarity, or recursive)
         roads.forEach(road => {
             if (road.target === patientZero.id) {
                 // Source depends on Target. Target failed. Source is broken.
                 brokenEdges.push({ source: road.source, target: road.target, type: 'CHAOS_FAILURE' })
             }
         })

         set({
             chaosSource: patientZero.id,
             simulatedDeletions: failures, // Visual reuse of "Deleted" state
             blastRadius: brokenEdges, // Visual reuse of "Broken" state
             isArchitectMode: true // Force mode
         })

         return patientZero
    }
}))
