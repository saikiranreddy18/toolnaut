// Capture every screen as a compression-friendly JPEG, sized to be embeddable
// in a single shareable page. capture-evidence.mjs writes full-resolution PNGs
// for the record; this writes the reviewable set.
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync, readFileSync, writeFileSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4197
const base = `http://127.0.0.1:${PORT}`
const OUT = 'evidence/gallery'

rmSync(OUT, { recursive: true, force: true })
mkdirSync(OUT, { recursive: true })

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
  stdio: 'ignore',
  shell: process.platform === 'win32',
})
process.on('exit', () => server.kill())

const deadline = Date.now() + 60000
for (;;) {
  try { await fetch(base); break } catch {
    if (Date.now() > deadline) { console.error('preview never came up'); process.exit(1) }
    await new Promise((r) => setTimeout(r, 400))
  }
}

const SEEDED = {
  exus_session_v1: {
    user: { name: 'Test Reviewer', provider: 'google' },
    plan: 'shishya', role: 'user', simulated: true, at: Date.now(),
  },
  exus_quiz_v1: {
    completed: true,
    answers: {
      domain: 'code', role: 'developer', career_stage: 'mid', experience: 'builder',
      goal: 'ship', budget: 'low', pace: 'steady', learning_style: 'tinker',
      blocker: 'toomany',
    },
  },
  exus_stack_v1: ['cursor', 'n8n', 'perplexity'],
  exus_favorites_v1: ['claude', 'midjourney'],
}
const SIGNED_IN_ONLY = { exus_session_v1: SEEDED.exus_session_v1 }

// [id, label, path, storage, state]
const SCREENS = [
  ['landing',        'Landing',              '/',                              null,           'public'],
  ['login',          'Sign in',              '/auth/login',                    null,           'gateway'],
  ['intake',         'Onboarding intake',    '/goal',                          null,           'step 1 of 9'],
  ['stack-empty',    'Stack — first run',    '/app/stack',                     SIGNED_IN_ONLY, 'empty'],
  ['stack',          'Stack — dashboard',    '/app/stack',                     SEEDED,         'populated'],
  ['find',           'Find — discovery',     '/app/discover',                  SEEDED,         'populated'],
  ['find-empty',     'Find — no results',    '/app/discover?q=zzzzqqqxnotool', SEEDED,         'no results'],
  ['find-filtered',  'Find — filtered',      '/app/discover?cat=automation',   SEEDED,         'filtered'],
  ['saved-empty',    'Saved — empty',        '/app/favorites',                 SIGNED_IN_ONLY, 'empty'],
  ['saved',          'Saved — shortlist',    '/app/favorites',                 SEEDED,         'populated'],
  ['learn',          'Learn — roadmap',      '/app/learning',                  SEEDED,         'populated'],
  ['squad',          'Squad — community',    '/app/community',                 SEEDED,         'populated'],
  ['me',             'Me — control centre',  '/app/settings',                  SEEDED,         'populated'],
  ['tool',           'Tool detail',          '/app/tools/cursor',              SEEDED,         'populated'],
  ['tool-404',       'Tool — not found',     '/app/tools/does-not-exist',      SEEDED,         'not found'],
  ['compare',        'Compare',              '/app/compare?tools=cursor,n8n',  SEEDED,         'populated'],
  ['pricing',        'Pricing',              '/pricing',                       null,           'public'],
  ['newfeed',        'New this week',        '/new',                           null,           'public'],
]

async function shoot(opts, suffix) {
  const ctx = await chromium.launchPersistentContext('', { headless: true, ...opts })
  const page = ctx.pages()[0] || (await ctx.newPage())
  for (const [id, , url, storage] of SCREENS) {
    const target = SCREENS.find((s) => s[0] === id)[2]
    await page.goto(`${base}/`, { waitUntil: 'domcontentloaded' }).catch(() => {})
    await page.evaluate(() => localStorage.clear())
    if (storage) {
      await page.evaluate((s) => {
        for (const [k, v] of Object.entries(s)) localStorage.setItem(k, JSON.stringify(v))
      }, storage)
    }
    await page.goto(`${base}${target}`, { waitUntil: 'networkidle' }).catch(() => {})
    await page.waitForTimeout(1300)
    await page.screenshot({ path: `${OUT}/${id}-${suffix}.jpg`, type: 'jpeg', quality: 68, fullPage: true })
    console.log(`  ${suffix} ${id}`)
  }
  await ctx.close()
}

console.log('DESKTOP')
await shoot({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 0.72 }, 'desktop')
console.log('MOBILE')
await shoot({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 1, isMobile: true, hasTouch: true }, 'mobile')

// Emit a manifest with base64 payloads so the gallery page can be built without
// re-reading 38 files by hand.
const manifest = SCREENS.map(([id, label, url, storage, state]) => ({
  id, label, url, state,
  auth: storage ? 'signed in' : 'public',
  desktop: readFileSync(`${OUT}/${id}-desktop.jpg`).toString('base64'),
  mobile: readFileSync(`${OUT}/${id}-mobile.jpg`).toString('base64'),
}))
writeFileSync(`${OUT}/manifest.json`, JSON.stringify(manifest))
const mb = (JSON.stringify(manifest).length / 1048576).toFixed(1)
console.log(`\nmanifest.json written — ${mb} MB of base64 across ${manifest.length} screens x2`)
