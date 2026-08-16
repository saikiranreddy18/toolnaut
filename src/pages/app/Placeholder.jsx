// Shared coming-soon surface for /app routes whose modules haven't shipped.
// Keeping them as real routes (instead of hiding nav items) preserves deep
// links and lets the sidebar/bottom-nav structure be final now.
export default function Placeholder({ title, blurb }) {
  return (
    <div className="flex min-h-[70dvh] flex-col items-center justify-center px-5 text-center">
      <span className="tape-label mb-6 text-xs">✦ coming soon ✦</span>
      <h1 className="arcade-heading text-3xl">{title}</h1>
      <p className="mt-4 max-w-md text-sm leading-relaxed text-slate-400">{blurb}</p>
      <p className="arcade-chip mt-8">In development</p>
    </div>
  )
}
