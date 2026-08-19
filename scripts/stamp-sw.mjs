// Replaces __BUILD_ID__ in dist/sw.js with a hash of the built index.html.
// Without this the service worker's cache name never changes between deploys,
// so its activate handler deletes nothing, the cache grows without bound, and
// returning visitors keep being served the very first build they ever loaded.
// Runs as a post-build step (not a Vite plugin) so it is guaranteed to happen
// after the public/ directory has been copied into dist/.
import { createHash } from 'node:crypto'
import { readFileSync, writeFileSync } from 'node:fs'
import { resolve } from 'node:path'

const swPath = resolve('dist/sw.js')
const sw = readFileSync(swPath, 'utf8')

if (!sw.includes('__BUILD_ID__')) {
  console.error('stamp-sw: __BUILD_ID__ placeholder missing from dist/sw.js')
  process.exit(1)
}

const id = createHash('sha256')
  .update(readFileSync(resolve('dist/index.html')))
  .digest('hex')
  .slice(0, 12)

writeFileSync(swPath, sw.replaceAll('__BUILD_ID__', id))
console.log(`stamp-sw: cache version → toolnaut-shell-${id}`)
