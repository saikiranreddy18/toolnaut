import { Link } from 'react-router-dom'
import { useHead } from '../utils/head'
import { motion } from 'framer-motion'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { BRAND } from '../config'
import { CHANGELOG } from '../utils/changelogData'

// Public, crawlable proof that the product is actively maintained — the
// cheapest possible answer to "is this still being worked on?" for a
// pre-revenue, single-builder beta. Reuses About.jsx's exact page shell.
export default function Changelog() {
  useHead({
    title: "What's new — Toolnaut",
    description: `${BRAND} ships almost every day. See what changed, in plain language, newest first.`,
    path: '/changelog',
  })

  return (
    <div className="relative z-10 min-h-screen bg-[#0a0a0f]">
      <div className="starfield" aria-hidden="true" />

      <header className="relative mx-auto flex max-w-3xl items-center justify-between px-5 py-6">
        <Link to="/" aria-label={BRAND}>
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          ⚡ Find your stack
        </Link>
      </header>

      <main className="relative mx-auto max-w-3xl px-5 pb-24 pt-8">
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="font-display text-xs font-black uppercase tracking-[0.3em]"
          style={{ color: 'var(--lime)' }}
        >
          ▸ What's new
        </motion.p>
        <motion.h1
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="arcade-heading mt-3 text-4xl sm:text-5xl"
        >
          Shipping,<br />almost every day
        </motion.h1>
        <p className="mt-4 max-w-xl text-sm leading-relaxed text-slate-400">
          {BRAND} is a solo-built beta that keeps improving. This is a plain-language
          record of what changed and when — no jargon, no commit hashes.
        </p>

        <div className="mt-12 space-y-6">
          {CHANGELOG.map((entry, i) => (
            <motion.article
              key={`${entry.date}-${entry.title}`}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, amount: 0.3 }}
              transition={{ delay: Math.min(i, 6) * 0.05 }}
              className="sticker p-6 backdrop-blur-sm bg-black/20"
              style={{ transform: 'rotate(0)' }}
            >
              <time
                dateTime={entry.date}
                className="font-display text-[11px] font-black uppercase tracking-[0.16em]"
                style={{ color: 'var(--lime)' }}
              >
                {entry.date}
              </time>
              <h2 className="arcade-heading mt-2 text-lg">{entry.title}</h2>
              <p className="mt-3 text-sm leading-relaxed text-slate-300">{entry.body}</p>
            </motion.article>
          ))}
        </div>

        <motion.div
          initial={{ opacity: 0 }}
          whileInView={{ opacity: 1 }}
          viewport={{ once: true }}
          className="mt-14 text-center"
        >
          <Link to="/goal" className="nb-btn inline-block px-8 py-4 text-base">
            🚀 Take the 60-second quiz
          </Link>
          <p className="mt-4 text-xs text-slate-500">
            <Link to="/about" className="underline underline-offset-2 hover:text-white">our story</Link>
            {' · '}
            <Link to="/" className="underline underline-offset-2 hover:text-white">back home</Link>
          </p>
        </motion.div>
      </main>
    </div>
  )
}
