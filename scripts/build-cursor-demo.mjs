// Assemble the cursor-effect picker page from effects.json (the workflow's
// output). Each effect is a strict (env) => {move,frame,down?} module; the
// harness owns the canvas, DPR, pointer plumbing and the switcher UI, so every
// variant runs under identical conditions and the comparison is fair.
import { readFileSync, writeFileSync } from 'node:fs'

const IN = process.argv[2] || 'evidence/cursor-effects.json'
const OUT = process.argv[3] || 'evidence/cursor-demo.html'
const effects = JSON.parse(readFileSync(IN, 'utf8'))

// Syntax-gate every module before it ships: a bad one must fail THIS build,
// not the page in the user's browser.
for (const e of effects) {
  try {
    // eslint-disable-next-line no-new-func
    new Function('return (' + e.code + ')')()
  } catch (err) {
    throw new Error(`effect ${e.id} failed syntax check: ${err.message}`)
  }
}

const modules = effects
  .map((e) => `  { id: ${JSON.stringify(e.id)}, name: ${JSON.stringify(e.name)}, blurb: ${JSON.stringify(e.blurb)},\n    make: ${e.code} },`)
  .join('\n')

const html = `<title>Cursor Lab</title>
<meta name="viewport" content="width=device-width, initial-scale=1">
<style>
  :root { --lime:#a3ff2e; --pink:#ff2ea3; --cyan:#22d3ee; --gold:#ffde2e; }
  /* Deliberately single-theme: the page IS the product surface these effects
     will live on — judging them on any other background would mislead. */
  * { box-sizing: border-box; }
  body { margin:0; background:#060609; color:#fff; min-height:100vh; overflow-x:hidden;
         font-family:'Space Grotesk', system-ui, sans-serif; }
  canvas#fx { position:fixed; inset:0; pointer-events:none; z-index:5; }
  .wrap { position:relative; z-index:10; max-width:880px; margin:0 auto; padding:44px 20px 80px; }
  h1 { font-size:clamp(1.7rem,5vw,2.6rem); font-weight:900; font-style:italic; text-transform:uppercase;
       letter-spacing:-0.02em; line-height:.95; margin:0;
       text-shadow:-1px -1px 0 var(--pink), 2px 2px 0 var(--lime), 4px 4px 0 rgba(0,0,0,.6); }
  .sub { color:#9d97bd; font-size:.95rem; max-width:56ch; line-height:1.55; margin:14px 0 26px; }
  .sub b { color:#fff; }
  .grid { display:grid; grid-template-columns:repeat(auto-fill,minmax(240px,1fr)); gap:12px; }
  button.card { text-align:left; cursor:pointer; border-radius:14px; padding:14px 16px;
    background:rgba(14,14,24,.75); border:2px solid #000; box-shadow:4px 4px 0 #000;
    color:#fff; font:inherit; transition:transform .15s ease, box-shadow .15s ease; }
  button.card:hover { transform:translate(-1px,-1px); }
  button.card:focus-visible { outline:2px solid var(--cyan); outline-offset:3px; }
  button.card.on { border-color:#000; box-shadow:4px 4px 0 var(--lime); background:rgba(163,255,46,.08); }
  .num { font-size:.62rem; font-weight:900; letter-spacing:.18em; color:#6b6690; }
  button.card.on .num { color:var(--lime); }
  .nm { display:block; font-weight:900; font-style:italic; text-transform:uppercase; font-size:1.02rem; margin:3px 0 5px; }
  .bl { display:block; color:#9d97bd; font-size:.8rem; line-height:1.45; }
  .hint { margin-top:26px; color:#6b6690; font-size:.8rem; }
  .hint kbd { background:#14121f; border:1px solid #2a2740; border-radius:5px; padding:1px 7px; font-family:inherit; }
  .stage { margin-top:26px; height:260px; border-radius:16px; border:2px dashed #2a2740;
    display:grid; place-items:center; color:#4c4768; font-size:.85rem; letter-spacing:.12em;
    text-transform:uppercase; font-weight:700; }
</style>
<canvas id="fx" aria-hidden="true"></canvas>
<div class="wrap">
  <h1>Cursor Lab</h1>
  <p class="sub"><b>Ten cursor effects, live.</b> Move your mouse anywhere on this page —
    the active effect follows it. Click a card to switch, or press <b>1–9</b> and <b>0</b>.
    Click anywhere to see each effect's click reaction, where it has one.
    Tell me the number you want on toolnaut.xyz.</p>
  <div class="grid" id="cards" role="listbox" aria-label="Cursor effects"></div>
  <p class="hint">Playground — drag your cursor through here at different speeds. <kbd>1</kbd>–<kbd>0</kbd> switch effects.</p>
  <div class="stage">open space · try fast + slow + idle</div>
</div>
<script>
const EFFECTS = [
${modules}
]

const canvas = document.getElementById('fx')
const ctx = canvas.getContext('2d')
let W = 0, H = 0, dpr = 1
function resize() {
  dpr = Math.min(window.devicePixelRatio || 1, 2)
  W = window.innerWidth; H = window.innerHeight
  canvas.width = W * dpr; canvas.height = H * dpr
  canvas.style.width = W + 'px'; canvas.style.height = H + 'px'
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0)
}
resize(); addEventListener('resize', resize)

const env = {
  ctx,
  W: () => W, H: () => H,
  clear: () => { ctx.setTransform(1,0,0,1,0,0); ctx.clearRect(0,0,canvas.width,canvas.height); ctx.setTransform(dpr,0,0,dpr,0,0) },
  fade: (a) => { ctx.fillStyle = 'rgba(6,6,9,' + a + ')'; ctx.fillRect(0, 0, W, H) },
  palette: { lime:'#a3ff2e', pink:'#ff2ea3', cyan:'#22d3ee', gold:'#ffde2e' },
}

let inst = null, active = -1
function activate(i) {
  active = i
  env.clear()
  try { inst = EFFECTS[i].make(env) } catch (e) { inst = null; console.error(EFFECTS[i].id, e) }
  document.querySelectorAll('button.card').forEach((b, j) => {
    b.classList.toggle('on', j === i)
    b.setAttribute('aria-selected', j === i)
  })
  try { localStorage.setItem('cursor-lab-pick', String(i)) } catch {}
}

const cards = document.getElementById('cards')
EFFECTS.forEach((e, i) => {
  const b = document.createElement('button')
  b.className = 'card'; b.setAttribute('role', 'option')
  b.innerHTML = '<span class="num">EFFECT ' + String((i + 1) % 10) + '</span>' +
    '<span class="nm">' + e.name + '</span><span class="bl">' + e.blurb + '</span>'
  b.addEventListener('click', () => activate(i))
  cards.appendChild(b)
})

let lx = innerWidth / 2, ly = innerHeight / 2
addEventListener('pointermove', (ev) => {
  const dx = ev.clientX - lx, dy = ev.clientY - ly
  lx = ev.clientX; ly = ev.clientY
  try { inst && inst.move(ev.clientX, ev.clientY, dx, dy) } catch {}
})
addEventListener('pointerdown', (ev) => { try { inst && inst.down && inst.down(ev.clientX, ev.clientY) } catch {} })
addEventListener('keydown', (ev) => {
  if (/^[0-9]$/.test(ev.key)) { const i = ev.key === '0' ? 9 : +ev.key - 1; if (EFFECTS[i]) activate(i) }
})

let last = performance.now()
function loop(now) {
  const dt = Math.min(now - last, 50); last = now
  try { inst && inst.frame(dt) } catch {}
  requestAnimationFrame(loop)
}
requestAnimationFrame(loop)

let start = 0
try { start = Math.min(EFFECTS.length - 1, Math.max(0, +(localStorage.getItem('cursor-lab-pick') ?? 0) || 0)) } catch {}
activate(start)
</script>`

writeFileSync(OUT, html)
console.log(`${OUT} — ${(html.length / 1024).toFixed(0)}KB, ${effects.length} effects`)
