"use client";
import Link from "next/link";
import { useMemo } from "react";
import { Nav, Footer } from "../../components/Nav";
import { ScoreGauge, Radar, EquityCurve, PnlBars } from "../../components/Visuals";
import { scoreTrades } from "../../lib/score";
import { sampleById } from "../../lib/sampleTraders";
import { usd, pct, num, scoreColor } from "../../lib/format";

export default function Dashboard() {
  const data = useMemo(() => {
    const trader = sampleById("maya")!;
    const r = scoreTrades(trader.trades);
    // Trader Score over time: expanding-window score at checkpoints.
    const trend: number[] = [];
    const N = trader.trades.length;
    for (let k = 6; k <= 12; k++) {
      const cut = Math.floor((N * k) / 12);
      trend.push(scoreTrades(trader.trades.slice(0, cut)).traderScore);
    }
    const recent = [...trader.trades].slice(-12).reverse();
    return { trader, r, trend, recent };
  }, []);

  const { r, trend, recent } = data;
  const a = r.analytics;
  const ddUsedPct = Math.min(1, a.maxDrawdown / r.offer.maxDrawdown);
  const scaleProgress = Math.min(1, a.totalPnl / r.offer.scalingTarget);
  const yourCut = a.totalPnl * r.offer.profitSplit;

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-5 py-10">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-7">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold">Maya Chen</h1>
              <span className="chip" style={{ borderColor: "#10B98155", color: "#10B981" }}>● FUNDED</span>
            </div>
            <p className="text-t2 text-sm mt-1">Disciplined Scalper · MNQ · funded account #FC-10428</p>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost !py-2 !px-4 text-sm">Request payout</button>
            <Link href="/apply" className="btn btn-primary !py-2 !px-4 text-sm">Re-underwrite</Link>
          </div>
        </div>

        {/* Top KPI row */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 mb-5">
          <Big label="Account size" value={usd(r.offer.accountSize)} sub="live capital allocated" />
          <Big label="Net profit" value={usd(a.totalPnl)} sub={`${pct(a.winRate)} win rate`} accent="#10B981" />
          <Big label="Your share (75%)" value={usd(yourCut)} sub={`split ${pct(r.offer.profitSplit)}`} accent="#10B981" />
          <Big label="Trader Score" value={String(r.traderScore)} sub={`grade ${r.grade}`} accent={scoreColor(r.traderScore)} />
        </div>

        {/* Equity + side panel */}
        <div className="grid lg:grid-cols-[1fr_320px] gap-5 mb-5">
          <div className="card p-5 md:p-6">
            <div className="flex items-center justify-between mb-3">
              <h2 className="font-semibold">Account equity</h2>
              <span className="mono text-sm text-grn">+{usd(a.totalPnl)}</span>
            </div>
            <EquityCurve data={a.equityCurve} height={230} />
            <div className="mt-3"><PnlBars data={a.dailyPnl.map((d) => d.pnl)} /></div>
            <div className="text-[.72rem] text-t3 mt-2">Daily P&amp;L · {a.trades} trades over {a.spanDays} days</div>
          </div>

          <div className="card p-5 flex flex-col items-center">
            <h2 className="font-semibold self-start mb-1">Current score</h2>
            <ScoreGauge score={r.traderScore} grade={r.grade} size={190} />
            <div className="w-full mt-3">
              <Radar axes={r.subscores.map((s) => ({ label: s.label.split(" ")[0], score: s.score }))} size={230} />
            </div>
          </div>
        </div>

        {/* Funding status row */}
        <div className="grid md:grid-cols-3 gap-5 mb-5">
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Scaling progress</h3>
            <div className="text-2xl font-bold mono">{pct(scaleProgress)}</div>
            <p className="text-[.78rem] text-t3 mb-3">to next tier at {usd(r.offer.scalingTarget)} profit</p>
            <Progress frac={scaleProgress} color="#3B82F6" />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Drawdown used</h3>
            <div className="text-2xl font-bold mono" style={{ color: ddUsedPct > 0.7 ? "#EF4444" : "#F0F4FF" }}>{pct(ddUsedPct)}</div>
            <p className="text-[.78rem] text-t3 mb-3">{usd(a.maxDrawdown)} of {usd(r.offer.maxDrawdown)} limit</p>
            <Progress frac={ddUsedPct} color={ddUsedPct > 0.7 ? "#EF4444" : "#10B981"} />
          </div>
          <div className="card p-5">
            <h3 className="font-semibold text-sm mb-3">Score trajectory</h3>
            <ScoreTrend data={trend} />
            <p className="text-[.78rem] text-t3 mt-2">Trader Score over the funded period — trending {trend[trend.length - 1] >= trend[0] ? "up" : "down"}.</p>
          </div>
        </div>

        {/* Metrics + recent trades */}
        <div className="grid lg:grid-cols-[1fr_1.3fr] gap-5">
          <div className="card p-5">
            <h3 className="font-semibold mb-4">Risk &amp; performance</h3>
            <div className="grid grid-cols-2 gap-y-4">
              <KPI label="Profit factor" value={num(a.profitFactor)} />
              <KPI label="Expectancy" value={usd(a.expectancy)} />
              <KPI label="Sharpe (ann.)" value={num(a.sharpe, 1)} />
              <KPI label="Recovery factor" value={num(a.recoveryFactor, 1)} />
              <KPI label="Avg win" value={usd(a.avgWin)} />
              <KPI label="Avg loss" value={usd(a.avgLoss)} />
              <KPI label="Best day" value={usd(a.bestDay)} />
              <KPI label="Worst day" value={usd(a.worstDay)} />
            </div>
          </div>
          <div className="card p-5">
            <h3 className="font-semibold mb-3">Recent trades</h3>
            <div className="overflow-x-auto">
              <table className="tbl">
                <thead>
                  <tr><th>Date</th><th>Symbol</th><th>Side</th><th>Size</th><th className="text-right">P&amp;L</th></tr>
                </thead>
                <tbody>
                  {recent.map((t) => (
                    <tr key={t.id}>
                      <td className="mono text-t2">{t.date}</td>
                      <td className="mono">{t.symbol}</td>
                      <td className="capitalize text-t2">{t.side}</td>
                      <td className="mono text-t2">{t.size}</td>
                      <td className={`mono text-right font-medium ${t.pnl >= 0 ? "text-grn" : "text-red"}`}>
                        {t.pnl >= 0 ? "+" : ""}{usd(t.pnl)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <p className="text-[.72rem] text-t3 mt-6 text-center">
          Demonstration dashboard populated with a sample funded trader. Figures are illustrative.
        </p>
      </main>
      <Footer />
    </>
  );
}

function Big({ label, value, sub, accent }: { label: string; value: string; sub: string; accent?: string }) {
  return (
    <div className="card p-5">
      <div className="text-[.72rem] uppercase tracking-wide text-t3">{label}</div>
      <div className="text-2xl font-bold mono mt-1" style={{ color: accent || "#F0F4FF" }}>{value}</div>
      <div className="text-[.76rem] text-t3 mt-0.5">{sub}</div>
    </div>
  );
}
function KPI({ label, value }: { label: string; value: string }) {
  return (
    <div>
      <div className="text-[.72rem] uppercase tracking-wide text-t3">{label}</div>
      <div className="mono text-[1.05rem] font-semibold mt-0.5">{value}</div>
    </div>
  );
}
function Progress({ frac, color }: { frac: number; color: string }) {
  return (
    <div className="h-2 w-full rounded-full bg-white/[.06] overflow-hidden">
      <div className="h-full rounded-full" style={{ width: `${frac * 100}%`, background: color, boxShadow: `0 0 8px ${color}99` }} />
    </div>
  );
}
function ScoreTrend({ data }: { data: number[] }) {
  if (data.length < 2) return null;
  const w = 280, h = 56, pad = 6;
  const min = Math.min(...data) - 3, max = Math.max(...data) + 3;
  const span = max - min || 1;
  const x = (i: number) => pad + (i / (data.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - min) / span) * (h - pad * 2);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <path d={line} fill="none" stroke="#3B82F6" strokeWidth={2.4} strokeLinejoin="round"
        style={{ filter: "drop-shadow(0 1px 4px #3B82F688)" }} />
      {data.map((v, i) => <circle key={i} cx={x(i)} cy={y(v)} r={2.4} fill="#93C5FD" />)}
    </svg>
  );
}
