import { RADAR_LABEL_HELP, labelText } from '../../utils/radarDisplay'

// The readiness pill. The rung is carried by the WORDS, always — colour only
// reinforces it. A viewer who cannot separate lime from cyan, or who is reading
// this in the alternate palette, loses nothing: "Watchlist" and
// "Production-ready" are as different in text as they are in meaning.
//
// There is deliberately no red. A tool that scores badly is usually a tool
// nobody has gathered evidence on yet, and red would read as a warning about
// the product rather than an admission about the radar.
const TONE = {
  'unrated': { bg: 'transparent', fg: 'rgba(255,255,255,0.65)', border: 'rgba(255,255,255,0.35)' },
  'watchlist': { bg: 'transparent', fg: 'rgba(255,255,255,0.85)', border: 'rgba(255,255,255,0.55)' },
  'experiment': { bg: 'var(--cyan)', fg: '#000', border: '#000' },
  'builder-ready': { bg: 'var(--cyan)', fg: '#000', border: '#000' },
  'production-ready': { bg: 'var(--lime)', fg: '#000', border: '#000' },
  'category-leader': { bg: 'var(--arcade-yellow)', fg: '#000', border: '#000' },
}

export default function RadarBadge({ scorecard, className = '' }) {
  const label = scorecard?.label
  const tone = TONE[label] || TONE.unrated
  const text = labelText(scorecard)

  return (
    <span
      className={`inline-flex shrink-0 items-center rounded-full px-2 py-0.5 font-display text-[10px] font-black uppercase tracking-wide ${className}`}
      style={{
        background: tone.bg,
        color: tone.fg,
        border: `2px solid ${tone.border}`,
        boxShadow: tone.bg === 'transparent' ? 'none' : '2px 2px 0 #000',
      }}
      title={RADAR_LABEL_HELP[label] || 'This tool has not been assessed by the radar yet.'}
    >
      {text}
    </span>
  )
}
