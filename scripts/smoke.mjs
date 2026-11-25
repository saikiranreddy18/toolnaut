// Post-build smoke test: renders every top-level route in a real browser and
// fails on any uncaught error or blank #root. This is the signal the automated
// bugfix agent keys off — without it, "the build passed" says nothing about
// whether the app actually renders.
import { spawn } from 'node:child_process'
import { existsSync, readdirSync } from 'node:fs'
import path from 'node:path'
import { chromium } from 'playwright'

const PORT = 4173
const base = `http://127.0.0.1:${PORT}`

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
process.on('exit', () => server.kill())
// Wait until preview actually accepts a connection. This was a flat 5s sleep,
// which is a race, not a wait: on a cold cache or a loaded machine vite needs
// longer, every route then fails with ERR_CONNECTION_REFUSED, and the run
// reports the whole app as broken when it was only slow to boot.
const deadline = Date.now() + 60_000
for (;;) {
  try {
    await fetch(base)
    break
  } catch {
    if (Date.now() > deadline) throw new Error('vite preview did not accept a connection within 60s')
    await new Promise((r) => setTimeout(r, 400))
  }
}
const routes = ['/', '/goal', '/example', '/methodology', '/pricing', '/about', '/changelog', '/developers', '/privacy', '/terms', '/app/stack', '/app/discover', '/app/favorites', '/app/compare?tools=chatgpt,claude', '/app/tools/chatgpt', '/app/learning', '/app/community', '/app/settings', '/office', '/s/chatgpt', '/compare/chatgpt,claude', '/tools/code', '/mcp-servers', '/new', '/search?q=chatgpt', '/vs/futurepedia', '/ai-tools/chatgpt', '/collections', '/collections/solo-founder-stack']
// Playwright resolves one exact browser build id and refuses to launch if that
// precise directory is missing, telling you to run `playwright install` — which
// is not possible in a locked image. Sandboxes routinely ship a different build:
// the autonomous agent's runner has chromium 1194 while this playwright wants
// 1234, so every hourly run was hand-copying binaries into a fake 1234 path
// before it could smoke-test anything. Fall back to whichever build is present.
function installedChromium() {
  const root = process.env.PLAYWRIGHT_BROWSERS_PATH
  if (!root || !existsSync(root)) return null
  // headless shell first: that is what chromium.launch() uses by default
  const layouts = [
    ['chrome-headless-shell-linux64', 'chrome-headless-shell'],
    ['chrome-linux', 'chrome-headless-shell'],
    ['chrome-linux64', 'chrome'],
    ['chrome-linux', 'chrome'],
  ]
  const dirs = readdirSync(root).filter((d) => d.startsWith('chromium')).sort().reverse()
  for (const dir of dirs) {
    for (const rel of layouts) {
      const candidate = path.join(root, dir, ...rel)
      if (existsSync(candidate)) return candidate
    }
  }
  return null
}

let executablePath
try {
  const wanted = chromium.executablePath()
  if (!existsSync(wanted)) {
    executablePath = installedChromium()
    if (executablePath) console.log(`smoke: playwright wanted ${wanted}, using ${executablePath}`)
  }
} catch { executablePath = installedChromium() }

const browser = await chromium.launch(executablePath ? { executablePath } : {})
let bad = 0
for (const r of routes) {
  const page = await browser.newPage()
  const errs = []
  // Chrome's console text for a failed resource load is the same generic
  // string regardless of what failed ("...status of 404 (Not Found)"), with
  // no URL in it — so the "favicon" keyword below can never match a real
  // favicon 404 by text alone. Some catalog domains genuinely have no icon
  // Google's favicon service can resolve; track those via the response URL
  // instead and discount an equal number of generic 404 console lines.
  let faviconFailures = 0
  page.on('response', res => {
    if (res.status() >= 400 && /google\.com\/s2\/favicons|gstatic\.com\/faviconV2/i.test(res.url())) faviconFailures++
  })
  page.on('console', m => { if (m.type() === 'error') errs.push(m.text()) })
  page.on('pageerror', e => errs.push('PAGEERROR ' + e.message))
  // /app/* sits behind AppShell's session guard. Without a seeded session every
  // one of these renders the login page instead, so the whole authed half of the
  // app reported OK while never having been rendered at all.
  const authed = r.startsWith('/app/')
  if (authed) {
    await page.addInitScript(() => {
      localStorage.setItem('exus_session_v1', JSON.stringify({
        user: { name: 'Smoke', provider: 'smoke' },
        plan: 'shishya', role: 'user', simulated: true, at: Date.now(),
      }))
    })
  }
  try {
    // One retry on a goto timeout. Measured on this machine: the same route
    // that times out in a full run loads in <100ms in isolation, and WHICH
    // route fails changes run to run — first-load contention, not the app.
    // A retry distinguishes "machine was busy" from "route is broken": a real
    // breakage fails twice, and that still fails the run.
    try {
      await page.goto(base + r, { waitUntil: 'networkidle', timeout: 25000 })
    } catch (e) {
      if (!/Timeout/i.test(String(e))) throw e
      await page.goto(base + r, { waitUntil: 'networkidle', timeout: 25000 })
    }
    await page.waitForTimeout(1200)
    const rootHtml = await page.$eval('#root', el => el.innerHTML.length).catch(() => 0)
    let faviconDiscount = faviconFailures
    const real = errs.filter(e => {
      if (/favicon|fonts.googleapis|fonts.gstatic|ERR_INTERNET|net::ERR|WebGL|Failed to load resource.*tools\.json/i.test(e)) return false
      if (faviconDiscount > 0 && /Failed to load resource: the server responded with a status of \d+/i.test(e)) {
        faviconDiscount--
        return false
      }
      return true
    })
    // A guarded route that bounced to login proves nothing about the page asked for.
    // Compare pathnames only — `r` may carry a query string (e.g. /app/compare?tools=...)
    // that page.url().pathname never includes, so comparing against the raw route
    // string here would flag every authed route with a query param as "redirected".
    const wantPath = new URL(base + r).pathname
    if (authed && new URL(page.url()).pathname !== wantPath) {
      real.push(`redirected to ${new URL(page.url()).pathname}`)
    }
    const status = real.length === 0 && rootHtml > 200 ? 'OK ' : 'FAIL'
    if (status === 'FAIL') bad++
    console.log(`${status} ${r.padEnd(20)} rootBytes=${rootHtml} errors=${real.length}`)
    real.slice(0, 3).forEach(e => console.log('      → ' + e.slice(0, 160)))
  } catch (e) {
    bad++
    console.log(`FAIL ${r} — ${e.message.slice(0, 120)}`)
  }
  await page.close()
}
await browser.close()
console.log(bad === 0 ? '\nSMOKE: all routes render clean' : `\nSMOKE: ${bad} route(s) failed`)
server.kill()
process.exit(bad === 0 ? 0 : 1)
