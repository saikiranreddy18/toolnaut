import { motion } from 'framer-motion'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import Tilt from '../ui/Tilt'

const FEATURES = [
  { name: 'Role-Aware Discovery', text: 'Not generic lists. Recommendations that understand your role and rank tools by fit.', accent: '#d4d4d8' },
  { name: 'Smart Learning Paths', text: 'From first tool to full stack, sequenced for your level and your available time.', accent: '#a1a1aa' },
  { name: 'Live Tool Comparison', text: 'Side-by-side capability, pricing, and integration comparisons kept current.', accent: '#d4d4d8' },
  { name: 'Progress Tracking', text: 'A skills graph that grows with you and shows exactly where the gaps are.', accent: '#e4e4e7' },
  { name: 'Signal over Noise', text: 'We watch the release firehose so you only hear about tools that matter to you.', accent: '#ffffff' },
  { name: 'Weekly Fresh Finds', text: 'New tools matched to your evolving role, delivered in one scannable digest.', accent: '#a1a1aa' },
]

function Spark({ color }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 2 L14 10 L22 12 L14 14 L12 22 L10 14 L2 12 L10 10 Z" fill={color} />
    </svg>
  )
}

export default function FeaturesSection() {
  return (
    <SectionShell id="features" eyebrow="Capabilities" title="Everything orbits your role">
      <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
        {FEATURES.map((f, i) => (
          <motion.div key={f.name} variants={fadeUp} className="h-full">
            <Tilt
              className={`sticker ${i % 3 === 0 ? '' : i % 3 === 1 ? 'pink' : 'cyan'} h-full p-6`}
              max={6}
            >
              <div
                className="mb-4 flex h-10 w-10 items-center justify-center rounded-xl border border-white/10 bg-white/5"
                style={{ boxShadow: '0 10px 28px -14px rgba(0,0,0,0.7)' }}
              >
                <Spark color={f.accent} />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-white">{f.name}</h3>
              <p className="text-sm leading-relaxed text-slate-300">{f.text}</p>
            </Tilt>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  )
}
