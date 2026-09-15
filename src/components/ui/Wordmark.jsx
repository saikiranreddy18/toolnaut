// The Toolnaut wordmark: the name, in plain letters.
//
// It used to draw the double "o" as an infinity. That was a nice idea, but at
// small sizes it read as "T∞lnaut" or "Tlnaut", and a brand people search for by
// name has to be readable at a glance. The spiral mark (SpiralMark) now carries
// the symbol; the wordmark just says the name.
//
// `glow` is accepted and ignored so existing call sites keep working.
// eslint-disable-next-line no-unused-vars
export default function Wordmark({ className = '', glow, style }) {
  return (
    <span
      className={`inline-flex items-center whitespace-nowrap font-display font-semibold tracking-[-0.02em] ${className}`}
      style={style}
    >
      Toolnaut
    </span>
  )
}
