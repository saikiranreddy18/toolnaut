// Capture the UI/UX evidence pack: desktop + mobile stills of every screen and
// every state a reviewer asked to see (populated / empty / no-results /
// not-found / loading / failed-fetch), plus a video walkthrough of the journey.
//
// Runs against `vite preview` — the production build, not the dev server — so
// what gets captured is what actually ships.
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4195
const base = `http://127.0.0.1:${PORT}`
const OUT = 'evidence'

rmSync(OUT, { recursive: true, force: true })
mkdirSync(`${OUT}/desktop`, { recursive: true })
mkdirSync(`${OUT}/mobile`, { recursive: true })
mkdirSync(`${OUT}/video`, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
process.on('exit', () => server.kill())

const deadline = Date.now() + 60000
for (;;) {
  try {
    await fetch(base)
    break
  } catch {
    if (Date.now() > deadline) {
      console.error('preview never came up')
      process.exit(1)
    }
    await new Promise((r) => setTimeout(r, 400))
  }
}

// A signed-in reviewer with a finished intake and a few real tools, so the
// populated states are genuine rather than staged with invented catalog rows.
const SEEDED = {
  exus_session_v1: {
    user: { name: 'Test Reviewer', provider: 'google' },
    plan: 'shishya',
    role: 'user',
    simulated: true,
    at: Date.now(),
  },
  exus_quiz_v1: {
    completed: true,
    answers: {
      domain: 'code', role: 'developer', career_stage: 'mid', experience: 'builder',
      goal: 'ship', budget: 'low', pace: 'steady', learning_style: 'tinker',
      blocker: 'toomany', horizon: 'month',
    },
  },
  exus_stack_v1: ['cursor', 'n8n', 'perplexity'],
  exus_favorites_v1: ['claude', 'midjourney'],
}
const SIGNED_IN_ONLY = { exus_session_v1: SEEDED.exus_session_v1 }

const SHOTS = [
  ['01-landing', '/', null, 'public landing'],
  ['02-login', '/auth/login', null, 'gateway - /app redirects here'],
  ['03-intake', '/goal', null, 'nine-question intake'],
  ['04-stack-first-run', '/app/stack', SIGNED_IN_ONLY, 'EMPTY: signed in, no persona'],
  ['05-stack-populated', '/app/stack', SEEDED, 'populated'],
  ['06-find', '/app/discover', SEEDED, 'populated, paginated at 24'],
  ['07-find-no-results', '/app/discover?q=zzzzqqqxnotool', SEEDED, 'NO RESULTS state'],
  ['08-find-filtered', '/app/discover?cat=automation', SEEDED, 'filtered'],
  ['09-saved-empty', '/app/favorites', SIGNED_IN_ONLY, 'EMPTY + starter picks'],
  ['10-saved-populated', '/app/favorites', SEEDED, 'populated'],
  ['11-learn', '/app/learning', SEEDED, 'roadmap'],
  ['12-squad', '/app/community', SEEDED, 'rank + feed'],
  ['13-me', '/app/settings', SEEDED, 'profile / control centre'],
  ['14-tool-detail', '/app/tools/cursor', SEEDED, 'tool detail'],
  ['15-tool-not-found', '/app/tools/does-not-exist', SEEDED, 'NOT-FOUND state'],
  ['16-compare', '/app/compare?tools=cursor,n8n', SEEDED, 'comparison'],
  ['17-pricing', '/pricing', null, 'pricing'],
  ['18-new-feed', '/new', null, 'public radar feed'],
]

async function shoot(ctxOpts, dir, label) {
  const ctx = await chromium.launchPersistentContext('', { headless: true, ...ctxOpts })
  const page = ctx.pages()[0] || (await ctx.newPage())
  for (const [name, url, storage, note] of SHOTS) {
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.evaluate(() => localStorage.clear())
    if (storage) {
      await page.evaluate((s) => {
        for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
      }, storage)
    }
    await page.goto(`${base}${url}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1400)
    await page.screenshot({ path: `${OUT}/${dir}/${name}.png`, fullPage: true })
    console.log(`  ${label} ${name}  (${note})`)
  }
  await ctx.close()
}

console.log('DESKTOP 1440x900')
await shoot({ viewport: { width: 1440, height: 900 } }, 'desktop', 'desktop')

console.log('MOBILE 390x844')
await shoot(
  { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true },
  'mobile',
  'mobile',
)

console.log('LOADING state')
{
  const ctx = await chromium.launchPersistentContext('', {
    headless: true,
    viewport: { width: 1440, height: 900 },
  })
  const page = ctx.pages()[0] || (await ctx.newPage())
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
  }, SEEDED)
  await page.route('**/tools.json', async (r) => {
    await new Promise((x) => setTimeout(x, 6000))
    await r.continue()
  })
  page.goto(`${base}/app/discover`, { waitUntil: 'commit' }).catch(() => {})
  await page.waitForTimeout(900)
  await page.screenshot({ path: `${OUT}/desktop/19-loading.png` })
  console.log('  desktop 19-loading')
  await ctx.close()
}

console.log('CATALOG FETCH FAILED state')
{
  const ctx = await chromium.launchPersistentContext('', {
    headless: true,
    viewport: { width: 1440, height: 900 },
  })
  const page = ctx.pages()[0] || (await ctx.newPage())
  await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
  await page.evaluate((s) => {
    for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
  }, SEEDED)
  await page.route('**/tools.json', (r) => r.abort())
  await page.goto(`${base}/app/discover`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(1200)
  await page.screenshot({ path: `${OUT}/desktop/20-catalog-fetch-failed.png` })
  console.log('  desktop 20-catalog-fetch-failed')
  await ctx.close()
}

console.log('VIDEO walkthrough')
{
  const ctx = await chromium.launchPersistentContext('', {
    headless: true,
    viewport: { width: 1440, height: 900 },
    recordVideo: { dir: `${OUT}/video`, size: { width: 1440, height: 900 } },
  })
  const page = ctx.pages()[0] || (await ctx.newPage())
  const seed = (s) =>
    page.evaluate((v) => {
      for (const [k, val] of Object.entries(v)) localStorage.setItem(k, JSON.stringify(val))
    }, s)
  const step = async (url, ms = 2600) => {
    await page.goto(`${base}${url}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(ms)
  }
  await step('/', 3200)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(1200)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(1200)
  await step('/auth/login', 2600)
  await step('/goal', 3000)
  await seed(SIGNED_IN_ONLY)
  await step('/app/stack', 3200)
  await seed(SEEDED)
  await step('/app/stack', 3000)
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(1400)
  await step('/app/discover', 3000)
  await page.mouse.wheel(0, 900)
  await page.waitForTimeout(1400)
  await step('/app/tools/cursor', 2800)
  await step('/app/favorites', 2600)
  await step('/app/learning', 3000)
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(1400)
  await step('/app/community', 2800)
  await step('/app/settings', 3200)
  await page.mouse.wheel(0, 800)
  await page.waitForTimeout(1600)
  await step('/pricing', 2600)
  await ctx.close()
}

console.log('\nDONE')
