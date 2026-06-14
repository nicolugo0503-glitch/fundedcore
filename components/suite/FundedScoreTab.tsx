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

function hexScore(n: number) { return n >= 80 ? "#10B981" : n >= 65 ? "#2BE3B0" : n >= 50 ? "#F5A623" : "#EF4444"; }
function hexBreach(p: number) { return p < 0.05 ? "#2BE3B0" : p < 0.15 ? "#F5A623" : "#EF4444"; }

async function shareScoreCard(fs: any, name: string) {
  const W = 1080, H = 1350;
  const c = document.createElement("canvas"); c.width = W; c.height = H;
  const x = c.getContext("2d"); if (!x) return;
  // bg
  const g = x.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "#0A0D11"); g.addColorStop(1, "#06080B");
  x.fillStyle = g; x.fillRect(0, 0, W, H);
  const rg = x.createRadialGradient(W / 2, 120, 40, W / 2, 120, 760);
  rg.addColorStop(0, "rgba(16,163,127,0.18)"); rg.addColorStop(1, "rgba(16,163,127,0)");
  x.fillStyle = rg; x.fillRect(0, 0, W, H);
  x.textAlign = "center";
  // wordmark
  x.font = "800 56px system-ui, -apple-system, Segoe UI, Roboto, sans-serif";
  const fw = x.measureText("Funded").width, cw = x.measureText("Core").width;
  const sx = W / 2 - (fw + cw) / 2;
  x.textAlign = "left"; x.fillStyle = "#EAF0F7"; x.fillText("Funded", sx, 130);
  x.fillStyle = "#2BE3B0"; x.fillText("Core", sx + fw, 130);
  x.textAlign = "center";
  // eyebrow
  x.fillStyle = "#2BE3B0"; x.font = "700 26px system-ui, sans-serif";
  x.fillText("F U N D E D S C O R E   ·   C O M P O S U R E", W / 2, 250);
  // big score
  const col = hexScore(fs.composure);
  x.fillStyle = col; x.font = "800 300px ui-monospace, 'JetBrains Mono', monospace";
  x.fillText(String(fs.composure), W / 2, 560);
  x.fillStyle = "#8A94A3"; x.font = "600 40px system-ui, sans-serif";
  x.fillText("/ 100   ·   GRADE " + fs.grade, W / 2, 630);
  // divider
  x.strokeStyle = "rgba(255,255,255,0.08)"; x.lineWidth = 2;
  x.beginPath(); x.moveTo(120, 720); x.lineTo(W - 120, 720); x.stroke();
  // breach
  if (fs.breach) {
    x.fillStyle = hexBreach(fs.breach.probability); x.font = "800 92px ui-monospace, monospace";
    x.fillText(Math.round(fs.breach.probability * 100) + "%", W / 2, 850);
    x.fillStyle = "#8A94A3"; x.font = "500 34px system-ui, sans-serif";
    x.fillText("chance to breach in " + fs.breach.horizonDays + " days", W / 2, 905);
  } else {
    x.fillStyle = "#EAF0F7"; x.font = "700 46px system-ui, sans-serif";
    x.fillText(fs.headline, W / 2, 850);
  }
  // top driver
  const hurt = fs.drivers.filter((d: any) => d.impact === "hurts").sort((a: any, b: any) => b.weight - a.weight)[0];
  if (hurt) { x.fillStyle = "#EF4444"; x.font = "600 32px system-ui, sans-serif"; x.fillText("Biggest leak: " + hurt.label, W / 2, 1010); }
  // CTA
  x.fillStyle = "#EAF0F7"; x.font = "700 40px system-ui, sans-serif";
  x.fillText("What's your score?", W / 2, 1210);
  x.fillStyle = "#2BE3B0"; x.font = "800 46px system-ui, sans-serif";
  x.fillText("funded-core.com", W / 2, 1270);

  const blob: Blob | null = await new Promise((r) => c.toBlob(r, "image/png"));
  if (!blob) return;
  const file = new File([blob], "fundedscore.png", { type: "image/png" });
  const text = `My FundedCore composure score: ${fs.composure}/100 \u{1F6E1} What's yours? funded-core.com`;
  try {
    if ((navigator as any).canShare && (navigator as any).canShare({ files: [file] })) {
      await (navigator as any).share({ files: [file], text });
      return;
    }
  } catch {}
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = "fundedscore.png"; a.click();
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
        right={<div className="flex items-center gap-2">
          <span className="chip" style={{ color: fs.confidence === "high" ? "var(--grn)" : fs.confidence === "medium" ? "var(--amb,#f5a623)" : "var(--red)" }}>{fs.confidence} confidence</span>
          <button onClick={() => shareScoreCard(fs, profile.name)} className="btn btn-primary !py-1.5 !px-3.5 text-[.8rem] inline-flex items-center gap-1.5"><Icon name="up" size={14} /> Share my score</button>
        </div>} />

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
              {acc
                ? `Need at least 3 trading days to simulate breach odds — you have ${fs.sampleDays}. Keep logging and this fills in.`
                : "Add a funded account to simulate breach odds against its real drawdown rules."}
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
              <div key={i} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "rgba(127,127,127,0.09)" }}>
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
