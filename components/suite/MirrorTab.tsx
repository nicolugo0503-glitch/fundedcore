"use client";
import { useEffect, useRef, useState } from "react";
import { type Profile } from "../../lib/profile";
import { computeMirror } from "../../lib/mirror";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const CSS = `
.mir-hero { position:relative; overflow:hidden; border:1px solid color-mix(in srgb, var(--red) 26%, var(--line2)); }
.mir-hero::before { content:""; position:absolute; inset:0; pointer-events:none;
  background: radial-gradient(680px 320px at 50% -40px, color-mix(in srgb, var(--red) 16%, transparent), transparent 70%); }
.mir-tax { font-variant-numeric: tabular-nums; letter-spacing:-.03em; line-height:.95;
  text-shadow: 0 6px 40px color-mix(in srgb, var(--red) 45%, transparent); }
.mir-draw { stroke-dasharray:1; stroke-dashoffset:1; animation: mirdraw 1.7s cubic-bezier(.35,.85,.3,1) forwards; }
.mir-draw.d2 { animation-delay:.25s; }
@keyframes mirdraw { to { stroke-dashoffset:0; } }
.mir-area { opacity:0; animation: mirfade 1.1s ease 1.05s forwards; }
@keyframes mirfade { to { opacity:1; } }
.mir-pop { opacity:0; transform: translateY(8px); animation: mirpop .6s ease forwards; }
@keyframes mirpop { to { opacity:1; transform:none; } }
.mir-endcap { opacity:0; animation: mirfade .5s ease 1.7s forwards; }
@media (prefers-reduced-motion: reduce){ .mir-draw,.mir-area,.mir-pop,.mir-endcap{ animation:none; opacity:1; stroke-dashoffset:0; transform:none; } }
`;

function useCountUp(target: number, ms = 1400) {
  const [v, setV] = useState(0);
  const ref = useRef(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (now: number) => {
      const p = Math.min(1, (now - start) / ms);
      const e = 1 - Math.pow(1 - p, 3);
      ref.current = target * e; setV(Math.round(ref.current));
      if (p < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function MirrorTab({ profile }: { profile: Profile }) {
  const m = computeMirror(profile.trades, { maxTradesPerDay: profile.settings.maxTradesPerDay, dailyLossStop: profile.settings.dailyLossStop });
  const taxAnim = useCountUp(m.ready ? Math.abs(m.tiltTax) : 0);

  if (!m.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="FundedCore Pro · The Mirror" title="Meet the disciplined you" sub="The version of you that never tilts — and what their discipline is worth, in dollars." />
        <EmptyState icon="spark" title="Not enough trades yet" body={m.reasonNeed || "Upload more trades and the Mirror comes alive."} />
      </div>
    );
  }

  // chart geometry
  const W = 680, H = 250, P = 14;
  const all = [...m.curveActual, ...m.curveDisc, 0];
  const mn = Math.min(...all), mx = Math.max(...all);
  const n = m.curveActual.length;
  const px = (i: number) => P + (i / (n - 1)) * (W - 2 * P);
  const py = (v: number) => H - P - ((v - mn) / (mx - mn || 1)) * (H - 2 * P);
  const line = (c: number[]) => c.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const gapArea = `${line(m.curveDisc)} L${px(n - 1).toFixed(1)},${py(m.curveActual[n - 1]).toFixed(1)} ${m.curveActual.slice().reverse().map((v, j) => `L${px(n - 1 - j).toFixed(1)},${py(v).toFixed(1)}`).join(" ")} Z`;
  const zeroY = py(0);
  const taxPos = m.tiltTax > 0;

  const facts = `Disciplined you netted ${usd(m.disciplinedNet)} vs your actual ${usd(m.actualNet)}. Tilt tax: ${usd(m.tiltTax)}. Top leaks: ${m.breaks.slice(0, 3).map((b) => `${b.label} (${usd(b.saved)})`).join(", ")}.`;

  return (
    <div className="fade space-y-5">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SuiteHeader eyebrow="FundedCore Pro · The Mirror" title="Meet the disciplined you"
        sub="We replayed every one of your real trades and removed only the ones that broke your own rules. This is what the version of you that never tilts would have made — doing nothing different but following the plan."
        right={<span className="chip" style={{ color: "var(--acc)", borderColor: "color-mix(in srgb, var(--acc) 35%, transparent)" }}>PRO</span>} />

      {/* HERO — the tilt tax */}
      <div className="card mir-hero p-8 md:p-10 text-center">
        <div className="relative">
          <div className="eyebrow mir-pop" style={{ color: taxPos ? "var(--red)" : "var(--grn)", animationDelay: ".1s" }}>{taxPos ? "Your tilt tax" : "Your discipline edge"}</div>
          <div className="mir-tax mono font-extrabold mt-2" style={{ fontSize: "clamp(3.2rem, 12vw, 6rem)", color: taxPos ? "var(--red)" : "var(--grn)" }}>
            {taxPos ? "−" : "+"}{usd(taxAnim)}
          </div>
          <p className="text-t2 text-[1rem] mt-3 max-w-md mx-auto leading-relaxed mir-pop" style={{ animationDelay: ".3s" }}>
            {taxPos ? "is what your behavior — not the market — quietly took from you across " : "is what your discipline earned you over "}{m.total} trades.
          </p>
        </div>
      </div>

      {/* DIVERGENCE CHART */}
      <div className="card p-6">
        <div className="flex items-center justify-between flex-wrap gap-3 mb-3">
          <h3 className="font-semibold">You vs. the disciplined you</h3>
          <div className="flex items-center gap-4 text-[.74rem]">
            <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-[3px] rounded" style={{ background: "var(--grn)" }} /> Disciplined</span>
            <span className="inline-flex items-center gap-1.5"><span className="w-3.5 h-[3px] rounded" style={{ background: "var(--red)" }} /> Actual</span>
          </div>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 250 }} preserveAspectRatio="none">
          <defs>
            <linearGradient id="mirgap" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor={taxPos ? "var(--red)" : "var(--grn)"} stopOpacity="0.22" />
              <stop offset="1" stopColor={taxPos ? "var(--red)" : "var(--grn)"} stopOpacity="0.02" />
            </linearGradient>
          </defs>
          {mn < 0 && mx > 0 && <line x1={P} y1={zeroY} x2={W - P} y2={zeroY} stroke="var(--line2)" strokeDasharray="3 5" strokeWidth="1" />}
          <path className="mir-area" d={gapArea} fill="url(#mirgap)" />
          <path className="mir-draw" pathLength={1} d={line(m.curveActual)} fill="none" stroke="var(--red)" strokeWidth="2.4" strokeLinejoin="round" strokeLinecap="round" opacity="0.9" />
          <path className="mir-draw d2" pathLength={1} d={line(m.curveDisc)} fill="none" stroke="var(--grn)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <g className="mir-endcap">
            <circle cx={px(n - 1)} cy={py(m.curveDisc[n - 1])} r="4.5" fill="var(--grn)" />
            <circle cx={px(n - 1)} cy={py(m.curveActual[n - 1])} r="4.5" fill="var(--red)" />
          </g>
        </svg>
        <div className="grid grid-cols-2 gap-3 mt-4">
          <div className="rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--grn) 9%, transparent)", border: "1px solid color-mix(in srgb, var(--grn) 26%, transparent)" }}>
            <div className="lbl">Disciplined you</div>
            <div className="mono text-2xl font-bold" style={{ color: "var(--grn)" }}>{usd(m.disciplinedNet)}</div>
          </div>
          <div className="rounded-xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--red) 7%, transparent)", border: "1px solid var(--line)" }}>
            <div className="lbl">Actual you</div>
            <div className="mono text-2xl font-bold" style={{ color: m.actualNet >= 0 ? "var(--t1)" : "var(--red)" }}>{usd(m.actualNet)}</div>
          </div>
        </div>
      </div>

      {/* BREAKDOWN */}
      <Panel title="Where the disciplined you said no" icon="alert">
        <div className="space-y-2.5">
          {m.breaks.map((b) => (
            <div key={b.reason} className="flex items-start gap-3 rounded-lg p-3" style={{ background: "color-mix(in srgb, var(--bg2,#111) 55%, transparent)" }}>
              <span className="shrink-0 mt-0.5" style={{ color: b.saved >= 0 ? "var(--red)" : "var(--grn)" }}><Icon name="alert" size={15} /></span>
              <div className="flex-1">
                <div className="flex items-center justify-between gap-2">
                  <span className="text-[.88rem] font-semibold">{b.label}</span>
                  <span className="mono text-[.9rem] font-bold" style={{ color: b.saved >= 0 ? "var(--grn)" : "var(--red)" }}>{b.saved >= 0 ? "+" : ""}{usd(b.saved)}</span>
                </div>
                <div className="text-[.78rem] text-t2">{b.count} trades · {b.detail}</div>
              </div>
            </div>
          ))}
          {!m.breaks.length && <div className="text-t3 text-sm py-2">No rule-breaking trades found — you already trade your plan.</div>}
        </div>
      </Panel>

      <AIRead module="The Mirror" facts={facts} />
      <p className="text-[.7rem] text-t3">A counterfactual replay of your own trades against your own rules (max {profile.settings.maxTradesPerDay} trades/day, ${profile.settings.dailyLossStop} daily stop, plus your detected leaks). Not a prediction — what already happened, with discipline applied. For insight only.</p>
    </div>
  );
}
