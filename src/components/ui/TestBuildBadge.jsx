// Staging-only marker, so nobody reviewing the test link mistakes it for
// production and any screenshot taken from it is self-identifying.
// pointer-events:none — it must never sit between a tester and a control.
export default function TestBuildBadge() {
  return (
    <div
      aria-hidden="true"
      className="pointer-events-none fixed bottom-[76px] left-3 z-[60] select-none lg:bottom-3"
      style={{
        background: 'var(--hot-pink)',
        color: '#fff',
        border: '2px solid #000',
        boxShadow: '3px 3px 0 #000',
        borderRadius: 6,
        padding: '4px 9px',
        font: '900 9px/1.1 "Space Grotesk", system-ui, sans-serif',
        letterSpacing: '0.12em',
        textTransform: 'uppercase',
      }}
    >
      Test build · not production
    </div>
  )
}
