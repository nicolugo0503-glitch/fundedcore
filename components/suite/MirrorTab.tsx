"use client";
import { useEffect, useRef, useState } from "react";
import { type Profile } from "../../lib/profile";
import { computeMirror } from "../../lib/mirror";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const CSS = `
.mir { position:relative; overflow:hidden; border-radius:16px; height:clamp(420px,56vw,520px);
  background:
    radial-gradient(60% 75% at 24% 52%, color-mix(in srgb, var(--red) 16%, transparent), transparent 70%),
    radial-gradient(60% 75% at 76% 52%, color-mix(in srgb, var(--grn) 16%, transparent), transparent 70%),
    linear-gradient(180deg,#0A0D11,#070A0E);
  border:1px solid var(--line); }
.mir-svg { position:absolute; inset:0; width:100%; height:100%; }
.mir-draw { stroke-dasharray:1; stroke-dashoffset:1; animation: mdraw 1.9s cubic-bezier(.3,.85,.25,1) .25s forwards; }
@keyframes mdraw { to { stroke-dashoffset:0; } }
.mir-seam { animation: mseam 2.6s ease-in-out infinite; }
@keyframes mseam { 0%,100%{ opacity:.55 } 50%{ opacity:1 } }
.mir-fade { opacity:0; animation: mfade .7s ease forwards; }
@keyframes mfade { to { opacity:1; } }
.mir-pill { position:absolute; left:50%; bottom:26px; transform:translateX(-50%); width:min(440px,84%); text-align:center;
  border-radius:18px; padding:18px 20px; background:linear-gradient(180deg, rgba(20,16,18,.92), rgba(12,16,15,.92));
  border:1px solid rgba(255,255,255,.09); box-shadow:0 20px 50px -20px rgba(0,0,0,.7); }
.mir-lbl { position:absolute; top:28px; }
.mir-num { font-variant-numeric:tabular-nums; letter-spacing:-.03em; }
@media (prefers-reduced-motion: reduce){ .mir-draw,.mir-fade{ animation:none; opacity:1; stroke-dashoffset:0; } .mir-seam{ animation:none; opacity:.8; } }
`;

function useCountUp(target: number, ms = 1700) {
  const [v, setV] = useState(0);
  useEffect(() => {
    let raf = 0; const start = performance.now();
    const tick = (now: number) => { const p = Math.min(1, (now - start) / ms); const e = 1 - Math.pow(1 - p, 3); setV(Math.round(target * e)); if (p < 1) raf = requestAnimationFrame(tick); };
    raf = requestAnimationFrame(tick); return () => cancelAnimationFrame(raf);
  }, [target, ms]);
  return v;
}

export function MirrorTab({ profile }: { profile: Profile }) {
  const m = computeMirror(profile.trades, { maxTradesPerDay: profile.settings.maxTradesPerDay, dailyLossStop: profile.settings.dailyLossStop });
  const tax = useCountUp(m.ready ? Math.abs(m.tiltTax) : 0);

  if (!m.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="FundedCore Pro · The Mirror" title="Meet the disciplined you" sub="The version of you that never tilts — and what their discipline is worth, in dollars." />
        <EmptyState icon="spark" title="Not enough trades yet" body={m.reasonNeed || "Upload more trades and the Mirror comes alive."} />
      </div>
    );
  }

  // both selves start at 0 on the seam and diverge outward
  const A = [0, ...m.curveActual], D = [0, ...m.curveDisc];
  const amax = Math.max(1, ...A.map(Math.abs), ...D.map(Math.abs));
  const VB = 1000, VH = 440, seamX = 500, mL = 55, mR = 945, cy = 206, amp = 116;
  const yy = (v: number) => cy - (v / amax) * amp;
  const lx = (i: number) => seamX - (i / (A.length - 1)) * (seamX - mL);
  const rx = (i: number) => seamX + (i / (D.length - 1)) * (mR - seamX);
  const leftPath = A.map((v, i) => `${i ? "L" : "M"}${lx(i).toFixed(1)},${yy(v).toFixed(1)}`).join(" ");
  const rightPath = D.map((v, i) => `${i ? "L" : "M"}${rx(i).toFixed(1)},${yy(v).toFixed(1)}`).join(" ");
  const leftArea = `${leftPath} L${mL},${VH} L${seamX},${VH} Z`;
  const rightArea = `${rightPath} L${mR},${VH} L${seamX},${VH} Z`;
  const taxPos = m.tiltTax > 0;

  const facts = `Disciplined you netted ${usd(m.disciplinedNet)} vs your actual ${usd(m.actualNet)}. Tilt tax: ${usd(m.tiltTax)}. Top leaks: ${m.breaks.slice(0, 3).map((b) => `${b.label} (${usd(b.saved)})`).join(", ")}.`;

  return (
    <div className="fade space-y-5">
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      <SuiteHeader eyebrow="FundedCore Pro · The Mirror" title="Meet the disciplined you"
        sub="Two versions of you, same trades. One followed the rules. One didn't. The gap between them is the money your behavior — not the market — took from you."
        right={<span className="chip" style={{ color: "var(--acc)", borderColor: "color-mix(in srgb, var(--acc) 35%, transparent)" }}>PRO</span>} />

      {/* THE MIRROR */}
      <div className="mir">
        <svg className="mir-svg" viewBox={`0 0 ${VB} ${VH}`} preserveAspectRatio="none">
          <defs>
            <linearGradient id="mseam" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--red)" /><stop offset="0.5" stopColor="#EAF0F7" /><stop offset="1" stopColor="var(--grn)" /></linearGradient>
            <linearGradient id="marA" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--red)" stopOpacity="0.18" /><stop offset="1" stopColor="var(--red)" stopOpacity="0" /></linearGradient>
            <linearGradient id="marD" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="var(--grn)" stopOpacity="0.18" /><stop offset="1" stopColor="var(--grn)" stopOpacity="0" /></linearGradient>
          </defs>
          <path className="mir-fade" style={{ animationDelay: "1.2s" }} d={leftArea} fill="url(#marA)" />
          <path className="mir-fade" style={{ animationDelay: "1.2s" }} d={rightArea} fill="url(#marD)" />
          <path className="mir-draw" pathLength={1} d={leftPath} fill="none" stroke="var(--red)" strokeWidth="2.6" strokeLinejoin="round" strokeLinecap="round" />
          <path className="mir-draw" pathLength={1} d={rightPath} fill="none" stroke="var(--grn)" strokeWidth="3" strokeLinejoin="round" strokeLinecap="round" />
          <circle className="mir-fade" style={{ animationDelay: "2s" }} cx={mL} cy={yy(A[A.length - 1])} r="4.5" fill="var(--red)" />
          <circle className="mir-fade" style={{ animationDelay: "2s" }} cx={mR} cy={yy(D[D.length - 1])} r="4.5" fill="var(--grn)" />
          <rect className="mir-seam" x={seamX - 3} y="40" width="6" height={VH - 130} fill="url(#mseam)" opacity="0.45" />
          <rect className="mir-seam" x={seamX - 0.75} y="40" width="1.5" height={VH - 130} fill="#EAF0F7" opacity="0.4" />
        </svg>

        <div className="mir-lbl mir-fade" style={{ left: 26, animationDelay: ".5s" }}>
          <div className="text-[.66rem] font-bold tracking-[.18em]" style={{ color: "var(--red)" }}>ACTUAL YOU</div>
          <div className="mir-num mono text-3xl font-extrabold" style={{ color: "var(--red)" }}>{usd(m.actualNet)}</div>
        </div>
        <div className="mir-lbl mir-fade text-right" style={{ right: 26, animationDelay: ".5s" }}>
          <div className="text-[.66rem] font-bold tracking-[.18em]" style={{ color: "var(--grn)" }}>DISCIPLINED YOU</div>
          <div className="mir-num mono text-3xl font-extrabold" style={{ color: "var(--grn)" }}>{usd(m.disciplinedNet)}</div>
        </div>

        <div className="mir-pill mir-fade" style={{ animationDelay: "1.6s" }}>
          <div className="text-[.66rem] font-bold tracking-[.18em] text-t3">{taxPos ? "THE GAP IS COSTING YOU" : "YOUR DISCIPLINE EARNED YOU"}</div>
          <div className="mir-num mono font-extrabold mt-1" style={{ fontSize: "clamp(2.6rem,9vw,4rem)", color: taxPos ? "var(--red)" : "var(--grn)" }}>{usd(tax)}</div>
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
      <p className="text-[.7rem] text-t3">Both selves start at $0 and diverge across your real trades. A counterfactual replay against your own rules (max {profile.settings.maxTradesPerDay} trades/day, ${profile.settings.dailyLossStop} daily stop, plus your detected leaks) — what already happened, with discipline applied. For insight only.</p>
    </div>
  );
}
