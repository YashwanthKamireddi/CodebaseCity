/**
 * Test Utilities
 * Custom render functions and helpers for testing
 */

import React from 'react'
import { render } from '@testing-library/react'
import { vi } from 'vitest'

// Create a mock store
export const createMockStore = (overrides = {}) => ({
  cityData: null,
  selectedBuilding: null,
  loading: false,
  error: null,
  theme: 'dark',
  colorMode: 'default',
  layoutMode: 'clustered',
  showRoads: true,
  showLabels: true,
  sidebarOpen: true,
  vscodeConnected: false,
  isAnimating: false,

  // Actions
  selectBuilding: vi.fn(),
  clearSelection: vi.fn(),
  setLoading: vi.fn(),
  setError: vi.fn(),
  toggleRoads: vi.fn(),
  toggleLabels: vi.fn(),
  fetchCity: vi.fn(),

  ...overrides
})

// Mock Zustand store
export const mockUseStore = (store) => {
  return (selector) => {
    if (typeof selector === 'function') {
      return selector(store)
    }
    return store
  }
}

// Custom render with providers
export const renderWithProviders = (ui, options = {}) => {
  const { store = createMockStore(), ...renderOptions } = options

  // Mock the store module
  vi.mock('@/store/useStore', () => ({
    default: mockUseStore(store)
  }))

  return {
    store,
    ...render(ui, renderOptions)
  }
}

// Wait for async operations
export const waitForAsync = () => new Promise(resolve => setTimeout(resolve, 0))

// Mock building data
export const mockBuilding = {
  id: 'src/App.jsx',
  name: 'App.jsx',
  path: 'src/App.jsx',
  district_id: 'src',
  language: 'javascript',
  position: { x: 0, y: 5, z: 0 },
  dimensions: { width: 8, height: 10, depth: 8 },
  metrics: {
    loc: 250,
    complexity: 8,
    churn: 3,
    dependencies_in: 5,
    dependencies_out: 12
  },
  is_hotspot: false
}

// Mock city data
export const mockCityData = {
  name: 'test-project',
  path: '/test/project',
  buildings: [mockBuilding],
  districts: [
    { id: 'src', name: 'src', center: { x: 0, z: 0 }, bounds: { min: { x: -50, z: -50 }, max: { x: 50, z: 50 } } }
  ],
  roads: [],
  stats: {
    total_files: 1,
    total_loc: 250,
    languages: { javascript: 1 }
  }
}

// Re-export everything
export * from '@testing-library/react'
export { default as userEvent } from '@testing-library/user-event'
