"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { computeFundedScore } from "../../lib/fundedscore";
import { usd } from "../../lib/format";
import { SuiteHeader, Ring, Panel, StatTile, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

function scoreColor(s: number) {
  return s >= 80 ? "var(--grn)" : s >= 65 ? "var(--acc)" : s >= 50 ? "var(--amb,#f5a623)" : "var(--red)";
}
function breachColor(p: number) {
  return p < 0.05 ? "var(--grn)" : p < 0.15 ? "var(--amb,#f5a623)" : "var(--red)";
}

export function FundedScoreTab({ profile }: { profile: Profile }) {
  const [accId, setAccId] = useState(profile.accounts[0]?.id || "");
  const [horizon, setHorizon] = useState(5);
  const acc = profile.accounts.find((a) => a.id === accId) || profile.accounts[0] || null;
  const fs = computeFundedScore(profile.trades, acc, { horizonDays: horizon });

  if (!fs.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="FundedScore" title="Your composure score + breach odds" sub="A predictive read on whether your behavior keeps the account — from your real trades." />
        <EmptyState icon="gauge" title="Not enough data yet" body={fs.headline} />
      </div>
    );
  }

  const sc = scoreColor(fs.composure);
  const breach = fs.breach;
  const facts = `Composure ${fs.composure}/100 (${fs.grade}), ${fs.confidence} confidence over ${fs.sampleDays} days. ` +
    (breach ? `Breach probability ${(breach.probability * 100).toFixed(0)}% in ${breach.horizonDays} days; ${usd(breach.distanceToBreach)} to breach; median day ${usd(breach.medianDailyPnl)}, worst ${usd(breach.worstDayPnl)}. ` : "") +
    `Drivers: ${fs.drivers.map((d) => `${d.label} ${d.impact}`).join(", ")}.`;

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="FundedScore" title="Your composure score + breach odds"
        sub="The predictive core: a behavioral discipline score and a breach probability simulated forward from YOUR own daily P&L against your firm's real floor. It sharpens as you log more — and as the network grows."
        right={<span className="chip" style={{ color: fs.confidence === "high" ? "var(--grn)" : fs.confidence === "medium" ? "var(--amb,#f5a623)" : "var(--red)" }}>{fs.confidence} confidence</span>} />

      <div className="grid lg:grid-cols-2 gap-5">
        {/* Composure */}
        <div className="card p-6">
          <div className="flex items-center gap-5">
            <Ring pct={fs.composure / 100} color={sc} size={132} stroke={11}>
              <div className="text-center">
                <div className="mono font-bold leading-none" style={{ fontSize: "2rem", color: sc }}>{fs.composure}</div>
                <div className="text-[.55rem] text-t3 mt-0.5 uppercase tracking-wide">composure · {fs.grade}</div>
              </div>
            </Ring>
            <div>
              <div className="lbl mb-1">Behavioral discipline</div>
              <p className="text-[.92rem] text-t1 leading-relaxed">{fs.headline}</p>
              <div className="text-[.7rem] text-t3 mt-2">{fs.sampleTrades} trades · {fs.sampleDays} days</div>
            </div>
          </div>
        </div>

        {/* Breach probability */}
        <div className="card p-6">
          {breach ? (
            <>
              <div className="flex items-center justify-between">
                <span className="lbl">Breach probability</span>
                <select className="inp !w-auto !py-1 text-[.74rem]" value={horizon} onChange={(e) => setHorizon(+e.target.value)}>
                  {[3, 5, 10, 20].map((h) => <option key={h} value={h}>next {h} days</option>)}
                </select>
              </div>
              <div className="flex items-end gap-3 mt-2">
                <div className="mono font-bold leading-none" style={{ fontSize: "2.6rem", color: breachColor(breach.probability) }}>
                  {(breach.probability * 100).toFixed(breach.probability < 0.1 ? 1 : 0)}%
                </div>
                <div className="text-[.74rem] text-t3 pb-1">chance you blow this account<br />in {breach.horizonDays} trading days</div>
              </div>
              <div className="mt-3 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--t3) 18%, transparent)" }}>
                <div className="h-full rounded-full" style={{ width: `${Math.min(100, Math.round(breach.probability * 100))}%`, background: breachColor(breach.probability) }} />
              </div>
              <div className="grid grid-cols-3 gap-2 mt-4 text-center">
                <div><div className="mono text-[.95rem] font-bold">{usd(breach.distanceToBreach)}</div><div className="text-[.62rem] text-t3">to breach</div></div>
                <div><div className="mono text-[.95rem] font-bold" style={{ color: breach.medianDailyPnl >= 0 ? "var(--grn)" : "var(--red)" }}>{usd(breach.medianDailyPnl)}</div><div className="text-[.62rem] text-t3">median day</div></div>
                <div><div className="mono text-[.95rem] font-bold" style={{ color: "var(--red)" }}>{usd(breach.worstDayPnl)}</div><div className="text-[.62rem] text-t3">worst day</div></div>
              </div>
              <p className="text-[.68rem] text-t3 mt-3">Bootstrapped from {breach.paths.toLocaleString()} simulated paths resampling your own daily P&L against your firm's floor + daily-loss rule.</p>
            </>
          ) : (
            <div className="text-center text-t3 py-8">
              <div className="lbl mb-2">Breach probability</div>
              Add a funded account to simulate breach odds against its real drawdown rules.
              <div className="mt-3">
                {profile.accounts.length > 0 && (
                  <select className="inp !w-auto" value={acc?.id || ""} onChange={(e) => setAccId(e.target.value)}>
                    {profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
                  </select>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {profile.accounts.length > 1 && breach && (
        <label className="text-[.78rem]"><span className="lbl">Account</span>
          <select className="inp !w-auto" value={acc?.id || ""} onChange={(e) => setAccId(e.target.value)}>
            {profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
          </select></label>
      )}

      {/* Drivers */}
      <Panel title="What's moving your score" icon="spark">
        <div className="space-y-2">
          {fs.drivers.sort((a, b) => b.weight - a.weight).map((d, i) => {
            const c = d.impact === "helps" ? "var(--grn)" : "var(--red)";
            return (
              <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "color-mix(in srgb, var(--bg2,#111) 55%, transparent)" }}>
                <span className="shrink-0 mt-0.5" style={{ color: c }}><Icon name={d.impact === "helps" ? "check" : "alert"} size={15} /></span>
                <div className="flex-1">
                  <div className="flex items-center justify-between">
                    <span className="text-[.88rem] font-semibold">{d.label}</span>
                    <span className="text-[.66rem] text-t3">weight {Math.round(d.weight * 100)}%</span>
                  </div>
                  <div className="text-[.8rem] text-t2 leading-snug">{d.detail}</div>
                </div>
              </div>
            );
          })}
        </div>
      </Panel>

      <AIRead module="FundedScore" facts={facts} />
      <p className="text-[.7rem] text-t3">FundedScore measures composure (behavior), not P&L. Breach probability is an estimate from resampling your own trading days forward — it's directional, not a guarantee, and gets more reliable the more you log. This is the foundation of the benchmark and breach-prediction layer.</p>
    </div>
  );
}
