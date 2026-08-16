import { motion } from 'framer-motion'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import Tilt from '../ui/Tilt'

const STEPS = [
  { name: 'Discover', text: 'Tell us your role, goals, and experience. Two minutes, no forms that feel like forms.' },
  { name: 'Match', text: 'We map the tool landscape to your role and surface only what earns a place in your stack.' },
  { name: 'Learn', text: 'Follow a learning path built for your level — from first prompt to production workflow.' },
  { name: 'Master', text: 'Track progress against your role, not generic benchmarks. Stay ahead as the field moves.' },
]

export default function HowItWorksSection() {
  return (
    <SectionShell id="how-it-works" eyebrow="The Method" title="Four steps from noise to mastery">
      <div className="relative">
        <svg
          className="pointer-events-none absolute inset-x-0 top-16 hidden h-24 w-full md:block"
          viewBox="0 0 1000 100"
          fill="none"
          preserveAspectRatio="none"
          aria-hidden="true"
        >
          <motion.path
            d="M20 60 C 180 10, 300 90, 480 50 S 800 20, 980 55"
            stroke="url(#pathGrad)"
            strokeWidth="1.5"
            strokeDasharray="5 9"
            initial={{ pathLength: 0 }}
            whileInView={{ pathLength: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 2, ease: 'easeInOut' }}
          />
          <defs>
            <linearGradient id="pathGrad" x1="0" x2="1000" gradientUnits="userSpaceOnUse">
              <stop stopColor="#7c3aed" />
              <stop offset="0.5" stopColor="#06b6d4" />
              <stop offset="1" stopColor="#ec4899" />
            </linearGradient>
          </defs>
        </svg>

        <div className="relative grid gap-6 md:grid-cols-4">
          {STEPS.map((s, i) => (
            <motion.div key={s.name} variants={fadeUp} className="h-full">
              <Tilt
                className={`sticker ${i % 3 === 0 ? '' : i % 3 === 1 ? 'pink' : 'cyan'} h-full p-6`}
                max={8}
              >
                <p className="font-display text-4xl font-black italic text-lime-400" style={{ textShadow: '2px 2px 0 #000' }}>
                  {String(i + 1).padStart(2, '0')}
                </p>
                <h3 className="mt-3 font-display text-xl font-black uppercase italic text-white">{s.name}</h3>
                <p className="mt-2 text-sm leading-relaxed text-slate-300">{s.text}</p>
              </Tilt>
            </motion.div>
          ))}
        </div>
      </div>
    </SectionShell>
  )
}
