import { motion, useReducedMotion } from 'framer-motion'
import { Link } from 'react-router-dom'
import SectionShell, { fadeUp } from '../ui/SectionShell'
import Tilt from '../ui/Tilt'
import { ROLES } from '../../utils/rolesData'

// "Every role gets a different sky" — the constellation cards from the
// the retired starchart page, restyled in the landing page's arcade/sticker look.
// Each role previews a mini sub-constellation (points in a 100×80 box) drawn
// in that persona's accent color.
const TILTS = ['', 'pink', 'cyan']

// Stars arrive from the surrounding sky and settle onto the card.
//
// Each point flies in along the ray from the card's centre through its final
// position, starting far outside the 100x80 viewBox — so they read as coming
// from the same space the page's starfield occupies, rather than fading in on
// the spot. The connecting lines draw only after the stars have landed,
// because a line between two points that have not arrived yet looks like a
// rendering fault.
//
// Origins are DERIVED from each point, not random: this section is prerendered,
// and Math.random() would produce a different sky in the static HTML than in the
// hydrated page. It also means the animation is identical on every replay.
const CX = 50
const CY = 40
const FLY = 150 // far enough to clear the viewBox from any angle

function origin([x, y]) {
  const dx = x - CX
  const dy = y - CY
  const len = Math.hypot(dx, dy) || 1
  return [x + (dx / len) * FLY, y + (dy / len) * FLY]
}

function Constellation({ pts, color }) {
  const still = useReducedMotion()

  // once:false so it replays whenever the section re-enters — scrolling back up
  // should show the sky assemble again, not a diagram that already happened.
  const view = { once: false, amount: 0.5 }
  const LAND = 0.55 // seconds for a star to arrive
  const lastStar = LAND + (pts.length - 1) * 0.07

  return (
    <svg viewBox="0 0 100 80" className="mt-4 h-24 w-full" aria-hidden="true">
      {pts.map((p, j) => j > 0 && (
        <motion.line
          key={`l${j}`}
          x1={pts[j - 1][0]} y1={pts[j - 1][1]}
          x2={p[0]} y2={p[1]}
          stroke={color} strokeWidth="0.7"
          initial={still ? false : { pathLength: 0, opacity: 0 }}
          whileInView={still ? undefined : { pathLength: 1, opacity: 0.4 }}
          viewport={view}
          transition={{ duration: 0.4, delay: lastStar + j * 0.06, ease: 'easeOut' }}
          style={still ? { opacity: 0.4 } : undefined}
        />
      ))}
      {pts.map((p, j) => {
        const [ox, oy] = origin(p)
        return (
          <motion.circle
            key={`c${j}`}
            r="2.4"
            fill={color}
            style={{ filter: `drop-shadow(0 0 4px ${color})` }}
            initial={still ? false : { cx: ox, cy: oy, opacity: 0 }}
            whileInView={still ? undefined : { cx: p[0], cy: p[1], opacity: 1 }}
            viewport={view}
            transition={{ duration: LAND, delay: j * 0.07, ease: [0.16, 1, 0.3, 1] }}
            cx={still ? p[0] : undefined}
            cy={still ? p[1] : undefined}
          />
        )
      })}
    </svg>
  )
}

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
            <Link to={`/tools/${r.domain}`} className="block h-full">
              <Tilt className={`sticker ${TILTS[i % 3]} h-full p-6`} max={6}>
                <div className="flex items-center justify-between">
                  <h3 className="font-display text-lg font-black uppercase italic text-white">
                    {r.name}
                  </h3>
                  <span className="font-display text-[10px] font-black uppercase tracking-widest" style={{ color: r.color }}>
                    {r.pts.length} stars
                  </span>
                </div>
                <Constellation pts={r.pts} color={r.color} />
              </Tilt>
            </Link>
          </motion.div>
        ))}
      </div>
    </SectionShell>
  )
}
