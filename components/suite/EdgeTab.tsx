"use client";
import { type Profile } from "../../lib/profile";
import { computeEdge, type EdgeCond } from "../../lib/edge";
import { usd, pct } from "../../lib/format";
import { SuiteHeader, Panel, Ring, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const CSS = `
.edge-hero { position:relative; overflow:hidden; border:1px solid color-mix(in srgb, var(--grn) 28%, var(--line2)); }
.edge-hero::before { content:""; position:absolute; inset:0; pointer-events:none; background: radial-gradient(520px 260px at 18% 20%, color-mix(in srgb, var(--grn) 16%, transparent), transparent 70%); }
.edge-dot { opacity:0; animation: edot .5s ease forwards; }
@keyframes edot { to { opacity:1; } }
@media (prefers-reduced-motion: reduce){ .edge-dot{ animation:none; opacity:1; } }
`;

function Row({ c, good }: { c: EdgeCond; good: boolean }) {
  const col = good ? "var(--grn)" : "var(--red)";
  return (
    <div className="flex items-center gap-3 rounded-lg p-3" style={{ background: "rgba(127,127,127,0.09)" }}>
      <span className="text-[.58rem] font-bold uppercase tracking-wide text-t3 w-[66px] shrink-0">{c.kind}</span>
      <div className="flex-1 min-w-0">
        <div className="text-[.9rem] font-semibold truncate">{c.label}</div>
        <div className="h-1.5 rounded-full mt-1.5 overflow-hidden" style={{ background: "color-mix(in srgb, var(--t3) 16%, transparent)" }}>
          <div className="h-full rounded-full" style={{ width: `${Math.round(c.winRate * 100)}%`, background: col }} />
        </div>
        <div className="text-[.72rem] text-t2 mt-1">{pct(c.winRate)} win · {c.trades} trades · {usd(Math.round(c.net))} net</div>
      </div>
      <div className="mono text-[.95rem] font-bold shrink-0" style={{ color: col }}>{c.expectancy >= 0 ? "+" : ""}{usd(Math.round(c.expectancy))}<span className="text-t3 text-[.62rem] font-normal">/tr</span></div>
    </div>
  );
}

export function EdgeTab({ profile }: { profile: Profile }) {
  const e = computeEdge(profile.trades);
  if (!e.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="FundedCore Pro · Your Edge" title="Where you actually make money" sub="Not signals. Not predictions. Your own proven winning conditions, mined from your real trades." />
        <EmptyState icon="spark" title="Need more trades" body={e.reasonNeed || "Log more and your edge appears."} />
      </div>
    );
  }
  const top = e.best[0];
  const spectrum = [...e.worst, ...e.best];
  const emax = Math.max(1, ...spectrum.map((c) => Math.abs(c.expectancy)));
  const tmax = Math.max(...spectrum.map((c) => c.trades), 1);
  const W = 680, H = 120, cyy = 64;
  const sx = (v: number) => W / 2 + (v / emax) * (W / 2 - 46);
  const facts = `Best: ${e.best.slice(0, 3).map((c) => `${c.label} (${Math.round(c.winRate * 100)}%, ${usd(Math.round(c.expectancy))}/trade)`).join(", ")}. Worst: ${e.worst.slice(0, 2).map((c) => c.label).join(", ")}.`;

  return (
    <div className="fade space-y-5">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SuiteHeader eyebrow="FundedCore Pro · Your Edge" title="Where you actually make money"
        sub="Not a signal bot guessing the market. We read YOUR history and find the exact conditions your own data proves you win on. Trade these. Trim the rest."
        right={<span className="chip" style={{ color: "var(--acc)", borderColor: "color-mix(in srgb, var(--acc) 35%, transparent)" }}>PRO</span>} />

      {/* HERO — sharpest edge */}
      {top ? (
        <div className="card edge-hero p-6 md:p-7">
          <div className="relative grid sm:grid-cols-[auto_1fr] gap-6 items-center">
            <div className="justify-self-center">
              <Ring pct={Math.max(0, Math.min(1, top.winRate))} color="var(--grn)" size={140} stroke={12}>
                <div className="text-center"><div className="mono text-[1.7rem] font-bold leading-none" style={{ color: "var(--grn)" }}>{pct(top.winRate)}</div><div className="text-[.54rem] text-t3 uppercase tracking-wide mt-0.5">win rate</div></div>
              </Ring>
            </div>
            <div>
              <div className="eyebrow" style={{ color: "var(--grn)" }}>Your sharpest edge</div>
              <div className="text-2xl md:text-[1.7rem] font-bold mt-1 leading-tight">{top.label} <span className="text-t3 text-base font-normal">· {top.kind}</span></div>
              <div className="flex flex-wrap gap-2 mt-3">
                <span className="chip" style={{ color: "var(--grn)", borderColor: "color-mix(in srgb, var(--grn) 30%, transparent)" }}>+{usd(Math.round(top.expectancy))}/trade</span>
                <span className="chip">{top.trades} trades</span>
                <span className="chip">{usd(Math.round(top.net))} net</span>
              </div>
              <p className="text-t2 text-[.92rem] mt-3 leading-relaxed">This is the condition your own data proves you win on. Concentrate your size and your focus here — it's your weapon.</p>
            </div>
          </div>
        </div>
      ) : (
        <div className="card p-6 text-t2 text-[.95rem]">{e.headline}</div>
      )}

      {/* SPECTRUM */}
      <Panel title="Your edge spectrum" icon="chart">
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 120 }}>
          <defs><linearGradient id="espec" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stopColor="var(--red)" stopOpacity="0.5" /><stop offset="0.5" stopColor="var(--t3)" stopOpacity="0.3" /><stop offset="1" stopColor="var(--grn)" stopOpacity="0.5" /></linearGradient></defs>
          <line x1="40" y1={cyy} x2={W - 40} y2={cyy} stroke="url(#espec)" strokeWidth="2.5" strokeLinecap="round" />
          <line x1={W / 2} y1={cyy - 14} x2={W / 2} y2={cyy + 14} stroke="var(--line2)" strokeWidth="1" strokeDasharray="2 3" />
          {spectrum.map((c, i) => {
            const x = sx(c.expectancy); const good = c.expectancy >= 0;
            const r = 4 + (c.trades / tmax) * 7;
            return <circle key={i} className="edge-dot" style={{ animationDelay: `${i * 0.07}s` }} cx={x.toFixed(1)} cy={cyy} r={r.toFixed(1)} fill={good ? "var(--grn)" : "var(--red)"} fillOpacity="0.9" stroke={good ? "var(--grn)" : "var(--red)"} strokeOpacity="0.3" strokeWidth="6" />;
          })}
          <text x="44" y={cyy + 34} fill="var(--t3)" fontSize="11" fontWeight="600">LOSING ←</text>
          <text x={W - 44} y={cyy + 34} fill="var(--t3)" fontSize="11" fontWeight="600" textAnchor="end">→ WINNING</text>
        </svg>
        <div className="text-[.72rem] text-t3 mt-1">Every condition you trade, placed by expectancy. Bigger dot = more trades. Pull your size toward the right.</div>
      </Panel>

      <Panel title="Your A+ edges — concentrate here" icon="up">
        <div className="space-y-2">{e.best.length ? e.best.map((c, i) => <Row key={i} c={c} good />) : <div className="text-t3 text-sm py-2">No clearly profitable condition yet.</div>}</div>
      </Panel>
      <Panel title="Your money pits — trim or cut" icon="down">
        <div className="space-y-2">{e.worst.length ? e.worst.map((c, i) => <Row key={i} c={c} good={false} />) : <div className="text-t3 text-sm py-2">Nothing clearly losing — good.</div>}</div>
      </Panel>

      <AIRead module="Your Edge" facts={facts} />
      <p className="text-[.7rem] text-t3">Built only from conditions with 5+ of your own trades. It describes your past edge — not a guarantee the market repeats. For insight, not financial advice.</p>
    </div>
  );
}
