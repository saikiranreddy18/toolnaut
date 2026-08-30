import { Link } from 'react-router-dom'
import { BrandLogo, LOGO } from '../components/ui/Mascot'
import { useHead } from '../utils/head'
import { TOOLS } from '../utils/toolsCatalog'
import { lastUpdatedLabel } from '../utils/catalogFreshness'

// How recommendations are made, in plain language.
//
// The product review put this bluntly: professional users will not act on
// recommendations that look opaque or commercially motivated, and trust is a
// product feature rather than a legal page. So this states the sources, the
// confidence thresholds, what the LLM does and does not decide, what is NOT
// verified, and the commercial relationships — of which there are currently
// none.
//
// EVERY CLAIM ON THIS PAGE IS CHECKED AGAINST THE CODE. The thresholds are the
// real defaults in radar/config.js, the sources are the real adapters in
// radar/sources/, and "no affiliate links" was verified by grep before being
// written down. If the pipeline changes, this page has to change with it — a
// methodology page that drifts from the system is worse than none, because it
// converts an honest gap into a false statement.

function Block({ title, children }) {
  return (
    <section className="mt-9">
      <h2 className="arcade-heading section text-xl sm:text-2xl">{title}</h2>
      <div className="mt-3 space-y-3 text-sm leading-relaxed text-slate-300">{children}</div>
    </section>
  )
}

export default function Methodology() {
  useHead({
    title: 'How Toolnaut chooses tools — methodology',
    description: 'How tools enter the catalogue, how match scores are calculated, and what the numbers on this site do and do not claim.',
    path: '/methodology',
  })
  const updated = lastUpdatedLabel()

  return (
    <div className="relative z-10 mx-auto max-w-3xl px-5 py-10 lg:py-14">
      {/* These pages are linked to directly and shared, so they can be
          someone's first screen — a bare "← Back" told them nothing about
          whose product they had landed on. Same header the other standalone
          pages use, at the same LOGO.page scale. */}
      <header className="mb-8 flex items-center justify-between gap-4">
        <Link to="/" aria-label="Toolnaut home">
          <BrandLogo {...LOGO.page} />
        </Link>
        <Link to="/goal" className="nb-btn px-4 py-2 text-xs">
          ⚡ Find your stack
        </Link>
      </header>

      <p className="mt-6 font-display text-xs font-black uppercase tracking-[0.2em]" style={{ color: 'var(--lime)' }}>
        ▸ Trust
      </p>
      <h1 className="arcade-heading mt-2 text-3xl sm:text-4xl">HOW WE CHOOSE</h1>
      <p className="mt-4 text-sm leading-relaxed text-slate-300">
        {TOOLS.length.toLocaleString()} tools are in the catalogue
        {updated ? `, last added to ${updated}` : ''}. Here is exactly how they get
        there, how they get ranked for you, and what we do not check.
      </p>

      <Block title="Where tools come from">
        <p>
          An automated discovery pass runs twice a day against public sources:
          GitHub, Hacker News, and — when credentials are configured — Product
          Hunt and a set of RSS feeds. Nobody pays to be listed and nobody can
          submit a paid placement.
        </p>
      </Block>

      <Block title="What gets filtered out">
        <p>
          Most of what those sources produce is news about AI rather than a tool
          you can use. A cheap heuristic drops article-shaped candidates before
          they cost anything to process — headlines phrased as “how to”, “the
          best”, “study finds”, names longer than eight words, and sentences.
          Curated listings like Product Hunt and GitHub are given more latitude
          than Hacker News headlines, because they are already product pages.
        </p>
        <p>
          Anything already in the catalogue is dropped as a duplicate rather than
          re-added under a second name.
        </p>
      </Block>

      <Block title="Where the confidence line sits">
        <p>
          Each surviving candidate is scored. At <strong className="text-white">0.75 and above</strong> it
          publishes automatically. Between <strong className="text-white">0.4 and 0.75</strong> it goes to a
          review queue instead of the catalogue. Below 0.4 it is rejected. The
          middle band exists so that uncertain entries wait rather than appear as
          though they were confirmed.
        </p>
      </Block>

      <Block title="What the AI does — and what it does not">
        <p>
          A language model writes the short description and assigns a category
          and audience. It does not decide whether a tool is good, and it does
          not set the ranking you see. When no model is configured the pipeline
          falls back to deterministic rules, so the catalogue never depends on a
          model being available.
        </p>
        <p>
          Ranking is a scoring function over your own answers — role, goal,
          experience, budget, time, and current stack. That is why every pick in
          your stack can show the reason it was chosen. If a pick cannot explain
          itself, treat that as a bug and tell us.
        </p>
      </Block>

      <Block title="What we do not verify">
        <p>
          This is the part most directories leave out. Pricing, free-tier limits,
          integrations and feature claims come from the tool’s own listing and
          are <strong className="text-white">not independently confirmed</strong>. They go out
          of date, and vendors change plans without notice. Check the vendor’s
          pricing page before you commit money or data to anything here.
        </p>
        <p>
          We also do not audit any tool’s security or privacy practices. A tool
          appearing in the catalogue is not an endorsement of how it handles your
          data.
        </p>
      </Block>

      <Block title="Commercial relationships">
        <p>
          There are none. No affiliate links, no referral parameters, no
          sponsored placements, no payment for inclusion or position. Links go
          straight to the tool. If that ever changes, it will be disclosed on
          this page and marked on the affected tools before it goes live — not
          after.
        </p>
        <p>
          Toolnaut is in free public beta and does not currently take payment of
          any kind.
        </p>
      </Block>

      <Block title="Telling us we got it wrong">
        <p>
          If a tool is mis-described, mis-priced, discontinued, or should not be
          listed at all, say so and it will be corrected or removed. Corrections
          are the mechanism that keeps the rest of this page honest.
        </p>
        <p>
          <Link to="/about" className="font-semibold underline underline-offset-2" style={{ color: 'var(--cyan)' }}>
            Get in touch →
          </Link>
        </p>
      </Block>

      <div className="mt-10 rounded-2xl border-[3px] border-black p-5" style={{ background: '#15151f', boxShadow: '5px 5px 0 #000' }}>
        <p className="text-sm text-slate-300">
          Want to see what this produces before signing up?{' '}
          <Link to="/example" className="font-semibold underline underline-offset-2" style={{ color: 'var(--lime)' }}>
            Look at a full example stack →
          </Link>
        </p>
      </div>
    </div>
  )
}
