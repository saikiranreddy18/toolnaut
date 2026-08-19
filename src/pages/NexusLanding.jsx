import { Component, lazy, Suspense, useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, MotionConfig, motion, useMotionValueEvent, useScroll, useSpring, useTransform } from 'framer-motion'
import { Link } from 'react-router-dom'
import { CONSTELLATION, HOW_IT_WORKS, NAV_LINKS, PRICING, RADAR_ITEMS, ROLES } from '../components/nexus/starchartData'
import GalaxyExplorer from '../components/ui/GalaxyExplorer'
import { useAnalytics } from '../hooks/useAnalytics'
import { useSpaceAudio } from '../hooks/useSpaceAudio'
import { EVENTS } from '../utils/analyticsEvents'
import { galaxyState } from '../state/galaxyStore'
import { webglAvailable } from '../utils/webgl'

const Scene = lazy(() => import('../components/3d/Scene'))

const EASE = [0.16, 1, 0.3, 1]

/* ---------- shared atoms ---------- */
function CtaPill({ href = '#cta', to, children, big = false }) {
  const cls = `press inline-flex cursor-pointer items-center justify-center rounded-full bg-gradient-to-r from-[#84cc16] to-[#06b6d4] font-semibold text-[#0a0a0f] shadow-[0_0_28px_rgba(132,204,22,0.35)] transition-shadow duration-300 hover:shadow-[0_0_46px_rgba(132,204,22,0.6)] ${big ? 'px-7 py-3 text-sm md:text-[15px]' : 'px-4 py-1.5 text-xs md:text-[13px]'}`
  return to ? <Link to={to} className={cls}>{children}</Link> : <a href={href} className={cls}>{children}</a>
}

function Eyebrow({ children }) {
  return <p className="mb-3 font-mono text-[10px] tracking-[0.32em] text-white/40 md:text-[11px]">{children}</p>
}

function Bullet({ color, children }) {
  return (
    <li className="flex items-start gap-3">
      <span className="mt-[7px] h-[3px] w-5 shrink-0 rounded-full" style={{ background: color, boxShadow: `0 0 10px ${color}66` }} />
      <span className="text-[15px] leading-relaxed text-white/60">{children}</span>
    </li>
  )
}

const rise = {
  initial: { opacity: 0, y: 28 },
  whileInView: { opacity: 1, y: 0 },
  viewport: { once: true, margin: '-80px' },
  transition: { duration: 0.7, ease: EASE },
}

/* ---------- glass Apple nav ---------- */
function Nav() {
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const on = () => setScrolled(window.scrollY > 40)
    on()
    window.addEventListener('scroll', on, { passive: true })
    return () => window.removeEventListener('scroll', on)
  }, [])
  return (
    <header className="fixed inset-x-0 top-0 z-50">
      <div className={`border-b transition-all duration-500 ${scrolled ? 'border-white/[0.06] bg-[rgba(10,10,15,0.75)] backdrop-blur-xl' : 'border-transparent bg-transparent'}`}>
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-5">
          <a href="#top" className="font-display text-[15px] font-bold tracking-[0.15em] text-white/90">
            Tool<span className="text-[#a3e635]">naut</span>
          </a>
          <nav className="hidden items-center gap-7 text-[13px] text-white/50 md:flex">
            {NAV_LINKS.map((l) => (
              <a key={l.href} href={l.href} className="transition-colors duration-200 hover:text-white/90">{l.label}</a>
            ))}
          </nav>
          <CtaPill to="/quiz">Chart your stack</CtaPill>
        </div>
      </div>
    </header>
  )
}

/* ---------- scroll-linked story beat overlay ---------- */
function Beat({ sp, io, out = [0, 1, 1, 0], align = 'center', fromX = 0, fromY, interactive = false, children }) {
  const opacity = useTransform(sp, io, out)
  const x = useTransform(sp, [io[0], io[1]], [fromX, 0])
  const y = useTransform(sp, [io[0], io[1]], [fromY ?? (fromX === 0 ? 26 : 0), 0])
  const pointerEvents = useTransform(sp, (v) => (interactive && v >= io[1] - 0.03 && v <= io[3] + 0.02 ? 'auto' : 'none'))
  const alignCls =
    align === 'left' ? 'items-center justify-start pl-6 md:pl-16 lg:pl-28'
      : align === 'right' ? 'items-center justify-end pr-6 md:pr-16 lg:pr-28'
        : 'items-center justify-center text-center'
  return (
    <motion.div style={{ opacity, x, y, pointerEvents }} className={`absolute inset-0 flex ${alignCls}`}>
      {children}
    </motion.div>
  )
}

/* ---------- THE RESOLVE: 704 → 8 named constellation ---------- */
function ResolveStar({ rp, i, star, cx, cy }) {
  // each pick ignites staggered by rank
  const d = i * 0.05
  const o = useTransform(rp, [0.12 + d, 0.4 + d], [0, 1])
  const s = useTransform(rp, [0.12 + d, 0.5 + d], [0.3, 1])
  return (
    <motion.g style={{ opacity: o }}>
      <motion.circle cx={cx} cy={cy} r={9 * star.mag} fill={star.color} style={{ scale: s, transformOrigin: `${cx}px ${cy}px` }} opacity={0.28} />
      <motion.circle cx={cx} cy={cy} r={3.4 * star.mag} fill="#fff" style={{ scale: s, transformOrigin: `${cx}px ${cy}px` }} />
      <text x={cx} y={cy - 16} textAnchor="middle" fill={star.color} style={{ font: "600 13px 'Space Grotesk', sans-serif", letterSpacing: '0.02em', filter: `drop-shadow(0 0 8px ${star.color}66)` }}>
        {star.name}
      </text>
    </motion.g>
  )
}

function ResolveEdge({ rp, from, to, i }) {
  const len = Math.hypot(to.x - from.x, to.y - from.y)
  const d = 0.28 + i * 0.045
  const off = useTransform(rp, [d, d + 0.14], [len, 0])
  const o = useTransform(rp, [d, d + 0.05], [0, 0.55])
  return (
    <motion.line
      x1={from.x} y1={from.y} x2={to.x} y2={to.y}
      stroke="url(#starline)" strokeWidth="1.4" strokeLinecap="round"
      strokeDasharray={len} style={{ strokeDashoffset: off, opacity: o }}
    />
  )
}

function Resolve({ sp }) {
  // map the track window [0.50,0.66] → resolveProgress 0..1
  const rp = useTransform(sp, [0.5, 0.66], [0, 1], { clamp: true })
  const scrim = useTransform(rp, [0, 0.5], [0, 0.62])
  const scan = useTransform(rp, [0.05, 0.45], [0, 1])
  const scanR = useTransform(scan, (v) => 40 + v * 900)
  const scanO = useTransform(rp, [0.05, 0.2, 0.5], [0, 0.5, 0])
  const chartO = useTransform(rp, [0.05, 0.2], [0, 1])
  const arche = useTransform(rp, (v) => CONSTELLATION.archetype.slice(0, Math.max(0, Math.round((v - 0.55) / 0.35 * CONSTELLATION.archetype.length))))
  const [arch, setArch] = useState('')
  useMotionValueEvent(arche, 'change', setArch)

  return (
    <>
      {/* noise scrim — dims the survey so the chart pops */}
      <motion.div className="pointer-events-none absolute inset-0" style={{ opacity: scrim, background: 'radial-gradient(120% 100% at 50% 42%, rgba(10,10,15,0.35) 30%, rgba(10,10,15,0.92) 100%)' }} aria-hidden="true" />
      <motion.svg viewBox="0 0 1000 600" preserveAspectRatio="xMidYMid meet" className="pointer-events-none absolute inset-0 mx-auto h-full w-full max-w-5xl" style={{ opacity: chartO }} aria-hidden="true">
        <defs>
          <linearGradient id="starline" x1="0" y1="0" x2="1" y2="1">
            <stop offset="0" stopColor="#84cc16" /><stop offset="0.5" stopColor="#06b6d4" /><stop offset="1" stopColor="#ec4899" />
          </linearGradient>
        </defs>
        {/* survey scan-line */}
        <motion.circle cx="500" cy="230" r={scanR} fill="none" stroke="#a3e635" strokeWidth="1" style={{ opacity: scanO }} />
        {CONSTELLATION.edges.map(([a, b], i) => (
          <ResolveEdge key={i} rp={rp} i={i} from={CONSTELLATION.stars[a]} to={CONSTELLATION.stars[b]} />
        ))}
        {CONSTELLATION.stars.map((s, i) => (
          <ResolveStar key={s.name} rp={rp} i={i} star={s} cx={s.x} cy={s.y} />
        ))}
      </motion.svg>
      {/* archetype typing in */}
      <motion.div className="pointer-events-none absolute inset-x-0 bottom-[34%] text-center" style={{ opacity: chartO }} aria-hidden="true">
        <span className="font-mono text-[12px] tracking-[0.4em] text-[#a3e635]">{arch}<span className="animate-pulse">▍</span></span>
      </motion.div>
    </>
  )
}

/* ---------- HUD odometer 704 → 8 ---------- */
function HudCounter({ sp }) {
  const rp = useTransform(sp, [0.5, 0.64], [704, 8], { clamp: true })
  const vis = useTransform(sp, [0.46, 0.52, 0.86, 0.9], [0, 1, 1, 0])
  const [n, setN] = useState(704)
  useMotionValueEvent(rp, 'change', (v) => setN(Math.round(v)))
  return (
    <motion.div style={{ opacity: vis }} className="pointer-events-none absolute left-5 top-20 md:left-10 md:top-24">
      <div className="rounded-lg border border-white/10 bg-[#0c0c14]/70 px-3 py-2 backdrop-blur">
        <div className="font-mono text-[9px] tracking-[0.28em] text-white/35">OBJECTS CHARTED</div>
        <div className="font-display text-3xl font-bold tabular-nums text-white/90 md:text-4xl">{n}</div>
      </div>
    </motion.div>
  )
}

/* ---------- the sticky sky-survey scrollytelling track ---------- */
function SkySurvey() {
  const trackRef = useRef(null)
  const { scrollYProgress } = useScroll({ target: trackRef, offset: ['start start', 'end end'] })
  const sp = useSpring(scrollYProgress, { stiffness: 120, damping: 30, restDelta: 0.001 })

  return (
    <section id="galaxy-track" ref={trackRef} className="relative h-[480vh]" aria-label="Toolnaut sky survey">
      <div className="sticky top-0 h-screen overflow-hidden">
        {/* center RA/Dec reticle — the one instrument tell */}
        <svg className="pointer-events-none absolute left-1/2 top-[42%] h-40 w-40 -translate-x-1/2 -translate-y-1/2 text-white/20" viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">
          <circle cx="50" cy="50" r="30" strokeWidth="0.6" />
          <circle cx="50" cy="50" r="44" strokeWidth="0.4" strokeDasharray="2 4" />
          <path d="M50 6v14M50 80v14M6 50h14M80 50h14" strokeWidth="0.6" />
        </svg>

        <HudCounter sp={sp} />
        <Resolve sp={sp} />

        {/* cinematic vignette — pixel-identical base color */}
        <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(120% 95% at 50% 50%, transparent 55%, rgba(10,10,15,0.55) 100%)' }} aria-hidden="true" />

        {/* Beat 1 — hero */}
        <Beat sp={scrollYProgress} io={[0, 0.02, 0.11, 0.15]} out={[1, 1, 1, 0]} fromY={0}>
          <div className="px-6">
            <Eyebrow>THE AI SKY SURVEY</Eyebrow>
            <h1 className="fos-heading font-display text-6xl font-bold tracking-tight md:text-8xl">704 stars.<br />No map.</h1>
            <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-white/55 md:text-base">
              New AI tools ignite every day — faster than any one person can track. Toolnaut is the chart that keeps up, drawn to your role.
            </p>
            <div className="mt-14 flex flex-col items-center gap-2 text-white/30">
              <span className="font-mono text-[10px] tracking-[0.35em]">SCROLL</span>
              <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.6" className="h-4 w-4 animate-bounce" aria-hidden="true"><path d="m6 9 6 6 6-6" /></svg>
            </div>
          </div>
        </Beat>

        {/* Beat 2 — the noise */}
        <Beat sp={scrollYProgress} io={[0.15, 0.2, 0.29, 0.33]} align="left" fromX={-44}>
          <div className="max-w-md pr-6">
            <Eyebrow><span className="text-[#f59e0b]">SIGNAL · NOISE</span></Eyebrow>
            <h2 className="fos-heading font-display text-4xl font-bold tracking-tight md:text-5xl">Every day, the sky gets louder.</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/60">
              Hundreds of launches a month. Real signal, buried in noise. This is exactly why keeping up feels impossible — and why a raw list never will.
            </p>
          </div>
        </Beat>

        {/* Beat 3 — start with you */}
        <Beat sp={scrollYProgress} io={[0.33, 0.39, 0.46, 0.5]} fromY={26}>
          <div className="px-6">
            <Eyebrow><span className="text-[#06b6d4]">FIND YOUR COORDINATES</span></Eyebrow>
            <h2 className="fos-heading font-display text-4xl font-bold tracking-tight md:text-6xl">So we start with you.</h2>
            <p className="mx-auto mt-5 max-w-lg text-[15px] leading-relaxed text-white/55">
              Sixty seconds, one question set. Your role becomes the map’s origin point — the coordinate everything else is measured from.
            </p>
            <div className="mt-7 flex flex-wrap items-center justify-center gap-2">
              {ROLES.map((r) => (
                <span key={r.name} className="rounded-full border px-3.5 py-1.5 font-mono text-[11px] tracking-wide text-white/60" style={{ borderColor: `${r.color}44`, background: `${r.color}0d` }}>
                  {r.name}
                </span>
              ))}
            </div>
          </div>
        </Beat>

        {/* Beat 4 — THE RESOLVE (copy gated to after the scan) */}
        <Beat sp={scrollYProgress} io={[0.58, 0.63, 0.66, 0.69]} align="center" fromY={30}>
          <div className="mt-auto mb-[9vh] px-6">
            <Eyebrow><span className="text-[#a3e635]">YOUR STACK, CHARTED</span></Eyebrow>
            <h2 className="fos-heading font-display text-4xl font-bold tracking-tight md:text-6xl">Chaos, charted.</h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/55">
              The noise recedes. Only the tools that earn a place in your stack stay lit — brightened, connected, named. A constellation, not a feed.
            </p>
          </div>
        </Beat>

        {/* Beat 5 — course to mastery */}
        <Beat sp={scrollYProgress} io={[0.69, 0.74, 0.81, 0.85]} align="left" fromX={-44}>
          <div className="max-w-md pr-6">
            <Eyebrow><span className="text-[#84cc16]">DAY-ZERO PATHS</span></Eyebrow>
            <h2 className="fos-heading font-display text-4xl font-bold tracking-tight md:text-5xl">A course plotted to mastery.</h2>
            <p className="mt-5 text-[15px] leading-relaxed text-white/60">
              Not just what to use — the order to learn it. Day-zero tutorials, waypointed from your first tool to the frontier of your field.
            </p>
          </div>
        </Beat>

        {/* Beat 6 — daily redraw + CTA */}
        <Beat sp={scrollYProgress} io={[0.86, 0.92, 0.999, 1]} out={[0, 1, 1, 1]} interactive fromY={26}>
          <div className="w-full px-6">
            <Eyebrow><span className="text-[#a3e635]">RADAR</span></Eyebrow>
            <h2 className="fos-heading font-display text-4xl font-bold tracking-tight md:text-6xl">The map redraws itself. Daily.</h2>
            <p className="mx-auto mt-4 max-w-lg text-[15px] leading-relaxed text-white/55">
              Radar scans the frontier every day and charts new tools onto your stack — so the map is never out of date, and you never fall behind.
            </p>
            <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
              <CtaPill to="/quiz" big>Chart your stack — 60 seconds</CtaPill>
              <a href="#how-it-works" className="cursor-pointer text-sm text-white/50 transition-colors hover:text-white/90">See how it works</a>
            </div>
          </div>
        </Beat>
      </div>
    </section>
  )
}

/* ---------- reduced-motion / no-webgl hero ---------- */
function StaticHero() {
  return (
    <section className="relative flex min-h-screen items-center justify-center overflow-hidden text-center">
      <div className="pointer-events-none absolute inset-0" style={{ background: 'radial-gradient(60% 45% at 50% 40%, rgba(132,204,22,0.09), transparent 70%), radial-gradient(50% 40% at 70% 70%, rgba(6,182,212,0.06), transparent 70%)' }} aria-hidden="true" />
      <div className="relative px-6">
        <Eyebrow>THE AI SKY SURVEY</Eyebrow>
        <h1 className="fos-heading font-display text-6xl font-bold tracking-tight md:text-8xl">704 stars. One map.</h1>
        <p className="mx-auto mt-6 max-w-md text-[15px] leading-relaxed text-white/55">
          Toolnaut charts the exploding universe of AI tools to your role — a named, connected stack instead of an endless feed.
        </p>
        <div className="mt-9 flex flex-wrap items-center justify-center gap-5">
          <CtaPill to="/quiz" big>Chart your stack</CtaPill>
          <a href="#how-it-works" className="cursor-pointer text-sm text-white/50 transition-colors hover:text-white/90">See how it works</a>
        </div>
      </div>
    </section>
  )
}

/* ---------- below-the-fold ---------- */
function SectionHead({ eyebrow, title, sub }) {
  return (
    <motion.div {...rise} className="mx-auto max-w-2xl text-center">
      <Eyebrow>{eyebrow}</Eyebrow>
      <h2 className="fos-heading font-display text-3xl font-bold tracking-tight md:text-5xl">{title}</h2>
      {sub && <p className="mt-4 text-[15px] leading-relaxed text-white/55">{sub}</p>}
    </motion.div>
  )
}

function HowItWorks() {
  return (
    <section id="how-it-works" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-5 py-24 md:py-32">
      <SectionHead eyebrow="HOW IT WORKS" title="One survey. Three moves." />
      <div className="mt-14 grid gap-6 md:grid-cols-3">
        {HOW_IT_WORKS.map((s, i) => (
          <motion.div key={s.step} {...rise} transition={{ ...rise.transition, delay: i * 0.08 }} className="rounded-2xl border border-white/[0.07] bg-[#12121c]/60 p-7 backdrop-blur-sm">
            <div className="font-mono text-sm text-[#a3e635]/70">{s.step}</div>
            <h3 className="mt-3 font-display text-lg font-semibold text-white/90">{s.title}</h3>
            <p className="mt-2 text-sm leading-relaxed text-white/55">{s.text}</p>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function Roles() {
  return (
    <section id="roles" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-5 py-24 md:py-32">
      <SectionHead eyebrow="COORDINATES" title="Every role gets a different sky." sub="Your map is drawn from your role — so a designer and an engineer never see the same stars." />
      <div className="mt-14 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r, i) => (
          <motion.div key={r.name} {...rise} transition={{ ...rise.transition, delay: (i % 3) * 0.07 }}
            className="group rounded-2xl border border-white/[0.07] bg-[#12121c]/60 p-6 backdrop-blur-sm transition-colors duration-300"
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = `${r.color}55` }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = '' }}>
            <div className="flex items-center justify-between">
              <h3 className="font-display text-lg font-semibold text-white/90">{r.name}</h3>
              <span className="font-mono text-[10px] tracking-widest" style={{ color: r.color }}>{r.pts.length} STARS</span>
            </div>
            <svg viewBox="0 0 100 80" className="mt-4 h-24 w-full" aria-hidden="true">
              {r.pts.map((p, j) => j > 0 && (
                <line key={j} x1={r.pts[j - 1][0]} y1={r.pts[j - 1][1]} x2={p[0]} y2={p[1]} stroke={r.color} strokeWidth="0.6" opacity="0.35" />
              ))}
              {r.pts.map((p, j) => (
                <circle key={j} cx={p[0]} cy={p[1]} r="2.2" fill={r.color} style={{ filter: `drop-shadow(0 0 4px ${r.color})` }} />
              ))}
            </svg>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function RadarPreview() {
  return (
    <section id="radar" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-5 py-24 md:py-32">
      <div className="grid items-center gap-12 md:grid-cols-2">
        <motion.div {...rise}>
          <Eyebrow>RADAR</Eyebrow>
          <h2 className="fos-heading font-display text-3xl font-bold tracking-tight md:text-5xl">The frontier, scanned daily.</h2>
          <p className="mt-5 max-w-md text-[15px] leading-relaxed text-white/55">
            Toolnaut watches GitHub, Product Hunt, Hacker News and more every day — and charts the tools that matter onto your stack, with a one-line reason each made the cut.
          </p>
          <ul className="mt-7 space-y-3">
            {RADAR_ITEMS.map((it) => (
              <li key={it.name} className="flex items-center gap-3 rounded-xl border border-white/[0.06] bg-[#12121c]/50 px-4 py-3">
                <span className="h-2 w-2 shrink-0 rounded-full" style={{ background: it.color, boxShadow: `0 0 10px ${it.color}` }} />
                <span className="font-display text-sm font-semibold text-white/85">{it.name}</span>
                <span className="min-w-0 flex-1 truncate text-[13px] text-white/45">{it.why}</span>
                <span className="shrink-0 font-mono text-[10px] tracking-widest text-white/30">{it.ago}</span>
              </li>
            ))}
          </ul>
        </motion.div>
        <motion.div {...rise} transition={{ ...rise.transition, delay: 0.1 }} className="mx-auto flex w-full max-w-sm items-center justify-center">
          <div className="relative aspect-square w-full max-w-[320px]">
            {[1, 0.66, 0.33].map((s) => (
              <div key={s} className="absolute rounded-full border border-[#06b6d4]/20" style={{ inset: `${(1 - s) * 50}%` }} />
            ))}
            <div className="absolute left-1/2 top-1/2 h-1/2 w-px origin-bottom -translate-x-1/2 animate-[spin_5s_linear_infinite]" style={{ background: 'linear-gradient(to top, rgba(132,204,22,0.6), transparent)' }} />
            {RADAR_ITEMS.map((it, i) => {
              const a = (i / RADAR_ITEMS.length) * Math.PI * 2 + 0.5
              const rr = 22 + i * 7
              return <span key={it.name} className="absolute h-2 w-2 rounded-full" style={{ background: it.color, left: `calc(50% + ${Math.cos(a) * rr}%)`, top: `calc(50% + ${Math.sin(a) * rr}%)`, boxShadow: `0 0 8px ${it.color}` }} />
            })}
            <span className="absolute left-1/2 top-1/2 h-2.5 w-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-[#a3e635]" style={{ boxShadow: '0 0 16px #a3e635' }} />
          </div>
        </motion.div>
      </div>
    </section>
  )
}

function Pricing() {
  return (
    <section id="pricing" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-5 py-24 md:py-32">
      <SectionHead eyebrow="PRICING" title="Cheaper than falling behind." />
      <div className="mx-auto mt-14 grid max-w-3xl items-stretch gap-6 md:grid-cols-2">
        {PRICING.map((p, i) => (
          <motion.div key={p.name} {...rise} transition={{ ...rise.transition, delay: i * 0.08 }}
            className={p.featured ? 'rounded-2xl bg-gradient-to-b from-[#84cc16]/60 via-[#84cc16]/20 to-[#06b6d4]/30 p-px shadow-[0_0_50px_rgba(132,204,22,0.12)]' : 'rounded-2xl border border-white/[0.07]'}>
            <div className={`flex h-full flex-col rounded-[15px] p-7 ${p.featured ? 'bg-[#0d0d16]' : 'bg-[#12121c]/60'}`}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-semibold text-white/90">{p.name}</h3>
                {p.featured && <span className="rounded-full border border-[#84cc16]/40 bg-[#84cc16]/10 px-2.5 py-0.5 font-mono text-[9px] tracking-[0.2em] text-[#a3e635]">EARLY ACCESS</span>}
              </div>
              <div className="mt-4 font-display text-4xl font-bold text-white/90">{p.price}<span className="ml-1 align-super text-sm text-white/40">{p.featured ? '/mo' : ''}</span></div>
              <p className="mt-1 text-xs text-white/40">{p.note}</p>
              <ul className="mt-6 flex-1 space-y-2.5">
                {p.features.map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-sm text-white/60">
                    <svg viewBox="0 0 24 24" fill="none" stroke="#a3e635" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="mt-0.5 h-3.5 w-3.5 shrink-0" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
                    {f}
                  </li>
                ))}
              </ul>
              <div className="mt-7">
                {p.featured ? <CtaPill to="/quiz" big>{p.cta}</CtaPill> : (
                  <Link to="/quiz" className="press inline-flex cursor-pointer items-center rounded-full border border-white/15 px-6 py-2.5 text-sm text-white/70 transition-colors hover:border-white/30 hover:text-white">{p.cta}</Link>
                )}
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  )
}

function Waitlist() {
  const [email, setEmail] = useState('')
  const [done, setDone] = useState(false)
  return (
    <section id="cta" className="relative z-10 mx-auto max-w-6xl scroll-mt-20 px-5 py-24 md:py-36">
      <motion.div {...rise} className="mx-auto max-w-xl text-center">
        <Eyebrow>GET EARLY ACCESS</Eyebrow>
        <h2 className="fos-heading font-display text-3xl font-bold tracking-tight md:text-5xl">Chart your stack in 60 seconds.</h2>
        <p className="mt-4 text-[15px] leading-relaxed text-white/55">Join the early-access list — your first chart is on us.</p>
        {done ? (
          <div className="mx-auto mt-8 flex max-w-md items-center justify-center gap-3 rounded-full border border-[#84cc16]/30 bg-[#84cc16]/10 px-6 py-3.5 text-sm text-[#d9f99d]" role="status">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden="true"><path d="m5 13 4 4L19 7" /></svg>
            You&rsquo;re on the list — we&rsquo;ll send your invite soon.
          </div>
        ) : (
          <form className="mx-auto mt-8 flex max-w-md flex-col gap-3 sm:flex-row" onSubmit={(e) => { e.preventDefault(); if (email.includes('@')) setDone(true) }}>
            <label htmlFor="nx-email" className="sr-only">Email address</label>
            <input id="nx-email" type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} placeholder="you@startup.com"
              className="min-h-[46px] flex-1 rounded-full border border-white/10 bg-white/[0.05] px-5 text-sm text-white/85 placeholder:text-white/30 focus:border-[#84cc16]/50 focus:outline-none focus:ring-2 focus:ring-[#84cc16]/25" />
            <button type="submit" className="press min-h-[46px] cursor-pointer rounded-full bg-gradient-to-r from-[#84cc16] to-[#06b6d4] px-7 text-sm font-semibold text-[#0a0a0f] shadow-[0_0_28px_rgba(132,204,22,0.35)] transition-shadow hover:shadow-[0_0_46px_rgba(132,204,22,0.6)]">Get early access</button>
          </form>
        )}
        <p className="mt-5 font-mono text-[11px] text-white/30">No credit card. Results before signup.</p>
      </motion.div>
    </section>
  )
}

function Footer() {
  return (
    <footer className="relative z-10 border-t border-white/[0.05] bg-[#0a0a0f]">
      <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-4 px-5 py-10 text-xs text-white/35 md:flex-row">
        <span className="font-display text-sm font-bold tracking-[0.15em] text-white/70">Tool<span className="text-[#a3e635]">naut</span></span>
        <nav className="flex gap-6">{NAV_LINKS.map((l) => <a key={l.href} href={l.href} className="transition-colors hover:text-white/70">{l.label}</a>)}</nav>
        <span>© 2026 Toolnaut — the AI universe, mapped to you.</span>
      </div>
    </footer>
  )
}

/* ---------- galaxy scene controls: sound + full exploration mode ---------- */
function SceneControls({ explore, onToggleExplore, audioOn, onToggleSound }) {
  return (
    <div className="fixed bottom-6 left-6 z-[76] flex items-center gap-2">
      <button
        onClick={onToggleSound}
        aria-pressed={audioOn}
        aria-label={audioOn ? 'Mute galaxy sound' : 'Play galaxy sound'}
        className="press flex h-11 w-11 items-center justify-center rounded-full border border-white/15 bg-[rgba(10,10,15,0.75)] text-white/70 backdrop-blur-xl transition-colors duration-200 hover:border-white/30 hover:text-white"
      >
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <path d="M11 5 6 9H3v6h3l5 4z" fill="currentColor" stroke="none" />
          {audioOn ? (
            <>
              <path d="M15.5 8.5a5 5 0 0 1 0 7" />
              <path d="M18.5 6a9 9 0 0 1 0 12" />
            </>
          ) : (
            <path d="M16 9l5 6M21 9l-5 6" />
          )}
        </svg>
      </button>
      <button
        onClick={onToggleExplore}
        className="press inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-[rgba(10,10,15,0.75)] px-5 py-2.5 font-mono text-[11px] tracking-[0.2em] text-white/80 backdrop-blur-xl transition-colors duration-200 hover:border-[#a3e635]/50 hover:text-white"
      >
        {!explore && <span className="text-[#a3e635]">+</span>}
        {explore ? 'EXIT EXPLORATION' : 'EXPLORE THE GALAXY'}
      </button>
    </div>
  )
}

/* ---------- error boundary keeps the galaxy from crashing the page ---------- */
class Boundary extends Component {
  constructor(p) { super(p); this.state = { err: false } }
  static getDerivedStateFromError() { return { err: true } }
  render() { return this.state.err ? this.props.fallback : this.props.children }
}

/* ---------- page ---------- */
export default function NexusLanding() {
  const [booted, setBooted] = useState(false)
  const [explore, setExplore] = useState(false)
  const reduced = useMemo(() => window.matchMedia('(prefers-reduced-motion: reduce)').matches, [])
  const hasWebGL = useMemo(webglAvailable, [])
  const mode = useMemo(() => (reduced ? 'calm' : window.innerWidth < 768 ? 'mobile' : 'full'), [reduced])
  const track = useAnalytics()
  const audio = useSpaceAudio()

  useEffect(() => {
    const prev = document.title
    document.title = 'Toolnaut — 704 AI tools, charted to your role'
    const t = setTimeout(() => setBooted(true), reduced ? 200 : 900)
    return () => { document.title = prev; clearTimeout(t) }
  }, [reduced])

  useEffect(() => {
    galaxyState.explore = explore
    document.body.style.overflow = explore ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [explore])

  function toggleExplore() {
    if (!explore) track(EVENTS.GALAXY_EXPLORE, {})
    setExplore((e) => !e)
  }

  function toggleSound() {
    track(EVENTS.SOUND_TOGGLE, { on: !audio.on })
    audio.toggle()
  }

  return (
    <MotionConfig reducedMotion="user">
      <div id="top" className="relative min-h-screen bg-[#0a0a0f] text-white">
        {hasWebGL && !reduced ? (
          <Boundary fallback={null}>
            <Suspense fallback={null}><Scene mode={mode} descend /></Suspense>
          </Boundary>
        ) : null}

        {/* boot: telescope calibration → galaxy fades up */}
        {!booted && !reduced && (
          <motion.div className="fixed inset-0 z-[90] flex items-center justify-center bg-black" initial={{ opacity: 1 }} animate={{ opacity: 0 }} transition={{ delay: 0.75, duration: 0.7, ease: EASE }} style={{ pointerEvents: 'none' }}>
            <div className="text-center">
              <svg className="mx-auto h-16 w-16 text-white/40" viewBox="0 0 100 100" fill="none" stroke="currentColor" aria-hidden="true">
                <circle cx="50" cy="50" r="26" strokeWidth="0.8" /><path d="M50 8v18M50 74v18M8 50h18M74 50h18" strokeWidth="0.8" />
              </svg>
              <p className="mt-5 font-mono text-[10px] tracking-[0.4em] text-white/40">CALIBRATING SKY SURVEY · 704 OBJECTS</p>
            </div>
          </motion.div>
        )}

        <div className={`transition-opacity duration-500 ${explore ? 'pointer-events-none opacity-0' : ''}`}>
          <Nav />
          {reduced || !hasWebGL ? <StaticHero /> : <SkySurvey />}
          <HowItWorks />
          <Roles />
          <RadarPreview />
          <Pricing />
          <Waitlist />
          <Footer />
        </div>

        {/* singleton hover popup for AI-tool stars, positioned from the frame loop */}
        <div
          id="tool-tooltip"
          aria-hidden="true"
          className="pointer-events-none fixed z-[85] -translate-x-1/2 -translate-y-full whitespace-nowrap rounded-full border border-white/15 bg-[rgba(10,10,15,0.9)] px-4 py-1.5 font-mono text-[11px] font-medium tracking-wide text-white/90 backdrop-blur-xl"
          style={{ opacity: 0, transition: 'opacity 0.15s ease' }}
        />

        {hasWebGL && !reduced && (
          <SceneControls explore={explore} onToggleExplore={toggleExplore} audioOn={audio.on} onToggleSound={toggleSound} />
        )}

        <AnimatePresence>
          {explore && <GalaxyExplorer onClose={() => setExplore(false)} />}
        </AnimatePresence>
      </div>
    </MotionConfig>
  )
}
