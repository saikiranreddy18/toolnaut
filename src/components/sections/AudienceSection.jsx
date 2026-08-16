import { motion } from 'framer-motion'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import Tilt from '../ui/Tilt'

const AUDIENCES = [
  {
    label: 'For students',
    title: 'Build your edge before your first job',
    text: 'The graduates who stand out next year are the ones fluent in AI tooling today. Start with free tiers, follow a path matched to your field, and walk into interviews with a working stack — not a list of buzzwords.',
  },
  {
    label: 'For working professionals',
    title: 'Adapt without carving out a sabbatical',
    text: 'Inside a Fortune 500 role there is no slack time to evaluate the flood of new AI tools. We do the scanning, keep only what fits your function, and compress the learning into paths you can run between meetings.',
  },
]

export default function AudienceSection() {
  return (
    <SectionShell id="audience" eyebrow="Who it's for" title="Built for people who can't afford to fall behind">
      <div className="grid gap-6 md:grid-cols-2">
        {AUDIENCES.map((a, i) => (
          <motion.div key={a.label} variants={fadeUp} className="h-full">
            <Tilt className={`sticker ${i === 0 ? 'pink' : 'cyan'} h-full p-8`} max={6}>
              <span className="arcade-chip on" style={{ fontSize: 10 }}>{a.label}</span>
              <h3 className="mt-5 font-display text-2xl font-black uppercase italic text-white">{a.title}</h3>
              <p className="mt-4 text-sm leading-relaxed text-slate-300">{a.text}</p>
            </Tilt>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  )
}
