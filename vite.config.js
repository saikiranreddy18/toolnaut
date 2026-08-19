import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    // Honour the harness-assigned port (autoPort sets PORT) so the preview
    // tool watches the same port vite binds — and bind IPv4+IPv6 so localhost
    // always resolves on Windows.
    port: Number(process.env.PORT) || 5173,
    host: true,
    strictPort: false,
  },
  build: {
    chunkSizeWarningLimit: 1200,
    rollupOptions: {
      output: {
        // Function form is deliberate: the object form
        // ({ three: ['three', '@react-three/fiber', ...] }) pulled react and
        // react-dom into the `three` chunk, which made the ~1MB three.js
        // bundle a static dependency of the entry on EVERY route and defeated
        // the lazy Scene import entirely.
        manualChunks(id) {
          // React must be pinned to its own chunk FIRST. Otherwise rollup sees
          // it reachable from the three chunk's modules and merges it in there,
          // which makes the whole three.js bundle a static dependency of the
          // entry on every route.
          if (
            id.includes('/node_modules/react/') ||
            id.includes('/node_modules/react-dom/') ||
            id.includes('/node_modules/scheduler/')
          ) {
            return 'react'
          }
          if (id.includes('/node_modules/three/') || id.includes('/node_modules/@react-three/')) {
            return 'three'
          }
        },
      },
    },
  },
})
