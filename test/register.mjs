// Entry for node --import: installs the Vite-style resolve hook (loader.mjs)
// before any test file is evaluated.
import { register } from 'node:module'
register('./loader.mjs', import.meta.url)
