// The explorer crew — 16 original profile characters.
//
// Drawn in code as parametric SVG rather than shipped as 16 images, for the
// same reasons Mascot.jsx and PixelRocket.jsx are:
//   - one <Avatar id> is ~1KB of shared geometry instead of 16 PNGs to load,
//     which matters on a PWA that is meant to work offline
//   - the suit accent reads from --lime / --hot-pink / --cyan, so the crew
//     retints with the active play mode instead of fighting it
//   - they scale to any size without a second asset
//
// Everything here is drawn from primitives. No traced likeness, no logo, no
// third-party mark — the only borrowed idea is the arcade character-select
// screen the picker is modelled on, which is a format, not a design.
//
// The two sets are the eight-and-eight the crew was specced as. Nothing in the
// app restricts who picks which: the picker shows both sets to everyone.

const INK = '#12131b'

// Skin tones spread across the range rather than clustered, so two crew members
// are never a near-match at 32px in the sidebar.
const SKIN = {
  porcelain: { base: '#f2d3b8', shade: '#dcb494' },
  sand: { base: '#e8b98d', shade: '#cf9c6d' },
  honey: { base: '#d69a63', shade: '#b87c48' },
  clay: { base: '#b87348', shade: '#96592f' },
  umber: { base: '#8a5232', shade: '#6d3d22' },
  espresso: { base: '#5e3722', shade: '#452716' },
}

const HAIR = {
  ink: '#1c1c26',
  slate: '#3d4250',
  chestnut: '#5a3420',
  auburn: '#8a3b1e',
  copper: '#c2632a',
  wheat: '#d9a441',
  ash: '#9aa3b2',
  snow: '#e8ecf2',
}

// Accent = the suit. Theme vars for most of the crew so the roster shifts with
// the play mode; a few fixed tones keep the set from going monochrome.
const ACCENT = {
  lime: 'var(--lime)',
  pink: 'var(--hot-pink)',
  cyan: 'var(--cyan)',
  violet: '#8b6cf0',
  amber: '#f2a33c',
  teal: '#2fbfa6',
  coral: '#f2685c',
  steel: '#7c8aa3',
}

// ── hair -------------------------------------------------------------------
// Split into a layer behind the head and one in front, so long styles fall
// past the jaw without the face being drawn over them.

function HairBack({ style, c }) {
  switch (style) {
    case 'long':
      return <path d="M20 48c0-19 13-30 30-30s30 11 30 30v30c0 5-5 7-8 4V54H28v28c-3 3-8 1-8-4z" fill={c} />
    case 'braids':
      return (
        <>
          <path d="M22 48c0-18 12-29 28-29s28 11 28 29v8H22z" fill={c} />
          {/* the braids have to clear the head silhouette (x 27–73) or they
              vanish behind it, which is what the first cut did */}
          <path d="M22 40c-9 6-11 20-8 32 5 3 12 1 12-4-3-10-4-19-1-27z" fill={c} />
          <path d="M78 40c9 6 11 20 8 32-5 3-12 1-12-4 3-10 4-19 1-27z" fill={c} />
          <circle cx="16" cy="70" r="5" fill={c} />
          <circle cx="84" cy="70" r="5" fill={c} />
        </>
      )
    case 'ponytail':
      return (
        <>
          <path d="M23 48c0-18 12-29 27-29s27 11 27 29v6H23z" fill={c} />
          <path d="M74 38c12 4 17 16 15 30-1 9-6 16-11 17-5 1-8-3-6-8 5-12 6-24 2-35z" fill={c} />
        </>
      )
    case 'twinbuns':
      return (
        <>
          <circle cx="16" cy="26" r="13" fill={c} />
          <circle cx="84" cy="26" r="13" fill={c} />
          <path d="M23 48c0-18 12-29 27-29s27 11 27 29v6H23z" fill={c} />
        </>
      )
    case 'afropuff':
      return <circle cx="50" cy="38" r="32" fill={c} />
    case 'bun':
      return (
        <>
          <circle cx="50" cy="13" r="12" fill={c} />
          <path d="M23 48c0-18 12-29 27-29s27 11 27 29v6H23z" fill={c} />
        </>
      )
    case 'tiedback':
      return (
        <>
          <path d="M24 48c0-18 11-29 26-29s26 11 26 29v6H24z" fill={c} />
          <path d="M73 40c11 5 15 16 12 28-1 6-5 10-9 9-4-1-4-5-3-10 3-9 3-19 0-27z" fill={c} />
        </>
      )
    case 'wavy':
      return <path d="M20 49c0-19 13-30 30-30s30 11 30 30v18c-2 4-7 4-8 0-1-7 0-12-1-17H29c-1 5 0 10-1 17-1 4-6 4-8 0z" fill={c} />
    default:
      return null
  }
}

// Front layer. Every style has to fill the crown from y≈20 down to a hairline
// near y≈42 — the first cut drew a thin band near the top and half the crew
// read as bald at 52px.
function HairFront({ style, c }) {
  switch (style) {
    case 'crop':
      return <path d="M26 48c0-16 11-27 24-27s24 11 24 27c-2-11-6-15-11-16-4-1-8 1-13 1s-9-2-13-1c-5 1-9 5-11 16z" fill={c} />
    case 'buzz':
      return <path d="M27 47c0-15 10-26 23-26s23 11 23 26c-3-9-7-13-12-14-4-1-7 0-11 0s-7-1-11 0c-5 1-9 5-12 14z" fill={c} opacity="0.9" />
    case 'spiky':
      return (
        <path
          d="M26 46l2-16 6 9 4-18 7 13 5-17 5 17 7-13 4 18 6-9 2 16c-4-11-10-15-24-15s-20 4-24 15z"
          fill={c}
        />
      )
    case 'curly':
      return (
        <>
          <circle cx="32" cy="30" r="12" fill={c} />
          <circle cx="50" cy="23" r="13" fill={c} />
          <circle cx="68" cy="30" r="12" fill={c} />
          <circle cx="26" cy="42" r="9" fill={c} />
          <circle cx="74" cy="42" r="9" fill={c} />
          <path d="M28 44c0-14 10-22 22-22s22 8 22 22c-4-10-11-14-22-14s-18 4-22 14z" fill={c} />
        </>
      )
    case 'undercut':
      return <path d="M25 44c1-15 12-24 26-24 11 0 20 6 24 15-5-6-12-9-21-8-9 1-16 3-21 7-4 3-6 6-8 10z" fill={c} />
    case 'wavy':
      return <path d="M25 47c0-16 11-27 25-27s25 11 25 27c-3-8-6-11-11-12-5-1-8 3-14 2-6-1-10-3-14 0-4 3-8 4-11 10z" fill={c} />
    case 'bob':
      return <path d="M24 48c0-17 11-28 26-28s26 11 26 28c-3-13-9-18-16-19-4-1-6 1-10 1s-6-2-10-1c-7 1-13 6-16 19z" fill={c} />
    case 'pixie':
      return <path d="M25 45c0-16 11-26 25-26 10 0 18 5 22 13-6-2-11 1-17 0-7-1-12-4-17 0-4 3-9 4-13 13z" fill={c} />
    case 'long':
    case 'braids':
    case 'ponytail':
    case 'twinbuns':
    case 'bun':
    case 'tiedback':
      return <path d="M24 48c0-17 11-28 26-28s26 11 26 28c-3-14-10-19-17-20-4 0-5 2-9 2s-5-2-9-2c-7 1-14 6-17 20z" fill={c} />
    case 'afropuff':
      return <path d="M26 44c1-14 11-23 24-23s23 9 24 23c-5-10-13-14-24-14s-19 4-24 14z" fill={c} />
    default:
      return null
  }
}


// ── faces ------------------------------------------------------------------
// Same eye treatment as Naut so the crew reads as the same universe, with four
// expressions spread across the roster. Sixteen identical faces made every
// character a hairstyle rather than a person.

function Face({ kind, hair }) {
  const brows = <path d="M34 40c3-2 7-2 10 0M56 40c3-2 7-2 10 0" stroke={hair} strokeWidth="2.8" strokeLinecap="round" fill="none" />

  if (kind === 'wink') {
    return (
      <>
        <path d="M35 49c3-3 7-3 10 0" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
        <circle cx="60" cy="49" r="5.5" fill="#fff" />
        <circle cx="61" cy="50" r="2.6" fill={INK} />
        <path d="M44 60c3 4 9 4 12 0" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
        {brows}
      </>
    )
  }

  if (kind === 'cool') {
    return (
      <>
        <circle cx="40" cy="49" r="5.5" fill="#fff" />
        <circle cx="60" cy="49" r="5.5" fill="#fff" />
        <circle cx="40" cy="51" r="2.6" fill={INK} />
        <circle cx="60" cy="51" r="2.6" fill={INK} />
        {/* lids, which is what makes it read as unimpressed rather than sleepy */}
        <path d="M34 46h12M54 46h12" stroke={INK} strokeWidth="3" strokeLinecap="round" />
        <path d="M45 62h11" stroke={INK} strokeWidth="2.6" strokeLinecap="round" />
        {brows}
      </>
    )
  }

  if (kind === 'beam') {
    return (
      <>
        <path d="M34 51c2-5 8-5 10 0" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M56 51c2-5 8-5 10 0" stroke={INK} strokeWidth="3" strokeLinecap="round" fill="none" />
        <path d="M42 59c3 6 13 6 16 0z" fill={INK} />
        {brows}
      </>
    )
  }

  return (
    <>
      <circle cx="40" cy="49" r="5.5" fill="#fff" />
      <circle cx="60" cy="49" r="5.5" fill="#fff" />
      <circle cx="41" cy="50" r="2.6" fill={INK} />
      <circle cx="61" cy="50" r="2.6" fill={INK} />
      <path d="M45 61c3 2.5 7 2.5 10 0" stroke={INK} strokeWidth="2.6" strokeLinecap="round" fill="none" />
      {brows}
    </>
  )
}

// ── accessories ------------------------------------------------------------

function Accessory({ kind, accent }) {
  switch (kind) {
    case 'visor':
      return (
        <>
          <path d="M25 44h50v9a9 9 0 0 1-9 9H34a9 9 0 0 1-9-9z" fill={accent} opacity="0.55" stroke={INK} strokeWidth="2.5" />
          <path d="M30 47h14" stroke="#fff" strokeWidth="2.5" strokeLinecap="round" opacity="0.8" />
        </>
      )
    case 'headset':
      return (
        <>
          <path d="M24 46a26 26 0 0 1 52 0" fill="none" stroke={INK} strokeWidth="4" />
          <rect x="16" y="42" width="11" height="16" rx="4" fill={accent} stroke={INK} strokeWidth="2.5" />
          <rect x="73" y="42" width="11" height="16" rx="4" fill={accent} stroke={INK} strokeWidth="2.5" />
          <path d="M22 58c0 7 5 10 10 10" fill="none" stroke={INK} strokeWidth="2.5" strokeLinecap="round" />
        </>
      )
    case 'goggles':
      return (
        <>
          <path d="M24 34h52" stroke={INK} strokeWidth="4" strokeLinecap="round" />
          <rect x="28" y="26" width="19" height="13" rx="5" fill={accent} stroke={INK} strokeWidth="2.5" />
          <rect x="53" y="26" width="19" height="13" rx="5" fill={accent} stroke={INK} strokeWidth="2.5" />
        </>
      )
    case 'glasses':
      return (
        <>
          <circle cx="39" cy="50" r="9" fill="none" stroke={INK} strokeWidth="2.8" />
          <circle cx="61" cy="50" r="9" fill="none" stroke={INK} strokeWidth="2.8" />
          <path d="M48 50h4M30 47l-5-2M70 47l5-2" stroke={INK} strokeWidth="2.8" strokeLinecap="round" />
        </>
      )
    case 'earring':
      return <circle cx="74" cy="58" r="3.5" fill={accent} stroke={INK} strokeWidth="2" />
    case 'bandana':
      return (
        <>
          <path d="M25 38h50v8H25z" fill={accent} stroke={INK} strokeWidth="2.5" />
          <path d="M75 42l9 5-9 4z" fill={accent} stroke={INK} strokeWidth="2.5" strokeLinejoin="round" />
        </>
      )
    case 'antenna':
      return (
        <>
          <path d="M68 24l6-10" stroke={INK} strokeWidth="3" strokeLinecap="round" />
          <circle cx="75" cy="12" r="4.5" fill={accent} stroke={INK} strokeWidth="2.5" />
        </>
      )
    default:
      return null
  }
}

function Beard({ kind, c }) {
  if (kind === 'full') {
    return <path d="M28 50c0 18 10 28 22 28s22-10 22-28c0 10-8 14-22 14s-22-4-22-14z" fill={c} />
  }
  if (kind === 'goatee') {
    return <path d="M43 66c0 6 3 9 7 9s7-3 7-9c-4 2-10 2-14 0z" fill={c} />
  }
  if (kind === 'stubble') {
    return <path d="M30 52c1 15 10 24 20 24s19-9 20-24c-2 12-10 17-20 17s-18-5-20-17z" fill={c} opacity="0.35" />
  }
  return null
}

// ── the crew ---------------------------------------------------------------
// `set` is the eight-and-eight grouping; it does not gate anything.

export const AVATARS = [
  // set a
  { id: 'atlas', face: 'beam', name: 'Atlas', set: 'a', skin: 'honey', hair: 'crop', hairColor: 'ink', accent: 'lime', beard: 'stubble' },
  { id: 'rigel', face: 'default', name: 'Rigel', set: 'a', skin: 'espresso', hair: 'curly', hairColor: 'ink', accent: 'cyan', accessory: 'headset' },
  { id: 'orion', face: 'wink', name: 'Orion', set: 'a', skin: 'porcelain', hair: 'spiky', hairColor: 'copper', accent: 'coral' },
  { id: 'kepler', face: 'cool', name: 'Kepler', set: 'a', skin: 'sand', hair: 'undercut', hairColor: 'slate', accent: 'violet', accessory: 'glasses' },
  { id: 'draco', face: 'default', name: 'Draco', set: 'a', skin: 'clay', hair: 'buzz', hairColor: 'ink', accent: 'amber', beard: 'full' },
  { id: 'titan', face: 'beam', name: 'Titan', set: 'a', skin: 'umber', hair: 'tiedback', hairColor: 'auburn', accent: 'teal', accessory: 'earring' },
  { id: 'zephyr', face: 'wink', name: 'Zephyr', set: 'a', skin: 'porcelain', hair: 'wavy', hairColor: 'wheat', accent: 'pink', accessory: 'goggles' },
  { id: 'corvus', face: 'cool', name: 'Corvus', set: 'a', skin: 'honey', hair: 'crop', hairColor: 'snow', accent: 'steel', beard: 'goatee' },

  // set b
  { id: 'lyra', face: 'default', name: 'Lyra', set: 'b', skin: 'porcelain', hair: 'long', hairColor: 'auburn', accent: 'pink' },
  { id: 'vega', face: 'beam', name: 'Vega', set: 'b', skin: 'espresso', hair: 'afropuff', hairColor: 'ink', accent: 'lime', accessory: 'earring' },
  { id: 'juno', face: 'cool', name: 'Juno', set: 'b', skin: 'sand', hair: 'bun', hairColor: 'chestnut', accent: 'cyan', accessory: 'glasses' },
  { id: 'astra', face: 'wink', name: 'Astra', set: 'b', skin: 'clay', hair: 'braids', hairColor: 'ink', accent: 'violet' },
  { id: 'nova', face: 'default', name: 'Nova', set: 'b', skin: 'porcelain', hair: 'bob', hairColor: 'snow', accent: 'teal', accessory: 'visor' },
  { id: 'cassia', face: 'beam', name: 'Cassia', set: 'b', skin: 'umber', hair: 'twinbuns', hairColor: 'ink', accent: 'amber' },
  { id: 'elara', face: 'wink', name: 'Elara', set: 'b', skin: 'honey', hair: 'ponytail', hairColor: 'ash', accent: 'coral', accessory: 'antenna' },
  { id: 'maia', face: 'cool', name: 'Maia', set: 'b', skin: 'sand', hair: 'pixie', hairColor: 'copper', accent: 'steel', accessory: 'bandana' },
]

export const AVATAR_IDS = AVATARS.map((a) => a.id)
export const getAvatar = (id) => AVATARS.find((a) => a.id === id) || null

export default function Avatar({ id, size = 64, className = '', title }) {
  const spec = getAvatar(id)
  if (!spec) return null

  const skin = SKIN[spec.skin]
  const hair = HAIR[spec.hairColor]
  const accent = ACCENT[spec.accent]
  const label = title ?? `${spec.name}, explorer avatar`

  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={className}
      role="img"
      aria-label={label}
    >
      <defs>
        <clipPath id={`clip-${spec.id}`}>
          <circle cx="50" cy="50" r="46" />
        </clipPath>
      </defs>

      <circle cx="50" cy="50" r="46" fill="#191a24" />

      <g clipPath={`url(#clip-${spec.id})`}>
        {/* deep-space wash behind the shoulders, tinted by the suit */}
        <circle cx="50" cy="50" r="46" fill={accent} opacity="0.16" />

        <HairBack style={spec.hair} c={hair} />

        {/* shoulders + suit */}
        <path d="M14 100c0-16 16-26 36-26s36 10 36 26z" fill={accent} />
        <path d="M50 74c-5 0-8 4-8 9s3 8 8 8 8-3 8-8-3-9-8-9z" fill="#fff" opacity="0.22" />

        {/* neck */}
        <path d="M42 60h16v14a8 8 0 0 1-16 0z" fill={skin.shade} />

        {/* head */}
        <path d="M50 22c14 0 23 10 23 24s-10 26-23 26-23-12-23-26 9-24 23-24z" fill={skin.base} />
        {/* jaw shading, keeps the face from reading flat */}
        <path d="M50 66c-8 0-14-4-18-11 2 11 9 17 18 17s16-6 18-17c-4 7-10 11-18 11z" fill={skin.shade} opacity="0.45" />

        {/* ears */}
        <circle cx="27" cy="50" r="5" fill={skin.base} />
        <circle cx="73" cy="50" r="5" fill={skin.base} />

        <Beard kind={spec.beard} c={hair} />

        <Face kind={spec.face} hair={hair} />

        <HairFront style={spec.hair} c={hair} />
        <Accessory kind={spec.accessory} accent={accent} />
      </g>

      {/* the chunky ring the rest of the app draws everything inside */}
      <circle cx="50" cy="50" r="46" fill="none" stroke={INK} strokeWidth="5" />
    </svg>
  )
}
