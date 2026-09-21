// The Toolnaut mark: a glowing neon spiral with blue-to-pink gradient.
export default function SpiralMark({ size = 28, className = '', title }) {
  return (
    <img
      src="/spiral-logo.webp"
      width={size}
      height={size}
      className={`shrink-0 ${className}`}
      role={title ? 'img' : undefined}
      aria-label={title}
      aria-hidden={title ? undefined : 'true'}
      style={{ imageRendering: 'auto' }}
    />
  )
}
