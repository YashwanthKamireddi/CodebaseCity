/**
 * Color Utilities Tests
 */

import { describe, it, expect } from 'vitest'
import { getBuildingColor, BUILDING_COLOR } from '@/utils/colorUtils'

describe('colorUtils', () => {
  describe('BUILDING_COLOR', () => {
    it('should export default building color', () => {
      expect(BUILDING_COLOR).toBe('#1a1a2e')
    })
  })

  describe('getBuildingColor', () => {
    const mockBuilding = {
      id: 'test.js',
      name: 'test.js',
      path: 'src/components/Button.jsx',
      language: 'javascript',
      layer: 'ui',
      metrics: {
        loc: 100,
        complexity: 5,
        churn: 2
      },
      dimensions: { height: 10 },
      is_hotspot: false
    }

    describe('interaction states', () => {
      it('should return cyan-green for selected building', () => {
        const color = getBuildingColor(mockBuilding, 'default', { isSelected: true })
        expect(color).toBe('#34d399')
      })

      it('should return cyan for hovered building', () => {
        const color = getBuildingColor(mockBuilding, 'default', { isHovered: true })
        expect(color).toBe('#60a5fa')
      })

      it('should return green for dependency', () => {
        const color = getBuildingColor(mockBuilding, 'default', { isDependency: true })
        expect(color).toBe('#4ade80')
      })

      it('should return coral for dependent', () => {
        const color = getBuildingColor(mockBuilding, 'default', { isDependent: true })
        expect(color).toBe('#fb7185')
      })

      it('should return near-black for unrelated in focus mode', () => {
        const color = getBuildingColor(mockBuilding, 'default', { isUnrelated: true })
        expect(color).toBe('#0e0f14')
      })
    })

    describe('layer mode', () => {
      it('should return cyan for UI components', () => {
        const color = getBuildingColor(mockBuilding, 'layer', {})
        expect(color).toBe('#ffffff')
      })

      it('should return orange for service files', () => {
        const serviceBuilding = { ...mockBuilding, path: 'src/services/api.js' }
        const color = getBuildingColor(serviceBuilding, 'layer', {})
        expect(color).toBe('#ff6d00')
      })

      it('should return green for utility files', () => {
        const utilBuilding = { ...mockBuilding, path: 'src/utils/helpers.js' }
        const color = getBuildingColor(utilBuilding, 'layer', {})
        expect(color).toBe('#00e676')
      })
    })

    describe('churn mode', () => {
      it('should return hot pink for hotspots', () => {
        const hotspotBuilding = { ...mockBuilding, is_hotspot: true }
        const color = getBuildingColor(hotspotBuilding, 'churn', {})
        expect(color).toBe('#ef4444')
      })

      it('should return orange-red for high churn', () => {
        const highChurnBuilding = { ...mockBuilding, metrics: { ...mockBuilding.metrics, churn: 10 } }
        const color = getBuildingColor(highChurnBuilding, 'churn', {})
        expect(color).toBe('#f97316')
      })

      it('should return cyan for stable files', () => {
        const stableBuilding = { ...mockBuilding, metrics: { ...mockBuilding.metrics, churn: 0 } }
        const color = getBuildingColor(stableBuilding, 'churn', {})
        expect(color).toBe('#38bdf8')
      })
    })

    describe('language mode', () => {
      it('should return TypeScript blue for .ts files', () => {
        const tsBuilding = { ...mockBuilding, path: 'src/app.ts' }
        const color = getBuildingColor(tsBuilding, 'language', {})
        expect(color).toBe('#3178c6')
      })

      it('should return Python blue for .py files', () => {
        const pyBuilding = { ...mockBuilding, path: 'src/main.py' }
        const color = getBuildingColor(pyBuilding, 'language', {})
        expect(color).toBe('#3572a5')
      })

      it('should return Go cyan for .go files', () => {
        const goBuilding = { ...mockBuilding, path: 'src/main.go' }
        const color = getBuildingColor(goBuilding, 'language', {})
        expect(color).toBe('#00add8')
      })
    })

    describe('complexity mode', () => {
      it('should return green for simple files', () => {
        const simpleBuilding = { ...mockBuilding, metrics: { ...mockBuilding.metrics, complexity: 3 } }
        const color = getBuildingColor(simpleBuilding, 'complexity', {})
        expect(color).toBe('#22c55e')
      })

      it('should return hot pink for extreme complexity', () => {
        const complexBuilding = { ...mockBuilding, metrics: { ...mockBuilding.metrics, complexity: 35 } }
        const color = getBuildingColor(complexBuilding, 'complexity', {})
        expect(color).toBe('#e11d48')
      })
    })

    describe('default mode', () => {
      it('should return color based on height', () => {
        const smallBuilding = { ...mockBuilding, dimensions: { height: 2 } }
        const color = getBuildingColor(smallBuilding, 'default', {})
        expect(color).toBe('#3b9eff') // Bright blue for tiny files
      })

      it('should return red for large files', () => {
        const largeBuilding = { ...mockBuilding, dimensions: { height: 100 } }
        const color = getBuildingColor(largeBuilding, 'default', {})
        expect(color).toBe('#ff1744') // Hot red for large files
      })
    })
  })
})
