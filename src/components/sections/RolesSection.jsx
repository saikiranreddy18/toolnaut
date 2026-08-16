import { motion } from 'framer-motion'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import Tilt from '../ui/Tilt'
import { ROLES } from '../nexus/starchartData'

// "Every role gets a different sky" — the constellation cards from the
// STARCHART page, restyled in the main landing page's arcade/sticker look.
// Each role previews a mini sub-constellation (points in a 100×80 box) drawn
// in that persona's accent color.
const TILTS = ['', 'pink', 'cyan']

export default function RolesSection() {
  return (
    <SectionShell
      id="roles"
      eyebrow="Coordinates"
      title="Every role gets a different sky"
    >
      <motion.p variants={fadeUp} className="-mt-6 mb-12 max-w-2xl text-base leading-relaxed text-slate-300 md:text-lg">
        Your map is drawn from your role — so a designer and an engineer never
        see the same stars.
      </motion.p>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {ROLES.map((r, i) => (
          <motion.div key={r.name} variants={fadeUp} className="h-full">
            <Tilt className={`sticker ${TILTS[i % 3]} h-full p-6`} max={6}>
              <div className="flex items-center justify-between">
                <h3 className="font-display text-lg font-black uppercase italic text-white">
                  {r.name}
                </h3>
                <span className="font-display text-[10px] font-black uppercase tracking-widest" style={{ color: r.color }}>
                  {r.pts.length} stars
                </span>
              </div>
              <svg viewBox="0 0 100 80" className="mt-4 h-24 w-full" aria-hidden="true">
                {r.pts.map((p, j) => j > 0 && (
                  <line
                    key={`l${j}`}
                    x1={r.pts[j - 1][0]} y1={r.pts[j - 1][1]}
                    x2={p[0]} y2={p[1]}
                    stroke={r.color} strokeWidth="0.7" opacity="0.4"
                  />
                ))}
                {r.pts.map((p, j) => (
                  <circle
                    key={`c${j}`}
                    cx={p[0]} cy={p[1]} r="2.4"
                    fill={r.color}
                    style={{ filter: `drop-shadow(0 0 4px ${r.color})` }}
                  />
                ))}
              </svg>
            </Tilt>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  )
}
