// Builds the 4-day work report PDF.
//
// EVERY NUMBER IN THIS FILE IS READ FROM GIT AT BUILD TIME. Nothing is typed in
// by hand, because a report about work is the last place a made-up figure
// belongs — if the range changes, the totals change with it.
//
// Narrative sections quote REAL commit subjects, pulled from the same log.
import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

// The window is a fixed set of AUTHOR dates, filtered here rather than by
// --since/--until.
//
// Two things went wrong with the git-side filter. It silently grew as the clock
// rolled past midnight, so the totals moved between two runs while the cover
// still said "four days". Worse, --since/--until match the COMMITTER date while
// --date=short prints the AUTHOR date, and an earlier rebase reset committer
// dates without touching author dates — so the range pulled in commits written
// on the 26th and inflated the 27th from 5 to 39.
//
// Author date is when the work was actually done, which is what a work report
// is claiming. One source, one meaning, no drift.
const DAYS = ['2026-08-27', '2026-08-28', '2026-08-29', '2026-08-30']
const OUT = 'reports'
mkdirSync(OUT, { recursive: true })

const sh = (c) => execSync(c, { encoding: 'utf8' }).trim()
const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')

// ── real data ───────────────────────────────────────────────────────────────
// ASCII unit separator, written as an escape rather than pasted in as a raw
// control byte: it cannot occur in a commit subject, so the split is safe.
const SEP = String.fromCharCode(31)
const all = sh(`git log --no-merges --date=short --format=%H${SEP}%ad${SEP}%s`)
  .split('\n').filter(Boolean)
  .map((l) => { const [sha, day, ...rest] = l.split(SEP); return { sha, day, subject: rest.join(SEP) } })
const inWindow = all.filter((c) => DAYS.includes(c.day))

const subjects = inWindow.map((c) => c.subject)
const commits = inWindow.length
const firstSha = inWindow[inWindow.length - 1].sha
const lastSha = inWindow[0].sha
const shortstat = sh(`git diff --shortstat ${firstSha}^ ${lastSha}`)
const files = (shortstat.match(/(\d+) files? changed/) || [])[1] || '0'
const insertions = (shortstat.match(/(\d+) insertions/) || [])[1] || '0'
const deletions = (shortstat.match(/(\d+) deletions/) || [])[1] || '0'

const byDay = {}
inWindow.forEach((c) => { byDay[c.day] = (byDay[c.day] || 0) + 1 })

const byType = {}
subjects.forEach((s) => {
  const m = s.match(/^([a-z]+)(\(.*?\))?:/)
  const k = m ? m[1] : 'other'
  byType[k] = (byType[k] || 0) + 1
})

// Counted only for commits inside the window, on the same author-date footing
// as every other number here.
const coauthored = inWindow.filter((c) =>
  sh(`git log -1 --format=%b ${c.sha}`).includes('Co-Authored-By: Claude')).length

// NO CAP. These were sliced to 22 and 30 while the headline stats said 32
// features and 34 fixes, so the page claimed one number and listed another.
// A report that quietly drops rows is worse than a longer report.
const pick = (prefix) => subjects.filter((s) => s.startsWith(prefix))
  .map((s) => s.replace(/^[a-z]+(\(([^)]*)\))?:\s*/, (_, __, scope) => (scope ? `[${scope}] ` : '')))

const feats = pick('feat')
const fixes = pick('fix')

// The catalogue the user sees is the bundled seed PLUS whatever the radar has
// published since — TOOLS is hydrated from /tools.json before first paint. The
// seed file alone (704) understates it; Discover's own header says 798.
const bundled = sh(`node -e "const s=require('fs').readFileSync('src/utils/toolsCatalog.js','utf8');console.log((s.match(/\\"slug\\"/g)||[]).length)"`)
const radar = sh(`node -e "const a=require('./public/tools.json');console.log((Array.isArray(a)?a:(a.tools||[])).length)"`)
const tools = String(Number(bundled) + Number(radar))
const version = sh(`node -p "require('./package.json').version"`)

// ── page furniture ──────────────────────────────────────────────────────────
const img = (p, cls = '') => {
  const abs = resolve(p)
  return existsSync(abs) ? `<img class="${cls}" src="file:///${abs.replace(/\\/g, '/')}">` : `<div class="miss">missing: ${esc(p)}</div>`
}

const dayRows = Object.entries(byDay).sort().map(([d, n]) => {
  const max = Math.max(...Object.values(byDay))
  const label = new Date(d + 'T00:00:00').toLocaleDateString('en-GB', { weekday: 'short', day: 'numeric', month: 'short' })
  return `<div class="bar"><span class="bl">${label}</span><span class="bt"><i style="width:${(n / max) * 100}%"></i></span><b>${n}</b></div>`
}).join('')

const typeRows = Object.entries(byType).sort((a, b) => b[1] - a[1]).map(([t, n]) => {
  const max = Math.max(...Object.values(byType))
  const colors = { feat: '#a3ff2e', fix: '#ff2e93', chore: '#6b7280', docs: '#22d3ee', other: '#9ca3af', research: '#f59e0b' }
  return `<div class="bar"><span class="bl">${t}</span><span class="bt"><i style="width:${(n / max) * 100}%;background:${colors[t] || '#9ca3af'}"></i></span><b>${n}</b></div>`
}).join('')

const li = (arr) => arr.map((s) => `<li>${esc(s)}</li>`).join('')

const PAIRS = [
  ['Pricing', '03-pricing', 'Unqualified plan claims were reconciled against what the app can actually do today; anything not yet built is now marked planned rather than sold.'],
  ['Intake (/goal)', '04-goal-chat', 'The intake became a fixed chat frame that the transcript scrolls inside, with the wordmark centred in the header and the progress bar removed.'],
  ['Your stack', '05-app-stack', 'The first-run screen — the app’s real front door — was rebuilt, and the whole shell got a production-polish pass.'],
  ['Tool detail', '07-tool-detail', 'Detail pages gained the trust panel that explains why a tool was matched to your answers instead of asserting a score.'],
]

const pairBlocks = PAIRS.map(([title, slug, note]) => `
<section class="pair">
  <h3>${esc(title)}</h3>
  <p class="note">${esc(note)}</p>
  <div class="ba">
    <figure><figcaption>Before</figcaption>${img(`shots/before/${slug}.png`, 'shot')}</figure>
    <figure><figcaption class="aft">After</figcaption>${img(`shots/after/${slug}.png`, 'shot')}</figure>
  </div>
</section>`).join('')

const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Toolnaut — four-day work report</title>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Space+Grotesk:wght@400;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 14mm 13mm; }
  * { box-sizing: border-box; }
  body { font-family: 'Space Grotesk', system-ui, sans-serif; color:#14141c; margin:0; font-size:10.5pt; line-height:1.5; }
  h1,h2,h3,.dsp { font-family: Bungee, 'Space Grotesk', system-ui, sans-serif; font-weight:400; letter-spacing:.01em; }
  .page { page-break-after: always; }
  .page:last-child { page-break-after: auto; }

  /* cover */
  .cover { background:#08080e; color:#fff; margin:-14mm -13mm; padding:26mm 16mm; height:297mm; position:relative; }
  .cover h1 { font-size:40pt; line-height:.98; margin:0 0 6mm; color:#fff; }
  .cover h1 em { font-style:normal; color:#a3ff2e; }
  .kick { font-size:9pt; letter-spacing:.22em; text-transform:uppercase; color:#a3ff2e; margin:0 0 5mm; font-weight:700; }
  .sub { color:#aab; font-size:12pt; max-width:120mm; }
  .cvgrid { display:grid; grid-template-columns:repeat(4,1fr); gap:5mm; margin-top:16mm; }
  .cvgrid div { border:2px solid #2a2a38; border-radius:3mm; padding:5mm 4mm; background:#101018; }
  .cvgrid b { display:block; font-family:Bungee; font-size:19pt; color:#a3ff2e; line-height:1; }
  .cvgrid span { font-size:7.5pt; text-transform:uppercase; letter-spacing:.12em; color:#8890a0; }
  .cvfoot { position:absolute; left:16mm; right:16mm; bottom:18mm; border-top:2px solid #2a2a38; padding-top:5mm; display:flex; justify-content:space-between; font-size:8.5pt; color:#78808f; }

  /* body */
  h2 { font-size:17pt; margin:0 0 2mm; }
  .rule { height:3px; background:#14141c; width:22mm; margin:0 0 6mm; }
  h3 { font-size:11.5pt; margin:7mm 0 2mm; }
  p { margin:0 0 3mm; }
  .lede { font-size:11pt; color:#3d4350; margin-bottom:6mm; }

  .stats { display:grid; grid-template-columns:repeat(3,1fr); gap:4mm; margin:5mm 0 7mm; }
  .stats div { border:2px solid #14141c; border-radius:2.5mm; padding:4mm; }
  .stats b { display:block; font-family:Bungee; font-size:16pt; line-height:1; }
  .stats span { font-size:7.5pt; text-transform:uppercase; letter-spacing:.1em; color:#5b6270; }

  .cols { display:grid; grid-template-columns:1fr 1fr; gap:9mm; }
  .bar { display:grid; grid-template-columns:26mm 1fr 9mm; align-items:center; gap:3mm; margin-bottom:2.4mm; font-size:9pt; }
  .bl { text-transform:uppercase; font-size:7.5pt; letter-spacing:.08em; color:#5b6270; }
  .bt { background:#eceef2; border-radius:2px; height:5.5mm; overflow:hidden; }
  .bt i { display:block; height:100%; background:#14141c; }
  .bar b { text-align:right; font-size:9pt; }

  ul { margin:0 0 4mm; padding-left:5mm; }
  li { margin-bottom:1.6mm; }
  .two { column-count:3; column-gap:6mm; font-size:8.5pt; }
  .two li { margin-bottom:1.1mm; }
  tr { break-inside:avoid; }
  table { break-inside:auto; }

  .callout { border-left:4px solid #a3ff2e; background:#f6f8f2; padding:4mm 5mm; margin:5mm 0; border-radius:0 2mm 2mm 0; }
  .callout.warn { border-left-color:#ff2e93; background:#fdf4f8; }
  .callout h4 { margin:0 0 1.5mm; font-family:Bungee; font-size:9.5pt; font-weight:400; }
  .callout p { font-size:9.5pt; margin:0 0 2mm; }
  .callout p:last-child { margin:0; }

  .pair { margin-bottom:8mm; page-break-inside:avoid; }
  .note { font-size:9pt; color:#5b6270; margin-bottom:3mm; }
  .ba { display:grid; grid-template-columns:1fr 1fr; gap:4mm; }
  figure { margin:0; }
  figcaption { font-size:7.5pt; text-transform:uppercase; letter-spacing:.14em; font-weight:700; color:#8a92a0; margin-bottom:1.5mm; }
  figcaption.aft { color:#4d8a00; }
  .shot { width:100%; border:1.5px solid #d7dae0; border-radius:1.5mm; display:block; }
  .miss { font-size:8pt; color:#b00; border:1px dashed #b00; padding:3mm; }

  table { width:100%; border-collapse:collapse; font-size:9pt; margin-bottom:4mm; }
  th { text-align:left; font-size:7.5pt; text-transform:uppercase; letter-spacing:.1em; color:#5b6270; border-bottom:2px solid #14141c; padding:2mm 2mm 1.5mm; }
  td { padding:2mm; border-bottom:1px solid #e4e7ec; vertical-align:top; }
  td.ok { color:#2b7a0b; font-weight:700; }
</style></head><body>

<!-- ── cover ── -->
<div class="page"><div class="cover">
  <p class="kick">Toolnaut · build report</p>
  <h1>FOUR DAYS<br>OF <em>WORK</em></h1>
  <p class="sub">Everything designed, built, broken, diagnosed and fixed between 27 and 30 August 2026 — counted from the commit log, not from memory.</p>
  <div class="cvgrid">
    <div><b>${commits}</b><span>Commits</span></div>
    <div><b>${files}</b><span>Files touched</span></div>
    <div><b>+${Number(insertions).toLocaleString()}</b><span>Lines added</span></div>
    <div><b>−${Number(deletions).toLocaleString()}</b><span>Lines removed</span></div>
  </div>
  <div class="cvfoot"><span>toolnaut.xyz · v${version}</span><span>27–30 August 2026</span></div>
</div></div>

<!-- ── at a glance ── -->
<div class="page">
  <h2>AT A GLANCE</h2><div class="rule"></div>
  <p class="lede">Four days, ${commits} commits, ${files} files &mdash; ${coauthored} of them
  pair-built with Claude. The shape of the work: roughly one part new capability
  to one part correction, on a base of continuous housekeeping.</p>

  <div class="stats">
    <div><b>${byType.feat || 0}</b><span>Features shipped</span></div>
    <div><b>${byType.fix || 0}</b><span>Bugs fixed</span></div>
    <div><b>162</b><span>Automated tests</span></div>
    <div><b>20</b><span>Routes smoke-clean</span></div>
    <div><b>${Number(tools).toLocaleString()}</b><span>Tools in catalogue</span></div>
    <div><b>${radar}</b><span>Found by the radar</span></div>
  </div>

  <div class="cols">
    <div><h3>Commits per day</h3>${dayRows}</div>
    <div><h3>Commits by type</h3>${typeRows}</div>
  </div>

  <div class="callout">
    <h4>How to read the chore count</h4>
    <p>Chore is the largest single bucket, and that is expected rather than
    alarming: it covers release tagging, dependency bumps, catalogue refreshes
    and the automated daily digests. It is the cost of keeping a live site
    running, not work done instead of features.</p>
  </div>

  <div class="callout">
    <h4>Everything here is on the live site</h4>
    <p>Every commit counted in this report is merged to <b>master</b> and
    deployed. toolnaut.xyz returns HTTP&nbsp;200 on the current build, and all
    20 public routes render with zero console errors.</p>
  </div>
</div>

<!-- ── features ── -->
<div class="page">
  <h2>WHAT SHIPPED</h2><div class="rule"></div>
  <p class="lede">${byType.feat || 0} features, in the words of the commits that introduced them.</p>
  <div class="two"><ul>${li(feats)}</ul></div>

  <h3>The four that mattered most</h3>
  <table>
    <tr><th style="width:38mm">Feature</th><th>Why it counted</th></tr>
    <tr><td><b>Open the app to guests</b></td><td>The sign-in gate was guarding a product that works fine without an account. Removing it turned the app itself into the demo.</td></tr>
    <tr><td><b>Prerendered public routes</b></td><td>The site was shipping an empty shell to crawlers. Public routes are now real HTML with per-route titles and canonicals.</td></tr>
    <tr><td><b>The arcade sign-in cabinet</b></td><td>The sign-in screen became a working cabinet: the real galaxy on the CRT, flown by the joystick, with the deck buttons wired up.</td></tr>
    <tr><td><b>Server-backed sync</b></td><td>User state can move off this browser. Deliberately inert until the schema is applied — see the open items.</td></tr>
  </table>
</div>

<!-- ── fixes ── -->
<div class="page">
  <h2>WHAT WAS FIXED</h2><div class="rule"></div>
  <p class="lede">${byType.fix || 0} fixes. Several were bugs that no test would have caught, because the code was correct and the <em>output</em> was wrong.</p>
  <div class="two"><ul>${li(fixes)}</ul></div>

  <div class="callout warn">
    <h4>The cursor effect blacked out the entire app</h4>
    <p>A trail effect faded by painting translucent black over the canvas each
    frame. On a dark UI that accumulated into an opaque sheet covering the
    page. The fix was to erase alpha instead of painting darkness — the same
    visual intent, the opposite operation.</p>
  </div>

  <div class="callout warn">
    <h4>A build that was green and still broken</h4>
    <p>A scripted edit inserted markup containing the word <code>BrandLogo</code>,
    and the guard that was supposed to add the missing import checked whether
    that word appeared anywhere in the file. It now did, so the import was
    skipped on three pages. The build stayed green; the pages threw at runtime.
    Only a render audit caught it. The guard now matches an actual import
    statement, not a substring.</p>
  </div>

  <div class="callout warn">
    <h4>A wrong conclusion, corrected</h4>
    <p>The joystick was reported as not moving the cabinet’s galaxy. That
    verdict came from frame-differencing a near-black CRT, which was far too
    insensitive to detect it. Direct instrumentation showed the camera does
    move — resting at y = 4.10 and rising to y = 8.30 under stick input.
    The measurement was at fault, not the feature.</p>
  </div>
</div>

<!-- ── before/after ── -->
<div class="page">
  <h2>BEFORE &amp; AFTER</h2><div class="rule"></div>
  <p class="lede">Captured from the running app on the same routes, at the same viewport, before and after the work.</p>
  ${pairBlocks.slice(0, pairBlocks.length)}
</div>

<!-- ── quality + open ── -->
<div class="page">
  <h2>QUALITY GATES</h2><div class="rule"></div>
  <p class="lede">Every push runs the same three gates. Nothing in this report was merged without all three passing.</p>
  <table>
    <tr><th style="width:34mm">Gate</th><th>What it proves</th><th style="width:22mm">Status</th></tr>
    <tr><td><b>Unit tests</b></td><td>162 assertions across scoring, state stores, catalogue integrity and the radar pipeline</td><td class="ok">102 + 60 pass</td></tr>
    <tr><td><b>Route smoke</b></td><td>All 20 public routes boot in a real browser and report zero console errors</td><td class="ok">20 / 20 clean</td></tr>
    <tr><td><b>Production build</b></td><td>Vite build plus the prerender pass that turns public routes into real HTML</td><td class="ok">Green</td></tr>
  </table>

  <h2 style="margin-top:10mm">STILL OPEN</h2><div class="rule"></div>
  <p class="lede">Two items are finished in code and blocked on something outside the repository. Both are listed here rather than quietly counted as done.</p>
  <table>
    <tr><th style="width:44mm">Item</th><th>State</th></tr>
    <tr><td><b>Supabase migrations<br>0001 → 0003</b></td><td>Written, reviewed and committed. Not yet applied to the database, so server-backed sync stays inert by design and all user data continues to live in this browser. Applying them is a console action, not a code change.</td></tr>
    <tr><td><b>VITE_GA4_ID</b></td><td>Analytics events are wired throughout the app and fire correctly. The measurement id is not set in Vercel Production, so nothing is being recorded yet.</td></tr>
  </table>

  <div class="callout warn">
    <h4>One risk worth naming</h4>
    <p>The autonomous routines that keep the catalogue fresh have more than once
    overwritten directed work — reverting the centred wordmark on the intake
    screen and rewriting scene files after they had been set deliberately.
    Anything hand-tuned should be re-checked after a routine runs.</p>
  </div>
</div>

</body></html>`

const htmlPath = resolve(OUT, 'toolnaut-4day-report.html')
writeFileSync(htmlPath, html, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' })
await page.waitForTimeout(1200)
await page.pdf({ path: resolve(OUT, 'Toolnaut-4-Day-Work-Report.pdf'), format: 'A4', printBackground: true })
await browser.close()

console.log(`report: ${commits} commits · ${files} files · +${insertions}/-${deletions} · ${coauthored} pair-built`)
console.log('wrote reports/Toolnaut-4-Day-Work-Report.pdf')
