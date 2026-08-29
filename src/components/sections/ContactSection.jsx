import { Link } from 'react-router-dom'
import { BRAND, CONTACT_EMAIL, SOCIALS } from '../../config'
import DottedWordmark from '../ui/DottedWordmark'
import { useAnalytics } from '../../hooks/useAnalytics'
import { EVENTS } from '../../utils/analyticsEvents'
import { catalogSize, lastUpdatedLabel } from '../../utils/catalogFreshness'

// The contact block.
//
// There was no contact section — "Contact" in the nav jumped to a footer whose
// only actual contact was a mailto buried in a row of links, under a giant
// decorative wordmark. Someone wanting to reach a human had to hunt for it.
//
// The giant wordmark is still the centrepiece, but it is now the dotted
// cursor-reveal: you paint the name in with the pointer instead of just
// reading it.
//
// The social row renders nothing while SOCIALS is empty. Placeholder handles
// would be dead links on a live page pointing at accounts that are not yours —
// worse than an absent row, and precisely the kind of thing the methodology
// page promises this product does not do.

const ICONS = {
  x: 'M18.2 2H21l-6.5 7.4L22 22h-6l-4.7-6.2L5.9 22H3l7-8L2 2h6.2l4.2 5.6L18.2 2Zm-1 18h1.6L7 3.9H5.3L17.2 20Z',
  instagram: 'M12 2.2c3.2 0 3.6 0 4.9.1 1.2.1 1.8.2 2.2.4.6.2 1 .5 1.4.9.4.4.7.8.9 1.4.2.4.4 1 .4 2.2.1 1.3.1 1.7.1 4.9s0 3.6-.1 4.9c-.1 1.2-.2 1.8-.4 2.2a3.9 3.9 0 0 1-2.3 2.3c-.4.2-1 .4-2.2.4-1.3.1-1.7.1-4.9.1s-3.6 0-4.9-.1c-1.2-.1-1.8-.2-2.2-.4a3.9 3.9 0 0 1-2.3-2.3c-.2-.4-.4-1-.4-2.2C2.2 15.6 2.2 15.2 2.2 12s0-3.6.1-4.9c.1-1.2.2-1.8.4-2.2.2-.6.5-1 .9-1.4.4-.4.8-.7 1.4-.9.4-.2 1-.4 2.2-.4C8.4 2.2 8.8 2.2 12 2.2Zm0 5.3a4.5 4.5 0 1 0 0 9 4.5 4.5 0 0 0 0-9Zm0 7.4a2.9 2.9 0 1 1 0-5.8 2.9 2.9 0 0 1 0 5.8Zm5.7-7.6a1.05 1.05 0 1 1-2.1 0 1.05 1.05 0 0 1 2.1 0Z',
  facebook: 'M22 12.06C22 6.5 17.52 2 12 2S2 6.5 2 12.06c0 5 3.66 9.15 8.44 9.94v-7.03H7.9v-2.9h2.54V9.85c0-2.52 1.5-3.91 3.77-3.91 1.1 0 2.24.2 2.24.2v2.46h-1.26c-1.24 0-1.63.78-1.63 1.57v1.89h2.78l-.45 2.9h-2.33V22c4.78-.79 8.44-4.93 8.44-9.94Z',
  linkedin: 'M4.98 3.5a2.5 2.5 0 1 1 0 5 2.5 2.5 0 0 1 0-5ZM3 9h4v12H3V9Zm7 0h3.8v1.7h.05c.53-1 1.83-2.05 3.76-2.05C21.4 8.65 22 11 22 14.1V21h-4v-6.1c0-1.45-.03-3.3-2-3.3-2.01 0-2.32 1.57-2.32 3.2V21h-4V9Z',
  github: 'M12 2a10 10 0 0 0-3.2 19.5c.5.1.7-.2.7-.5v-1.7c-2.8.6-3.4-1.2-3.4-1.2-.5-1.2-1.1-1.5-1.1-1.5-.9-.6.1-.6.1-.6 1 .1 1.5 1 1.5 1 .9 1.6 2.4 1.1 3 .9.1-.7.4-1.1.6-1.4-2.2-.3-4.6-1.1-4.6-5 0-1.1.4-2 1-2.7-.1-.2-.4-1.2.1-2.6 0 0 .8-.3 2.7 1a9.4 9.4 0 0 1 5 0c1.9-1.3 2.7-1 2.7-1 .5 1.4.2 2.4.1 2.6.6.7 1 1.6 1 2.7 0 3.9-2.4 4.7-4.6 5 .4.3.7.9.7 1.9v2.8c0 .3.2.6.7.5A10 10 0 0 0 12 2Z',
  youtube: 'M21.6 7.2s-.2-1.4-.8-2c-.75-.8-1.6-.8-2-.85C16 4.2 12 4.2 12 4.2h-.01s-4 0-6.8.2c-.4.05-1.25.05-2 .85-.6.6-.8 2-.8 2S2.2 8.8 2.2 10.5v1.6c0 1.65.2 3.3.2 3.3s.2 1.4.8 2c.75.8 1.75.78 2.2.86 1.6.15 6.8.2 6.8.2s4 0 6.8-.21c.4-.05 1.25-.05 2-.85.6-.6.8-2 .8-2s.2-1.65.2-3.3v-1.6c0-1.65-.2-3.3-.2-3.3ZM9.9 14.6V8.9l5.2 2.86-5.2 2.84Z',
  discord: 'M19.3 5.3A16.9 16.9 0 0 0 15.1 4l-.2.4a15.7 15.7 0 0 1 3.7 1.2c-1.8-.85-3.6-1.25-5.6-1.25s-3.8.4-5.6 1.25A15.7 15.7 0 0 1 9.1 4.4L8.9 4a16.9 16.9 0 0 0-4.2 1.3C2.1 9.2 1.4 13 1.75 16.7A17 17 0 0 0 6.9 19.3l1-1.4c-.55-.2-1.08-.45-1.58-.75l.4-.3a12.1 12.1 0 0 0 10.56 0l.4.3c-.5.3-1.03.55-1.58.75l1 1.4a17 17 0 0 0 5.15-2.6c.42-4.3-.68-8.05-2.95-11.4ZM8.55 14.5c-1 0-1.83-.92-1.83-2.05s.8-2.06 1.83-2.06c1.03 0 1.85.93 1.83 2.06 0 1.13-.8 2.05-1.83 2.05Zm6.9 0c-1 0-1.83-.92-1.83-2.05s.8-2.06 1.83-2.06c1.03 0 1.85.93 1.83 2.06 0 1.13-.8 2.05-1.83 2.05Z',
}

export default function ContactSection() {
  const track = useAnalytics()
  const count = catalogSize()
  const updated = lastUpdatedLabel()

  return (
    <div className="relative mx-auto max-w-5xl px-5 pb-16 pt-28 text-center">
      {/* Paint the name in with the cursor. */}
      <DottedWordmark className="mx-auto max-w-3xl pb-6" />

      <h2 className="arcade-heading section mt-10 text-2xl sm:text-3xl">GET IN TOUCH</h2>
      <p className="mx-auto mt-3 max-w-xl text-sm leading-relaxed text-slate-400">
        A missing tool, a wrong price, a recommendation that made no sense, or an
        idea for what {BRAND} should do next — all of it is worth sending.
        Corrections are how the catalogue stays honest.
      </p>

      <a
        href={`mailto:${CONTACT_EMAIL}`}
        onClick={() => track(EVENTS.CTA_CLICK, { cta: 'contact_email', location: 'contact' })}
        className="nb-btn mt-7 inline-block px-7 py-3.5 text-base"
      >
        ✉ {CONTACT_EMAIL}
      </a>

      {SOCIALS.length > 0 && (
        <ul className="mt-8 flex flex-wrap items-center justify-center gap-3">
          {SOCIALS.map((s) => (
            <li key={s.id}>
              <a
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                aria-label={s.label}
                title={s.label}
                onClick={() => track(EVENTS.CTA_CLICK, { cta: 'social', network: s.id })}
                className="flex h-11 w-11 items-center justify-center rounded-full border-[3px] border-black transition-transform hover:scale-110"
                style={{ background: '#15151c', color: 'var(--lime)', boxShadow: '3px 3px 0 #000' }}
              >
                <svg width="19" height="19" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                  <path d={ICONS[s.id] || ICONS.github} />
                </svg>
              </a>
            </li>
          ))}
        </ul>
      )}

      {/* What someone actually wants to know before writing in. */}
      <dl className="mx-auto mt-12 grid max-w-3xl gap-3 text-left sm:grid-cols-3">
        {[
          ['Catalogue', `${count.toLocaleString()} tools${updated ? ` · updated ${updated}` : ''}`],
          ['Cost', 'Free public beta — no card, no payment taken'],
          ['Your data', 'Stays in your browser; nothing sold, ever'],
        ].map(([k, v]) => (
          <div
            key={k}
            className="rounded-xl border-[3px] border-black p-4"
            style={{ background: '#15151f', boxShadow: '4px 4px 0 #000' }}
          >
            <dt className="font-display text-[10px] font-black uppercase tracking-[0.16em]" style={{ color: 'var(--lime)' }}>
              {k}
            </dt>
            <dd className="mt-1.5 text-sm leading-relaxed text-slate-300">{v}</dd>
          </div>
        ))}
      </dl>

      <nav className="mt-10 flex flex-wrap justify-center gap-x-7 gap-y-2 text-sm font-semibold text-slate-300">
        <Link to="/methodology" className="transition-colors hover:text-white">How we choose</Link>
        <Link to="/example" className="transition-colors hover:text-white">Example stack</Link>
        <Link to="/pricing" className="transition-colors hover:text-white">Pricing</Link>
        <Link to="/about" className="transition-colors hover:text-white">About</Link>
        <Link to="/privacy" className="transition-colors hover:text-white">Privacy</Link>
        <Link to="/terms" className="transition-colors hover:text-white">Terms</Link>
      </nav>
    </div>
  )
}
