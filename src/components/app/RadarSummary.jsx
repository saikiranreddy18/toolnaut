import RadarBadge from './RadarBadge'
import { basisSummary, coveragePercent, showsNumericScores } from '../../utils/radarDisplay'

// The two scores, or the honest absence of them.
//
// WHY THE UNRATED CASE LOOKS SO DIFFERENT FROM THE RATED ONE
// A sparse scorecard produces real, high numbers: Utility 100 from a single
// integration signal at 41% coverage. Printing that with an "Unrated" badge
// beside it is technically honest and practically useless — people anchor on
// the 100 and never read the badge. So below the coverage line the numbers are
// not shown here at all. They are still available on the detail page under
// "Partial signals", where they read as evidence rather than as a verdict.
//
// Utility and Trust are never added together. A tool that saves an hour a day
// and leaks your customer list is not the average of those two facts.
export default function RadarSummary({ scorecard, compact = false }) {
  const showScores = showsNumericScores(scorecard)
  const coverage = coveragePercent(scorecard)

  if (compact) {
    return (
      <div className="mt-2 flex flex-col gap-1">
        <RadarBadge scorecard={scorecard} className="self-start" />
        {showScores ? (
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-300">
            Utility {scorecard.utility} · Trust {scorecard.trust}
          </p>
        ) : (
          <p className="text-[10px] font-bold uppercase tracking-wide text-slate-400">
            {coverage == null ? 'Not yet assessed' : `${coverage}% evidence · more evaluation needed`}
          </p>
        )}
      </div>
    )
  }

  return (
    <section className="sticker cyan p-4" aria-labelledby="radar-assessment">
      <div className="flex flex-wrap items-center gap-3">
        <h3 id="radar-assessment" className="arcade-heading lime compact text-base">
          Radar assessment
        </h3>
        <RadarBadge scorecard={scorecard} />
      </div>

      {showScores ? (
        <dl className="mt-4 grid grid-cols-2 gap-3">
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Utility</dt>
            <dd className="font-display text-2xl font-black text-white">
              {scorecard.utility}
              <span className="text-sm text-slate-500"> / 100</span>
            </dd>
          </div>
          <div>
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">Trust</dt>
            <dd className="font-display text-2xl font-black text-white">
              {scorecard.trust}
              <span className="text-sm text-slate-500"> / 100</span>
            </dd>
          </div>
        </dl>
      ) : (
        <p className="mt-3 text-xs leading-relaxed text-slate-300">
          {coverage == null
            ? 'This tool has not been through the radar yet, so it carries no scores.'
            : `Too little of the rubric has been verified (${coverage}%) to place this tool or publish a score. The evidence gathered so far is below.`}
        </p>
      )}

      <p className="mt-4 text-[10px] font-bold uppercase tracking-wide text-slate-400">
        {coverage == null ? 'No evidence gathered' : `Evidence coverage ${coverage}%`} · {basisSummary(scorecard)}
      </p>

      {showScores && (
        <p className="mt-3 text-xs leading-relaxed text-slate-400">
          Utility measures practical workflow value. Trust measures security, data control, maturity and
          maintainability. They are deliberately not combined into one number.
        </p>
      )}
    </section>
  )
}
