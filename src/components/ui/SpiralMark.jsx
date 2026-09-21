// The Toolnaut mark: a two-arm spiral galaxy with a lit core and a single
// satellite at one arm's tip.
//
// This is the rendered brand artwork rather than drawn geometry, so the mark is
// pixel-identical to the logo used off-site (store listings, social, press).
// The art has its own near-black backdrop baked in, which is why it sits in a
// rounded tile instead of floating on the page background.
export default function SpiralMark({ size = 28, className = '', title }) {
  return (
    <img
      src="/logo.webp"
      width={size}
      height={size}
      className={`shrink-0 rounded-[22%] ${className}`}
      alt={title || ''}
      aria-hidden={title ? undefined : 'true'}
      draggable="false"
      decoding="async"
    />
  )
}
