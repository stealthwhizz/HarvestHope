import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // Base path for deployment (GitHub Pages uses repository name as base)
  base: process.env.NODE_ENV === 'production' ? '/HarvestHope/' : '/',
  build: {
    // Output directory
    outDir: 'dist',
    assetsDir: 'assets',
    // Optimize build for production
    target: 'es2020',
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: process.env.NODE_ENV === 'production', // Remove console.log in production
        drop_debugger: true,
      },
    },
    rollupOptions: {
      output: {
        // Code splitting for better caching
        manualChunks: {
          vendor: ['react', 'react-dom'],
          ai: ['@google/generative-ai'],
        },
        // Asset naming for better caching
        assetFileNames: (assetInfo) => {
          const fileName = assetInfo.names?.[0] || assetInfo.originalFileNames?.[0] || 'asset';
          const info = fileName.split('.');
          const ext = info[info.length - 1];
          if (/png|jpe?g|svg|gif|tiff|bmp|ico/i.test(ext || '')) {
            return `assets/images/[name]-[hash][extname]`;
          }
          if (/css/i.test(ext || '')) {
            return `assets/css/[name]-[hash][extname]`;
          }
          return `assets/[name]-[hash][extname]`;
        },
        chunkFileNames: 'assets/js/[name]-[hash].js',
        entryFileNames: 'assets/js/[name]-[hash].js',
      },
    },
    // Asset optimization
    assetsInlineLimit: 4096, // Inline small assets
    chunkSizeWarningLimit: 1000,
    // Source maps for debugging (disable in production)
    sourcemap: process.env.NODE_ENV !== 'production',
  },
  optimizeDeps: {
    // Pre-bundle dependencies for faster dev server
    include: ['react', 'react-dom', '@google/generative-ai'],
  },
  server: {
    // Development server configuration
    port: 5174,
    host: true,
    hmr: {
      overlay: false, // Disable error overlay for better performance
    },
  },
  preview: {
    // Preview server configuration
    port: 4173,
    host: true,
  },
})
