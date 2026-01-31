import { create } from 'zustand'
import { persist, createJSONStorage } from 'zustand/middleware'

export const useBookmarksStore = create(
    persist(
        (set, get) => ({
            bookmarks: [],
            isPanelOpen: false,

            setPanelOpen: (isOpen) => set({ isPanelOpen: isOpen }),

            addBookmark: (bookmark) => set((state) => ({
                bookmarks: [
                    ...state.bookmarks,
                    {
                        id: crypto.randomUUID(),
                        createdAt: Date.now(),
                        ...bookmark
                    }
                ]
            })),

            removeBookmark: (id) => set((state) => ({
                bookmarks: state.bookmarks.filter(b => b.id !== id)
            })),

            updateBookmark: (id, updates) => set((state) => ({
                bookmarks: state.bookmarks.map(b => b.id === id ? { ...b, ...updates } : b)
            })),

            // Camera Capture Bridge (Set by Canvas component)
            cameraRef: null,
            controlsRef: null,
            setCameraRefs: (camera, controls) => set({ cameraRef: camera, controlsRef: controls }),

            // Action to Capture Current View
            captureView: () => {
                const { cameraRef, controlsRef } = get()
                if (!cameraRef || !controlsRef) return null

                return {
                    position: cameraRef.position.toArray(),
                    rotation: cameraRef.rotation.toArray(),
                    target: controlsRef.target.toArray(),
                    zoom: cameraRef.zoom
                }
            }
        }),
        {
            name: 'code-city-bookmarks',
            storage: createJSONStorage(() => localStorage),
            partialize: (state) => ({ bookmarks: state.bookmarks }), // Only persist bookmarks
        }
    )
)
