"use client";
import { Icon } from "../Icon";

type Reason = { tone: "red" | "amber" | "green"; text: string };
const TONE: Record<string, string> = { red: "var(--red)", amber: "var(--amb)", green: "var(--grn)" };

export function ClearanceCard({ verdict, reasons, budget }: {
  verdict: "GO" | "CAUTION" | "STAND DOWN";
  reasons: Reason[];
  budget?: { dollars: number; perTrade: number; contracts: number; instrument: string; stop: number } | null;
}) {
  const meta = verdict === "GO"
    ? { color: "var(--grn)", icon: "check", sub: "Conditions favor disciplined trading." }
    : verdict === "CAUTION"
    ? { color: "var(--amb)", icon: "alert", sub: "Tradeable — but smaller, slower, pickier." }
    : { color: "var(--red)", icon: "shield", sub: "The data says protect capital today." };
  return (
    <div className="card p-5 relative overflow-hidden" style={{ borderColor: "color-mix(in srgb, " + meta.color + " 38%, var(--line2))" }}>
      <div className="absolute inset-y-0 left-0 w-1" style={{ background: meta.color }} />
      <div className="grid md:grid-cols-[auto_1fr_auto] gap-5 items-center">
        <div className="flex items-center gap-3.5">
          <span className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ background: "color-mix(in srgb, " + meta.color + " 14%, transparent)", border: "1px solid color-mix(in srgb, " + meta.color + " 35%, transparent)", color: meta.color }}>
            <Icon name={meta.icon} size={22} />
          </span>
          <div>
            <div className="lbl mb-0.5">Trading clearance</div>
            <div className="display text-[1.5rem] font-bold leading-none" style={{ color: meta.color }}>{verdict}</div>
            <div className="text-[.74rem] text-t3 mt-1">{meta.sub}</div>
          </div>
        </div>
        <div className="flex flex-wrap gap-2 content-center">
          {reasons.slice(0, 5).map((r, i) => (
            <span key={i} className="inline-flex items-center gap-1.5 text-[.76rem] px-2.5 py-1.5 rounded-lg" style={{ background: "color-mix(in srgb, " + TONE[r.tone] + " 9%, transparent)", border: "1px solid color-mix(in srgb, " + TONE[r.tone] + " 24%, transparent)", color: "var(--t1)" }}>
              <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: TONE[r.tone] }} />{r.text}
            </span>
          ))}
        </div>
        {budget && (
          <div className="rounded-xl px-4 py-3 shrink-0 md:text-right" style={{ background: "var(--panel2)", border: "1px solid var(--line)" }}>
            <div className="lbl mb-0.5">Risk budget today</div>
            <div className="mono text-[1.35rem] font-bold leading-none" style={{ color: "var(--t1)" }}>${Math.round(budget.dollars).toLocaleString("en-US")}</div>
            <div className="text-[.72rem] text-t3 mt-1">≤ {budget.contracts} {budget.instrument} @ {budget.stop}-pt stop · ~${Math.round(budget.perTrade).toLocaleString("en-US")}/trade</div>
          </div>
        )}
      </div>
    </div>
  );
}

type HourBucket = { key: string; net: number; trades: number; winRate: number };
export function EdgeClock({ buckets, best, worst, nowKey }: {
  buckets: HourBucket[]; best: HourBucket | null; worst: HourBucket | null; nowKey: string;
}) {
  if (!buckets.length) return null;
  const max = Math.max(...buckets.map((b) => Math.abs(b.net)), 1);
  return (
    <div>
      <div className="flex items-end gap-1.5 h-28">
        {buckets.map((b) => {
          const up = b.net >= 0;
          const h = 8 + (Math.abs(b.net) / max) * 78;
          const isNow = b.key === nowKey;
          const isBest = best && b.key === best.key;
          const isWorst = worst && b.key === worst.key;
          return (
            <div key={b.key} className="flex-1 flex flex-col items-center justify-end gap-1 group relative" title={b.key + " UTC · " + (b.net >= 0 ? "+" : "") + "$" + Math.round(b.net) + " · " + b.trades + " trades"}>
              <div className="w-full rounded-t-[3px] transition" style={{ height: h, background: up ? "var(--grn)" : "var(--red)", opacity: isNow ? 1 : 0.55, outline: isNow ? "2px solid var(--acc)" : "none", outlineOffset: 1 }} />
              <span className="text-[.56rem] text-t3" style={{ color: isNow ? "var(--acc)" : isBest ? "var(--grn)" : isWorst ? "var(--red)" : "var(--t3)" }}>{b.key.slice(0, 2)}</span>
            </div>
          );
        })}
      </div>
      <div className="flex flex-wrap gap-2 mt-3 text-[.78rem]">
        {best && <span className="chip" style={{ color: "var(--grn)", borderColor: "color-mix(in srgb, var(--grn) 30%, transparent)" }}>A+ window {best.key} UTC · +${Math.round(best.net)}</span>}
        {worst && worst.net < 0 && <span className="chip" style={{ color: "var(--red)", borderColor: "color-mix(in srgb, var(--red) 30%, transparent)" }}>Sit out {worst.key} UTC · −${Math.abs(Math.round(worst.net))}</span>}
        <span className="chip"><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--acc)" }} /> now {nowKey} UTC</span>
      </div>
    </div>
  );
}
