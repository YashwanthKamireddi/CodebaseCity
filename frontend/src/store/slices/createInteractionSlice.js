/**
 * Interaction Slice
 * Handles user interactions: Selection and Hovering.
 */
export const createInteractionSlice = (set) => ({
    // State
    selectedBuilding: null,
    selectedBuildingScreenY: null, // viewport Y of click, for panel placement
    hoveredBuilding: null,
    focusedDistrict: null,

    // Actions
    selectBuilding: (building, screenY = null) => {
        set({
            selectedBuilding: building,
            selectedBuildingScreenY: screenY,
            codeViewerOpen: false
        })
    },

    clearSelection: () => set({
        selectedBuilding: null,
        selectedBuildingScreenY: null,
        highlightedIssue: null
    }),

    setHoveredBuilding: (building) => set({ hoveredBuilding: building }),
    focusDistrict: (district) => set({ focusedDistrict: district }),
})
