"use client";
import { type Profile } from "../../lib/profile";
import { computeMirror } from "../../lib/mirror";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

export function MirrorTab({ profile }: { profile: Profile }) {
  const m = computeMirror(profile.trades, { maxTradesPerDay: profile.settings.maxTradesPerDay, dailyLossStop: profile.settings.dailyLossStop });

  if (!m.ready) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="Pro · The Mirror" title="Meet the disciplined you" sub="The version of you that never tilts — and what their discipline is worth, in dollars." />
        <EmptyState icon="spark" title="Not enough trades yet" body={m.reasonNeed || "Upload more trades and the Mirror comes alive."} />
      </div>
    );
  }

  // dual equity curve
  const W = 640, H = 190, P = 8;
  const all = [...m.curveActual, ...m.curveDisc, 0];
  const mn = Math.min(...all), mx = Math.max(...all);
  const n = m.curveActual.length;
  const px = (i: number) => P + (i / (n - 1)) * (W - 2 * P);
  const py = (v: number) => H - P - ((v - mn) / (mx - mn || 1)) * (H - 2 * P);
  const path = (c: number[]) => c.map((v, i) => `${i ? "L" : "M"}${px(i).toFixed(1)},${py(v).toFixed(1)}`).join(" ");
  const zeroY = py(0);

  const facts = `Disciplined you netted ${usd(m.disciplinedNet)} vs your actual ${usd(m.actualNet)}. Tilt tax: ${usd(m.tiltTax)}. Top leaks: ${m.breaks.slice(0, 3).map((b) => `${b.label} (${usd(b.saved)})`).join(", ")}.`;

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Pro · The Mirror" title="Meet the disciplined you"
        sub="We replayed your real trades and removed only the ones that broke your own rules — revenge trades, trades past your stop or cap, your worst hour. This is what the disciplined version of you would have made, doing nothing different but following the plan."
        right={<span className="chip" style={{ color: "var(--acc)", borderColor: "color-mix(in srgb, var(--acc) 35%, transparent)" }}>PRO</span>} />

      {/* hero */}
      <div className="card p-6" style={{ boxShadow: m.tiltTax > 0 ? "0 0 0 1px color-mix(in srgb, var(--red) 28%, transparent), 0 18px 50px -22px color-mix(in srgb, var(--red) 30%, transparent)" : undefined }}>
        <div className="grid sm:grid-cols-3 gap-4 text-center">
          <div>
            <div className="lbl">Disciplined you</div>
            <div className="mono text-3xl font-bold" style={{ color: "var(--grn)" }}>{usd(m.disciplinedNet)}</div>
          </div>
          <div>
            <div className="lbl">Actual you</div>
            <div className="mono text-3xl font-bold" style={{ color: m.actualNet >= 0 ? "var(--t1)" : "var(--red)" }}>{usd(m.actualNet)}</div>
          </div>
          <div>
            <div className="lbl">Your tilt tax</div>
            <div className="mono text-3xl font-bold" style={{ color: m.tiltTax > 0 ? "var(--red)" : "var(--grn)" }}>{m.tiltTax > 0 ? "−" : "+"}{usd(Math.abs(m.tiltTax)).replace("$", "$")}</div>
          </div>
        </div>
        <p className="text-[.95rem] text-t1 leading-relaxed mt-5 text-center">{m.headline}</p>
      </div>

      {/* equity curves */}
      <Panel title="You vs. the disciplined you" icon="chart">
        <div className="flex items-center gap-4 mb-2 text-[.72rem]">
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-[2px]" style={{ background: "var(--grn)" }} /> Disciplined</span>
          <span className="inline-flex items-center gap-1.5"><span className="w-3 h-[2px]" style={{ background: "var(--red)" }} /> Actual</span>
        </div>
        <svg viewBox={`0 0 ${W} ${H}`} className="w-full" style={{ height: 190 }} preserveAspectRatio="none">
          {mn < 0 && mx > 0 && <line x1={P} y1={zeroY} x2={W - P} y2={zeroY} stroke="var(--line2)" strokeDasharray="3 4" strokeWidth="1" />}
          <path d={path(m.curveActual)} fill="none" stroke="var(--red)" strokeWidth="2" strokeLinejoin="round" opacity="0.85" />
          <path d={path(m.curveDisc)} fill="none" stroke="var(--grn)" strokeWidth="2.4" strokeLinejoin="round" />
        </svg>
        <div className="text-[.72rem] text-t3 mt-1">Cumulative P&L across your {m.total} trades. The gap is your behavior — not the market.</div>
      </Panel>

      {/* breakdown */}
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
                <div className="text-[.78rem] text-t2">{b.count} trades · {b.detail} · skipping them {b.saved >= 0 ? "saves" : "costs"} you {usd(Math.abs(b.saved))}</div>
              </div>
            </div>
          ))}
          {!m.breaks.length && <div className="text-t3 text-sm py-2">No rule-breaking trades found — you already trade your plan.</div>}
        </div>
      </Panel>

      <AIRead module="The Mirror" facts={facts} />
      <p className="text-[.7rem] text-t3">The Mirror is a counterfactual replay of your own trades against your own rules (max {profile.settings.maxTradesPerDay} trades/day, ${profile.settings.dailyLossStop} daily stop, plus your detected leaks). It's not a prediction — it's what already happened, with discipline applied. Past performance, for insight only.</p>
    </div>
  );
}
