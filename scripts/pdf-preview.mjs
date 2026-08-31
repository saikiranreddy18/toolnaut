// Render a PDF's pages to PNGs so the output can actually be looked at.
//
// Screenshotting the source HTML is not a substitute: element capture ignores
// pagination entirely, so it shows neither where pages actually break nor what
// spills. This drives pdf.js over the real file.
import { chromium } from 'playwright'
import { resolve, basename, extname, join } from 'node:path'
import { pathToFileURL } from 'node:url'
import { writeFileSync, mkdirSync, createReadStream, statSync } from 'node:fs'
import { createServer } from 'node:http'

// Served over HTTP, not opened from disk: Chrome treats every file:// document
// as an opaque origin and refuses ES module imports across them, so pdf.js
// never loaded and the harness just never signalled ready.
const ROOT = process.cwd()
const MIME = { '.html': 'text/html', '.mjs': 'text/javascript', '.js': 'text/javascript', '.pdf': 'application/pdf', '.map': 'application/json' }
const server = createServer((req, res) => {
  const rel = decodeURIComponent(req.url.split('?')[0]).replace(/^\/+/, '')
  const file = join(ROOT, rel)
  if (!file.startsWith(ROOT)) { res.writeHead(403).end(); return }
  try {
    if (!statSync(file).isFile()) throw new Error('dir')
    res.writeHead(200, { 'content-type': MIME[extname(file)] || 'application/octet-stream' })
    createReadStream(file).pipe(res)
  } catch { res.writeHead(404).end('not found') }
})
await new Promise((r) => server.listen(0, '127.0.0.1', r))
const ORIGIN = `http://127.0.0.1:${server.address().port}`
const httpUrl = (abs) => ORIGIN + '/' + resolve(abs).slice(ROOT.length + 1).split(/[\/]/).map(encodeURIComponent).join('/')

const pdf = process.argv[2]
const outDir = process.argv[3] || 'shots/pdf'
const scale = Number(process.argv[4] || 1.4)
if (!pdf) { console.error('usage: pdf-preview.mjs <file.pdf> [outDir] [scale]'); process.exit(1) }
mkdirSync(outDir, { recursive: true })

const harness = resolve('_pdfview.html')
writeFileSync(harness, `<!doctype html><meta charset="utf-8"><body style="margin:0">
<script type="module">
import * as pdfjs from ${JSON.stringify(httpUrl('node_modules/pdfjs-dist/build/pdf.mjs'))}
pdfjs.GlobalWorkerOptions.workerSrc = ${JSON.stringify(httpUrl('node_modules/pdfjs-dist/build/pdf.worker.mjs'))}
window.render = async (url, scale) => {
  const doc = await pdfjs.getDocument({ url, isEvalSupported: false }).promise
  const out = []
  for (let i = 1; i <= doc.numPages; i++) {
    const page = await doc.getPage(i)
    const vp = page.getViewport({ scale })
    const c = document.createElement('canvas')
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height)
    await page.render({ canvasContext: c.getContext('2d'), viewport: vp }).promise
    out.push(c.toDataURL('image/png'))
  }
  return out
}
window.ready = true
</script></body>`, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage()
const errs = []
page.on('pageerror', (e) => errs.push(e.message))
await page.goto(httpUrl(harness), { waitUntil: 'networkidle' })
await page.waitForFunction(() => window.ready === true, { timeout: 30000 })

const pages = await page.evaluate(
  ([u, s]) => window.render(u, s),
  [httpUrl(pdf), scale],
)

const stem = basename(pdf).replace(/\.pdf$/i, '')
pages.forEach((d, i) => {
  writeFileSync(resolve(outDir, `${stem}-p${String(i + 1).padStart(2, '0')}.png`),
    Buffer.from(d.split(',')[1], 'base64'))
})
console.log(`${basename(pdf)}: ${pages.length} pages -> ${outDir}${errs.length ? '  errors: ' + errs.length : ''}`)
await browser.close()
server.close()
