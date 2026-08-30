import { ESTIMATE_FOOTNOTE, caveats, criteriaRows, hasEstimateFootnote, showsEvidenceColumn } from '../../utils/radarDisplay'

// The full rubric, gaps included. Every criterion gets a row whether or not it
// was scored, because the blanks are the most useful column on the page: they
// are where a reader learns that a missing security score means "not verified",
// not "verified and bad".
//
// The weights come from the pipeline with each row rather than from a copy of
// the rubric kept here — a second copy would silently start lying the day the
// rubric changed.
//
// The table scrolls inside its own container. On a phone the alternative is a
// horizontally scrolling PAGE, which breaks every other section on it.
export default function RadarCriteriaTable({ scorecard }) {
  const rows = criteriaRows(scorecard)
  if (!rows.length) return null
  const gaps = caveats(scorecard)
  const withEvidence = showsEvidenceColumn(scorecard)

  return (
    <section className="sticker pink p-4" aria-labelledby="radar-criteria">
      <h3 id="radar-criteria" className="arcade-heading lime compact text-base">
        How it scored
      </h3>

      <div className="mt-3 overflow-x-auto">
        <table className="w-full min-w-[26rem] border-collapse text-left text-xs">
          <thead>
            <tr className="text-[10px] uppercase tracking-widest text-slate-400">
              <th scope="col" className="py-2 pr-3 font-bold">Criterion</th>
              <th scope="col" className="py-2 pr-3 text-right font-bold">Score</th>
              <th scope="col" className="py-2 pr-3 text-right font-bold">Weight</th>
              <th scope="col" className="py-2 pr-3 font-bold">Basis</th>
              {withEvidence && <th scope="col" className="py-2 font-bold">Evidence</th>}
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.key} className="border-t border-white/10 align-top">
                <th scope="row" className="py-2 pr-3 font-bold text-slate-200">{row.label}</th>
                <td
                  className={`py-2 pr-3 text-right font-display font-black ${row.score == null ? 'text-slate-500' : 'text-white'}`}
                >
                  {row.scoreText}
                </td>
                <td className="py-2 pr-3 text-right text-slate-400">{row.weight}</td>
                <td className={`py-2 pr-3 ${row.basis === 'unscored' ? 'text-slate-500' : 'text-slate-300'}`}>
                  {row.basisText}
                </td>
                {withEvidence && <td className="py-2 text-slate-400">{row.evidence}</td>}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {hasEstimateFootnote(scorecard) && (
        <p className="mt-3 text-[11px] leading-relaxed text-slate-500">{ESTIMATE_FOOTNOTE}</p>
      )}

      {gaps.length > 0 && (
        <div className="mt-4 border-t border-white/10 pt-3">
          <h4 className="text-[10px] font-bold uppercase tracking-widest text-slate-400">
            What the radar could not verify
          </h4>
          <ul className="mt-2 space-y-1 text-xs leading-relaxed text-slate-400">
            {gaps.map((gap) => (
              <li key={gap}>· {gap}</li>
            ))}
          </ul>
        </div>
      )}
    </section>
  )
}
