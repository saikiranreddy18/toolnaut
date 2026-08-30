import { automationSteps } from '../../utils/radarDisplay'

// Trigger → input → AI step → action → outcome: what the tool actually does in
// a workflow, which is the only reason it belongs in a catalogue for people who
// build automations rather than collect launches.
//
// It is also the radar's hardest gate, so it is shown rather than hidden. A
// tool whose chain nobody can state is capped at Watchlist however well it
// scores, and printing that rule where the reader can see it turns a private
// rubric into something they can argue with.
export default function AutomationFit({ scorecard }) {
  const fit = automationSteps(scorecard)

  if (!fit) {
    return (
      <section className="sticker p-4" aria-labelledby="automation-fit">
        <h3 id="automation-fit" className="arcade-heading lime compact text-base">
          Automation fit — not yet verified
        </h3>
        <p className="mt-3 text-xs leading-relaxed text-slate-300">
          This tool cannot move above <strong className="text-white">Watchlist</strong> until the radar has
          evidence of a complete trigger → input → AI step → action → outcome workflow.
        </p>
      </section>
    )
  }

  return (
    <section className="sticker p-4" aria-labelledby="automation-fit">
      <h3 id="automation-fit" className="arcade-heading lime compact text-base">
        Automation fit
      </h3>
      {!fit.complete && (
        <p className="mt-2 text-[10px] font-bold uppercase tracking-wide" style={{ color: 'var(--hot-pink)' }}>
          ◆ Incomplete — capped at Watchlist until the missing steps are known
        </p>
      )}
      <dl className="mt-3 space-y-2">
        {fit.steps.map((step) => (
          <div key={step.key} className="grid grid-cols-[6.5rem_1fr] gap-2">
            <dt className="text-[10px] font-bold uppercase tracking-widest text-slate-400">{step.label}</dt>
            <dd className="text-xs leading-relaxed text-slate-200">{step.text}</dd>
          </div>
        ))}
      </dl>
    </section>
  )
}
