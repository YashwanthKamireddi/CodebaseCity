import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
  },
  build: {
    sourcemap: 'hidden',
    chunkSizeWarningLimit: 700,
    rollupOptions: {
      output: {
        manualChunks: {
          'three': ['three'],
          'r3f': ['@react-three/fiber', '@react-three/drei', '@react-three/postprocessing'],
          'vendor': ['react', 'react-dom', 'zustand', 'framer-motion'],
        }
      }
    }
  },
  worker: {
    format: 'es'
  }
})
