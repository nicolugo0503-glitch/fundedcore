"use client";
import { Icon } from "../Icon";

export type Levels = {
  root: string; cur: number; open: number; PDH: number; PDL: number; PDC: number;
  dayH: number; dayL: number; gap: number; atr: number;
};

function fmt(n: number) { return n >= 1000 ? n.toLocaleString("en-US", { maximumFractionDigits: 0 }) : n.toFixed(2); }

export function KeyLevels({ lv }: { lv: Levels }) {
  // reference levels, de-duped, sorted high -> low, with current inserted
  const rows = [
    { label: "Prior day high", price: lv.PDH, kind: "res" },
    { label: "Overnight high", price: lv.dayH, kind: "res" },
    { label: "Today's open", price: lv.open, kind: "piv" },
    { label: "Prior close", price: lv.PDC, kind: "piv" },
    { label: "Overnight low", price: lv.dayL, kind: "sup" },
    { label: "Prior day low", price: lv.PDL, kind: "sup" },
  ].filter((r) => isFinite(r.price));
  const all = [...rows, { label: "▸ Current", price: lv.cur, kind: "cur" as const }]
    .sort((a, b) => b.price - a.price);
  const gapUp = lv.gap >= 0;
  return (
    <div>
      <div className="flex flex-wrap gap-2 mb-3">
        <span className="chip">Expected range <span className="mono text-t1 ml-1">±{fmt(lv.atr / 2)} pts</span></span>
        <span className="chip" style={{ color: gapUp ? "var(--grn)" : "var(--red)", borderColor: "color-mix(in srgb, " + (gapUp ? "var(--grn)" : "var(--red)") + " 30%, transparent)" }}>
          Gap {gapUp ? "▲" : "▼"} {fmt(Math.abs(lv.gap))} pts
        </span>
        <span className="chip">ATR <span className="mono text-t1 ml-1">{fmt(lv.atr)}</span></span>
      </div>
      <div className="rounded-lg overflow-hidden" style={{ border: "1px solid var(--line)" }}>
        {all.map((r, i) => {
          const isCur = r.kind === "cur";
          const dist = r.price - lv.cur;
          const col = r.kind === "res" ? "var(--red)" : r.kind === "sup" ? "var(--grn)" : r.kind === "cur" ? "var(--acc)" : "var(--t2)";
          return (
            <div key={i} className="flex items-center justify-between px-3.5 py-2 text-[.82rem]"
              style={{ borderTop: i ? "1px solid var(--line)" : "none", background: isCur ? "var(--acc-weak)" : "transparent" }}>
              <span className="flex items-center gap-2" style={{ color: isCur ? "var(--t1)" : "var(--t2)", fontWeight: isCur ? 600 : 400 }}>
                <span className="w-1.5 h-1.5 rounded-full shrink-0" style={{ background: col }} />{r.label}
              </span>
              <span className="flex items-center gap-3">
                <span className="mono" style={{ color: "var(--t1)", fontWeight: isCur ? 700 : 500 }}>{fmt(r.price)}</span>
                {!isCur && <span className="mono text-[.7rem] w-16 text-right" style={{ color: dist >= 0 ? "var(--red)" : "var(--grn)" }}>{dist >= 0 ? "+" : ""}{fmt(dist)}</span>}
              </span>
            </div>
          );
        })}
      </div>
      <div className="text-[.72rem] text-t3 mt-2 flex items-center gap-1.5"><Icon name="alert" size={12} /> {lv.root} continuous · reference levels for context, not signals.</div>
    </div>
  );
}

import type { CondResult } from "../../lib/conditions";
export function ConditionsEdge({ res }: { res: NonNullable<CondResult> }) {
  return (
    <div>
      <div className="space-y-2.5">
        {res.dims.map((d) => {
          const max = Math.max(Math.abs(d.good.avg), Math.abs(d.bad.avg), 1);
          const Row = ({ s, isGood }: { s: { label: string; avg: number; n: number }; isGood: boolean }) => {
            const isToday = (isGood && d.todaySide === "good") || (!isGood && d.todaySide === "bad");
            const col = s.avg >= 0 ? "var(--grn)" : "var(--red)";
            return (
              <div className="flex items-center gap-2.5">
                <span className="text-[.78rem] w-32 shrink-0" style={{ color: isToday ? "var(--t1)" : "var(--t2)", fontWeight: isToday ? 600 : 400 }}>
                  {s.label}{isToday && <span className="text-acc"> · today</span>}
                </span>
                <div className="flex-1 h-4 rounded relative" style={{ background: "var(--panel2)", outline: isToday ? "1px solid var(--acc)" : "none" }}>
                  <div className="absolute inset-y-0 left-0 rounded" style={{ width: (Math.abs(s.avg) / max) * 100 + "%", background: col, opacity: isToday ? 1 : 0.5 }} />
                </div>
                <span className="mono text-[.76rem] w-16 text-right" style={{ color: col }}>{s.avg >= 0 ? "+" : ""}${Math.round(s.avg)}</span>
              </div>
            );
          };
          return (
            <div key={d.key}>
              <Row s={d.good} isGood />
              <div className="mt-1.5"><Row s={d.bad} isGood={false} /></div>
            </div>
          );
        })}
      </div>
      <div className="text-[.78rem] text-t2 mt-3 leading-relaxed">{res.summary}</div>
    </div>
  );
}
