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
import { spawn, execSync } from 'node:child_process'
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

// The build image has no browser binaries. Install before importing anything
// that needs one, and keep the outcome — this is the step most likely to fail
// on a host we cannot read logs from.
const status = []
function note(line) { status.push(line); console.log(line) }

// The chromium binary installs fine on Vercel; it then dies the instant it is
// launched, which is the signature of missing shared libraries rather than a
// missing browser. `playwright install --with-deps` cannot help here: it shells
// out to apt-get, and the build image is Amazon Linux. So ask dnf directly, and
// treat the whole thing as best-effort — on a host that already has the libs,
// or has no dnf at all, this is a no-op and the launch below still succeeds.
if (process.env.VERCEL) {
  const LIBS = 'nss nspr atk at-spi2-atk at-spi2-core cups-libs libdrm libX11 libXcomposite libXdamage libXext libXfixes libXrandr libxkbcommon libxshmfence mesa-libgbm pango cairo alsa-lib'
  try {
    execSync(`dnf install -y ${LIBS} 2>&1 | tail -2`, { encoding: 'utf8', timeout: 240000 })
    note('deps: dnf ok')
  } catch (err) {
    note('deps: dnf FAILED — ' + String(err.message || err).split(/\r?\n/)[0])
  }
}

try {
  const out = execSync('npx playwright install chromium --only-shell 2>&1', {
    encoding: 'utf8', timeout: 300000,
  })
  note('install: ok — ' + out.trim().split(/\r?\n/).slice(-1)[0])
} catch (err) {
  note('install: FAILED — ' + String(err.message || err).split(/\r?\n/).slice(0, 3).join(' | '))
}

// Keep a pristine empty shell for the SPA rewrite fallback. Without this, every
// unmatched route would fall back to the prerendered HOMEPAGE and flash landing
// content before React routed away from it.
copyFileSync(join(DIST, 'index.html'), join(DIST, '_shell.html'))

// Every prerendered page is THIS pristine shell with the rendered app dropped
// into it — never the browser's hydrated <html> serialised back out. A live
// document carries state the shipped file must not: Vite injects a
// <link rel="modulepreload"> for each lazy chunk the route happened to touch,
// so capturing outerHTML on the landing page baked an ~850KB three.js preload
// into the entry HTML and put it on the critical path for every visitor.
// Rebuilding from the shell keeps runtime DOM mutations out of static output by
// construction, instead of maintaining a list of tags to strip after the fact.
//
// split() rather than replace(): it proves the marker is unique AND sidesteps
// replace()'s $-patterns, which would corrupt rendered markup containing "$&".
const ROOT_MARKER = '<div id="root"></div>'
const shellParts = readFileSync(join(DIST, '_shell.html'), 'utf8').split(ROOT_MARKER)
if (shellParts.length !== 2) {
  note(`shell: FAILED — expected exactly one ${ROOT_MARKER}, found ${shellParts.length - 1}`)
  note('RESULT: 0 routes prerendered — serving the SPA shell')
  writeFileSync(join(DIST, '_prerender-status.txt'), status.join('\n') + '\n')
  process.exit(0)
}

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

let browser
try {
  browser = await chromium.launch()
  note('launch: ok')
} catch (err) {
  note('launch: FAILED — ' + String(err.message || err).split(/\r?\n/).slice(0, 4).join(' | '))
  note('RESULT: 0 routes prerendered — serving the SPA shell')
  writeFileSync(join(DIST, '_prerender-status.txt'), status.join('\n') + '\n')
  process.exit(0)
}
const page = await browser.newPage({ viewport: { width: 1280, height: 900 } })

let written = 0
let failed = 0
for (const route of ROUTES) {
  try {
    await page.goto(`${base}${route}`, { waitUntil: 'networkidle', timeout: 45000 })
    // The catalog hydrates from /tools.json before first paint; give the route
    // a beat past networkidle so lists are populated rather than mid-render.
    await page.waitForTimeout(900)

    // Settle the animation library before reading #root.
    //
    // Rebuilding from the shell already keeps runtime mutations out of <head>,
    // but #root is still a snapshot of a LIVE tree, and every framer-motion
    // element here starts at initial={{ opacity: 0 }}. Those inline styles were
    // being frozen into the shipped HTML — 45 of them on the landing page — so
    // what every visitor received was a page that is INVISIBLE until React
    // hydrates and the animations run, and stays black permanently if either
    // does not: a reduced-motion preference, slow or failed JS, a hydration
    // mismatch. The static file has to represent the settled page.
    //
    // Only the properties the animation library owns are cleared; it reapplies
    // them itself on hydration, so nothing here is styling that outlives the
    // runtime.
    await page.evaluate(() => {
      for (const el of document.querySelectorAll('#root [style]')) {
        const st = el.style
        if (parseFloat(st.opacity) === 0) st.removeProperty('opacity')
        if (/translate|scale|rotate/.test(st.transform || '')) st.removeProperty('transform')
        if (st.visibility === 'hidden') st.removeProperty('visibility')
      }
    })

    const rendered = await page.$eval('#root', (el) => el.innerHTML)
    const bodyText = await page.evaluate(() => (document.getElementById('root')?.innerText || '').trim().length)

    if (bodyText < 200) {
      console.log(`  SKIP ${route} — rendered only ${bodyText} chars, refusing to ship a blank prerender`)
      failed++
      continue
    }

    const html = `${shellParts[0]}<div id="root">${rendered}</div>${shellParts[1]}`
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

// A prerender pass that silently produces nothing is worse than none at all:
// the build goes green and the site still serves a blank shell, which is
// exactly how the first attempt at this shipped without anyone noticing.
// Vercel's build logs are not reachable from here, so the outcome is written
// into dist/ and can be read back off the deployed site:
//   curl https://toolnaut.xyz/_prerender-status.txt
note(`RESULT: ${written} routes written, ${failed} skipped`)
writeFileSync(join(DIST, '_prerender-status.txt'), status.join('\n') + '\n')
if (written === 0) console.error('prerender: no routes rendered — serving the SPA shell')

// `vite preview` keeps a live handle, so node will not exit on its own and the
// build hangs until the host's timeout kills it. Kill the child and leave
// deliberately — everything that had to be written is already on disk.
server.kill()
process.exit(0)
