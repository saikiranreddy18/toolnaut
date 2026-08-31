import React, { useEffect, useState } from 'react'
import { motion } from 'framer-motion'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { generatePersona } from '../utils/personaGenerator'
import { recommendationConfidence } from '../utils/confidence'
import { read as readScoped, write as writeScoped } from '../state/scopedStorage'
import { loadQuiz, resetQuiz } from '../state/quizStore'
import { haptic } from '../utils/haptics'

// Persona reveal — the emotional peak of the funnel. Arcade neubrutalism:
// chunky italic display, sticker cards on tilt, black-bordered CTA, pixel
// confetti. Guests see full value here BEFORE any signup ask.
export default function QuizResult() {
  const navigate = useNavigate()
  const quiz = loadQuiz()

  // Pixel confetti burst — square particles in arcade palette. Declared before
  // the completed-quiz redirect below so hook order stays stable.
  useEffect(() => {
    const colors = ['var(--lime)', 'var(--hot-pink)', 'var(--cyan)', '#ffde2e', '#a78bfa']
    const timers = []
    const nodes = []
    for (let i = 0; i < 40; i++) {
      timers.push(setTimeout(() => {
        const conf = document.createElement('div')
        conf.className = 'pixel-confetti'
        conf.style.cssText = `
          --tx: ${(Math.random() - 0.5) * 280}px;
          --ty: ${(Math.random() - 0.5) * 280 - 120}px;
          left: 50%;
          top: 30%;
          background: ${colors[Math.floor(Math.random() * colors.length)]};
          transform: rotate(${Math.random() * 360}deg);
        `
        document.body.appendChild(conf)
        nodes.push(conf)
        timers.push(setTimeout(() => conf.remove(), 1000))
      }, i * 25))
    }
    return () => {
      timers.forEach(clearTimeout)
      nodes.forEach((n) => n.remove())
    }
  }, [])

  if (!quiz.completed) {
    return <Navigate to="/quiz?step=1" replace />
  }

  const persona = generatePersona(quiz.answers)
  const confidence = recommendationConfidence(quiz.answers)
  // Deterministic: the same answers always print the same ticket. FNV-1a over
  // the serialised answers, base36 — a stable id with no randomness, no server.
  const ticketId = (() => {
    const str = JSON.stringify(quiz.answers)
    let h = 0x811c9dc5
    for (let i = 0; i < str.length; i++) {
      h ^= str.charCodeAt(i)
      h = Math.imul(h, 0x01000193)
    }
    return (h >>> 0).toString(36).toUpperCase().padStart(7, '0')
  })()
  const [fit, setFit] = useState(() => readScoped('exus_stack_feedback_v1', null))

  function retake() {
    resetQuiz()
    navigate('/quiz?step=1')
  }

  // Persona → arcade-style level nametag
  const experienceLevels = {
    beginner: 'COSMIC ROOKIE',
    dabbler: 'STAR CADET',
    regular: 'GALAXY EXPLORER',
    builder: 'STAR CAPTAIN',
    teacher: 'COSMIC LEGEND',
  }
  const level = experienceLevels[quiz.answers?.experience] || 'STAR CADET'

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden px-5">
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className="relative w-full max-w-4xl py-16 text-center"
      >
        {/* Tape label — "level unlocked" tilted diagonal */}
        <motion.div
          initial={{ opacity: 0, scale: 0.6, rotate: -20 }}
          animate={{ opacity: 1, scale: 1, rotate: -6 }}
          transition={{ delay: 0.2, type: 'spring', stiffness: 260, damping: 18 }}
          className="mb-6 flex justify-center"
        >
          <span className="tape-label text-xs">✦ level unlocked ✦</span>
        </motion.div>

        {/* THE TICKET — the user's reference render, rebuilt live: main body
            (tier badge, holographic persona name, tagline, three colour-framed
            tool cards) plus a perforated stub with passenger data and a
            barcode. Every field is REAL: the badge is the earned level, the
            passenger is the persona, and the ticket id is a deterministic
            hash of the answers — same answers, same ticket. */}
        <motion.div
          initial={{ opacity: 0, y: 40, rotate: 0 }}
          animate={{ opacity: 1, y: 0, rotate: -1.2 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 120, damping: 16 }}
          className="mx-auto mt-2 max-w-4xl overflow-hidden rounded-[26px] text-left"
          style={{
            background: 'linear-gradient(135deg, #121220 0%, #0d0d17 55%, #10101c 100%)',
            border: '1px solid rgba(255,255,255,0.10)',
            boxShadow: '0 30px 80px -20px rgba(0,0,0,0.85), inset 0 1px 0 rgba(255,255,255,0.06)',
          }}
        >
          <div className="grid md:grid-cols-[minmax(0,1fr)_230px]">
            <div className="px-6 py-8 text-center sm:px-10">
              <span
                className="inline-flex items-center gap-2 rounded-lg px-4 py-1.5 font-display text-xs font-black uppercase tracking-[0.2em] text-black"
                style={{
                  background: 'linear-gradient(180deg, #f6e27a, #d4af37 55%, #b8860b)',
                  border: '1px solid #8a6d1a',
                  boxShadow: '0 2px 10px rgba(212,175,55,0.45), inset 0 1px 0 rgba(255,255,255,0.5)',
                }}
              >
                ★ {level}
              </span>

              <h1 className="relative mt-5 font-display text-4xl font-black uppercase leading-[1.05] sm:text-5xl">
                {/* glow layer: same text, blurred, BEHIND the gradient — a
                    drop-shadow filter on background-clip text rasterises at
                    the element box and amputated the last glyphs. */}
                <span aria-hidden="true" className="absolute inset-0 select-none" style={{ color: 'rgba(163,255,216,0.45)', filter: 'blur(12px)' }}>
                  {persona.name.toUpperCase()}
                </span>
                <span
                  className="relative"
                  style={{
                    background: 'linear-gradient(100deg, #bfeee2 0%, #ffffff 40%, #a3ffd8 65%, #d8f7ff 100%)',
                    WebkitBackgroundClip: 'text',
                    backgroundClip: 'text',
                    color: 'transparent',
                  }}
                >
                  {persona.name.toUpperCase()}
                </span>
              </h1>

              {persona.career && (
                <p className="mt-3 font-display text-[11px] font-black uppercase tracking-[0.24em]" style={{ color: '#39d5c8' }}>
                  {persona.career} / {persona.category.name}
                </p>
              )}

              <p className="mt-4 font-display text-sm font-bold text-white sm:text-base">{persona.tagline}</p>
              <p className="mt-1.5 text-xs text-slate-400">
                We picked just {persona.stack.length} tools so you skip the endless search.
              </p>

              <div className="mt-6 flex justify-center">
                <span
                  className="rounded-full px-4 py-1 font-display text-[10px] font-black uppercase tracking-[0.18em] text-black"
                  style={{ background: 'var(--lime)', boxShadow: '0 0 16px rgba(163,255,46,0.45)' }}
                >
                  🎯 your starter kit
                </span>
              </div>

              <div className="mt-5 grid gap-4 sm:grid-cols-3">
                {persona.stack.map((t, i) => {
                  const frame = i === 0 ? 'var(--lime)' : i === 1 ? 'var(--hot-pink)' : 'var(--cyan)'
                  return (
                    <motion.div
                      key={t.name}
                      initial={{ opacity: 0, y: 26 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.7 + i * 0.14, type: 'spring', stiffness: 200, damping: 16 }}
                      className="rounded-2xl p-4 text-left"
                      style={{
                        border: `2px solid ${frame}`,
                        background: 'rgba(6,6,12,0.55)',
                        boxShadow: `0 0 18px -6px ${frame}, inset 0 0 22px rgba(0,0,0,0.5)`,
                      }}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <p className="font-display text-sm font-black uppercase leading-tight" style={{ color: frame }}>
                          {t.name}
                        </p>
                        <span className="font-display text-xs font-black" style={{ color: frame }}>#{i + 1}</span>
                      </div>
                      <p className="mt-2 text-xs leading-relaxed text-slate-300">{t.blurb}</p>
                    </motion.div>
                  )
                })}
              </div>
            </div>

            <div className="relative px-5 py-6 md:py-8" style={{ borderTop: '2px dashed rgba(255,255,255,0.16)' }}>
              <div className="absolute inset-y-3 left-0 hidden border-l-2 border-dashed border-white/15 md:block" aria-hidden="true" />
              <dl className="space-y-2 text-left">
                {[
                  ['Passenger', persona.name],
                  ['Flight', `COSMIC PATH ${ticketId.slice(0, 3)}`],
                  ['Origin', 'Ideation Station'],
                  ['Destination', 'Shipped Projects'],
                  ['Depart', 'Now'],
                  ['Seat', 'AI (Cosmic Class)'],
                  ['Ticket ID', `#${ticketId}`],
                ].map(([k, v]) => (
                  <div key={k}>
                    <dt className="font-display text-[8px] font-black uppercase tracking-[0.2em]" style={{ color: '#39d5c8' }}>{k}</dt>
                    <dd className="font-display text-[11px] font-black uppercase leading-tight text-white">{v}</dd>
                  </div>
                ))}
              </dl>
              <div
                className="mt-4 h-14 w-full rounded-sm"
                aria-hidden="true"
                style={{
                  background: 'repeating-linear-gradient(90deg, #e8ecf4 0 2px, transparent 2px 5px, #e8ecf4 5px 6px, transparent 6px 11px, #e8ecf4 11px 14px, transparent 14px 17px)',
                  opacity: 0.85,
                }}
              />
              <div
                className="mt-4 h-20 w-full rounded-lg"
                aria-hidden="true"
                style={{
                  background: 'radial-gradient(circle at 60% 45%, rgba(163,255,216,0.5), rgba(124,58,237,0.45) 35%, rgba(34,211,238,0.25) 60%, transparent 75%), radial-gradient(circle at 30% 70%, rgba(255,46,163,0.3), transparent 60%), #0a0a12',
                  border: '1px solid rgba(255,255,255,0.08)',
                }}
              />
            </div>
          </div>
        </motion.div>

        {/* Honest confidence, now beneath the ticket it grades. */}
        <div className="mx-auto mt-6 max-w-xl rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-center">
          <p className="font-display text-[10px] font-black uppercase tracking-[0.18em]" style={{ color: confidence.constrained ? 'var(--hot-pink)' : 'var(--lime)' }}>
            Recommendation quality: {confidence.constrained ? 'Limited by your answers' : confidence.label}
          </p>
          <p className="mt-1.5 text-xs leading-relaxed text-slate-400">
            {confidence.constrained
              ? `Your combination of answers narrows the field — only ${confidence.pool} tools score highly for it. The picks above are the best of a small pool; relaxing budget or level widens it.`
              : `Built from ${confidence.known.length} things you told us — ${confidence.known.slice(0, 3).join(', ')}${confidence.known.length > 3 ? '…' : ''}.`}
            {!confidence.constrained && confidence.nextSignal && ` Telling us ${confidence.nextSignal} would sharpen it further.`}
          </p>
        </div>

        {/* One light question, once. The three answers map to the three
            actions the funnel cares about: fits -> proceed, mostly -> refine
            in Find, not really -> retake. Far more useful from a newcomer
            than rating unfamiliar tools out of five. */}
        <div className="mt-8 text-center">
          {fit ? (
            <p className="text-xs font-bold uppercase tracking-widest text-slate-500">
              {fit === 'yes' ? '✓ Noted — glad it fits.' : fit === 'mostly' ? '✓ Noted — tune it in FIND.' : '✓ Noted — a retake takes a minute.'}
            </p>
          ) : (
            <>
              <p className="font-display text-[10px] font-black uppercase tracking-[0.18em] text-slate-400">
                Does this kit fit what you need?
              </p>
              <div className="mt-2.5 flex flex-wrap items-center justify-center gap-2">
                {[
                  ['yes', 'Yes, it fits'],
                  ['mostly', 'Mostly — I want changes'],
                  ['no', 'Not really'],
                ].map(([key, label]) => (
                  <button
                    key={key}
                    onClick={() => {
                      setFit(key)
                      writeScoped('exus_stack_feedback_v1', key)
                      track(EVENTS.STACK_FEEDBACK, { fit: key, band: confidence.band, pool: confidence.pool })
                    }}
                    className="cursor-pointer rounded-full border border-white/15 bg-white/[0.04] px-3.5 py-1.5 text-xs font-semibold text-slate-200 transition-colors hover:border-[var(--lime)] hover:text-white"
                  >
                    {label}
                  </button>
                ))}
              </div>
            </>
          )}
        </div>

        {/* Suggested plan — chip */}
        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 1.4 }}
          className="mt-8 font-display text-sm font-bold uppercase tracking-wider text-slate-400"
        >
          plan match:{' '}
          <span className="rounded-full bg-white/10 px-3 py-1 text-white" style={{ boxShadow: '2px 2px 0 #000' }}>
            {persona.suggestedPlan}
          </span>
        </motion.p>

        {/* CTA — chunky neubrutalism button */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 1.5, duration: 0.4 }}
          className="mt-10 flex flex-col items-center gap-5"
        >
          <Link
            to="/auth/login?next=/app/stack"
            onClick={() => haptic.success()}
            className="nb-btn inline-block px-8 py-4 text-base"
          >
            🚀 enter your universe
          </Link>

          <div className="flex items-center gap-6 pt-2">
            <Link
              to="/pricing"
              className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300 underline decoration-2 decoration-cyan-400/60 underline-offset-4 hover:text-white"
            >
              see the plans
            </Link>
            <button
              onClick={retake}
              className="cursor-pointer font-display text-xs font-bold uppercase tracking-wider text-slate-400 underline decoration-2 decoration-white/20 underline-offset-4 hover:text-white"
            >
              start over
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
