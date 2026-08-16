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
        manualChunks: {
          three: ['three', '@react-three/fiber', '@react-three/drei'],
        },
      },
    },
  },
})
