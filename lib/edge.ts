// Your Edge — the honest, data-grounded version of "trade ideas".
// It does NOT predict the market. It mines YOUR own history to find the specific
// conditions where you actually make money (instrument, time, day, side, setup),
// ranked by real expectancy with real sample size. Trade your edge; trim the rest.
import type { Trade } from "./score";
import { analyze } from "./insights";

export type EdgeCond = { kind: string; label: string; trades: number; winRate: number; expectancy: number; net: number };
export type EdgeResult = {
  ready: boolean;
  reasonNeed?: string;
  best: EdgeCond[];
  worst: EdgeCond[];
  totals: { trades: number; net: number; winRate: number };
  headline: string;
};

export function computeEdge(trades: Trade[]): EdgeResult {
  if (trades.length < 15) {
    return { ready: false, reasonNeed: "Upload at least 15 trades so your edge is statistically meaningful.", best: [], worst: [], totals: { trades: trades.length, net: 0, winRate: 0 }, headline: "" };
  }
  const ins = analyze(trades);
  const dims: EdgeCond[] = [];
  const push = (kind: string, label: string, b: { trades: number; winRate: number; net: number; expectancy: number }) => {
    if (b.trades >= 5) dims.push({ kind, label, trades: b.trades, winRate: b.winRate, expectancy: b.expectancy, net: b.net });
  };
  ins.byHour.forEach((b) => push("Time", `${b.key} UTC`, b));
  ins.byDay.forEach((b) => push("Day", `${b.key}s`, b));
  ins.bySymbol.forEach((b) => push("Instrument", b.key, b));
  ins.bySide.forEach((b) => push("Direction", b.key === "long" ? "Longs" : b.key === "short" ? "Shorts" : b.key, b));
  ins.bySetup.forEach((b) => push("Setup", `"${b.key}"`, b));

  const best = dims.filter((d) => d.expectancy > 0).sort((a, b) => b.expectancy - a.expectancy).slice(0, 5);
  const worst = dims.filter((d) => d.expectancy < 0).sort((a, b) => a.expectancy - b.expectancy).slice(0, 4);

  const top = best[0];
  const headline = top
    ? `Your sharpest edge: ${top.label} — ${Math.round(top.winRate * 100)}% win rate, ${fmt(Math.round(top.expectancy))}/trade over ${top.trades} trades. Concentrate here.`
    : "No clearly profitable condition yet — your edge isn't separating from noise. Tighten risk and log more.";

  return { ready: true, best, worst, totals: { trades: ins.totals.trades, net: Math.round(ins.totals.net), winRate: ins.totals.winRate }, headline };
}
function fmt(n: number) { return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(); }
