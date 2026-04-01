/**
 * createUISlice.test.js — UI state management tests
 */

import { describe, it, expect, beforeEach, vi } from 'vitest'
import { act, renderHook } from '@testing-library/react'

global.fetch = vi.fn()

async function freshStore() {
  vi.resetModules()
  const { default: useStore } = await import('@/store/useStore')
  return useStore
}

describe('createUISlice — initial state', () => {
  it('has sidebarOpen=true', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.sidebarOpen).toBe(true)
  })

  it('has colorMode=default', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.colorMode).toBe('default')
  })

  it('has showRoads=false', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.showRoads).toBe(false)
  })

  it('has commandPaletteOpen=false', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.commandPaletteOpen).toBe(false)
  })

  it('has highlightedCategory=null', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())
    expect(result.current.highlightedCategory).toBeNull()
  })
})

describe('createUISlice — actions', () => {
  beforeEach(() => vi.clearAllMocks())

  it('toggleRoads flips showRoads', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.toggleRoads())
    expect(result.current.showRoads).toBe(true)

    act(() => result.current.toggleRoads())
    expect(result.current.showRoads).toBe(false)
  })

  it('setColorMode updates colorMode', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setColorMode('layer'))
    expect(result.current.colorMode).toBe('layer')

    act(() => result.current.setColorMode('churn'))
    expect(result.current.colorMode).toBe('churn')
  })

  it('setSidebarOpen sets sidebarOpen to given value', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setSidebarOpen(false))
    expect(result.current.sidebarOpen).toBe(false)

    act(() => result.current.setSidebarOpen(true))
    expect(result.current.sidebarOpen).toBe(true)
  })

  it('setCommandPaletteOpen can open and close command palette', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setCommandPaletteOpen(true))
    expect(result.current.commandPaletteOpen).toBe(true)

    act(() => result.current.setCommandPaletteOpen(false))
    expect(result.current.commandPaletteOpen).toBe(false)
  })

  it('setHighlightedCategory stores the category', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    const category = { type: 'language', value: 'javascript' }
    act(() => result.current.setHighlightedCategory(category))
    expect(result.current.highlightedCategory).toEqual(category)

    act(() => result.current.setHighlightedCategory(null))
    expect(result.current.highlightedCategory).toBeNull()
  })

  it('setHighlightedIssue stores the issue', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    const issue = { type: 'god_class', paths: ['src/App.js'] }
    act(() => result.current.setHighlightedIssue(issue))
    expect(result.current.highlightedIssue).toEqual(issue)
  })

  it('setViewMode updates viewMode', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setViewMode('street'))
    expect(result.current.viewMode).toBe('street')
  })

  it('setRenderMode updates renderMode', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setRenderMode('instanced'))
    expect(result.current.renderMode).toBe('instanced')
  })

  it('setCameraAction records type and timestamp', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    const before = Date.now()
    act(() => result.current.setCameraAction('FIT'))
    const after = Date.now()

    expect(result.current.cameraAction?.type).toBe('FIT')
    expect(result.current.cameraAction?.timestamp).toBeGreaterThanOrEqual(before)
    expect(result.current.cameraAction?.timestamp).toBeLessThanOrEqual(after)
  })

  it('setSidebarWidth sets sidebarWidth', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.setSidebarWidth(400))
    expect(result.current.sidebarWidth).toBe(400)
  })
})

describe('createInteractionSlice — building selection', () => {
  it('selectBuilding stores the building', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    const building = { id: 'main.js', name: 'main.js' }
    act(() => result.current.selectBuilding(building))
    expect(result.current.selectedBuilding).toEqual(building)
  })

  it('clearSelection resets to null', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    act(() => result.current.selectBuilding({ id: 'test.js' }))
    act(() => result.current.clearSelection())
    expect(result.current.selectedBuilding).toBeNull()
  })

  it('hovering a building stores it in hoveredBuilding', async () => {
    const useStore = await freshStore()
    const { result } = renderHook(() => useStore())

    const building = { id: 'hover.js' }
    act(() => result.current.setHoveredBuilding(building))
    expect(result.current.hoveredBuilding).toEqual(building)

    act(() => result.current.setHoveredBuilding(null))
    expect(result.current.hoveredBuilding).toBeNull()
  })
})
