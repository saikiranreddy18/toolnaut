// Post-build smoke test: renders every top-level route in a real browser and
// fails on any uncaught error or blank #root. This is the signal the automated
// bugfix agent keys off — without it, "the build passed" says nothing about
// whether the app actually renders.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 4173
const base = `http://127.0.0.1:${PORT}`

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
process.on('exit', () => server.kill())
await new Promise((r) => setTimeout(r, 5000))
const routes = ['/', '/quiz?step=1', '/pricing', '/about', '/starchart', '/app/stack', '/app/discover', '/app/learning', '/app/community', '/app/settings', '/office']
const browser = await chromium.launch()
let bad = 0
for (const r of routes) {
  const page = await browser.newPage()
  const errs = []
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
    await page.goto(base + r, { waitUntil: 'networkidle', timeout: 25000 })
    await page.waitForTimeout(1200)
    const rootHtml = await page.$eval('#root', el => el.innerHTML.length).catch(() => 0)
    const real = errs.filter(e => !/favicon|fonts.googleapis|fonts.gstatic|ERR_INTERNET|net::ERR|WebGL|Failed to load resource.*tools\.json/i.test(e))
    // A guarded route that bounced to login proves nothing about the page asked for.
    if (authed && new URL(page.url()).pathname !== r) {
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
