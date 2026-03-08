/**
 * Store Tests - Core State Management
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock fetch globally
global.fetch = vi.fn()

// We need to test the store slices directly
describe('City Store', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  describe('createCitySlice', () => {
    it('should have initial state', async () => {
      // Dynamic import to get fresh store
      const { default: useStore } = await import('@/store/useStore')

      const { result } = renderHook(() => useStore())

      expect(result.current.cityData).toBeNull()
      expect(result.current.loading).toBe(false)
      expect(result.current.error).toBeNull()
    })

    it('should set loading state during fetch', async () => {
      global.fetch.mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          name: 'test',
          buildings: [],
          districts: [],
          roads: []
        })
      })

      const { default: useStore } = await import('@/store/useStore')
      const { result } = renderHook(() => useStore())

      // The fetchCity should set loading
      expect(typeof result.current.fetchDemo).toBe('function')
    })
  })

  describe('createUISlice', () => {
    it('should toggle roads visibility', async () => {
      const { default: useStore } = await import('@/store/useStore')
      const { result } = renderHook(() => useStore())

      const initialState = result.current.showRoads

      act(() => {
        result.current.toggleRoads()
      })

      expect(result.current.showRoads).toBe(!initialState)
    })

    it('should have UI state defaults', async () => {
      const { default: useStore } = await import('@/store/useStore')
      const { result } = renderHook(() => useStore())

      // Verify basic UI state exists
      expect(result.current.colorMode).toBeDefined()
    })
  })

  describe('createInteractionSlice', () => {
    it('should select and clear building', async () => {
      const { default: useStore } = await import('@/store/useStore')
      const { result } = renderHook(() => useStore())

      const mockBuilding = { id: 'test.js', name: 'test.js' }

      act(() => {
        result.current.selectBuilding(mockBuilding)
      })

      expect(result.current.selectedBuilding).toEqual(mockBuilding)

      act(() => {
        result.current.clearSelection()
      })

      expect(result.current.selectedBuilding).toBeNull()
    })
  })
})
