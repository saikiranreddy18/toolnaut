import { Link } from 'react-router-dom'
import { useHead, SITE } from '../utils/head'
import { COLLECTIONS } from '../utils/collectionsData'

// Public, crawlable index of hand-curated tool bundles — the middle step
// between the 6 broad /tools/:domain pages (too wide: "writing" spans
// ChatGPT through Doubao) and the 9-question quiz (too much commitment for
// a first visit). Mirrors CategoryLanding.jsx's card markup so this doesn't
// invent new chrome.
export default function Collections() {
  useHead({
    title: `AI tool collections — ${COLLECTIONS.length} curated stacks — Toolnaut`,
    description:
      'Hand-picked groups of AI tools that work well together, organised by use case — pick a bundle instead of building a stack from scratch.',
    path: '/collections',
    jsonLd: {
      '@context': 'https://schema.org',
      '@type': 'CollectionPage',
      name: 'AI tool collections',
      url: `${SITE}/collections`,
      mainEntity: {
        '@type': 'ItemList',
        numberOfItems: COLLECTIONS.length,
        itemListElement: COLLECTIONS.map((c, i) => ({
          '@type': 'ListItem',
          position: i + 1,
          name: c.title,
          description: c.blurb,
          url: `${SITE}/collections/${c.slug}`,
        })),
      },
    },
  })

  return (
    <div id="main-content" tabIndex={-1} className="mx-auto max-w-5xl px-5 py-10 lg:py-16">
      <p className="font-display text-xs uppercase tracking-[0.2em] font-semibold cosmic-text">
        Collections
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">
        Tool bundles that work well together
      </h1>
      <p className="mt-4 max-w-2xl text-sm leading-relaxed text-zinc-300">
        Not ready for the full quiz? Each collection below is a hand-picked
        group of tools for one real use case, with the reasoning for why they
        belong together.
      </p>

      <Link to="/goal" className="nb-btn mt-6 inline-block px-6 py-3 text-sm">
        Take the 60-second quiz for your own stack
      </Link>

      <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {COLLECTIONS.map((c) => (
          <Link
            key={c.slug}
            to={`/collections/${c.slug}`}
            className="glass rounded-2xl p-5 transition-transform hover:-translate-y-0.5"
          >
            <span className="text-[10px] font-bold text-zinc-400">
              {c.toolSlugs.length} TOOLS
            </span>
            <p className="arcade-heading mt-2 text-base hover:underline underline-offset-4">
              {c.title}
            </p>
            <p className="mt-2 text-xs leading-relaxed text-zinc-300">{c.blurb}</p>
          </Link>
        ))}
      </div>

      <div className="mt-12 text-center">
        <Link
          to="/goal"
          className="glow-btn inline-block rounded-full bg-gradient-to-r from-exus-purple to-exus-cyan px-7 py-3 font-display text-sm font-semibold text-white"
        >
          Build my own stack
        </Link>
      </div>
    </div>
  )
}
