import { useRef } from 'react'
import { motion, useInView, useReducedMotion } from 'framer-motion'
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

  // THE OBSERVER WATCHES THE <svg>, NOT THE STARS.
  // whileInView on each circle looked right and never fired: a circle whose
  // start position is 150 units outside the viewBox is clipped, so
  // IntersectionObserver never reports it entering the viewport, so the
  // animation that would bring it on-screen waits for it to be on-screen.
  // Variants on the parent svg propagate "in"/"out" to every child instead.
  const LAND = 0.55
  const lastStar = LAND + (pts.length - 1) * 0.07

  // useInView + animate, NOT whileInView. This svg sits inside SectionShell's
  // own variant tree (initial="hidden" whileInView="show"), and a nested
  // whileInView child inside an already-animated variant parent never received
  // its "in" state — verified: stars stayed at the fly-in origin with the
  // section fully centred in the viewport. An explicit observer on the svg and
  // an explicit `animate` prop cannot be overridden by ancestry.
  const ref = useRef(null)
  const inView = useInView(ref, { once: false, amount: 0.5 })

  return (
    <motion.svg
      ref={ref}
      viewBox="0 0 100 80"
      className="mt-4 h-24 w-full"
      aria-hidden="true"
      initial={false}
      animate={still ? 'in' : inView ? 'in' : 'out'}
    >
      {pts.map((p, j) => j > 0 && (
        <motion.line
          key={`l${j}`}
          x1={pts[j - 1][0]} y1={pts[j - 1][1]}
          x2={p[0]} y2={p[1]}
          stroke={color} strokeWidth="0.7"
          variants={still ? undefined : {
            out: { pathLength: 0, opacity: 0 },
            in: {
              pathLength: 1, opacity: 0.4,
              // lines draw only after the stars have landed — a line between
              // two points that have not arrived reads as a rendering fault
              transition: { duration: 0.4, delay: lastStar + j * 0.06, ease: 'easeOut' },
            },
          }}
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
            variants={still ? undefined : {
              out: { cx: ox, cy: oy, opacity: 0 },
              in: {
                cx: p[0], cy: p[1], opacity: 1,
                transition: { duration: LAND, delay: j * 0.07, ease: [0.16, 1, 0.3, 1] },
              },
            }}
            cx={still ? p[0] : undefined}
            cy={still ? p[1] : undefined}
          />
        )
      })}
    </motion.svg>
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
