import { Link } from 'react-router-dom'
import { useHead } from '../utils/head'
import { motion } from 'framer-motion'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { BRAND } from '../config'
import { TOOLS } from '../utils/toolsCatalog'
import { catalogSize, lastUpdatedLabel } from '../utils/catalogFreshness'

// The catalog this page describes (public/tools.json) already exists and is
// already served statically by Vercel — this page just says so. Reuses
// Changelog.jsx's/About.jsx's exact shell, the third page to do so.
//
// EVERY CLAIM HERE IS CHECKED AGAINST THE CODE: the field list is
// radar/scripts/sync-to-app.js's own FIELDS array, and the example record
// below is read from the live catalog at render time rather than typed in,
// so it can't drift the way a hand-written sample would.
const FIELDS = [
  ['slug', 'Unique, URL-safe identifier'],
  ['name', 'Display name'],
  ['category', "Toolnaut's own category (code, design, writing, data, automation, learning, ...)"],
  ['sourceCategory', 'The category as the tool itself describes it'],
  ['price', '"free", "freemium", or "paid"'],
  ['pricing', 'Plain-language pricing detail'],
  ['level', '"beginner", "intermediate", or "advanced"'],
  ['blurb', 'One-sentence description'],
  ['audience', 'Who it is for'],
  ['dev', 'Maker / developer name'],
  ['year', 'Year released, as a number'],
  ['website', 'The tool’s own homepage'],
  ['status', '"Active" or "Deprecated"'],
  ['note', 'Optional editorial note, often empty'],
  ['tags', 'Array of free-text tags'],
  ['discoveredAt', 'ISO timestamp of when Toolnaut’s radar found it, if known'],
]

function Block({ title, children }) {
  return (
    <section className="mt-9">
      <h2 className="arcade-heading section text-xl sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-zinc-300">{children}</div>
    </section>
  )
}

export default function Developers() {
  const count = catalogSize()
  const updated = lastUpdatedLabel()
  const example = TOOLS[0]

  useHead({
    title: `Developer API — ${BRAND}`,
    description: `${BRAND}'s full tool catalog is a public JSON file, free to fetch. No key, no auth, no rate limit enforced.`,
    path: '/developers',
  })

  return (
    <div id="main-content" tabIndex={-1} className="relative z-10 min-h-screen">
      <div className="starfield" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link to="/" aria-label={BRAND}>
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          Find your stack
        </Link>
      </header>

      <main className="relative mx-auto max-w-3xl px-5 pb-24 pt-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="text-xs font-medium uppercase tracking-[0.22em] cosmic-text"
          style={{ color: 'var(--lime)' }}
        >
          For developers
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="arcade-heading mt-3 text-4xl sm:text-5xl"
        >
          Build on<br />{BRAND}'s catalog
        </motion.h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-zinc-400">
          Every tool {BRAND} knows about — {count.toLocaleString()} of them
          {updated ? `, last added to ${updated}` : ''} — lives in one public
          JSON file. It's the same file the app itself fetches, so there's
          nothing held back for a "real" API.
        </p>

        <Block title="The endpoint">
          <p>
            <code className="rounded bg-white/10 px-1.5 py-0.5 text-xs text-white">
              GET https://toolnaut.xyz/tools.json
            </code>
          </p>
          <p>
            A plain static file, cross-origin requests allowed. No API key, no
            headers to set, no signup.
          </p>
          <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
{`fetch('https://toolnaut.xyz/tools.json')
  .then((res) => res.json())
  .then((tools) => console.log(tools.length, 'tools'))`}
          </pre>
        </Block>

        <Block title="Shape">
          <p>Each entry is one tool, with these fields:</p>
          <ul className="list-disc space-y-1.5 pl-5">
            {FIELDS.map(([field, desc]) => (
              <li key={field}>
                <code className="rounded bg-white/10 px-1 py-0.5 text-xs text-white">{field}</code>
                {' — '}{desc}
              </li>
            ))}
          </ul>
          {example && (
            <>
              <p className="mt-4">A real record, pulled live from the catalog:</p>
              <pre className="mt-2 overflow-x-auto rounded-lg border border-white/10 bg-black/30 p-4 text-xs text-zinc-300">
                {JSON.stringify(example, null, 2)}
              </pre>
            </>
          )}
        </Block>

        <Block title="What this is, honestly">
          <p>
            There's no rate limit enforced today — just be reasonable, and
            please don't poll it more than once an hour since it only changes
            that often. There's no uptime SLA beyond whatever Vercel's own CDN
            gives a static file (which is a lot). Filtering, sorting and
            search are all client-side jobs — fetch the whole file and slice
            it however you need, the same way {BRAND}'s own{' '}
            <Link to="/app/stack" className="underline underline-offset-2 hover:text-white">
              Discover page
            </Link>{' '}
            does.
          </p>
          <p>
            New tools get added by{' '}
            <Link to="/changelog" className="underline underline-offset-2 hover:text-white">
              an automated pipeline that runs daily
            </Link>
            . For a prose summary of what {BRAND} is, written for AI agents
            and crawlers rather than for a `fetch()` call, see{' '}
            <a
              href="/llms.txt"
              className="underline underline-offset-2 hover:text-white"
            >
              /llms.txt
            </a>
            .
          </p>
        </Block>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <Link to="/goal" className="nb-btn inline-block px-8 py-4 text-base">
            Take the 60-second quiz
          </Link>
          <p className="mt-4 text-xs text-zinc-500">
            <Link to="/about" className="underline underline-offset-2 hover:text-white">our story</Link>
            {' · '}
            <Link to="/" className="underline underline-offset-2 hover:text-white">back home</Link>
          </p>
        </motion.div>
      </main>
    </div>
  )
}
