// Regenerate src/utils/cursorEffects.js from docs/cursor-effect-candidates.json.
// The JSON is the reviewed source of truth (same modules behind the Cursor Lab
// picker); the generated file is what the app bundles. Regenerate rather than
// hand-editing the output, so the demo page and the app cannot drift.
const fs = require('fs')

const effects = JSON.parse(fs.readFileSync('docs/cursor-effect-candidates.json', 'utf8'))

// Syntax-gate before writing: a broken module must fail THIS script, not the
// app build (where it would surface as a cryptic Vite parse error).
for (const e of effects) {
  try {
    // eslint-disable-next-line no-new-func
    new Function('return (' + e.code + ')')()
  } catch (err) {
    throw new Error(`effect ${e.id} failed syntax check: ${err.message}`)
  }
}

const entries = effects
  .map((e) => `  {
    id: ${JSON.stringify(e.id)},
    name: ${JSON.stringify(e.name)},
    blurb: ${JSON.stringify(e.blurb)},
    make: ${e.code},
  },`)
  .join('\n')

const out = `// The ten cursor effects, selectable in ME -> Sky settings.
//
// GENERATED from docs/cursor-effect-candidates.json (the adversarially
// reviewed modules behind the Cursor Lab picker) — regenerate rather than
// hand-editing an effect here, so the demo page and the app cannot drift:
//   node scripts/gen-cursor-effects.cjs
//
// Every effect implements one contract:
//   make(env) -> { move(x,y,dx,dy), frame(dt), down?(x,y) }
// where env = { ctx, W(), H(), clear(), fade(a), palette }. The harness in
// CursorStars.jsx owns the canvas, DPR, pointer plumbing and the palette —
// effects only draw. This module is dynamic-imported so its ~53KB never
// lands in the entry chunk.

export const CURSOR_EFFECTS = [
${entries}
]
`

fs.writeFileSync('src/utils/cursorEffects.js', out)
console.log(`src/utils/cursorEffects.js — ${(out.length / 1024).toFixed(0)}KB, ${effects.length} effects`)
