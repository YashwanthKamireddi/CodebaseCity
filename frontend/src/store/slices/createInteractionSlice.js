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
    selectedLandmark: null, // 'reactor' | 'mothership' | null

    // Actions
    selectBuilding: (building, screenY = null) => {
        set({
            selectedBuilding: building,
            selectedBuildingScreenY: screenY,
            selectedLandmark: null,
            codeViewerOpen: false
        })
    },

    clearSelection: () => set({
        selectedBuilding: null,
        selectedBuildingScreenY: null,
        highlightedIssue: null,
        selectedLandmark: null,
    }),

    selectLandmark: (landmark) => set({
        selectedLandmark: landmark,
        selectedBuilding: null,
        selectedBuildingScreenY: null,
        codeViewerOpen: false,
    }),

    setHoveredBuilding: (building) => set({ hoveredBuilding: building }),
    focusDistrict: (district) => set({ focusedDistrict: district }),
})
