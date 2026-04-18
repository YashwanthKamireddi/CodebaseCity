import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import path from 'path'
import { fileURLToPath } from 'url'

const __dirname = path.dirname(fileURLToPath(import.meta.url))

export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      'wasm-core': path.resolve(__dirname, './src/engine/wasm-core/pkg'),
      '@': path.resolve(__dirname, './src'),
      '@engine': path.resolve(__dirname, './src/engine'),
      '@features': path.resolve(__dirname, './src/features'),
      '@widgets': path.resolve(__dirname, './src/widgets'),
      '@entities': path.resolve(__dirname, './src/entities'),
      '@store': path.resolve(__dirname, './src/store'),
      '@utils': path.resolve(__dirname, './src/utils'),
      '@shared': path.resolve(__dirname, './src/shared'),
      '@hooks': path.resolve(__dirname, './src/hooks'),
      '@styles': path.resolve(__dirname, './src/styles'),
    }
  },
  server: {
    port: 5173,
    headers: {
      "Cross-Origin-Opener-Policy": "same-origin",
      "Cross-Origin-Embedder-Policy": "require-corp"
    },
    proxy: {
      '/codeload': {
        target: 'https://codeload.github.com',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/codeload/, '')
      }
    }
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'r3f': ['@react-three/fiber', '@react-three/drei'],
          'vendor': ['react', 'react-dom', 'zustand'],
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
})
