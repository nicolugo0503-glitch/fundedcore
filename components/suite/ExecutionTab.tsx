"use client";
import { type Profile, demoProfile } from "../../lib/profile";
import { execMetrics, edgeDecay } from "../../lib/execution";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const DSTATUS: Record<string, { color: string; label: string }> = {
  dead: { color: "var(--red)", label: "DEAD" },
  decaying: { color: "var(--amb)", label: "DECAYING" },
  stable: { color: "var(--t2)", label: "STABLE" },
  improving: { color: "var(--grn)", label: "IMPROVING" },
};

export function ExecutionTab({ profile, setProfile, go }: { profile: Profile; setProfile?: (p: Profile) => void; go?: (t: string) => void }) {
  const m = execMetrics(profile.trades);
  const decay = edgeDecay(profile.trades);

  if (!m.hasPrices) {
    return (
      <div className="fade">
        <SuiteHeader eyebrow="Execution analytics" title="Exit efficiency & edge decay" sub="The tier that sees what you can't — how much of each move you capture, and which setups are dying." />
        <div className="card"><EmptyState icon="target" title="Needs entry & exit prices" body="Upload a trade history with entry, exit, high (MFE) and low (MAE) columns — most broker/journal exports include them. Then this engine shows your exit efficiency and which edges are decaying." cta={<button onClick={() => go && go("journal")} className="btn btn-primary text-sm">Upload your trades →</button>} /></div>
      </div>
    );
  }
  const effColor = m.winnersCaptured >= 0.65 ? "var(--grn)" : m.winnersCaptured >= 0.5 ? "var(--amb)" : "var(--red)";

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Execution analytics" title="Exit efficiency & edge decay" sub="How much of the move you actually capture — and which of your setups are dying." />
      <AIRead module="Execution" facts={`Capture ${Math.round(m.winnersCaptured*100)}% of the move on winners, $${Math.round(m.totalLeftOnTable)} left on the table, ${m.avgHeatPts.toFixed(0)}pts avg heat, ${Math.round(m.loserMfeRate*100)}% of losers were green first.${decay.ready?` ${decay.summary}`:""}`} />

      {/* EXIT EFFICIENCY */}
      <div className="card p-6">
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="flex items-center gap-5">
            <Ring pct={m.winnersCaptured} color={effColor} size={120} stroke={10}>
              <div className="text-center"><div className="mono text-[1.7rem] font-bold leading-none" style={{ color: effColor }}>{Math.round(m.winnersCaptured * 100)}%</div><div className="text-[.6rem] text-t3 mt-1">move captured</div></div>
            </Ring>
            <div>
              <div className="lbl mb-1">Exit efficiency</div>
              <div className="text-[.78rem] text-t3 max-w-[12rem]">Of the favorable move available on your winners, this is how much you actually banked.</div>
            </div>
          </div>
          <div>
            <p className="text-[.95rem] text-t1 leading-relaxed">{m.verdict}</p>
            <div className="mt-3 flex flex-wrap gap-2">
              <span className="chip" style={{ color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 30%, transparent)" }}>left on table {usd(m.totalLeftOnTable)}</span>
              <span className="chip">avg heat {m.avgHeatPts.toFixed(0)} pts</span>
              <span className="chip" style={{ color: m.loserMfeRate > 0.45 ? "var(--amb)" : "var(--t2)" }}>{Math.round(m.loserMfeRate * 100)}% of losers were green first</span>
            </div>
          </div>
        </div>
      </div>

      {/* EXECUTION LEAKS */}
      {m.leaks.length > 0 && (
        <div className="grid md:grid-cols-2 gap-4">
          {m.leaks.map((l, i) => (
            <Panel key={i} title={l.title} icon={<Icon name="down" />} accent="var(--red)">
              <p className="text-[.86rem] text-t2 leading-relaxed">{l.detail}</p>
              <div className="mt-3 inline-flex items-center gap-2 rounded-lg px-3 py-1.5" style={{ background: "rgba(220,38,38,.08)", border: "1px solid rgba(220,38,38,.2)" }}>
                <span className="text-[.72rem] text-t3">estimated cost</span><span className="mono font-bold text-red">{usd(-l.cost)}</span>
              </div>
            </Panel>
          ))}
        </div>
      )}

      {/* EDGE DECAY */}
      <Panel title="Edge decay" icon={<Icon name="spark" />} action={<span className="text-[.66rem] text-t3 uppercase tracking-wide">early vs recent expectancy</span>}>
        {decay.ready ? (
          <div>
            <p className="text-[.9rem] text-t1 leading-relaxed mb-4">{decay.summary}</p>
            <div className="space-y-2.5">
              {[...(decay.overall ? [decay.overall] : []), ...decay.setups].map((d, i) => {
                const st = DSTATUS[d.status];
                const max = Math.max(Math.abs(d.earlyExp), Math.abs(d.recentExp), 1);
                return (
                  <div key={i} className="flex items-center gap-3">
                    <span className="text-[.84rem] w-36 shrink-0 truncate" style={{ color: d.key === "Overall edge" ? "var(--t1)" : "var(--t2)", fontWeight: d.key === "Overall edge" ? 600 : 400 }}>{d.key}</span>
                    <div className="flex-1 flex items-center gap-2">
                      <span className="text-[.66rem] text-t3 w-10 text-right">early</span>
                      <div className="flex-1 h-3 rounded relative" style={{ background: "var(--panel2)" }}><div className="absolute inset-y-0 left-0 rounded" style={{ width: (Math.abs(d.earlyExp) / max) * 100 + "%", background: d.earlyExp >= 0 ? "var(--grn)" : "var(--red)", opacity: .45 }} /></div>
                      <span className="text-[.66rem] text-t3 w-10 text-right">now</span>
                      <div className="flex-1 h-3 rounded relative" style={{ background: "var(--panel2)" }}><div className="absolute inset-y-0 left-0 rounded" style={{ width: (Math.abs(d.recentExp) / max) * 100 + "%", background: d.recentExp >= 0 ? "var(--grn)" : "var(--red)" }} /></div>
                    </div>
                    <span className="text-[.66rem] font-semibold w-20 text-right shrink-0" style={{ color: st.color }}>{st.label}</span>
                  </div>
                );
              })}
            </div>
            <div className="text-[.72rem] text-t3 mt-3">Bars compare your average $/trade in the first half of each setup's history vs the most recent half. A green-to-red flip is an edge that has stopped working.</div>
          </div>
        ) : <div className="text-t3 text-sm py-3">Add more trades (and tag your setups) to track edge decay over time.</div>}
      </Panel>
      <p className="text-[.7rem] text-t3">Execution analytics require entry/exit/high/low per trade — upload a richer CSV to sharpen these.</p>
    </div>
  );
}
