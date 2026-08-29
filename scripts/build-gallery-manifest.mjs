// Re-encode the gallery JPEGs down to an embeddable budget and emit a manifest
// of base64 payloads. Full-page captures of long routes run to several thousand
// pixels; a reviewer needs the screen, not every last row, so height is capped.
import sharp from 'sharp'
import { readdirSync, writeFileSync, existsSync } from 'node:fs'

const DIR = 'evidence/gallery'
const SCREENS = [
  ['landing',       'Landing',             '/',                              'public',    'public'],
  ['login',         'Sign in',             '/auth/login',                    'public',    'gateway'],
  ['intake',        'Onboarding intake',   '/goal',                          'public',    'step 1 of 9'],
  ['stack-empty',   'Stack — first run',   '/app/stack',                     'signed in', 'empty'],
  ['stack',         'Stack — dashboard',   '/app/stack',                     'signed in', 'populated'],
  ['find',          'Find — discovery',    '/app/discover',                  'signed in', 'populated'],
  ['find-empty',    'Find — no results',   '/app/discover?q=…',              'signed in', 'no results'],
  ['find-filtered', 'Find — filtered',     '/app/discover?cat=automation',   'signed in', 'filtered'],
  ['saved-empty',   'Saved — empty',       '/app/favorites',                 'signed in', 'empty'],
  ['saved',         'Saved — shortlist',   '/app/favorites',                 'signed in', 'populated'],
  ['learn',         'Learn — roadmap',     '/app/learning',                  'signed in', 'populated'],
  ['squad',         'Squad — community',   '/app/community',                 'signed in', 'populated'],
  ['me',            'Me — control centre', '/app/settings',                  'signed in', 'populated'],
  ['tool',          'Tool detail',         '/app/tools/cursor',              'signed in', 'populated'],
  ['tool-404',      'Tool — not found',    '/app/tools/does-not-exist',      'signed in', 'not found'],
  ['compare',       'Compare',             '/app/compare?tools=…',           'signed in', 'populated'],
  ['pricing',       'Pricing',             '/pricing',                       'public',    'public'],
  ['newfeed',       'New this week',       '/new',                           'public',    'public'],
]

async function enc(file, maxW, maxH) {
  if (!existsSync(file)) return null
  const img = sharp(file)
  const { height } = await img.metadata()
  let p = sharp(file).resize({ width: maxW, withoutEnlargement: true })
  if (height > maxH) {
    // extract from the top: the fold and the content under it is what matters
    p = sharp(file).extract({ left: 0, top: 0, width: (await img.metadata()).width, height: maxH })
                   .resize({ width: maxW, withoutEnlargement: true })
  }
  const buf = await p.jpeg({ quality: 60, mozjpeg: true }).toBuffer()
  return { b64: buf.toString('base64'), truncated: height > maxH }
}

const out = []
for (const [id, label, url, auth, state] of SCREENS) {
  const d = await enc(`${DIR}/${id}-desktop.jpg`, 880, 2400)
  const m = await enc(`${DIR}/${id}-mobile.jpg`, 360, 2600)
  if (!d && !m) { console.log('  MISSING', id); continue }
  out.push({
    id, label, url, auth, state,
    desktop: d?.b64 || null, mobile: m?.b64 || null,
    dTrunc: !!d?.truncated, mTrunc: !!m?.truncated,
  })
  console.log(`  ${id.padEnd(15)} d=${d ? (d.b64.length / 1024).toFixed(0) + 'k' : '-'}  m=${m ? (m.b64.length / 1024).toFixed(0) + 'k' : '-'}`)
}

writeFileSync(`${DIR}/manifest.json`, JSON.stringify(out))
console.log(`\n${out.length} screens · manifest ${(JSON.stringify(out).length / 1048576).toFixed(1)} MB base64`)
