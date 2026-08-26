import { Link } from 'react-router-dom'
import { getDomainCoverage } from '../../utils/skillCoverage'

export default function SkillGraph({ tools, progress }) {
  const domains = getDomainCoverage(tools, progress).sort((a, b) => b.count - a.count)

  return (
    <div className="sticker p-4">
      <div className="mb-3 flex items-center justify-between">
        <span className="tape-label text-xs" style={{ transform: 'rotate(-2deg)' }}>
          📊 Skills graph
        </span>
        <span className="font-display text-[10px] font-bold uppercase tracking-widest text-slate-500">
          where the gaps are
        </span>
      </div>
      <div className="space-y-3">
        {domains.map((d) => (
          <div key={d.domain}>
            <div className="mb-1 flex items-center justify-between gap-2">
              <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-white">
                <span className="h-2 w-2 rounded-full" style={{ background: d.color }} aria-hidden="true" />
                {d.name}
              </span>
              {d.count === 0 ? (
                <Link
                  to={`/app/discover?cat=${d.domain}`}
                  className="text-[10px] font-bold uppercase tracking-widest text-slate-500 underline underline-offset-2 hover:text-white"
                >
                  Explore →
                </Link>
              ) : (
                <span className="text-[10px] font-bold uppercase tracking-widest text-slate-500">
                  {d.count} tool{d.count === 1 ? '' : 's'}
                </span>
              )}
            </div>
            <div className="h-2 w-full overflow-hidden rounded-full bg-white/[0.06]">
              <div
                className="h-full rounded-full transition-all duration-500"
                style={{ width: `${Math.round(d.avgStatus * 100)}%`, background: d.count === 0 ? 'transparent' : d.color }}
              />
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
