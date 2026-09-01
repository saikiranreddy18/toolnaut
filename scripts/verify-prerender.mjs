// Verify the prerender the way a crawler sees it: fetch each route's raw HTML
// with NO JavaScript executed, and assert real content came back.
//
// Serves dist/ with Vercel's routing order — filesystem before rewrites — so a
// pass here means the same request against Vercel returns the same bytes.
import { createServer } from 'node:http'
import { readFile, stat } from 'node:fs/promises'
import { extname, join } from 'node:path'

const DIST = 'dist'
const PORT = 4330
const TYPES = {
  '.html': 'text/html', '.js': 'application/javascript', '.css': 'text/css',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.webmanifest': 'application/manifest+json',
}

const server = createServer(async (req, res) => {
  const path = decodeURIComponent(new URL(req.url, 'http://x').pathname)
  const candidates = [join(DIST, path), join(DIST, path, 'index.html')]
  for (const c of candidates) {
    try {
      const st = await stat(c)
      if (st.isFile()) {
        const b = await readFile(c)
        res.writeHead(200, { 'content-type': TYPES[extname(c)] || 'application/octet-stream' })
        return res.end(b)
      }
    } catch { /* next candidate */ }
  }
  // rewrite fallback, exactly as vercel.json declares it
  const b = await readFile(join(DIST, '_shell.html'))
  res.writeHead(200, { 'content-type': 'text/html', 'x-served-by': 'spa-fallback' })
  res.end(b)
})

await new Promise((r) => server.listen(PORT, r))

const PUBLIC = ['/', '/about', '/pricing', '/methodology', '/example', '/new', '/search',
  '/privacy', '/terms', '/tools/code', '/tools/design', '/tools/writing',
  '/tools/data', '/tools/automation', '/tools/learning']
const SPA = ['/app/stack', '/app/discover', '/goal', '/auth/login']

const strip = (h) => h
  .replace(/<script[\s\S]*?<\/script>/gi, '')
  .replace(/<style[\s\S]*?<\/style>/gi, '')
  .replace(/<[^>]+>/g, ' ')
  .replace(/\s+/g, ' ')
  .trim()

let bad = 0
console.log('PUBLIC ROUTES — must return real HTML with no JS')
for (const r of PUBLIC) {
  const res = await fetch(`http://127.0.0.1:${PORT}${r}`)
  const html = await res.text()
  const text = strip(html)
  const h1 = (html.match(/<h1[^>]*>([\s\S]*?)<\/h1>/i) || [])[1]
  const ok = text.length > 300 && !html.includes('<div id="root"></div>')
  if (!ok) bad++
  console.log(`  ${ok ? 'OK  ' : 'FAIL'} ${r.padEnd(20)} ${String(text.length).padStart(5)} chars  h1=${h1 ? strip(h1).slice(0, 34) : '(none)'}`)
}

console.log('\nSPA ROUTES — must fall back to the EMPTY shell, not the homepage')
for (const r of SPA) {
  const res = await fetch(`http://127.0.0.1:${PORT}${r}`)
  const html = await res.text()
  const empty = html.includes('<div id="root"></div>')
  if (!empty) bad++
  console.log(`  ${empty ? 'OK  ' : 'FAIL'} ${r.padEnd(20)} ${empty ? 'clean shell' : 'LEAKED prerendered content'}`)
}

server.close()
console.log(bad === 0 ? '\nPRERENDER VERIFIED' : `\n${bad} FAILURES`)
process.exit(bad === 0 ? 0 : 1)
