"use client";
import { useMemo, useState } from "react";
import { type Profile } from "../../lib/profile";
import { survival } from "../../lib/survival";
import { benchmark } from "../../lib/benchmark";
import { archetype } from "../../lib/archetype";
import { shareTraderCard } from "../../lib/tradercard";
import { INSTRUMENTS } from "../../lib/firms";
import { usd } from "../../lib/format";
import { SuiteHeader, Ring, Panel, StatTile, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const INSTR = Object.keys(INSTRUMENTS);
const VCOL: Record<string, string> = { GO: "var(--grn)", CAUTION: "var(--amb,#f5a623)", SKIP: "var(--red)" };

export function SurvivalTab({ profile }: { profile: Profile }) {
  const [accId, setAccId] = useState(profile.accounts[0]?.id || "");
  const [inst, setInst] = useState(profile.settings.instrument || "MNQ");
  const [contracts, setContracts] = useState(2);
  const [stopPts, setStopPts] = useState(profile.settings.defaultStop || 20);
  const acc = profile.accounts.find((a) => a.id === accId) || profile.accounts[0] || null;

  const s = useMemo(() => survival(profile.trades, acc, {
    dailyLossStop: profile.settings.dailyLossStop, maxTradesPerDay: profile.settings.maxTradesPerDay,
    proposed: { instrument: inst, contracts, stopPts },
  }), [profile.trades, acc, profile.settings, inst, contracts, stopPts]);
  const bench = useMemo(() => benchmark(profile.trades, acc), [profile.trades, acc]);
  const mv = (k: string) => bench.metrics.find((m) => m.key === k)?.value;
  const arch = archetype({ composure: mv("composure") ?? s.score, breachOdds: s.breachOdds, winRate: mv("winRate") ?? 0, payoff: mv("payoff") ?? 1, tilt: s.tiltIndex, bufferPct: s.bufferPct });
  const cardAccent = arch.accent === "green" ? "var(--grn)" : arch.accent === "amber" ? "var(--amb,#f5a623)" : "var(--red)";
  function shareCard() {
    shareTraderCard({ name: profile.name, archName: arch.name, tagline: arch.tagline, accent: arch.accent, survival: s.score, grade: s.grade, breachPct: Math.round(s.breachOdds * 100), composure: Math.round(mv("composure") ?? s.score), winRatePct: Math.round((mv("winRate") ?? 0) * 100), topPct: bench.composite, trades: profile.trades.length });
  }

  if (!s.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="The Survival Score" title="Will your account survive?" sub="A live, forward-looking read on your breach odds — from your behavior, your buffer, and your firm's exact rules." />
        <EmptyState icon="shield" title="Not enough to read yet" body={s.headline} />
      </div>
    );
  }

  const col = s.score >= 70 ? "var(--grn)" : s.score >= 45 ? "var(--amb,#f5a623)" : "var(--red)";
  const facts = `Survival score ${s.score}/100 (${s.grade}); forward breach probability ${(s.breachOdds * 100).toFixed(0)}% over ${s.horizonDays} days. ` +
    `Distance to breach ${usd(s.distanceToBreach)}, buffer ${(s.bufferPct * 100).toFixed(0)}%, tilt index ${s.tiltIndex}/100, ${s.consecLosses} losses in a row. ` +
    (s.sim ? `Proposed ${contracts} ${inst} @ ${stopPts}pt stop risks ${usd(s.sim.riskDollars)}; odds ${(s.sim.oddsBefore*100).toFixed(0)}%→${(s.sim.oddsAfter*100).toFixed(0)}%; verdict ${s.sim.verdict}. ` : "") +
    `Drivers: ${s.drivers.map((d) => `${d.label} (${d.dir})`).join(", ") || "none"}.`;

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="The Survival Score" title="Will your account survive?"
        sub="The one number that fuses your behavior, your buffer, and your firm's exact rules into a live read on whether you keep the account — before you take the next trade."
        right={<span className="chip" style={{ color: col }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: col }} /> {(s.breachOdds * 100).toFixed(0)}% breach risk</span>} />

      <div className="card p-4 flex flex-wrap items-center gap-3" style={{ borderColor: "color-mix(in srgb, var(--acc) 30%, var(--line2))" }}>
        <div>
          <div className="eyebrow" style={{ color: "var(--acc)" }}>Your trader type</div>
          <div className="text-xl font-bold" style={{ color: cardAccent }}>{arch.name}</div>
          <div className="text-[.85rem] text-t2">{arch.tagline}</div>
        </div>
        <button onClick={shareCard} className="btn btn-primary text-sm ml-auto shrink-0 inline-flex items-center gap-1.5"><Icon name="up" size={14} /> Share my Trader Card</button>
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        <div className="card p-6">
          <div className="flex items-center gap-5">
            <Ring pct={s.score / 100} color={col} size={140} stroke={12}>
              <div className="text-center">
                <div className="mono font-bold leading-none" style={{ fontSize: "2.2rem", color: col }}>{s.score}</div>
                <div className="text-[.55rem] text-t3 mt-0.5 uppercase tracking-wide">survival · {s.grade}</div>
              </div>
            </Ring>
            <div>
              <div className="lbl mb-1">Odds you keep the account (next {s.horizonDays} days)</div>
              <p className="text-[.98rem] text-t1 leading-relaxed">{s.headline}</p>
              {s.runway && (
                <div className="text-[.8rem] text-t2 mt-2">
                  {s.runway.greenDays != null ? <>~<b>{s.runway.greenDays} green days</b> from your payout ({usd(s.runway.toTarget)} to go).</> : <>{usd(s.runway.toTarget)} to your payout target.</>}
                </div>
              )}
            </div>
          </div>
          <div className="grid grid-cols-3 gap-3 mt-5">
            <StatTile icon={<Icon name="shield" size={15} />} label="To breach" value={usd(s.distanceToBreach)} />
            <StatTile icon={<Icon name="gauge" size={15} />} label="Buffer" value={`${Math.round(s.bufferPct * 100)}%`} accent={s.bufferPct >= 0.4 ? "var(--grn)" : "var(--red)"} />
            <StatTile icon={<Icon name="bolt" size={15} />} label="Tilt" value={`${s.tiltIndex}`} accent={s.tiltIndex < 30 ? "var(--grn)" : s.tiltIndex < 60 ? "var(--amb,#f5a623)" : "var(--red)"} />
          </div>
        </div>

        {/* Pre-trade check */}
        <Panel title="Before you click buy" icon={<Icon name="target" />}>
          <div className="grid grid-cols-3 gap-3">
            <label><span className="lbl">Instrument</span><select className="inp !py-1.5 text-sm" value={inst} onChange={(e) => setInst(e.target.value)}>{INSTR.map((k) => <option key={k} value={k}>{k}</option>)}</select></label>
            <label><span className="lbl">Contracts</span><input type="number" min={0} className="inp !py-1.5 text-sm" value={contracts} onChange={(e) => setContracts(Math.max(0, +e.target.value))} /></label>
            <label><span className="lbl">Stop (pts)</span><input type="number" min={0} className="inp !py-1.5 text-sm" value={stopPts} onChange={(e) => setStopPts(Math.max(0, +e.target.value))} /></label>
          </div>
          {s.sim ? (
            <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(127,127,127,0.06)", border: `1px solid ${VCOL[s.sim.verdict]}55` }}>
              <div className="flex items-center gap-2">
                <span className="text-xl font-bold" style={{ color: VCOL[s.sim.verdict] }}>{s.sim.verdict}</span>
                <span className="text-[.72rem] text-t3">· {Math.round(s.sim.pctOfBuffer * 100)}% of your buffer</span>
              </div>
              <p className="text-[.9rem] text-t1 mt-1.5 leading-relaxed">{s.sim.line}</p>
              <div className="h-2 rounded-full mt-3" style={{ background: "var(--panel2, rgba(127,127,127,.15))" }}>
                <div className="h-full rounded-full" style={{ width: Math.round(s.sim.oddsAfter * 100) + "%", background: VCOL[s.sim.verdict], transition: "width .3s" }} />
              </div>
              <div className="text-[.7rem] text-t3 mt-1">breach odds after this trade</div>
            </div>
          ) : <div className="text-t3 text-sm mt-3">Add an account in Settings to run the pre-trade check against your real breach line.</div>}
        </Panel>
      </div>

      {s.drivers.length > 0 && (
        <Panel title="What's moving your risk right now" icon={<Icon name="spark" />}>
          <div className="space-y-2.5">
            {s.drivers.map((d, i) => (
              <div key={i} className="flex items-start gap-3">
                <span className="mt-0.5 text-sm" style={{ color: d.dir === "up" ? "var(--red)" : "var(--grn)" }}>{d.dir === "up" ? "▲" : "▼"}</span>
                <div><div className="font-medium text-[.9rem] text-t1">{d.label}</div><div className="text-[.8rem] text-t2 leading-snug">{d.detail}</div></div>
              </div>
            ))}
          </div>
        </Panel>
      )}

      <AIRead module="survival" facts={facts} />

      <p className="text-[.72rem] text-t3">The Survival Score is a probability estimate from your own trades, your live behavior, and your firm's rules — resampled forward. It shifts your odds; it does not remove risk, and it is not a guarantee. Numbers come from your data, never invented.</p>
    </div>
  );
}
