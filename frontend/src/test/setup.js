/**
 * Vitest Setup File
 * Global test configuration and mocks
 */

import { expect, afterEach, vi } from 'vitest'
import { cleanup } from '@testing-library/react'
import * as matchers from '@testing-library/jest-dom/matchers'

// Extend Vitest's expect with jest-dom matchers
expect.extend(matchers)

// Cleanup after each test
afterEach(() => {
  cleanup()
})

// Mock window.matchMedia
Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation(query => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn()
  }))
})

// Mock ResizeObserver
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock IntersectionObserver
global.IntersectionObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn()
}))

// Mock WebGL for Three.js
HTMLCanvasElement.prototype.getContext = vi.fn((type) => {
  if (type === 'webgl' || type === 'webgl2') {
    return {
      canvas: {},
      getExtension: vi.fn(),
      getParameter: vi.fn(() => 16),
      getShaderPrecisionFormat: vi.fn(() => ({ precision: 23 })),
      createShader: vi.fn(),
      shaderSource: vi.fn(),
      compileShader: vi.fn(),
      getShaderParameter: vi.fn(() => true),
      createProgram: vi.fn(),
      attachShader: vi.fn(),
      linkProgram: vi.fn(),
      getProgramParameter: vi.fn(() => true),
      useProgram: vi.fn(),
      createBuffer: vi.fn(),
      bindBuffer: vi.fn(),
      bufferData: vi.fn(),
      enable: vi.fn(),
      disable: vi.fn(),
      depthFunc: vi.fn(),
      clearColor: vi.fn(),
      clearDepth: vi.fn(),
      clear: vi.fn(),
      viewport: vi.fn(),
      createTexture: vi.fn(),
      bindTexture: vi.fn(),
      texImage2D: vi.fn(),
      texParameteri: vi.fn(),
      createFramebuffer: vi.fn(),
      bindFramebuffer: vi.fn(),
      framebufferTexture2D: vi.fn(),
      createRenderbuffer: vi.fn(),
      bindRenderbuffer: vi.fn(),
      renderbufferStorage: vi.fn(),
      framebufferRenderbuffer: vi.fn(),
      checkFramebufferStatus: vi.fn(() => 36053),
      getUniformLocation: vi.fn(),
      getAttribLocation: vi.fn(),
      uniform1f: vi.fn(),
      uniform2f: vi.fn(),
      uniform3f: vi.fn(),
      uniform4f: vi.fn(),
      uniformMatrix4fv: vi.fn(),
      vertexAttribPointer: vi.fn(),
      enableVertexAttribArray: vi.fn(),
      drawArrays: vi.fn(),
      drawElements: vi.fn(),
      readPixels: vi.fn(),
      pixelStorei: vi.fn(),
      activeTexture: vi.fn(),
      blendFunc: vi.fn(),
      blendEquation: vi.fn(),
      cullFace: vi.fn(),
      frontFace: vi.fn(),
      scissor: vi.fn()
    }
  }
  return null
})

// Console warnings filter (reduce noise)
const originalWarn = console.warn
console.warn = (...args) => {
  if (
    typeof args[0] === 'string' &&
    (args[0].includes('React does not recognize') ||
     args[0].includes('Unknown prop'))
  ) {
    return
  }
  originalWarn.apply(console, args)
}
