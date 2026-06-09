"use client";
import { type Profile } from "../../lib/profile";
import { analyze, type Bucket } from "../../lib/insights";
import { usd, pct } from "../../lib/format";
import { SuiteHeader } from "./ui";
import { AIRead } from "./AIRead";

export function InsightsTab({ profile }: { profile: Profile }) {
  if (profile.trades.length < 5) return <div className="card p-8 text-center text-t3">Add at least ~20 trades (Journal tab) to unlock your personalized insights.</div>;
  const ins = analyze(profile.trades);
  const sevColor: Record<string, string> = { high: "#EF4444", med: "#F59E0B", low: "#94A3B8" };

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow="Insights" title="What's costing you — and what's working" sub="Your leaks, ranked by the dollars they cost you. Your strengths, ready to scale." />
      <AIRead module="Insights" facts={`Net $${Math.round(ins.totals.net)}, win rate ${Math.round(ins.totals.winRate*100)}%. Leaks: ${ins.leaks.map(l=>l.title+" -$"+Math.round(l.cost)).join("; ")||"none"}. Best window ${ins.bestWindow?.key||"n/a"}; worst ${ins.worstWindow?.key||"n/a"}.`} />

      <section className="space-y-3">
        <h3 className="font-semibold">Your leaks, ranked by what they cost you</h3>
        {ins.leaks.length ? ins.leaks.map((l, i) => (
          <div key={i} className="card p-5">
            <div className="flex items-start justify-between gap-3">
              <div>
                <div className="flex items-center gap-2"><span className="chip" style={{ borderColor: sevColor[l.severity] + "66", color: sevColor[l.severity] }}>{l.severity}</span><h4 className="font-semibold">{l.title}</h4></div>
                <p className="text-[.86rem] text-t2 mt-1.5">{l.detail}</p>
                <p className="text-[.86rem] text-t1 mt-1.5">→ {l.fix}</p>
              </div>
              <div className="text-right shrink-0"><div className="lbl">cost</div><div className="mono font-bold text-red">{usd(-l.cost)}</div></div>
            </div>
          </div>
        )) : <div className="card p-5 text-t3 text-sm">No material leaks detected on this sample — clean trading.</div>}
      </section>

      {ins.strengths.length > 0 && (
        <section className="card p-5">
          <h3 className="font-semibold mb-2">Lean into these</h3>
          <ul className="space-y-1.5">{ins.strengths.map((s, i) => <li key={i} className="text-[.86rem] text-t2 flex gap-2"><span className="text-grn">▲</span>{s}</li>)}</ul>
        </section>
      )}

      <div className="grid md:grid-cols-2 gap-5">
        <BucketChart title="By hour (UTC)" buckets={ins.byHour} />
        <BucketChart title="By day of week" buckets={ins.byDay} />
      </div>
      <div className="grid md:grid-cols-2 gap-5">
        <BucketTable title="By instrument" buckets={ins.bySymbol} />
        {ins.bySetup.length > 0 ? <BucketTable title="By setup" buckets={ins.bySetup} /> : (
          <div className="card p-5 flex items-center justify-center text-center text-t3 text-sm">
            Tag your trades with a setup (Today tab, or a &quot;setup&quot; column in your CSV)<br />to see which playbook actually pays you.
          </div>
        )}
      </div>
    </div>
  );
}

function BucketChart({ title, buckets }: { title: string; buckets: Bucket[] }) {
  const max = Math.max(1, ...buckets.map((b) => Math.abs(b.net)));
  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <div className="space-y-1.5">
        {buckets.map((b) => (
          <div key={b.key} className="flex items-center gap-2 text-[.8rem]">
            <span className="w-12 text-t3 mono shrink-0">{b.key}</span>
            <div className="flex-1 h-4 bg-black/[.04] rounded relative overflow-hidden">
              <div className="h-full rounded" style={{ width: `${(Math.abs(b.net) / max) * 100}%`, background: b.net >= 0 ? "#10B981" : "#EF4444", opacity: .8 }} />
            </div>
            <span className="w-16 text-right mono shrink-0" style={{ color: b.net >= 0 ? "#10B981" : "#EF4444" }}>{usd(b.net)}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function BucketTable({ title, buckets }: { title: string; buckets: Bucket[] }) {
  return (
    <div className="card p-5">
      <h3 className="font-semibold mb-3">{title}</h3>
      <table className="tbl">
        <thead><tr><th>Symbol</th><th>Trades</th><th>Win rate</th><th className="text-right">Net</th></tr></thead>
        <tbody>
          {buckets.map((b) => (
            <tr key={b.key}>
              <td className="mono">{b.key}</td><td>{b.trades}</td><td>{pct(b.winRate)}</td>
              <td className="text-right mono" style={{ color: b.net >= 0 ? "#10B981" : "#EF4444" }}>{usd(b.net)}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
