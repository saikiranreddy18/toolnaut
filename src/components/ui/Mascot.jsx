import { useId, useState } from 'react'

// "Naut" — the Toolnaut mascot. One alien character with three moods:
//   happy   — the default resting face (6A)
//   curious — perked-up antennae + wide eyes, for when the user is exploring (6B)
//   cheeky  — a third eye + smirk, playful (6C)
// Body colour is driven by --lime, so the mascot retints with the active play
// mode (green by default, follows Solar/Toxic/Synth). Eyes stay neutral.
const LIME = 'var(--lime)'
const PUPIL = '#12131b'

function Antennae({ mood }) {
  if (mood === 'cheeky') {
    return (
      <>
        <path d="M34 20 v9 M62 20 v9 M48 15 v8" stroke={LIME} strokeWidth="3.5" strokeLinecap="round" />
        <circle cx="34" cy="17" r="4" fill={LIME} />
        <circle cx="62" cy="17" r="4" fill={LIME} />
        <circle cx="48" cy="12" r="4" fill={LIME} />
      </>
    )
  }
  if (mood === 'curious') {
    return (
      <>
        <path d="M38 22 q-5 -9 3 -13 M58 22 q5 -9 -3 -13" stroke={LIME} strokeWidth="3.5" strokeLinecap="round" fill="none" />
        <circle cx="41" cy="9" r="4" fill={LIME} />
        <circle cx="55" cy="9" r="4" fill={LIME} />
      </>
    )
  }
  return (
    <>
      <path d="M36 20 v10 M60 20 v10" stroke={LIME} strokeWidth="3.5" strokeLinecap="round" />
      <circle cx="36" cy="17" r="4.5" fill={LIME} />
      <circle cx="60" cy="17" r="4.5" fill={LIME} />
    </>
  )
}

function Face({ mood }) {
  if (mood === 'cheeky') {
    return (
      <>
        <circle cx="37" cy="48" r="7" fill="#fff" />
        <circle cx="59" cy="48" r="7" fill="#fff" />
        <circle cx="38" cy="49" r="3.2" fill={PUPIL} />
        <circle cx="60" cy="49" r="3.2" fill={PUPIL} />
        <circle cx="48" cy="62" r="6" fill="#fff" />
        <circle cx="48" cy="63" r="2.8" fill={PUPIL} />
        <path d="M40 72 q8 5 16 0" stroke={PUPIL} strokeWidth="2.6" fill="none" strokeLinecap="round" />
      </>
    )
  }
  if (mood === 'curious') {
    return (
      <>
        <circle cx="38" cy="50" r="10.5" fill="#fff" />
        <circle cx="58" cy="50" r="10.5" fill="#fff" />
        <circle cx="38" cy="52" r="5" fill={PUPIL} />
        <circle cx="58" cy="52" r="5" fill={PUPIL} />
        <circle cx="40" cy="49" r="2" fill="#fff" />
        <circle cx="60" cy="49" r="2" fill="#fff" />
        <circle cx="48" cy="68" r="3.2" fill={PUPIL} />
      </>
    )
  }
  return (
    <>
      <circle cx="38" cy="52" r="9" fill="#fff" />
      <circle cx="58" cy="52" r="9" fill="#fff" />
      <circle cx="39" cy="54" r="4" fill={PUPIL} />
      <circle cx="59" cy="54" r="4" fill={PUPIL} />
      <circle cx="41" cy="51" r="1.6" fill="#fff" />
      <circle cx="61" cy="51" r="1.6" fill="#fff" />
      <path d="M41 67 q7 6 14 0" stroke={PUPIL} strokeWidth="3" fill="none" strokeLinecap="round" />
    </>
  )
}

export default function Mascot({ mood = 'happy', size = 32, className = '', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 96 96"
      className={className}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      <Antennae mood={mood} />
      <path d="M48 26 c20 0 30 15 30 33 c0 16 -60 16 -60 0 c0 -18 10 -33 30 -33z" fill={LIME} />
      <Face mood={mood} />
    </svg>
  )
}

// Brand lockup: the mascot + "Toolnaut" wordmark. The mascot perks up to
// "curious" on hover — a small taste of the mood system reacting to the user.
// The "o" in Toolnaut, drawn as a ringed planet in the sticker style used across
// the app: bold black outline, flat fill, and a ring that passes behind the top
// of the planet and in front of the bottom. Colours come from the theme vars, so
// it retints with the play modes. Sized in `em` to scale with the wrapping text.
function GalaxyO() {
  // clipPath ids must be unique — the logo renders more than once per page.
  const clipId = `tn-ring-${useId().replace(/:/g, '')}`
  const ring = (
    <g transform="rotate(-20 60 60)">
      <ellipse cx="60" cy="60" rx="55" ry="17" fill="none" stroke="#000" strokeWidth="10" />
      <ellipse cx="60" cy="60" rx="55" ry="17" fill="none" stroke="var(--arcade-yellow)" strokeWidth="6.5" />
    </g>
  )

  return (
    <svg
      viewBox="0 0 120 120"
      aria-hidden="true"
      style={{
        width: '1.18em',
        height: '1.18em',
        display: 'inline-block',
        verticalAlign: '-0.20em',
        margin: '0 -0.10em',
      }}
    >
      <defs>
        <clipPath id={clipId}>
          {/* lower half, tilted with the ring — the part that passes in front */}
          <rect x="-20" y="60" width="170" height="90" transform="rotate(-20 60 60)" />
        </clipPath>
      </defs>

      {ring}

      <circle cx="60" cy="60" r="33" fill="var(--lime)" stroke="#000" strokeWidth="6" />
      <circle cx="72" cy="44" r="7.5" fill="none" stroke="#000" strokeWidth="4" />
      <circle cx="49" cy="62" r="4" fill="none" stroke="#000" strokeWidth="3.4" />
      <circle cx="74" cy="70" r="2.6" fill="#000" />
      <path d="M42 66 a20 20 0 0 1 8 -18" fill="none" stroke="#fff" strokeWidth="4.5" strokeLinecap="round" />

      <g clipPath={`url(#${clipId})`}>{ring}</g>
    </svg>
  )
}

export function BrandLogo({ size = 30, wordmark = true, className = '', textClass = 'text-sm' }) {
  const [hover, setHover] = useState(false)
  return (
    <span
      className={`inline-flex items-center gap-2.5 ${className}`}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
    >
      <Mascot mood={hover ? 'curious' : 'happy'} size={size} />
      {wordmark && (
        <span className={`font-display font-black italic tracking-[0.06em] text-white ${textClass}`}>
          To<GalaxyO />l<span style={{ color: 'var(--lime)' }}>naut</span>
        </span>
      )}
    </span>
  )
}
