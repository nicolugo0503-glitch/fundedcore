// Personalized pattern + leak analysis from a trader's own trades.
import type { Trade } from "./score";

export type Bucket = {
  key: string;
  trades: number;
  wins: number;
  winRate: number;
  net: number;
  expectancy: number;
};

export type Leak = {
  title: string;
  detail: string;
  cost: number;        // estimated $ this pattern cost
  severity: "high" | "med" | "low";
  fix: string;
};

export type Insights = {
  byHour: Bucket[];
  byDay: Bucket[];
  bySymbol: Bucket[];
  bySide: Bucket[];
  afterLoss: { net: number; trades: number; avgSizeMult: number };
  leaks: Leak[];
  strengths: string[];
  bestWindow: Bucket | null;
  worstWindow: Bucket | null;
  totals: { trades: number; net: number; winRate: number; avgWin: number; avgLoss: number };
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

function mk(key: string, ts: Trade[]): Bucket {
  const wins = ts.filter((t) => t.pnl > 0).length;
  const net = ts.reduce((s, t) => s + t.pnl, 0);
  return {
    key, trades: ts.length, wins,
    winRate: ts.length ? wins / ts.length : 0,
    net, expectancy: ts.length ? net / ts.length : 0,
  };
}
function group(trades: Trade[], keyFn: (t: Trade) => string): Bucket[] {
  const m = new Map<string, Trade[]>();
  for (const t of trades) { const k = keyFn(t); (m.get(k) || m.set(k, []).get(k)!).push(t); }
  return [...m.entries()].map(([k, ts]) => mk(k, ts));
}

export function analyze(trades: Trade[]): Insights {
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const hourOf = (t: Trade) => new Date(t.timestamp).getUTCHours();
  const byHour = group(sorted, (t) => String(hourOf(t)).padStart(2, "0") + ":00")
    .sort((a, b) => a.key.localeCompare(b.key));
  const byDay = group(sorted, (t) => DOW[new Date(t.timestamp).getUTCDay()]);
  const bySymbol = group(sorted, (t) => t.symbol || "—").sort((a, b) => b.trades - a.trades);
  const bySide = group(sorted, (t) => t.side || "—");

  // After-loss behavior (revenge): trades immediately following a losing trade.
  const sizes = sorted.map((t) => (t.size != null ? Math.abs(t.size) : Math.abs(t.pnl) || 1));
  const baseSize = sizes.reduce((s, x) => s + x, 0) / (sizes.length || 1);
  const afterLossTs: Trade[] = [];
  const afterLossSizes: number[] = [];
  for (let i = 1; i < sorted.length; i++) {
    if (sorted[i - 1].pnl < 0) { afterLossTs.push(sorted[i]); afterLossSizes.push(sizes[i]); }
  }
  const afterLoss = {
    net: afterLossTs.reduce((s, t) => s + t.pnl, 0),
    trades: afterLossTs.length,
    avgSizeMult: baseSize > 0 && afterLossSizes.length
      ? (afterLossSizes.reduce((s, x) => s + x, 0) / afterLossSizes.length) / baseSize : 1,
  };

  const wins = sorted.filter((t) => t.pnl > 0);
  const losses = sorted.filter((t) => t.pnl < 0);
  const totals = {
    trades: sorted.length,
    net: sorted.reduce((s, t) => s + t.pnl, 0),
    winRate: sorted.length ? wins.length / sorted.length : 0,
    avgWin: wins.length ? wins.reduce((s, t) => s + t.pnl, 0) / wins.length : 0,
    avgLoss: losses.length ? Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length) : 0,
  };

  // Best / worst time windows (need enough samples).
  const meaningful = byHour.filter((b) => b.trades >= 3);
  const bestWindow = meaningful.length ? meaningful.reduce((a, b) => (b.net > a.net ? b : a)) : null;
  const worstWindow = meaningful.length ? meaningful.reduce((a, b) => (b.net < a.net ? b : a)) : null;

  // ── Leaks ──────────────────────────────────────────────────────────────────
  const leaks: Leak[] = [];
  if (afterLoss.net < 0 && afterLoss.trades >= 3) {
    leaks.push({
      title: "Revenge trading after losses",
      detail: `Your ${afterLoss.trades} trades taken right after a loss lost ${fmt(afterLoss.net)} total` +
        (afterLoss.avgSizeMult > 1.15 ? `, and you sized them ${Math.round((afterLoss.avgSizeMult - 1) * 100)}% bigger than normal.` : "."),
      cost: -afterLoss.net,
      severity: -afterLoss.net > Math.abs(totals.net) * 0.4 ? "high" : "med",
      fix: "Hard rule: after a red trade, step away for 10 minutes. No re-entry, no size-up.",
    });
  }
  if (worstWindow && worstWindow.net < 0 && worstWindow.trades >= 4) {
    leaks.push({
      title: `Your worst hour: ${worstWindow.key} UTC`,
      detail: `${worstWindow.trades} trades in this window, ${pct(worstWindow.winRate)} win rate, ${fmt(worstWindow.net)} net.`,
      cost: -worstWindow.net,
      severity: -worstWindow.net > Math.abs(totals.net) * 0.3 ? "high" : "med",
      fix: `Stop trading the ${worstWindow.key} hour. It's a consistent drain.`,
    });
  }
  const worstDay = byDay.filter((b) => b.trades >= 4).sort((a, b) => a.net - b.net)[0];
  if (worstDay && worstDay.net < 0) {
    leaks.push({
      title: `${worstDay.key} is costing you`,
      detail: `${pct(worstDay.winRate)} win rate on ${worstDay.key}s, ${fmt(worstDay.net)} net across ${worstDay.trades} trades.`,
      cost: -worstDay.net,
      severity: "med",
      fix: `Trade smaller on ${worstDay.key}s, or sit them out until the data turns.`,
    });
  }
  const worstSym = bySymbol.filter((b) => b.trades >= 4).sort((a, b) => a.net - b.net)[0];
  if (worstSym && worstSym.net < 0) {
    leaks.push({
      title: `${worstSym.key} isn't your instrument`,
      detail: `${fmt(worstSym.net)} net on ${worstSym.key} over ${worstSym.trades} trades (${pct(worstSym.winRate)} win rate).`,
      cost: -worstSym.net,
      severity: "low",
      fix: `Cut ${worstSym.key} and concentrate on what works.`,
    });
  }
  // overtrading: days with many trades vs median
  const byDate = group(sorted, (t) => t.date);
  const counts = byDate.map((b) => b.trades).sort((a, b) => a - b);
  const median = counts.length ? counts[Math.floor(counts.length / 2)] : 0;
  const heavyDays = byDate.filter((b) => b.trades > median * 2 && b.trades >= 6);
  const heavyNet = heavyDays.reduce((s, b) => s + b.net, 0);
  if (heavyDays.length >= 2 && heavyNet < 0) {
    leaks.push({
      title: "Overtrading days bleed money",
      detail: `On your ${heavyDays.length} highest-volume days you netted ${fmt(heavyNet)}. More trades, worse results.`,
      cost: -heavyNet,
      severity: "med",
      fix: `Cap yourself at ~${Math.max(2, median)} trades/day. Quality over volume.`,
    });
  }

  leaks.sort((a, b) => b.cost - a.cost);

  // ── Strengths ───────────────────────────────────────────────────────────────
  const strengths: string[] = [];
  if (bestWindow && bestWindow.net > 0)
    strengths.push(`Your edge lives at ${bestWindow.key} UTC — ${pct(bestWindow.winRate)} win rate, +${fmt(bestWindow.net)} net. Trade more here.`);
  const bestDay = byDay.filter((b) => b.trades >= 4).sort((a, b) => b.net - a.net)[0];
  if (bestDay && bestDay.net > 0) strengths.push(`${bestDay.key}s are your best day (+${fmt(bestDay.net)}).`);
  const bestSym = bySymbol.filter((b) => b.trades >= 4).sort((a, b) => b.net - a.net)[0];
  if (bestSym && bestSym.net > 0) strengths.push(`${bestSym.key} is your money-maker (+${fmt(bestSym.net)}).`);
  if (totals.avgLoss > 0 && totals.avgWin / totals.avgLoss > 1.3) strengths.push(`Healthy payoff: your average win is ${(totals.avgWin / totals.avgLoss).toFixed(1)}× your average loss.`);

  return { byHour, byDay, bySymbol, bySide, afterLoss, leaks, strengths, bestWindow, worstWindow, totals };
}

function fmt(n: number) { return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString(); }
function pct(n: number) { return Math.round(n * 100) + "%"; }
