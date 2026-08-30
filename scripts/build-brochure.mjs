// Builds the Toolnaut handbook — what the app is, how it works, how to use it.
//
// Every screen shown here is a REAL capture of the running app (shots/book/),
// taken from a seeded session with the actual quiz schema, not a mockup. The
// tool count is read from the same two sources the app reads at runtime, so
// the book cannot claim a catalogue size the product does not have.
import { execSync } from 'node:child_process'
import { writeFileSync, mkdirSync, existsSync } from 'node:fs'
import { resolve } from 'node:path'
import { chromium } from 'playwright'

const OUT = 'reports'
mkdirSync(OUT, { recursive: true })
const sh = (c) => execSync(c, { encoding: 'utf8' }).trim()

const bundled = Number(sh(`node -e "const s=require('fs').readFileSync('src/utils/toolsCatalog.js','utf8');console.log((s.match(/\\"slug\\"/g)||[]).length)"`))
const radar = Number(sh(`node -e "const a=require('./public/tools.json');console.log((Array.isArray(a)?a:(a.tools||[])).length)"`))
const TOOLS = bundled + radar

const img = (p, cls = 'shot') => {
  const abs = resolve(p)
  return existsSync(abs)
    ? `<img class="${cls}" src="file:///${abs.replace(/\\/g, '/')}">`
    : `<div class="miss">missing: ${p}</div>`
}

// tall: crops from the top instead of shrinking a very long capture to a
// postage stamp. Compare and Learning run past 1500px and would otherwise be
// unreadable on the page.
const S = (n, cls = 'shot') => img(`shots/book/${n}.png`, cls)

const html = `<!doctype html><html><head><meta charset="utf-8">
<title>Toolnaut — the handbook</title>
<link href="https://fonts.googleapis.com/css2?family=Bungee&family=Space+Grotesk:wght@400;500;600;700&display=swap" rel="stylesheet">
<style>
  @page { size: A4; margin: 0; }
  * { box-sizing: border-box; }
  html { background:#0a0a12; }
  body { margin:0; background:#0a0a12; color:#e8ecf4;
         font-family:'Space Grotesk',system-ui,sans-serif; font-size:10.5pt; line-height:1.55; }
  h1,h2,h3,h4,.dsp { font-family:Bungee,'Space Grotesk',system-ui,sans-serif; font-weight:400; }
  .page { width:210mm; min-height:297mm; padding:18mm 16mm; page-break-after:always;
          position:relative; background:#0a0a12; }
  .page:last-child { page-break-after:auto; }
  a { color:inherit; }

  .lime { color:#a3ff2e; } .pink { color:#ff2e93; } .cyan { color:#22d3ee; }
  .kick { font-size:8.5pt; letter-spacing:.24em; text-transform:uppercase; color:#a3ff2e;
          font-weight:700; margin:0 0 4mm; }
  h2 { font-size:21pt; line-height:1.05; margin:0 0 3mm; font-style:italic; }
  h3 { font-size:12pt; margin:0 0 2mm; font-style:italic; }
  p { margin:0 0 3.5mm; color:#c3c9d6; }
  .lede { font-size:11.5pt; color:#aab3c4; margin-bottom:6mm; }
  strong { color:#fff; font-weight:600; }

  /* cover */
  .cover { display:flex; flex-direction:column; justify-content:center; height:297mm;
           background:radial-gradient(120% 90% at 70% 25%, #1a1030 0%, #0a0a12 62%); }
  .mark { font-family:Bungee; font-size:44pt; font-style:italic; line-height:1; margin:0 0 5mm; }
  .mark .lime { font-size:1.35em; line-height:0; vertical-align:-0.06em; }
  .cover h1 { font-size:30pt; line-height:1.04; margin:0 0 6mm; font-style:italic; }
  .cover .lede { max-width:130mm; font-size:12.5pt; }
  .badge { display:inline-block; align-self:flex-start; border:2px solid #a3ff2e; color:#a3ff2e; border-radius:99px;
           padding:2mm 5mm; font-size:8.5pt; letter-spacing:.16em; text-transform:uppercase;
           font-weight:700; margin-bottom:8mm; }
  .cvfoot { position:absolute; left:16mm; right:16mm; bottom:16mm; display:flex;
            justify-content:space-between; font-size:8.5pt; color:#6c7486;
            border-top:1px solid #23233a; padding-top:4mm; }

  /* steps */
  .steps { display:grid; grid-template-columns:repeat(2,1fr); gap:6mm; margin:6mm 0; }
  .step { border:2px solid #23233a; border-radius:3mm; padding:5mm; background:#101019; }
  .step b { font-family:Bungee; color:#a3ff2e; font-size:15pt; display:block; line-height:1; margin-bottom:2mm; }
  .step h4 { font-size:10.5pt; margin:0 0 1.5mm; font-style:italic; }
  .step p { font-size:9pt; margin:0; color:#9aa3b4; }

  /* figures */
  figure { margin:0 0 5mm; }
  .shot { width:100%; border:1.5px solid #23233a; border-radius:2mm; display:block; }
  .tall { width:100%; height:96mm; object-fit:cover; object-position:top;
          border:1.5px solid #23233a; border-radius:2mm; display:block; }
  .half { width:100%; height:56mm; object-fit:cover; object-position:top;
          border:1.5px solid #23233a; border-radius:2mm; display:block; }
  figcaption { font-size:8pt; color:#6c7486; margin-top:2mm; }
  .two { display:grid; grid-template-columns:1fr 1fr; gap:5mm; }

  .note { border-left:3px solid #a3ff2e; background:#111a0d; padding:4mm 5mm;
          border-radius:0 2mm 2mm 0; margin:5mm 0; }
  .note.pinkk { border-left-color:#ff2e93; background:#1a0d15; }
  .note h4 { font-size:9.5pt; margin:0 0 1.5mm; font-style:italic; }
  .note p { font-size:9.5pt; margin:0; color:#b8c0d0; }

  ul { margin:0 0 4mm; padding-left:5mm; color:#c3c9d6; }
  li { margin-bottom:1.8mm; }
  li b { color:#fff; }

  table { width:100%; border-collapse:collapse; font-size:9.5pt; }
  tr { break-inside:avoid; }
  .page { orphans:3; widows:3; }
  th { text-align:left; font-size:7.5pt; letter-spacing:.12em; text-transform:uppercase;
       color:#6c7486; border-bottom:2px solid #23233a; padding:2.5mm 2mm; }
  td { padding:2.5mm 2mm; border-bottom:1px solid #1a1a2a; color:#c3c9d6; vertical-align:top; }
  td b { color:#fff; }
  .miss { font-size:8pt; color:#ff6b6b; border:1px dashed #ff6b6b; padding:3mm; }
  .pg { position:absolute; right:16mm; bottom:10mm; font-size:8pt; color:#4c5262; }
</style></head><body>

<!-- ── cover ── -->
<div class="page cover">
  <p class="mark">T<span class="lime">∞</span>lnaut</p>
  <span class="badge">The handbook</span>
  <h1>Your AI stack,<br>chosen for who<br>you actually are.</h1>
  <p class="lede">${TOOLS.toLocaleString()} AI tools. Nine questions. One plan you can
  actually follow. This book explains what Toolnaut does, how it decides, and
  how to use every part of it.</p>
  <div class="cvfoot"><span>toolnaut.xyz</span><span>Free public beta</span></div>
</div>

<!-- ── what it is ── -->
<div class="page">
  <p class="kick">Chapter one</p>
  <h2>The problem with<br>“best AI tools” lists</h2>
  <p class="lede">There are thousands of AI tools and roughly infinite listicles
  ranking them. None of them know anything about you — your job, your budget,
  how much time you have on a Tuesday night, or what actually stopped you last
  time.</p>

  <p>Toolnaut starts from the opposite end. It asks you nine short questions,
  then builds a stack from the ${TOOLS.toLocaleString()} tools in its catalogue
  and a four-week plan for learning them. Every pick can explain why it was
  chosen for <strong>you</strong> — not why it is popular.</p>

  <h3 style="margin-top:7mm">How it works</h3>
  <div class="steps">
    <div class="step"><b>01</b><h4>Answer nine questions</h4>
      <p>About a minute. No account, no email. Your answers stay in your browser.</p></div>
    <div class="step"><b>02</b><h4>Get your stack</h4>
      <p>A named persona and a set of tools matched to your domain, level, budget and pace.</p></div>
    <div class="step"><b>03</b><h4>Follow the 4-week orbit</h4>
      <p>Week by week, tool by tool. Each week unlocks when you finish the one before it.</p></div>
    <div class="step"><b>04</b><h4>Explore and adjust</h4>
      <p>Search the full catalogue, compare tools side by side, add and drop as you go.</p></div>
  </div>

  <div class="note">
    <h4>You can try all of it without signing up</h4>
    <p>The whole app works as a guest — the quiz, your stack, the learning plan,
    search and compare. Everything is saved to this browser. Signing in exists
    so your work can follow you to another device, not to unlock features.</p>
  </div>
  <span class="pg">1</span>
</div>

<!-- ── step 1 ── -->
<div class="page">
  <p class="kick">Chapter two · Step one</p>
  <h2>Tell Naut what you do</h2>
  <p class="lede">The intake is a conversation, not a form. Nine questions,
  each with tappable answers — or type your own in your own words.</p>
  <figure>${S('02-goal', 'tall')}<figcaption>The intake at toolnaut.xyz/goal — no account required.</figcaption></figure>
  <h3>What it asks, and why</h3>
  <table>
    <tr><th style="width:44mm">Question</th><th>What it changes</th></tr>
    <tr><td><b>Your domain</b></td><td>Which corner of the catalogue you start from — code, design, writing, data, automation or learning</td></tr>
    <tr><td><b>Role &amp; career stage</b></td><td>The persona you are given, and how advanced the picks are</td></tr>
    <tr><td><b>Experience</b></td><td>Whether you get beginner-friendly tools or the powerful, fiddly ones</td></tr>
    <tr><td><b>Goal</b></td><td>Ship a project, get a job, save time, freelance or lead — reorders everything</td></tr>
    <tr><td><b>Budget</b></td><td>A “free only” answer means you are never shown a paid tool as a core pick</td></tr>
    <tr><td><b>Pace</b></td><td>How much the four-week plan asks of you each week</td></tr>
    <tr><td><b>Learning style</b></td><td>The tip attached to every step — a googler and a course-taker get different advice</td></tr>
    <tr><td><b>Blocker</b></td><td>What actually stops you, answered directly in your plan</td></tr>
  </table>
  <span class="pg">2</span>
</div>

<!-- ── step 2 ── -->
<div class="page">
  <p class="kick">Chapter three · Step two</p>
  <h2>Your stack</h2>
  <p class="lede">The home screen. Your persona, your streak, where your skills
  are thin, and the kit itself.</p>
  <figure>${S('05-stack', 'tall')}<figcaption>Your stack — persona, streak, skill graph and the tools themselves.</figcaption></figure>
  <h3>What is on this screen</h3>
  <ul>
    <li><b>Your persona</b> — a name for how you answered, e.g. “Curious Learner”.</li>
    <li><b>Streak</b> — the run of days you have opened the app. Real, and yours alone.</li>
    <li><b>Skill graph</b> — one bar per domain, showing how far along you are with the tools you own rather than how many you have collected. Empty bars are the point: they show where the gaps are.</li>
    <li><b>Your kit</b> — every tool you have added. Tap the status button to cycle it: <span class="lime">Not started → Exploring → Using weekly → Mastered</span>. That is what fills the graph.</li>
    <li><b>Today’s drop</b> — one fresh pick a day, matched to you and not yet in your stack.</li>
    <li><b>Points</b> — earned from the size of your stack and the steps you complete.</li>
  </ul>
  <div class="note">
    <h4>Why the bars start empty</h4>
    <p>Adding a tool is not progress. The graph moves when you mark a tool as
    actually being used, which is why a full kit can still show a flat line.</p>
  </div>
  <span class="pg">3</span>
</div>

<!-- ── step 3 ── -->
<div class="page">
  <p class="kick">Chapter four · Step three</p>
  <h2>The four-week orbit</h2>
  <p class="lede">A stack without a plan is just a list. The orbit turns it into
  four weeks of small, specific moves.</p>
  <figure>${S('07-learning', 'tall')}<figcaption>Your 4-week orbit — one tool per week, the next locked until you finish this one.</figcaption></figure>
  <ul>
    <li><b>One tool per week</b>, drawn from your own stack.</li>
    <li><b>Two concrete steps per tool</b> — set it up, then use it on something real. Each has a <em>How</em> expander if you get stuck.</li>
    <li><b>Weeks lock.</b> Week two opens when week one is done, so you finish things instead of collecting them.</li>
    <li><b>Week four is a build.</b> Ship one small real project using your top two tools together.</li>
    <li><b>The tip is yours.</b> It is written for the learning style you picked.</li>
  </ul>
  <div class="note">
    <h4>Set the pace once</h4>
    <p>The plan is sized to the time you said you had, from under an hour a week
    to five-plus. Change that answer and the orbit resizes with it.</p>
  </div>
  <span class="pg">4</span>
</div>

<!-- ── find + compare ── -->
<div class="page">
  <p class="kick">Chapter five</p>
  <h2>Find &amp; compare</h2>
  <p class="lede">The stack is a starting point, not a cage. The full catalogue
  is open, searchable and ranked for you.</p>

  <h3>Find</h3>
  <figure>${S('06-discover', 'half')}<figcaption>Search, filter by domain, price and level, and see what the radar found this week.</figcaption></figure>
  <p>Search by name, company or problem. Filter by domain, by price
  (<strong>free, freemium, paid</strong>) and by level. Once you have taken the
  quiz, every card carries a personal match score. <strong>New this week</strong>
  is the automated radar’s latest finds.</p>

  <h3 style="margin-top:6mm">Compare</h3>
  <figure>${S('08-compare', 'half')}<figcaption>Two to four tools side by side, including how well each matches you.</figcaption></figure>
  <p>Tick <strong>Compare</strong> on two to four tools and see them on one
  screen: match score, category, real pricing, level, developer, year, audience,
  status and tags. Add the winner to your stack without leaving the page.</p>
  <span class="pg">5</span>
</div>

<!-- ── trust ── -->
<div class="page">
  <p class="kick">Chapter six</p>
  <h2>See it before<br>you start</h2>
  <p class="lede">Two pages exist purely so you can judge Toolnaut before giving
  it a single answer.</p>

  <div class="two">
    <figure>${S('03-example', 'half')}<figcaption>A complete worked example stack.</figcaption></figure>
    <figure>${S('09-methodology', 'half')}<figcaption>How tools are chosen, in plain language.</figcaption></figure>
  </div>

  <h3>How tools get in</h3>
  <p>An automated pass runs twice a day against public sources — GitHub, Hacker
  News, and, where configured, Product Hunt and RSS. Candidates are scored:
  above <strong>0.75</strong> a tool publishes automatically, between
  <strong>0.4 and 0.75</strong> it waits in a review queue, below that it is
  rejected. The middle band exists so uncertain entries wait rather than appear
  as though they were confirmed.</p>

  <h3>What the AI does — and does not</h3>
  <p>A language model writes the short description and assigns a category. It
  does <strong>not</strong> decide whether a tool is good, and it does not set
  your ranking. Ranking is a scoring function over your own answers, which is
  why every pick can show its reason.</p>

  <div class="note pinkk">
    <h4>What is not verified</h4>
    <p>Pricing, free-tier limits and feature claims come from each tool’s own
    listing and are not independently confirmed — vendors change plans without
    notice. Check the vendor’s pricing page before committing money or data.
    Security and privacy practices are not audited either.</p>
  </div>

  <div class="note">
    <h4>No commercial relationships</h4>
    <p>No affiliate links, no referral parameters, no sponsored placements, no
    payment for inclusion or position. If that ever changes it will be disclosed
    before it goes live, not after.</p>
  </div>
  <span class="pg">6</span>
</div>

<!-- ── accounts + pricing ── -->
<div class="page">
  <p class="kick">Chapter seven</p>
  <h2>Keeping your work</h2>
  <p class="lede">Everything is saved to your browser the moment you do it.
  Signing in is only about moving it somewhere else.</p>
  <figure>${S('04-signin', 'half')}<figcaption>Sign in with Google or a magic link — no password to invent.</figcaption></figure>
  <p>Continue with Google, or have a one-time magic link emailed to you. When
  you sign in for the first time, everything you did as a guest is offered for
  import so nothing is lost.</p>

  <h3 style="margin-top:6mm">What it costs</h3>
  <figure>${S('10-pricing', 'half')}<figcaption>Published plans — and an honest split of what is live today.</figcaption></figure>
  <div class="note">
    <h4>Nothing, right now</h4>
    <p>Toolnaut is in free public beta and takes no payment of any kind — no
    card is asked for. The plans above are published so the direction is
    visible, and every line in the comparison is marked either live today or
    planned. Nothing unbuilt is sold as though it exists.</p>
  </div>
  <span class="pg">7</span>
</div>

<!-- ── reference ── -->
<div class="page">
  <p class="kick">Chapter eight</p>
  <h2>Everything, in one table</h2>
  <p class="lede">Each section of the app, what it is for, and whether it needs
  an account.</p>
  <table>
    <tr><th style="width:26mm">Section</th><th>What it does</th><th style="width:22mm">Account?</th></tr>
    <tr><td><b>Stack</b></td><td>Your persona, streak, skill graph, your kit and the daily drop</td><td>No</td></tr>
    <tr><td><b>Find</b></td><td>Search and filter all ${TOOLS.toLocaleString()} tools; personal match scores after the quiz</td><td>No</td></tr>
    <tr><td><b>Saved</b></td><td>Tools you favourited but have not committed to your stack</td><td>No</td></tr>
    <tr><td><b>Learn</b></td><td>The four-week orbit, its steps and checkpoints</td><td>No</td></tr>
    <tr><td><b>Squad</b></td><td>The community side — other explorers and standings</td><td>No</td></tr>
    <tr><td><b>Me</b></td><td>Avatar, cursor effect, sky controls and your saved answers</td><td>No</td></tr>
    <tr><td><b>Compare</b></td><td>Two to four tools side by side on every attribute</td><td>No</td></tr>
    <tr><td><b>New</b></td><td>A public feed of what the radar discovered, newest first</td><td>No</td></tr>
    <tr><td><b>Example</b></td><td>A complete worked stack, before you answer anything</td><td>No</td></tr>
    <tr><td><b>Methodology</b></td><td>Sources, thresholds, and what is deliberately not checked</td><td>No</td></tr>
  </table>

  <h3 style="margin-top:7mm">Quick answers</h3>
  <table>
    <tr><td style="width:52mm"><b>Do I need an account?</b></td><td>No. Every section above works as a guest.</td></tr>
    <tr><td><b>Where is my data?</b></td><td>In this browser. Clearing site data clears your stack, so sign in if you want it to survive.</td></tr>
    <tr><td><b>Can I retake the quiz?</b></td><td>Yes, from <strong>Me</strong>. Your stack and plan rebuild around the new answers.</td></tr>
    <tr><td><b>How often does the catalogue grow?</b></td><td>The radar runs twice a day. ${radar} of the current ${TOOLS.toLocaleString()} tools were found that way.</td></tr>
    <tr><td><b>Something is wrong or out of date.</b></td><td>Tell us — corrections are the mechanism that keeps the rest honest.</td></tr>
  </table>

  <div class="cvfoot" style="position:static;margin-top:10mm">
    <span>toolnaut.xyz</span><span>hello@toolnaut.app</span>
  </div>
  <span class="pg">8</span>
</div>

</body></html>`

const htmlPath = resolve(OUT, 'toolnaut-handbook.html')
writeFileSync(htmlPath, html, 'utf8')

const browser = await chromium.launch()
const page = await browser.newPage()
await page.goto('file:///' + htmlPath.replace(/\\/g, '/'), { waitUntil: 'networkidle' })
await page.waitForTimeout(1500)
await page.pdf({ path: resolve(OUT, 'Toolnaut-Handbook.pdf'), format: 'A4', printBackground: true })
await browser.close()

console.log(`handbook: ${TOOLS} tools (${bundled} bundled + ${radar} radar)`)
console.log('wrote reports/Toolnaut-Handbook.pdf')
