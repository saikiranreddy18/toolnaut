import fs from 'node:fs'
import { fileURLToPath } from 'node:url'

// Loads radar/.env into process.env BEFORE config.js reads it. Import this as
// the FIRST import in any entry point (run.js, seed.js, scripts/*). ES modules
// evaluate imports in source order, so listing it first guarantees the env is
// populated before config initialises. No dependency: uses Node 20.6+'s
// process.loadEnvFile when present, with a tiny manual parser as a fallback.
const envPath = fileURLToPath(new URL('./.env', import.meta.url))

try {
  if (fs.existsSync(envPath)) {
    if (typeof process.loadEnvFile === 'function') {
      process.loadEnvFile(envPath)
    } else {
      for (const raw of fs.readFileSync(envPath, 'utf8').split('\n')) {
        const line = raw.trim()
        if (!line || line.startsWith('#')) continue
        const m = line.match(/^([\w.]+)\s*=\s*(.*)$/)
        if (!m) continue
        const key = m[1]
        const val = m[2].replace(/^["']|["']$/g, '')
        if (process.env[key] === undefined) process.env[key] = val
      }
    }
  }
} catch {
  /* no or unreadable .env — every setting has a safe default */
}
