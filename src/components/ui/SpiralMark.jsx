import { useId } from 'react'

// The Toolnaut mark: a two-arm spiral galaxy, the same shape the landing page's
// tool stars form. Two gradient arms (violet → pink → sky) wind around a white
// core, with one small star at the tip of an arm.
//
// The arm paths are a logarithmic-style spiral sampled at 51 points each and
// baked in here, so the mark is identical everywhere and costs nothing at
// runtime. public/icon.svg carries the same geometry for favicons and icons.
export const SPIRAL_ARM_A =
  'M54.0 50.0L54.5 50.5L55.0 51.2L55.4 52.0L55.6 52.9L55.8 53.9L55.8 55.0L55.6 56.2L55.2 57.4L54.6 58.6L53.9 59.7L52.8 60.8L51.6 61.8L50.2 62.6L48.7 63.3L46.9 63.8L45.1 64.0L43.1 64.0L41.1 63.7L39.0 63.1L37.0 62.2L35.0 61.0L33.1 59.6L31.4 57.8L29.8 55.7L28.5 53.4L27.5 50.8L26.8 48.1L26.4 45.2L26.4 42.2L26.8 39.1L27.6 36.0L28.8 32.9L30.4 29.9L32.5 27.1L34.9 24.5L37.7 22.1L40.9 20.1L44.4 18.4L48.1 17.1L52.1 16.3L56.3 16.0L60.5 16.2L64.8 17.0L69.0 18.3L73.2 20.1L77.2 22.5L80.9 25.4L84.3 28.8L87.4 32.7L89.9 37.0'
export const SPIRAL_ARM_B =
  'M46.0 50.0L45.5 49.5L45.0 48.8L44.6 48.0L44.4 47.1L44.2 46.1L44.2 45.0L44.4 43.8L44.8 42.6L45.4 41.4L46.1 40.3L47.2 39.2L48.4 38.2L49.8 37.4L51.3 36.7L53.1 36.2L54.9 36.0L56.9 36.0L58.9 36.3L61.0 36.9L63.0 37.8L65.0 39.0L66.9 40.4L68.6 42.2L70.2 44.3L71.5 46.6L72.5 49.2L73.2 51.9L73.6 54.8L73.6 57.8L73.2 60.9L72.4 64.0L71.2 67.1L69.6 70.1L67.5 72.9L65.1 75.5L62.3 77.9L59.1 79.9L55.6 81.6L51.9 82.9L47.9 83.7L43.7 84.0L39.5 83.8L35.2 83.0L31.0 81.7L26.8 79.9L22.8 77.5L19.1 74.6L15.7 71.2L12.6 67.3L10.1 63.0'

export default function SpiralMark({ size = 28, className = '', title }) {
  // Gradient ids must be unique: the mark renders several times per page.
  const id = `tn-spiral-${useId().replace(/:/g, '')}`
  return (
    <svg
      viewBox="0 0 100 100"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
    >
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#a5b4fc" />
          <stop offset="0.5" stopColor="#f0abfc" />
          <stop offset="1" stopColor="#7dd3fc" />
        </linearGradient>
      </defs>
      <path d={SPIRAL_ARM_A} fill="none" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <path d={SPIRAL_ARM_B} fill="none" stroke={`url(#${id})`} strokeWidth="9" strokeLinecap="round" strokeLinejoin="round" />
      <circle cx="50" cy="50" r="9" fill="#ffffff" />
      <circle cx="84" cy="22" r="3.5" fill="#ffffff" />
    </svg>
  )
}
