// "Conditions × your edge" — correlate the trader's daily P&L with that day's
// market regime (gap, tape direction, volatility), then match to today.
import type { Trade } from "./score";
type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

export type Side = { label: string; avg: number; n: number };
export type CondDim = { key: string; good: Side; bad: Side; todaySide: "good" | "bad" | null };
export type CondResult = { dims: CondDim[]; favorableCount: number; unfavorableCount: number; summary: string } | null;

const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
const avg = (a: number[]) => (a.length ? a.reduce((s, x) => s + x, 0) / a.length : 0);

export function conditionEdge(
  candles: Candle[],
  trades: Trade[],
  today: { gap: number; prevClose: number; tape: "risk-on" | "risk-off" | "flat" | null; range: number } | null
): CondResult {
  if (!candles || candles.length < 20 || trades.length < 10) return null;

  const byDate = new Map<string, { o: number; h: number; l: number; c: number; prevC: number }>();
  for (let i = 1; i < candles.length; i++) {
    const c = candles[i];
    byDate.set(iso(c.t), { o: c.o, h: c.h, l: c.l, c: c.c, prevC: candles[i - 1].c });
  }
  const netByDate = new Map<string, number>();
  for (const t of trades) { const d = iso(t.timestamp); netByDate.set(d, (netByDate.get(d) || 0) + t.pnl); }

  const ranges = candles.map((c) => c.h - c.l).sort((a, b) => a - b);
  const medRange = ranges[Math.floor(ranges.length / 2)] || 1;

  const acc = { gapUp: [] as number[], gapDn: [] as number[], green: [] as number[], red: [] as number[], hiVol: [] as number[], loVol: [] as number[] };
  for (const [d, net] of netByDate.entries()) {
    const c = byDate.get(d); if (!c) continue;
    const gapPct = (c.o - c.prevC) / c.prevC;
    if (gapPct > 0.0012) acc.gapUp.push(net); else if (gapPct < -0.0012) acc.gapDn.push(net);
    if (c.c >= c.o) acc.green.push(net); else acc.red.push(net);
    if (c.h - c.l >= medRange) acc.hiVol.push(net); else acc.loVol.push(net);
  }

  const todayGapPct = today && today.prevClose ? today.gap / today.prevClose : null;
  const dims: CondDim[] = [];
  function dim(key: string, aLabel: string, aArr: number[], bLabel: string, bArr: number[], todayIsA: boolean | null) {
    if (aArr.length < 3 || bArr.length < 3) return;
    const a: Side = { label: aLabel, avg: avg(aArr), n: aArr.length };
    const b: Side = { label: bLabel, avg: avg(bArr), n: bArr.length };
    const good = a.avg >= b.avg ? a : b, bad = a.avg >= b.avg ? b : a;
    let todaySide: "good" | "bad" | null = null;
    if (todayIsA != null) { const side = todayIsA ? a : b; todaySide = side === good ? "good" : "bad"; }
    dims.push({ key, good, bad, todaySide });
  }
  dim("gap", "Gap-up days", acc.gapUp, "Gap-down days", acc.gapDn, todayGapPct == null ? null : todayGapPct >= 0);
  dim("tape", "Up-tape days", acc.green, "Down-tape days", acc.red, today?.tape == null ? null : today.tape !== "risk-off");
  dim("vol", "High-volatility", acc.hiVol, "Quiet days", acc.loVol, today?.range == null ? null : today.range >= medRange);

  const favorableCount = dims.filter((d) => d.todaySide === "good").length;
  const unfavorableCount = dims.filter((d) => d.todaySide === "bad").length;
  let summary = "";
  const best = [...dims].sort((a, b) => b.good.avg - a.good.avg)[0];
  if (best) summary = `You trade best on ${best.good.label.toLowerCase()} (${best.good.avg >= 0 ? "+" : ""}$${Math.round(best.good.avg)}/day).`;
  return { dims, favorableCount, unfavorableCount, summary };
}
