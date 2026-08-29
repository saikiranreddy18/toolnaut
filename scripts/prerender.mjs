// Prerender the public routes to real HTML.
//
// Toolnaut is a client-rendered SPA: every URL served 2,828 bytes with an empty
// <div id="root">. Browsers cope. Nothing else does — crawlers, link unfurlers,
// social cards, audit tools and AI research systems all received a blank page,
// which is why two separate external reviewers could not read the site at all.
//
// This runs after `vite build`, walks each public route in a real browser, and
// writes the rendered HTML back into dist/ as a static file. Vercel checks the
// filesystem before it applies rewrites, so dist/about/index.html is served at
// /about directly and the SPA rewrite never sees it.
//
// The app still boots and takes over on the client; this only changes what
// arrives in the first response. Authenticated and per-visitor routes (/app/*,
// /goal, /auth/login, /s/:slugs) are deliberately NOT prerendered: their content
// depends on that visitor's localStorage, so a shared static copy would be
// wrong for everyone.
import { spawn } from 'node:child_process'
import { mkdirSync, writeFileSync, copyFileSync, readFileSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { chromium } from 'playwright'

const PORT = 4321
const base = `http://127.0.0.1:${PORT}`
const DIST = 'dist'

// Public, indexable, identical for every visitor.
const ROUTES = [
  '/',
  '/about',
  '/pricing',
  '/methodology',
  '/example',
  '/new',
  '/privacy',
  '/terms',
  '/tools/code',
  '/tools/design',
  '/tools/writing',
  '/tools/data',
  '/tools/automation',
  '/tools/learning',
]

// Keep a pristine empty shell for the SPA rewrite fallback. Without this, every
// unmatched route would fall back to the prerendered HOMEPAGE and flash landing
// content before React routed away from it.
copyFileSync(join(DIST, 'index.html'), join(DIST, '_shell.html'))

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
process.on('exit', () => server.kill())

const deadline = Date.now() + 60000
for (;;) {
  try { await fetch(base); break } catch {
    if (Date.now() > deadline) { console.error('prerender: preview never came up'); process.exit(1) }
    await new Promise((r) => setTimeout(r, 400))
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

let written = 0
let failed = 0
for (const route of ROUTES) {
  try {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 45000 })
    // The catalog hydrates from /tools.json before first paint; give the route
    // a beat past networkidle so lists are populated rather than mid-render.
    await page.waitForTimeout(900)

    const html = await page.evaluate(() => '<!doctype html>\n' + document.documentElement.outerHTML)
    const bodyText = await page.evaluate(() => (document.getElementById('root')?.innerText || '').trim().length)

    if (bodyText < 200) {
      console.log(`  SKIP ${route} — rendered only ${bodyText} chars, refusing to ship a blank prerender`)
      failed++
      continue
    }

    const out = route === '/' ? join(DIST, 'index.html') : join(DIST, route, 'index.html')
    mkdirSync(dirname(out), { recursive: true })
    writeFileSync(out, html)
    console.log(`  ${route.padEnd(20)} ${(html.length / 1024).toFixed(0)}KB  ${bodyText} chars of text`)
    written++
  } catch (err) {
    console.log(`  FAIL ${route} — ${err.message.split('\n')[0]}`)
    failed++
  }
}

await browser.close()

// A prerender pass that silently produced nothing is worse than none at all:
// it looks like it worked. Fail the build instead.
if (written === 0) {
  console.error('prerender: no routes rendered')
  process.exit(1)
}
console.log(`\nprerender: ${written} routes written, ${failed} skipped`)
