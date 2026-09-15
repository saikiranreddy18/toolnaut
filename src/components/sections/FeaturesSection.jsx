import { motion } from 'framer-motion'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import Tilt from '../ui/Tilt'

const FEATURES = [
  { name: 'Role-aware discovery', text: 'Not generic lists. Recommendations that understand your role and rank tools by fit.', icon: 'M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Zm-7 8a7 7 0 0 1 14 0' },
  { name: 'Smart learning paths', text: 'From first tool to full stack, sequenced for your level and your available time.', icon: 'M4 19h4v-4H4zM10 13h4V9h-4zM16 7h4V3h-4zM8 17l2-4M14 11l2-4' },
  { name: 'Live tool comparison', text: 'Side-by-side capability, pricing, and integration comparisons kept current.', icon: 'M4 20V10M10 20V4M16 20v-7M22 20H2' },
  { name: 'Progress tracking', text: 'A skills graph that grows with you and shows exactly where the gaps are.', icon: 'M3 17l6-6 4 4 8-8M15 7h6v6' },
  { name: 'Signal over noise', text: 'We watch the release firehose so you only hear about tools that matter to you.', icon: 'M3 5h18l-7 8v6l-4 2v-8z' },
  { name: 'Weekly fresh finds', text: 'New tools matched to your evolving role, delivered in one scannable digest.', icon: 'M4 6h16v12H4zM4 7l8 6 8-6' },
]

function Icon({ d }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="#e4e4e7" strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d={d} />
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
                <Icon d={f.icon} />
              </div>
              <h3 className="mb-2 font-display text-lg font-semibold text-white">{f.name}</h3>
              <p className="text-sm leading-relaxed text-zinc-300">{f.text}</p>
            </Tilt>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  )
}
