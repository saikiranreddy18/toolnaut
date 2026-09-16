// Writes one static, crawlable HTML page per tool: dist/ai-tools/<slug>/index.html
// and adds every one of them to dist/sitemap.xml.
//
// WHY NOT THE PRERENDERER. scripts/prerender.mjs drives a real browser, which
// is right for a dozen marketing routes and wrong for 1,100 tool pages: about a
// second each in a browser that already struggles to launch on Vercel's build
// image. These pages are pure data, so they are rendered as strings instead —
// milliseconds each, no browser, nothing that can fail to launch.
//
// The head and body come from src/utils/toolSeo.js, the same module the React
// page uses, so what the crawler reads and what the app renders cannot drift.
// Vercel serves a file before it applies rewrites, so /ai-tools/chatgpt gets
// this HTML directly and the SPA takes over once its script loads.
//
// Runs last in the build, after prerender, because it reads the app shell that
// prerender leaves behind and appends to the sitemap stamp-sitemap wrote.
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { join, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

const DIST = 'dist'
const imp = (p) => import(pathToFileURL(resolve(p)).href)

const { TOOLS, hydrateCatalog } = await imp('src/utils/toolsCatalog.js')
const { isCatalogNoise } = await imp('src/utils/prominence.js')
const { SITE, toolPath, toolTitle, toolDescription, toolJsonLd, toolStaticHtml, relatedTools } = await imp('src/utils/toolSeo.js')

// The live radar catalogue, merged the same way the app merges it at startup.
const live = join(DIST, 'tools.json')
if (existsSync(live)) {
  try {
    const raw = JSON.parse(readFileSync(live, 'utf8'))
    hydrateCatalog(Array.isArray(raw) ? raw : raw?.tools || [])
  } catch {
    console.warn('gen-tool-pages: dist/tools.json unreadable — bundled catalogue only')
  }
}

// Repositories and forum posts the radar mis-shelved as tools are real entries
// but not products; they get no page of their own to rank.
const tools = TOOLS.filter((t) => t?.slug && t?.name && !isCatalogNoise(t))

const shellPath = existsSync(join(DIST, '_shell.html')) ? join(DIST, '_shell.html') : join(DIST, 'index.html')
const ROOT_MARKER = '<div id="root"></div>'
const parts = readFileSync(shellPath, 'utf8').split(ROOT_MARKER)
if (parts.length !== 2) {
  console.warn(`gen-tool-pages: shell has ${parts.length - 1} root markers, expected 1 — no tool pages written`)
  process.exit(0)
}

const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

function head(t, related) {
  const url = `${SITE}${toolPath(t.slug)}`
  const title = toolTitle(t)
  const desc = toolDescription(t)
  let h = parts[0]
  const attr = (re, value) => { h = h.replace(re, (_, pre, post) => `${pre}${esc(value)}${post}`) }
  h = h.replace(/<title>[^<]*<\/title>/, () => `<title>${esc(title)}</title>`)
  attr(/(<meta name="description" content=")[^"]*(")/, desc)
  attr(/(<link rel="canonical" href=")[^"]*(")/, url)
  attr(/(<meta property="og:title" content=")[^"]*(")/, title)
  attr(/(<meta property="og:description" content=")[^"]*(")/, desc)
  attr(/(<meta property="og:url" content=")[^"]*(")/, url)
  attr(/(<meta name="twitter:title" content=")[^"]*(")/, title)
  attr(/(<meta name="twitter:description" content=")[^"]*(")/, desc)
  const ld = JSON.stringify(toolJsonLd(t, related)).replace(/</g, '\\u003c')
  return h.replace('</head>', () => `<script type="application/ld+json" id="route-jsonld">${ld}</script>\n  </head>`)
}

let written = 0
for (const t of tools) {
  const related = relatedTools(t, tools, 6)
  const html = `${head(t, related)}<div id="root">${toolStaticHtml(t, related)}</div>${parts[1]}`
  const dir = join(DIST, 'ai-tools', t.slug)
  mkdirSync(dir, { recursive: true })
  writeFileSync(join(dir, 'index.html'), html)
  written++
}

// Sitemap: one <url> per tool page, inserted before the closing tag. Tools the
// radar dated carry a truthful lastmod; bundled tools carry none rather than a
// fake "today".
const mapPath = join(DIST, 'sitemap.xml')
if (existsSync(mapPath)) {
  const xml = readFileSync(mapPath, 'utf8')
  const already = new Set([...xml.matchAll(/<loc>([^<]+)<\/loc>/g)].map((m) => m[1]))
  const entries = tools
    .map((t) => {
      const loc = `${SITE}${toolPath(t.slug)}`
      if (already.has(loc)) return ''
      const when = t.discoveredAt ? new Date(t.discoveredAt) : null
      const lastmod = when && !Number.isNaN(when.getTime()) ? `<lastmod>${when.toISOString().slice(0, 10)}</lastmod>` : ''
      return `  <url><loc>${loc}</loc>${lastmod}</url>`
    })
    .filter(Boolean)
    .join('\n')
  writeFileSync(mapPath, xml.replace('</urlset>', () => `${entries}\n</urlset>`))
}

console.log(`gen-tool-pages: ${written} tool pages written, sitemap updated`)
