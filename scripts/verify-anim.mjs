// One-off verification for the two scroll animations, in headless Chromium —
// which composites frames, unlike the in-app browser pane where document.hidden
// is permanently true and IntersectionObserver never fires at all.
import { spawn } from 'node:child_process'
import { chromium } from 'playwright'

const PORT = 4177
const base = `http://127.0.0.1:${PORT}`

const server = spawn('npx', ['vite', 'preview', '--port', String(PORT), '--host', '127.0.0.1', '--strictPort'], {
  stdio: 'ignore', shell: process.platform === 'win32',
})
process.on('exit', () => server.kill())

const deadline = Date.now() + 60000
for (;;) {
  try { await fetch(base); break } catch {
    if (Date.now() > deadline) { console.error('preview never came up'); process.exit(1) }
    await new Promise((r) => setTimeout(r, 400))
  }
}

const browser = await chromium.launch()
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } })
await page.goto(base, { waitUntil: 'networkidle' })

const state = () => page.evaluate(() => {
  const svg = [...document.querySelectorAll('svg')].find((s) => s.getAttribute('viewBox') === '0 0 100 80')
  const c = svg?.querySelector('circle')
  const l = svg?.querySelector('line')
  return {
    hidden: document.hidden,
    cx: c ? Math.round(Number(c.getAttribute('cx'))) : null,
    op: c ? getComputedStyle(c).opacity : null,
    line: l ? getComputedStyle(l).opacity : null,
  }
})

const toRoles = () => page.evaluate(() => {
  const h = [...document.querySelectorAll('h3')].find((x) => /STUDENT/i.test(x.textContent))
  h.scrollIntoView({ block: 'center' })
})

console.log('env:', JSON.stringify(await state()))
await toRoles(); await page.waitForTimeout(2200)
console.log('ENTERED :', JSON.stringify(await state()))
await page.evaluate(() => window.scrollTo(0, 0)); await page.waitForTimeout(1200)
console.log('LEFT    :', JSON.stringify(await state()))
await toRoles(); await page.waitForTimeout(2200)
console.log('REENTERED:', JSON.stringify(await state()))

// The mastery connector: same both-directions requirement
const conn = () => page.evaluate(() => {
  const path = document.querySelector('#pathGrad')?.closest('svg')?.querySelector('path')
  return path ? { dash: getComputedStyle(path).strokeDashoffset, len: path.getAttribute('pathLength') || 'n/a' } : 'no path'
})
await page.evaluate(() => {
  const h = [...document.querySelectorAll('h3,h2')].find((x) => /DISCOVER/i.test(x.textContent))
  h?.scrollIntoView({ block: 'center' })
})
await page.waitForTimeout(1800)
console.log('CONNECTOR in view:', JSON.stringify(await conn()))

await browser.close()
server.kill()
process.exit(0)
