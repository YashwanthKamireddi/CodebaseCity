/**
 * createCitySlice.test.js — Extended slice tests
 *
 * Tests the city slice's file content caching, color injection,
 * and AbortController-based cancellation.
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

// Mock the github API module used by the slice
vi.mock('../../../engine/api/githubApi', () => ({
  ghFetch: vi.fn(),
  ghFetchBatch: vi.fn(),
  ghFetchRaw: vi.fn(),
}))

global.fetch = vi.fn()

// Helper: get fresh store + slice helpers from the same module instance
async function freshStore() {
  vi.resetModules()
  const [{ default: useStore }, sliceModule] = await Promise.all([
    import('@/store/useStore'),
    import('@/store/slices/createCitySlice'),
  ])
  return { useStore, getCache: sliceModule.getFileContentCache, clearCache: sliceModule.clearFileContentCache }
}

describe('createCitySlice — setCityData', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('strips fileContents from Zustand state', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())

    const data = {
      buildings: [],
      districts: [],
      id: 'test',
      fileContents: { 'src/main.js': 'const x = 1' },
    }

    act(() => {
      result.current.setCityData(data)
    })

    // cityData in Zustand must NOT contain fileContents
    expect(result.current.cityData?.fileContents).toBeUndefined()
  })

  it('stores fileContents in module-level cache', async () => {
    const { useStore, getCache } = await freshStore()
    const { result } = renderHook(() => useStore())

    const cache = { 'src/main.js': 'const x = 1', 'src/app.js': 'export default App' }
    const data = {
      buildings: [],
      districts: [],
      id: 'test',
      fileContents: cache,
    }

    act(() => {
      result.current.setCityData(data)
    })

    expect(getCache()).toEqual(cache)
  })

  it('injects color_metric for buildings missing it', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())

    const data = {
      buildings: [
        { id: 'a.js', path: 'a.js', metrics: { loc: 100 } },
        { id: 'b.js', path: 'b.js', metrics: { loc: 200 } },
        { id: 'c.js', path: 'c.js', metrics: { loc: 50 } },
      ],
      districts: [],
      id: 'test',
    }

    act(() => {
      result.current.setCityData(data)
    })

    const buildings = result.current.cityData?.buildings
    expect(buildings).toBeDefined()

    // All buildings should have a color_metric between 0 and 1
    for (const b of buildings) {
      expect(b.color_metric).toBeGreaterThanOrEqual(0)
      expect(b.color_metric).toBeLessThanOrEqual(1)
    }

    // Smallest LOC (c.js = 50) → smallest rank → color_metric = 0
    const cBuilding = buildings.find(b => b.id === 'c.js')
    expect(cBuilding?.color_metric).toBe(0)

    // Largest LOC (b.js = 200) → largest rank → color_metric = 1
    const bBuilding = buildings.find(b => b.id === 'b.js')
    expect(bBuilding?.color_metric).toBe(1)
  })

  it('does not overwrite existing color_metric', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())

    const data = {
      buildings: [
        { id: 'a.js', path: 'a.js', metrics: { loc: 100 }, color_metric: 0.42 },
        { id: 'b.js', path: 'b.js', metrics: { loc: 200 }, color_metric: 0.99 },
      ],
      districts: [],
      id: 'test',
    }

    act(() => {
      result.current.setCityData(data)
    })

    const buildings = result.current.cityData?.buildings
    expect(buildings.find(b => b.id === 'a.js')?.color_metric).toBe(0.42)
    expect(buildings.find(b => b.id === 'b.js')?.color_metric).toBe(0.99)
  })

  it('handles single building — color_metric is 0.5', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => {
      result.current.setCityData({
        buildings: [{ id: 'only.js', path: 'only.js', metrics: { loc: 100 } }],
        districts: [],
        id: 'test',
      })
    })

    const building = result.current.cityData?.buildings[0]
    expect(building?.color_metric).toBe(0.5)
  })

  it('updates loading to false after setCityData', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())

    // Prime loading state
    act(() => result.current.setLoading(true))
    expect(result.current.loading).toBe(true)

    act(() => {
      result.current.setCityData({ buildings: [], districts: [], id: 'test' })
    })

    expect(result.current.loading).toBe(false)
  })
})

describe('createCitySlice — initial state', () => {
  it('has null cityData', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.cityData).toBeNull()
  })

  it('has loading=false', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.loading).toBe(false)
  })

  it('has null error', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.error).toBeNull()
  })

  it('has landingOverlayActive=true', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.isLandingOverlayActive).toBe(true)
  })

  it('setLandingOverlayActive can dismiss the overlay', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setLandingOverlayActive(false))
    expect(result.current.isLandingOverlayActive).toBe(false)
  })
})

describe('createCitySlice — setError', () => {
  it('sets error and clears loading', async () => {
    const { useStore } = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setLoading(true))
    act(() => result.current.setError('Something went wrong'))

    expect(result.current.error).toBe('Something went wrong')
    expect(result.current.loading).toBe(false)
  })
})
