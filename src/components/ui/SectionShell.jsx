import { motion } from 'framer-motion'
import { useSectionView } from '../../hooks/useAnalytics'

export const fadeUp = {
  hidden: { opacity: 0, y: 32 },
  show: { opacity: 1, y: 0, transition: { duration: 0.7, ease: 'easeOut' } },
}

export const stagger = {
  hidden: {},
  show: { transition: { staggerChildren: 0.12 } },
}

// Common wrapper: full-height stop on the scroll journey + section_view tracking.
// titleAs exists because these sections are reused as WHOLE PAGES. On the
// landing page a section title is correctly an h2 under the hero's h1; on
// /pricing the same component is the top of the document, and rendering h2
// there left the page with no h1 at all — the only public route missing one.
export default function SectionShell({ id, eyebrow, title, titleAs = 'h2', children, className = '' }) {
  const ref = useSectionView(id)
  const Heading = motion[titleAs] || motion.h2
  return (
    <section id={id} ref={ref} className={`relative z-10 mx-auto w-full max-w-6xl px-5 py-24 md:py-32 ${className}`}>
      <motion.div initial="hidden" whileInView="show" viewport={{ once: true, amount: 0.2 }} variants={stagger}>
        {eyebrow && (
          <motion.p variants={fadeUp} className="mb-4 font-display text-xs font-black uppercase tracking-[0.3em] text-lime-400">
            ▸ {eyebrow}
          </motion.p>
        )}
        {title && (
          <Heading variants={fadeUp} className="arcade-heading mb-12 max-w-3xl text-3xl md:text-5xl">
            {title}
          </Heading>
        )}
        {children}
      </motion.div>
    </section>
  )
}
