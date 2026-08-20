import React, { useEffect } from 'react'
import { motion } from 'framer-motion'
import { Link, Navigate, useNavigate } from 'react-router-dom'
import { generatePersona } from '../utils/personaGenerator'
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
        className="relative w-full max-w-xl py-20 text-center"
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

        {/* Level badge — chunky orange/yellow pixel style */}
        <motion.div
          initial={{ opacity: 0, scale: 0.5 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ delay: 0.35, type: 'spring', stiffness: 300, damping: 15 }}
          className="mb-8 inline-block"
        >
          <div className="level-badge inline-flex items-center gap-2 px-5 py-2.5">
            <span className="text-xl">⭐</span>
            <span className="font-display text-sm font-black tracking-wider">{level}</span>
          </div>
        </motion.div>

        {/* Persona name — chunky italic hero heading */}
        <motion.h1
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.5, duration: 0.5 }}
          className="arcade-heading text-5xl sm:text-6xl"
        >
          {persona.name.toUpperCase()}
        </motion.h1>

        {persona.career && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.62 }}
            className="mt-4 font-display text-xs font-black uppercase tracking-[0.2em]"
            style={{ color: persona.category.color }}
          >
            {persona.career} · {persona.category.name}
          </motion.p>
        )}

        <motion.p
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.7 }}
          className="mt-5 font-display text-base font-bold italic text-white sm:text-lg"
        >
          {persona.tagline}
        </motion.p>

        {persona.subline && (
          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8 }}
            className="mt-3 text-sm leading-relaxed text-slate-300"
          >
            {persona.subline}
          </motion.p>
        )}

        {/* Starter stack — sticker cards on alternating tilt */}
        <div className="mt-12 text-left">
          <div className="mb-5 flex justify-center">
            <span className="arcade-chip on">🎯 your starter kit</span>
          </div>
          <div className="grid gap-4 sm:grid-cols-3">
            {persona.stack.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 40, rotate: 0 }}
                animate={{ opacity: 1, y: 0, rotate: i % 2 === 0 ? -1.5 : 1.5 }}
                transition={{ delay: 0.9 + i * 0.12, type: 'spring', stiffness: 200, damping: 15 }}
                className={`sticker ${i === 0 ? '' : i === 1 ? 'pink' : 'cyan'} p-4`}
              >
                <div className="flex items-start justify-between gap-2">
                  <p className="font-display text-base font-black uppercase text-white leading-tight">
                    {t.name}
                  </p>
                  <span className="font-display text-xs font-black text-lime-400">#{i + 1}</span>
                </div>
                <p className="mt-2 text-xs leading-relaxed text-slate-300">{t.blurb}</p>
              </motion.div>
            ))}
          </div>
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
              to="/#pricing"
              className="font-display text-xs font-bold uppercase tracking-wider text-cyan-300 underline decoration-2 decoration-cyan-400/60 underline-offset-4 hover:text-white"
            >
              see the plans
            </Link>
            <button
              onClick={retake}
              className="cursor-pointer font-display text-xs font-bold uppercase tracking-wider text-slate-400 underline decoration-2 decoration-white/20 underline-offset-4 hover:text-white"
            >
              retake quiz
            </button>
          </div>
        </motion.div>
      </motion.div>
    </div>
  )
}
