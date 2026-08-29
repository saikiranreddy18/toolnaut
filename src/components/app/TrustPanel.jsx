import { Link } from 'react-router-dom'
import { TOOLS } from '../../utils/toolsCatalog'
import { matchReasonShort } from '../../utils/matchScore'
import { matchScore } from '../../utils/matchScore'

// The trust block the product review asks for on every recommendation: best
// for, why it matched you, a limitation, pricing, learning curve, alternatives,
// when it was last checked, and any commercial relationship.
//
// WHY IT MATTERS MORE THAN IT LOOKS
// A tool page that only lists upside is indistinguishable from an ad, and a
// professional deciding where to put their data will treat it as one. The
// limitation and the "not independently verified" line are the two things here
// that a directory optimising for clicks would never print — which is exactly
// why they are worth printing.
//
// EVERYTHING IS DERIVED, NOTHING IS INVENTED. Alternatives are real catalogue
// neighbours scored against the same answers. The verification line reports
// what is actually known: radar-discovered tools carry a date, bundled ones do
// not, and the component says so rather than showing a comforting placeholder.

const LEVEL_CURVE = {
  beginner: 'Gentle — usable on day one',
  intermediate: 'Moderate — expect a short ramp',
  advanced: 'Steep — assumes real technical background',
}

// Limitations we can state honestly from catalogue data alone. These are
// characteristics, not opinions about quality.
function limitationOf(tool) {
  if (tool.note) return tool.note
  const bits = []
  if (tool.level === 'advanced') bits.push('assumes a technical background and setup effort')
  if (/paid|subscription/i.test(tool.price || tool.pricing || '')) bits.push('no meaningful free tier')
  if (tool.status && /beta|alpha|early/i.test(tool.status)) bits.push(`still ${tool.status.toLowerCase()}`)
  if (!bits.length) return null
  return bits.join('; ')
}

function alternativesFor(tool, answers) {
  return TOOLS
    .filter((t) => t.slug !== tool.slug && t.category === tool.category)
    .map((t) => ({ ...t, s: matchScore(t, answers) ?? 50 }))
    .sort((a, b) => b.s - a.s)
    .slice(0, 3)
}

function Row({ label, children }) {
  if (!children) return null
  return (
    <div className="flex flex-col gap-1 border-t border-white/10 py-3 sm:flex-row sm:gap-4">
      <dt className="w-40 shrink-0 font-display text-[11px] font-black uppercase tracking-[0.12em] text-slate-500">
        {label}
      </dt>
      <dd className="text-sm leading-relaxed text-slate-200">{children}</dd>
    </div>
  )
}

export default function TrustPanel({ tool, answers }) {
  if (!tool) return null

  const reason = answers ? matchReasonShort(tool, answers) : null
  const limitation = limitationOf(tool)
  const alts = answers ? alternativesFor(tool, answers) : []
  const verified = tool.discoveredAt ? new Date(tool.discoveredAt) : null

  return (
    <section
      className="mt-6 rounded-2xl border-[3px] border-black p-5"
      style={{ background: '#12121b', boxShadow: '5px 5px 0 #000' }}
    >
      <h2 className="arcade-heading compact text-base" style={{ color: 'var(--lime)' }}>
        WHY THIS IS HERE
      </h2>

      <dl className="mt-3">
        <Row label="Best for">{tool.audience}</Row>

        {reason && <Row label="Why it matched you">{reason}</Row>}

        {/* The row a directory optimising for clicks would omit. */}
        <Row label="Watch out for">
          {limitation || <span className="text-slate-400">Nothing specific flagged in the catalogue — check the vendor’s docs before committing.</span>}
        </Row>

        <Row label="Pricing">
          {tool.price || tool.pricing || 'See the vendor’s site'}
          <span className="ml-2 text-xs text-slate-500">(not independently verified)</span>
        </Row>

        <Row label="Learning curve">{LEVEL_CURVE[tool.level] || tool.level}</Row>

        {alts.length > 0 && (
          <Row label="Alternatives">
            <span className="flex flex-wrap gap-2">
              {alts.map((a) => (
                <Link
                  key={a.slug}
                  to={`/app/tools/${a.slug}`}
                  className="rounded-full border-2 border-black px-2.5 py-1 text-xs font-semibold text-white transition-transform hover:scale-105"
                  style={{ background: '#1c1c28' }}
                >
                  {a.name}
                </Link>
              ))}
            </span>
          </Row>
        )}

        <Row label="Last checked">
          {verified
            ? <>Discovered {verified.toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}. Details come from the vendor and are not re-verified on a schedule.</>
            : <>Part of the founding catalogue — not individually date-stamped. Treat pricing and features as indicative.</>}
        </Row>

        <Row label="Commercial ties">
          None. No affiliate link, no referral code, no paid placement.{' '}
          <Link to="/methodology" className="underline underline-offset-2" style={{ color: 'var(--cyan)' }}>
            How we choose →
          </Link>
        </Row>
      </dl>
    </section>
  )
}
