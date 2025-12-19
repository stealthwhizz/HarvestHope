import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize build for production
    target: 'es2020',
    minify: 'terser',
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ai: ['@google/generative-ai'],
        },
      },
    },
    // Asset optimization
    assetsInlineLimit: 4096, // Inline small assets
    chunkSizeWarningLimit: 1000,
    // Source maps for debugging (disable in production if needed)
    sourcemap: false,
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server
    include: ['react', 'react-dom', '@google/generative-ai'],
  },
  server: {
    // Development server optimizations
    hmr: {
      overlay: false, // Disable error overlay for better performance
    },
  },
})
