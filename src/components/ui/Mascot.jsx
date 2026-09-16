import SpiralMark from './SpiralMark'
import Wordmark from './Wordmark'

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

// Brand lockup: the mascot + the Toolnaut wordmark. The mascot perks up to
// "curious" on hover — a small taste of the mood system reacting to the user.
//
// The wordmark itself lives in Wordmark.jsx: the ringed-planet "o" that used to
// sit here was replaced by the infinity mark, and that glyph is now shared by
// every surface that shows the name rather than being redrawn per component.

// beta defaults ON: the product is a public beta, and the tag belongs to the
// LOCKUP, not to one page. It used to ride only the hero's centre wordmark, so
// the app shell, the intake and the nav all showed the name with no version —
// and the one place that did say beta was the wordmark we removed.
// Logo scale, in one place.
//
// Seven call sites each hard-coded their own size and they drifted: the landing
// nav rendered the mark at 68px while Pricing and About used 44 and the quiz
// used 40, so the same brand shrank by a third depending on which page you
// landed on. Sizes live here now, named by ROLE rather than by number, so a new
// page picks a role instead of inventing a size.
//
//   page    a public page's own header — the brand moment
//   nav     the landing page's top bar
//   chrome  persistent navigation INSIDE the app, alongside content all session
//   compact dense bars and back-links, where the mark is a wayfinder
//
// PUBLIC PAGES SCALE, THE APP DOES NOT.
// A fixed pixel size was chosen for a phone and then looked lost in the header
// of a 1440px page with a whole empty band around it. The public roles now
// grow with the viewport through markClass/textClass breakpoints — the size
// prop is only the mobile baseline and the SVG's intrinsic size. Inside the app
// the lockup stays one fixed size on every screen on purpose: it is a wayfinder
// there, and a brand that changes size as you move between tabs reads as a
// layout bug.
export const LOGO = {
  page: {
    size: 36,
    markClass: 'h-9 w-9 sm:h-11 sm:w-11 lg:h-14 lg:w-14',
    textClass: 'text-2xl sm:text-3xl lg:text-4xl',
    gapClass: 'gap-2.5 sm:gap-3 lg:gap-3.5',
  },
  nav: {
    size: 32,
    markClass: 'h-8 w-8 md:h-9 md:w-9 lg:h-11 lg:w-11',
    textClass: 'text-xl md:text-[1.35rem] lg:text-[1.65rem]',
    gapClass: 'gap-2.5 lg:gap-3',
  },
  chrome: { size: 30, textClass: 'text-xl' },
  compact: { size: 22, textClass: 'text-base' },
}

export function BrandLogo({
  size = 30, wordmark = true, beta = true, className = '', textClass = 'text-sm',
  markClass = '', gapClass = 'gap-2.5',
}) {
  return (
    <span className={`inline-flex items-center ${gapClass} ${className}`}>
      <SpiralMark size={size} className={markClass} />
      {wordmark && (
        <Wordmark glow={false} className={`tracking-[-0.02em] text-white ${textClass}`} />
      )}
      {wordmark && beta && (
        <span
          className="ml-0.5 rounded-full border border-white/15 px-1.5 py-px text-[10px] font-medium text-zinc-400"
        >
          beta
        </span>
      )}
    </span>
  )
}
