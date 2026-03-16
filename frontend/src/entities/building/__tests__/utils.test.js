/**
 * utils.test.js — Tests for building pattern detection
 */

import { describe, it, expect } from 'vitest'
import { detectPattern } from '../utils'

describe('detectPattern', () => {
  it('returns null for a normal building', () => {
    const building = { metrics: { loc: 50, complexity: 5, dependencies_in: 2 } }
    expect(detectPattern(building)).toBeNull()
  })

  it('detects God Class by high complexity + high coupling', () => {
    const building = { metrics: { complexity: 35, dependencies_in: 15 } }
    const result = detectPattern(building)
    expect(result?.type).toBe('god_class')
    expect(result?.severity).toBe('critical')
  })

  it('detects God Class when is_hotspot is set', () => {
    const building = { metrics: { complexity: 5, dependencies_in: 2 }, is_hotspot: true }
    const result = detectPattern(building)
    expect(result?.type).toBe('god_class')
  })

  it('detects Data Class by many attributes and few methods', () => {
    const building = { metrics: { complexity: 1, dependencies_in: 12 } }
    const result = detectPattern(building)
    expect(result?.type).toBe('data_class')
    expect(result?.severity).toBe('warning')
  })

  it('detects Lazy Class by near-empty metrics', () => {
    const building = { metrics: { complexity: 1, dependencies_in: 1 } }
    const result = detectPattern(building)
    expect(result?.type).toBe('lazy_class')
    expect(result?.severity).toBe('info')
  })

  it('detects Brain Class by high complexity and few deps', () => {
    const building = { metrics: { complexity: 25, dependencies_in: 3 } }
    const result = detectPattern(building)
    expect(result?.type).toBe('brain_class')
    expect(result?.severity).toBe('warning')
  })

  it('detects Blob by extremely high coupling', () => {
    const building = { metrics: { complexity: 10, dependencies_in: 25 } }
    const result = detectPattern(building)
    expect(result?.type).toBe('blob')
    expect(result?.severity).toBe('critical')
  })

  it('God Class check takes priority over Data Class boundary', () => {
    // complexity=35 + deps=15 → both God Class and Data Class conditions met
    const building = { metrics: { complexity: 35, dependencies_in: 15 } }
    expect(detectPattern(building)?.type).toBe('god_class')
  })

  it('handles missing metrics gracefully', () => {
    const building = {}
    expect(() => detectPattern(building)).not.toThrow()
    // all metrics default to 0 → Lazy Class
    expect(detectPattern(building)?.type).toBe('lazy_class')
  })

  it('handles partial metrics object', () => {
    const building = { metrics: { loc: 100 } }
    expect(() => detectPattern(building)).not.toThrow()
  })
})
