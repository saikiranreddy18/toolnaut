import { Link, useLocation } from 'react-router-dom'
import { useHead } from '../utils/head'
import { CATEGORY_META } from '../utils/toolsCatalog'

// The catch-all used to render the LANDING PAGE at every unmatched URL. A
// typo'd or dead link then looked exactly like the homepage — no signal to the
// person that their link was wrong, duplicate content at 200 for every crawler
// that followed a bad URL, and nothing in an error report to distinguish "user
// hit the site" from "user hit a hole in it". A not-found page's whole job is
// to say so, and then hand the person somewhere real to go.
//
// Served at HTTP 200 like every SPA route here — the static host cannot vary
// the status per client-side route. The robots meta keeps crawlers from
// indexing the hole, which is the part of a real 404 this architecture can
// deliver.
export default function NotFound() {
  const { pathname } = useLocation()

  useHead({
    title: 'Page not found — Toolnaut',
    description: 'That page does not exist. Browse the AI tool catalogue or head back to the start.',
    path: pathname,
  })

  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center px-5 py-16 text-center">
      <div className="starfield" aria-hidden="true" />
      <meta name="robots" content="noindex" />
      <div className="relative z-10">
        <p className="font-display text-xs font-black uppercase tracking-[0.3em]" style={{ color: 'var(--hot-pink)' }}>
          ▸ 404 · LOST IN SPACE
        </p>
        <h1 className="arcade-heading mt-3 text-4xl sm:text-5xl">
          THIS PAGE<br />DOES NOT EXIST
        </h1>
        <p className="mx-auto mt-5 max-w-md text-sm leading-relaxed text-slate-300">
          Nothing lives at <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-cyan-300">{pathname}</code>.
          The link may be old, or the page may have moved.
        </p>

        <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
          <Link to="/app/discover" className="nb-btn min-h-11 px-6 py-3 text-sm">
            🔭 BROWSE ALL TOOLS
          </Link>
          <Link to="/" className="nb-btn dark min-h-11 px-6 py-3 text-sm">
            ← BACK TO START
          </Link>
        </div>

        {/* the six category pages are the likeliest real destination for a
            mistyped tool URL, and they are public — no session needed */}
        <p className="mt-10 font-display text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
          Or jump into a category
        </p>
        <div className="mt-3 flex flex-wrap items-center justify-center gap-2">
          {Object.entries(CATEGORY_META).map(([id, meta]) => (
            <Link
              key={id}
              to={`/tools/${id}`}
              className="arcade-chip press min-h-9 cursor-pointer"
            >
              {meta.name}
            </Link>
          ))}
        </div>
      </div>
    </div>
  )
}
