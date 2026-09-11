// Assemble the reviewable gallery page from the manifest. Images are inlined as
// data URIs so the page is self-contained and needs no asset host.
import { readFileSync, writeFileSync, existsSync } from 'node:fs'

const screens = JSON.parse(readFileSync('evidence/gallery/manifest.json', 'utf8'))
const OUT = process.argv[2] || 'evidence/gallery/toolnaut-screens.html'
const VID = 'evidence/video/toolnaut-walkthrough-desktop.webm'
const video = existsSync(VID) ? readFileSync(VID).toString('base64') : null

const chip = (t, cls = '') => `<span class="chip ${cls}">${t}</span>`

const sections = screens.map((s) => {
  const stateCls = /empty|no results|not found/.test(s.state) ? 'st-edge' : s.state === 'public' ? 'st-pub' : 'st-ok'
  return `
  <section class="screen" id="${s.id}">
    <div class="shead">
      <div>
        <h2>${s.label}</h2>
        <p class="path">${s.url}</p>
      </div>
      <div class="chips">
        ${chip(s.state, stateCls)}
        ${chip(s.auth, s.auth === 'public' ? 'st-pub' : 'st-auth')}
      </div>
    </div>
    <div class="shots">
      <figure class="d">
        <div class="frame">${s.desktop ? `<img loading="lazy" alt="${s.label} on desktop, 1440 by 900" src="data:image/jpeg;base64,${s.desktop}">` : '<p class="none">not captured</p>'}</div>
        <figcaption>Desktop · 1440&times;900${s.dTrunc ? ' · trimmed for length' : ''}</figcaption>
      </figure>
      <figure class="m">
        <div class="frame">${s.mobile ? `<img loading="lazy" alt="${s.label} on mobile, 390 by 844" src="data:image/jpeg;base64,${s.mobile}">` : '<p class="none">not captured</p>'}</div>
        <figcaption>Mobile · 390&times;844${s.mTrunc ? ' · trimmed' : ''}</figcaption>
      </figure>
    </div>
  </section>`
}).join('\n')

const nav = screens.map((s) => `<a href="#${s.id}">${s.label.replace(/ — .*/, '')}<span>${s.state}</span></a>`).join('')

const html = `<title>Toolnaut Screens</title>
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,800&family=IBM+Plex+Mono:wght@400;500&family=Source+Sans+3:wght@400;600&display=swap">
<style>
:root{
  --ground:#F6F7F9; --panel:#FFFFFF; --panel-2:#EFF1F4; --edge:#DFE3E9;
  --ink:#12161C; --ink-2:#414B57; --muted:#6C7684;
  --accent:#2C5F91; --accent-soft:#E4EDF5;
  --ok:#2E6B4F; --ok-bg:#E2EFE8; --edgec:#8A5A16; --edgec-bg:#F6EDDC;
  --pub:#3A5A8C; --pub-bg:#E5EAF3; --auth:#6A4C86; --auth-bg:#EDE7F3;
  --shadow:0 1px 2px rgba(18,22,28,.06),0 10px 28px -14px rgba(18,22,28,.22);
}
@media (prefers-color-scheme:dark){
  :root:not([data-theme="light"]){
    --ground:#0D1014; --panel:#161A20; --panel-2:#1D232A; --edge:#2A323B;
    --ink:#E6EAEF; --ink-2:#B6BFC9; --muted:#818C99;
    --accent:#7FB2E0; --accent-soft:#182430;
    --ok:#79C79B; --ok-bg:#16261D; --edgec:#D9A85A; --edgec-bg:#2A2115;
    --pub:#8FAEDC; --pub-bg:#171F2C; --auth:#B79BD6; --auth-bg:#221A2C;
    --shadow:0 1px 2px rgba(0,0,0,.45),0 12px 32px -16px rgba(0,0,0,.8);
  }
}
:root[data-theme="dark"]{
  --ground:#0D1014; --panel:#161A20; --panel-2:#1D232A; --edge:#2A323B;
  --ink:#E6EAEF; --ink-2:#B6BFC9; --muted:#818C99;
  --accent:#7FB2E0; --accent-soft:#182430;
  --ok:#79C79B; --ok-bg:#16261D; --edgec:#D9A85A; --edgec-bg:#2A2115;
  --pub:#8FAEDC; --pub-bg:#171F2C; --auth:#B79BD6; --auth-bg:#221A2C;
  --shadow:0 1px 2px rgba(0,0,0,.45),0 12px 32px -16px rgba(0,0,0,.8);
}
*{box-sizing:border-box}
body{margin:0;background:var(--ground);color:var(--ink);
  font-family:"Source Sans 3",ui-sans-serif,system-ui,sans-serif;font-size:16px;line-height:1.6;
  -webkit-font-smoothing:antialiased}
.wrap{max-width:1180px;margin:0 auto;padding:48px 22px 90px}
h1,h2{font-family:"Bricolage Grotesque",ui-sans-serif,system-ui,sans-serif;margin:0;letter-spacing:-.015em;text-wrap:balance}
h1{font-size:clamp(1.9rem,4.6vw,2.7rem);font-weight:800;line-height:1.05}
h2{font-size:1.16rem;font-weight:600}
p{margin:0 0 12px;max-width:70ch}
a{color:var(--accent)}
a:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:3px}
.eyebrow{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.7rem;letter-spacing:.17em;
  text-transform:uppercase;color:var(--muted);margin:0 0 11px}
.lede{font-size:1.06rem;color:var(--ink-2);max-width:66ch;margin-top:12px}

.callout{background:var(--panel);border:1px solid var(--edge);border-left:3px solid var(--accent);
  border-radius:9px;padding:16px 20px;margin:26px 0 0;box-shadow:var(--shadow)}
.callout p{margin:0;color:var(--ink-2);font-size:.96rem}
.callout b{color:var(--ink)}

nav.jump{display:flex;flex-wrap:wrap;gap:7px;margin:30px 0 8px;padding:0}
nav.jump a{display:flex;flex-direction:column;gap:1px;text-decoration:none;
  background:var(--panel);border:1px solid var(--edge);border-radius:7px;
  padding:7px 11px;font-size:.83rem;font-weight:600;color:var(--ink);line-height:1.25}
nav.jump a span{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.6rem;
  letter-spacing:.09em;text-transform:uppercase;color:var(--muted);font-weight:400}
nav.jump a:hover{border-color:var(--accent);color:var(--accent)}

.screen{margin-top:44px;scroll-margin-top:16px}
.shead{display:flex;flex-wrap:wrap;gap:10px;align-items:baseline;justify-content:space-between;
  padding-bottom:10px;border-bottom:1px solid var(--edge);margin-bottom:16px}
.path{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.76rem;color:var(--muted);margin:2px 0 0}
.chips{display:flex;gap:6px;flex-wrap:wrap}
.chip{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.63rem;letter-spacing:.09em;
  text-transform:uppercase;padding:4px 8px;border-radius:5px;white-space:nowrap}
.st-ok{background:var(--ok-bg);color:var(--ok)}
.st-edge{background:var(--edgec-bg);color:var(--edgec)}
.st-pub{background:var(--pub-bg);color:var(--pub)}
.st-auth{background:var(--auth-bg);color:var(--auth)}

.shots{display:grid;grid-template-columns:minmax(0,1fr) 300px;gap:20px;align-items:start}
@media (max-width:820px){.shots{grid-template-columns:1fr}.shots .m{max-width:330px}}
figure{margin:0;display:flex;flex-direction:column;gap:7px}
.frame{background:var(--panel-2);border:1px solid var(--edge);border-radius:9px;overflow:hidden;
  box-shadow:var(--shadow);max-height:660px;overflow-y:auto}
.frame img{display:block;width:100%;height:auto}
figcaption{font-family:"IBM Plex Mono",ui-monospace,monospace;font-size:.66rem;letter-spacing:.08em;
  text-transform:uppercase;color:var(--muted)}
.none{padding:26px;color:var(--muted);font-size:.85rem;margin:0}

.walk{margin-top:34px}
.walk h2{font-size:1.16rem;margin-bottom:2px}
.wsub{font-size:.92rem;color:var(--ink-2);margin:0 0 12px;max-width:74ch}
.walk video{width:100%;max-width:1000px;display:block;border:1px solid var(--edge);
  border-radius:10px;background:var(--panel-2);box-shadow:var(--shadow)}
footer{margin-top:66px;padding-top:20px;border-top:1px solid var(--edge);color:var(--muted);font-size:.85rem}
</style>
<div class="wrap">
  <p class="eyebrow">Toolnaut · every screen, both breakpoints · 29 Aug 2026</p>
  <h1>Toolnaut, screen by screen</h1>
  <p class="lede">
    Eighteen screens at desktop and mobile, captured from the production build.
    Empty, no-results and not-found states are included alongside the populated
    ones, because those are where a product usually gives itself away.
  </p>

  <div class="callout">
    <p><b>Why a fetch-based renderer sees nothing.</b> <code>toolnaut.xyz</code> returns
    HTTP&nbsp;200 with <code>robots.txt: Allow /</code>, no CSP, no bot protection and no
    redirects &mdash; but its HTML is 2,828 bytes with an empty <code>&lt;div id="root"&gt;</code>.
    It is a client-rendered SPA with no SSR or prerendering, so any tool that does not execute
    JavaScript receives a blank page. That is a separate problem from the staging link&rsquo;s
    Vercel protection, and it affects the public production URL too.</p>
  </div>

  ${video ? `<section class="walk">
    <h2>Walkthrough</h2>
    <p class="wsub">Landing &rarr; sign-in &rarr; intake &rarr; first-run Stack &rarr; populated Stack &rarr; Find &rarr; no-results &rarr; tool detail &rarr; Compare &rarr; Saved &rarr; Learn &rarr; Squad &rarr; Me &rarr; Pricing.</p>
    <video controls preload="metadata" playsinline src="data:video/webm;base64,${video}"></video>
  </section>` : ''}

  <nav class="jump" aria-label="Jump to screen">${nav}</nav>

${sections}

  <footer>
    Captured from <code>vite preview</code> (the production build) via
    <code>scripts/capture-gallery.mjs</code>. Signed-in screens use the app&rsquo;s simulated
    session &mdash; no real account, no server data. Long pages are trimmed for height where noted;
    full-resolution PNGs and a video walkthrough exist alongside these.
  </footer>
</div>`

writeFileSync(OUT, html)
console.log(`${OUT} — ${(html.length / 1048576).toFixed(1)} MB`)
