// Imported rather than served from /public so the URL is content-hashed: a
// fixed /spiral-logo.webp kept showing browsers the previous logo from cache.
import spiralLogo from '../../assets/spiral-logo.webp'

// The Toolnaut mark: a glossy blue-to-pink spiral on a transparent background.
export default function SpiralMark({ size = 28, className = '', title }) {
  return (
    <img
      src={spiralLogo}
      width={size}
      height={size}
      className={`shrink-0 object-contain ${className}`}
      alt={title || ''}
      aria-hidden={title ? undefined : 'true'}
      decoding="async"
    />
  )
}
