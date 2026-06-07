import type { ScoreResult } from "../lib/score";
import { usd, pct, num, DECISION_META } from "../lib/format";
import { ScoreGauge, Radar, EquityCurve, PnlBars, ScoreBar } from "./Visuals";
import Link from "next/link";

export function ScoreReport({ r, name }: { r: ScoreResult; name?: string }) {
  const dm = DECISION_META[r.decision];
  const a = r.analytics;

  return (
    <div className="space-y-5">
      {/* Verdict header */}
      <section className="card p-6 md:p-8 fade fade-1">
        <div className="grid md:grid-cols-[auto_1fr] gap-7 items-center">
          <div className="flex flex-col items-center">
            <ScoreGauge score={r.traderScore} grade={r.grade} />
            <div className="mt-2 text-xs text-t3">
              confidence {pct(r.confidence)} · {a.trades} trades · {a.spanDays}d
            </div>
          </div>
          <div>
            <div className="flex items-center gap-3 flex-wrap">
              <span className="chip" style={{ background: dm.bg, borderColor: dm.color + "55", color: dm.color }}>
                ● {dm.label.toUpperCase()}
              </span>
              {name && <span className="text-t2 text-sm">{name}</span>}
            </div>
            <h2 className="mt-3 text-2xl md:text-[1.7rem] font-bold leading-snug grad-text">
              {r.headline}
            </h2>
            {r.decision !== "DECLINED" ? (
              <div className="mt-5 grid sm:grid-cols-3 gap-3">
                <Stat label="Capital allocated" value={usd(r.offer.accountSize)} accent={dm.color} />
                <Stat label="Your profit split" value={pct(r.offer.profitSplit)} accent={dm.color} />
                <Stat label="Account drawdown" value={usd(r.offer.maxDrawdown)} />
              </div>
            ) : (
              <p className="mt-4 text-t2 text-sm leading-relaxed max-w-xl">
                No money changes hands and you owe us nothing. Tighten the flagged behaviors below,
                log more trades, and re-submit any time — the underwriting is free, always.
              </p>
            )}
          </div>
        </div>
      </section>

      {/* Sub-scores: radar + four dimension cards */}
      <section className="grid lg:grid-cols-[300px_1fr] gap-5">
        <div className="card p-5 flex flex-col items-center justify-center fade fade-2">
          <div className="eyebrow self-start mb-1">The fingerprint</div>
          <Radar axes={r.subscores.map((s) => ({ label: s.label.split(" ")[0], score: s.score }))} />
        </div>
        <div className="grid sm:grid-cols-2 gap-4 fade fade-2">
          {r.subscores.map((s) => (
            <div key={s.key} className="card p-5 card-hover">
              <div className="flex items-baseline justify-between">
                <h3 className="font-semibold text-[.98rem]">{s.label}</h3>
                <span className="mono text-xl font-semibold" style={{ color: scoreCol(s.score) }}>{s.score}</span>
              </div>
              <div className="mt-2"><ScoreBar score={s.score} /></div>
              <p className="mt-2.5 text-[.8rem] text-t2">{s.blurb}</p>
              <div className="mt-3 grid grid-cols-2 gap-x-4 gap-y-1.5">
                {s.metrics.map((m) => (
                  <div key={m.label} className="flex items-center justify-between text-[.78rem]">
                    <span className="text-t3">{m.label}</span>
                    <span className="mono text-t1">{m.value}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      {/* Equity curve + KPIs */}
      <section className="card p-5 md:p-6 fade fade-3">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold">Verified equity curve</h3>
          <span className={`mono text-sm ${a.totalPnl >= 0 ? "text-grn" : "text-red"}`}>
            {a.totalPnl >= 0 ? "+" : ""}{usd(a.totalPnl)} net
          </span>
        </div>
        <EquityCurve data={a.equityCurve} />
        <div className="mt-3"><PnlBars data={a.dailyPnl.map((d) => d.pnl)} /></div>
        <div className="divider my-5" />
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-y-4 gap-x-3">
          <KPI label="Win rate" value={pct(a.winRate)} />
          <KPI label="Profit factor" value={num(a.profitFactor)} />
          <KPI label="Expectancy" value={usd(a.expectancy)} />
          <KPI label="Payoff (W/L)" value={num(a.payoff)} />
          <KPI label="Sharpe (ann.)" value={num(a.sharpe, 1)} />
          <KPI label="Max drawdown" value={usd(a.maxDrawdown)} />
          <KPI label="Recovery factor" value={num(a.recoveryFactor, 1)} />
        </div>
      </section>

      {/* Strengths & flags */}
      <section className="grid md:grid-cols-2 gap-5 fade fade-4">
        <div className="card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Dot c="#10B981" /> What's working</h3>
          {r.strengths.length ? (
            <ul className="space-y-2.5">
              {r.strengths.map((s, i) => (
                <li key={i} className="text-[.85rem] text-t2 flex gap-2.5">
                  <span className="text-grn mt-0.5">▲</span><span>{s}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-t3">No standout strengths surfaced on this sample.</p>}
        </div>
        <div className="card p-5">
          <h3 className="font-semibold flex items-center gap-2 mb-3"><Dot c="#F59E0B" /> What underwriting flags</h3>
          {r.flags.length ? (
            <ul className="space-y-2.5">
              {r.flags.map((s, i) => (
                <li key={i} className="text-[.85rem] text-t2 flex gap-2.5">
                  <span className="text-amb mt-0.5">●</span><span>{s}</span>
                </li>
              ))}
            </ul>
          ) : <p className="text-sm text-t3">Clean — no material risk flags.</p>}
        </div>
      </section>

      {/* Offer / next step */}
      <section className="card p-6 md:p-7 fade fade-4" style={{ borderColor: dm.color + "44" }}>
        {r.decision !== "DECLINED" ? (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="eyebrow" style={{ color: dm.color }}>{dm.label} offer</div>
              <h3 className="text-xl font-bold mt-1">
                {usd(r.offer.accountSize)} live account · keep {pct(r.offer.profitSplit)}
              </h3>
              <p className="text-sm text-t2 mt-1.5 max-w-lg">
                Scale to the next tier after {usd(r.offer.scalingTarget)} in profit.
                Payouts: {r.offer.payoutCadence.toLowerCase()}. No fee — FundedCore earns only its
                {" "}{pct(1 - r.offer.profitSplit)} on profits you actually make.
              </p>
            </div>
            <Link href="/dashboard" className="btn btn-primary whitespace-nowrap">Open funded dashboard →</Link>
          </div>
        ) : (
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
            <div>
              <div className="eyebrow" style={{ color: dm.color }}>Not funded — yet</div>
              <h3 className="text-xl font-bold mt-1">The underwriting is free and unlimited.</h3>
              <p className="text-sm text-t2 mt-1.5 max-w-lg">
                Every prop firm you've paid wanted you to fail quietly. We just showed you exactly
                what to fix. Address the flags above and re-submit — there's no challenge fee and no limit on attempts.
              </p>
            </div>
            <Link href="/apply" className="btn btn-ghost whitespace-nowrap">Score another history</Link>
          </div>
        )}
      </section>
    </div>
  );
}

function scoreCol(s: number) {
  if (s >= 78) return "#10B981";
  if (s >= 62) return "#F59E0B";
  if (s >= 48) return "#FB923C";
  return "#EF4444";
}
function Stat({ label, value, accent }: { label: string; value: string; accent?: string }) {
  return (
    <div className="rounded-xl bg-black/[.03] border border-black/[.06] px-4 py-3">
      <div className="text-[.7rem] uppercase tracking-wide text-t3">{label}</div>
      <div className="mono text-lg font-semibold mt-0.5" style={{ color: accent || "#F0F4FF" }}>{value}</div>
    </div>
  );
}
function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[.7rem] uppercase tracking-wide text-t3">{label}</div>
      <div className="mono text-[1.05rem] font-semibold mt-0.5">{value}</div>
    </div>
  );
}
function Dot({ c }: { c: string }) {
  return <span className="inline-block w-2.5 h-2.5 rounded-full" style={{ background: c, boxShadow: `0 0 8px ${c}` }} />;
}
