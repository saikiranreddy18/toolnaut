import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],

  // Vite only exposes VITE_-prefixed vars to client code. Supabase's Vercel
  // integration injects its values under Next.js names (NEXT_PUBLIC_SUPABASE_URL,
  // NEXT_PUBLIC_SUPABASE_ANON_KEY), so without this the integration appears to
  // work and the app still sees nothing.
  //
  // NEXT_PUBLIC_ only. Deliberately NOT 'SUPABASE_', because that same
  // integration can also inject SUPABASE_SERVICE_ROLE_KEY — a secret with full
  // read/write on every table, bypassing Row Level Security. Adding that prefix
  // would bake it into a public bundle.
  envPrefix: ['VITE_', 'NEXT_PUBLIC_'],

  // Which build an error came from. Without it every Sentry issue is dated but
  // not versioned, so 'did the fix ship' has no answer. Vercel exposes the
  // commit at build time; a local build says 'dev' rather than lying about it.
  define: {
    // Sentry compiles its debug logging and its entire tracing subsystem into
    // the bundle unless these flags strip them. Tracing is off by default here,
    // so shipping it costs every visitor bytes for a feature nobody enabled.
    // Read from the same build-time env as the runtime sample rate, so a build
    // made with tracing on still contains the code to do it.
    __SENTRY_DEBUG__: false,
    __SENTRY_TRACING__: Number(process.env.VITE_SENTRY_TRACES || 0) > 0,
    __APP_RELEASE__: JSON.stringify(
      (process.env.VERCEL_GIT_COMMIT_SHA || '').slice(0, 12) || 'dev',
    ),
  },
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
          // Sentry is loaded on demand and would otherwise be merged into
          // whichever dynamic chunk rollup groups it with, which makes its
          // real cost impossible to read and re-downloads the whole SDK
          // whenever that unrelated code changes.
          if (id.includes('/node_modules/@sentry/')) {
            return 'sentry'
          }
        },
      },
    },
  },
})
