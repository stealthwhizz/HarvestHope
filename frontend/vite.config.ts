import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  build: {
    // Optimize build for performance
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom', '@reduxjs/toolkit', 'react-redux'],
          pixi: ['pixi.js'],
          audio: ['howler'],
        },
      },
    },
    // Asset optimization
    assetsInlineLimit: 4096, // Inline small assets
    chunkSizeWarningLimit: 1000,
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server
    include: ['react', 'react-dom', 'pixi.js', 'howler', '@reduxjs/toolkit'],
  },
  server: {
    // Development server optimizations
    hmr: {
      overlay: false, // Disable error overlay for better performance
    },
  },
})
