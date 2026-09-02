import { TIERS, CAPABILITIES } from '../../utils/capabilityMatrix'

// What each tier actually gets, side by side.
//
// The pricing page listed three paid plans and no free one, so a visitor could
// not tell what they get for nothing — and the answer, today, is "almost all of
// it". Discovery is free; what a subscription would buy is the continuous part:
// alerts when a tool changes, deeper comparison, exports, team collaboration.
//
// Live rows are marked and planned rows are dimmed and labelled. That
// distinction is not decoration: a table implying working paid features would
// be false while a row is still just the intended shape of a tier. Saying
// "planned" costs a little polish and keeps the page honest — which, for a
// product asking to be trusted with tool recommendations, is the better trade.

const isLive = (cell) => cell.status === 'live'

function Cell({ cell, emphasis }) {
  return (
    <td
      className="border-t-2 border-black/60 px-3 py-3 align-top text-sm"
      style={{ background: emphasis ? 'rgba(163,255,46,0.05)' : 'transparent' }}
    >
      <span className={isLive(cell) ? 'text-white' : 'text-slate-500'}>{cell.text}</span>
      {isLive(cell) ? (
        <span
          className="ml-2 whitespace-nowrap rounded-full border-2 border-black px-1.5 py-0.5 font-display text-[9px] font-black uppercase"
          style={{ background: 'var(--lime)', color: '#000' }}
        >
          live
        </span>
      ) : (
        <span className="ml-2 whitespace-nowrap rounded-full border border-slate-600 px-1.5 py-0.5 font-display text-[9px] font-black uppercase text-slate-500">
          planned
        </span>
      )}
    </td>
  )
}

export default function CapabilityMatrix() {
  return (
    <section className="relative mx-auto max-w-5xl px-5 pb-14">
      <h2 className="arcade-heading section text-xl sm:text-2xl">WHAT EACH TIER GETS</h2>
      <p className="mt-2 max-w-2xl text-sm leading-relaxed text-slate-400">
        Discovery is free and stays free — you should not have to pay to find out
        whether the recommendation is any good. A subscription would buy the
        continuous part: knowing when a tool in your stack changes price, gets
        replaced, or stops being the right call.
      </p>

      <div
        className="mt-6 rounded-2xl border-[3px] border-black p-3"
        style={{ background: '#12121b', boxShadow: '6px 6px 0 #000' }}
      >
        {/* the table scrolls in its own box rather than pushing the page wide */}
        <div className="overflow-x-auto">
          <table className="w-full min-w-[620px] border-collapse text-left">
            <thead>
              <tr>
                <th className="px-3 pb-3 font-display text-[11px] font-black uppercase tracking-[0.14em] text-slate-500">
                  Capability
                </th>
                {TIERS.map((t) => (
                  <th
                    key={t.id}
                    className="px-3 pb-3"
                    style={{ background: t.id === 'free' ? 'rgba(163,255,46,0.05)' : 'transparent' }}
                  >
                    <span className="font-display text-base font-black uppercase text-white">{t.name}</span>
                    <span className="ml-2 font-display text-[10px] font-black uppercase tracking-wide text-slate-500">
                      {t.note}
                    </span>
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {CAPABILITIES.map((row) => (
                <tr key={row.capability}>
                  <th
                    scope="row"
                    className="border-t-2 border-black/60 px-3 py-3 align-top text-sm font-semibold text-slate-300"
                  >
                    {row.capability}
                  </th>
                  <Cell cell={row.free} emphasis />
                  <Cell cell={row.pro} />
                  <Cell cell={row.team} />
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <p className="mt-4 text-xs leading-relaxed text-slate-500">
        {/* DRIVEN BY THE PAYMENT SWITCH — same flag ContactSection.jsx's
            footer and Methodology.jsx already read. See docs/razorpay.md. */}
        {import.meta.env.VITE_PAYMENTS_ENABLED === 'true'
          ? <>Paid plans are live — see <span className="text-slate-400">/pricing</span> to subscribe. Rows marked <span className="text-slate-400">planned</span> are still just the intended shape of a future tier, not features you are being sold today.</>
          : <>Nothing is charged today. Toolnaut is in free public beta and has no payment path — rows marked <span className="text-slate-400">planned</span> are the intended shape of a paid tier, not features you are being sold.</>}
      </p>
    </section>
  )
}
