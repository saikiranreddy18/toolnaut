// Video walkthrough only — split out of capture-evidence.mjs because the
// failed-fetch screenshot before it crashes the renderer, which killed the
// recording before it ever started.
import { spawn } from 'node:child_process'
import { mkdirSync, rmSync } from 'node:fs'
import { chromium } from 'playwright'

const PORT = 4196
const base = `http://127.0.0.1:${PORT}`
const OUT = 'evidence/video'

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

const ctx = await chromium.launchPersistentContext('', {
  headless: true,
  viewport: { width: 1440, height: 900 },
  recordVideo: { dir: OUT, size: { width: 1440, height: 900 } },
})
const page = ctx.pages()[0] || (await ctx.newPage())

const seed = (s) =>
  page.evaluate((v) => {
    for (const [k, val] of Object.entries(v)) localStorage.setItem(k, JSON.stringify(val))
  }, s)

const step = async (url, ms = 2600, label = '') => {
  await page.goto(`${base}${url}`, { waitUntil: 'networkidle' }).catch(() => {})
  await page.waitForTimeout(ms)
  if (label) console.log(`  ${label}`)
}
const scroll = async (px = 800, ms = 1400) => {
  await page.mouse.wheel(0, px)
  await page.waitForTimeout(ms)
}

await step('/', 3400, 'landing')
await scroll(900); await scroll(900); await scroll(900)
await step('/auth/login', 3000, 'sign-in gateway')
await step('/goal', 3400, 'nine-question intake')
await seed(SIGNED_IN_ONLY)
await step('/app/stack', 3400, 'STACK — first run, no persona')
await scroll(600)
await seed(SEEDED)
await step('/app/stack', 3400, 'STACK — populated')
await scroll(900); await scroll(900)
await step('/app/discover', 3400, 'FIND')
await scroll(900); await scroll(900)
await step('/app/discover?q=zzzzqqqx', 2800, 'FIND — no results')
await step('/app/tools/cursor', 3000, 'tool detail')
await scroll(700)
await step('/app/compare?tools=cursor,n8n', 2800, 'compare')
await step('/app/favorites', 3000, 'SAVED')
await step('/app/learning', 3400, 'LEARN')
await scroll(900); await scroll(700)
await step('/app/community', 3200, 'SQUAD')
await scroll(800)
await step('/app/settings', 3600, 'ME')
await scroll(900); await scroll(900)
await step('/pricing', 3000, 'pricing')
await scroll(800)

await ctx.close()
console.log('video written to', OUT)
