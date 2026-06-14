// The Mirror — your disciplined twin.
// Replays your real trades, removes the ones that broke your own rules (past your
// daily stop, over your trade cap, revenge trades after a loss, your worst hour),
// and computes what the disciplined version of you WOULD have made. The gap in $ is
// your "tilt tax" — the money your behavior (not the market) took from you.
import type { Trade } from "./score";
import { analyze } from "./insights";

export type MReason = "stop" | "cap" | "revenge" | "worsthour";
export type MBreak = { reason: MReason; label: string; detail: string; count: number; net: number; saved: number };
export type MirrorResult = {
  ready: boolean;
  reasonNeed?: string;
  actualNet: number;
  disciplinedNet: number;
  tiltTax: number;          // disciplinedNet - actualNet (positive = discipline beats you)
  total: number; kept: number; skipped: number;
  breaks: MBreak[];
  curveActual: number[];
  curveDisc: number[];
  headline: string;
};

const LABEL: Record<MReason, string> = {
  stop: "Trading past your daily stop",
  cap: "Trading past your trade cap",
  revenge: "Revenge trades after a loss",
  worsthour: "Trading your worst hour",
};

export function computeMirror(trades: Trade[], opts: { maxTradesPerDay: number; dailyLossStop: number }): MirrorResult {
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const empty: MirrorResult = { ready: false, actualNet: 0, disciplinedNet: 0, tiltTax: 0, total: sorted.length, kept: 0, skipped: 0, breaks: [], curveActual: [], curveDisc: [], headline: "" };
  if (sorted.length < 10) return { ...empty, reasonNeed: "Upload at least 10 trades so the Mirror can replay your behavior." };

  const ins = analyze(sorted);
  const worstHourKey = ins.worstWindow && ins.worstWindow.net < 0 && ins.worstWindow.trades >= 3 ? ins.worstWindow.key : null;
  const afterLossBleeds = ins.afterLoss.net < 0 && ins.afterLoss.trades >= 3;
  const hourOf = (t: Trade) => String(new Date(t.timestamp).getUTCHours()).padStart(2, "0") + ":00";

  let curDay = "", dayCount = 0, dayPnl = 0, prevLoss = false;
  let cumA = 0, cumD = 0;
  const curveA: number[] = [], curveD: number[] = [];
  const bm = new Map<MReason, { count: number; net: number }>();

  for (const t of sorted) {
    if (t.date !== curDay) { curDay = t.date; dayCount = 0; dayPnl = 0; prevLoss = false; }
    let reason: MReason | null = null;
    if (opts.dailyLossStop > 0 && dayPnl <= -opts.dailyLossStop) reason = "stop";
    else if (opts.maxTradesPerDay > 0 && dayCount >= opts.maxTradesPerDay) reason = "cap";
    else if (afterLossBleeds && prevLoss) reason = "revenge";
    else if (worstHourKey && hourOf(t) === worstHourKey) reason = "worsthour";

    cumA += t.pnl; curveA.push(Math.round(cumA));
    if (reason) { const m = bm.get(reason) || { count: 0, net: 0 }; m.count++; m.net += t.pnl; bm.set(reason, m); }
    else cumD += t.pnl;
    curveD.push(Math.round(cumD));

    dayCount++; dayPnl += t.pnl; prevLoss = t.pnl < 0;
  }

  const breaks: MBreak[] = [...bm.entries()].map(([reason, v]) => ({
    reason, label: LABEL[reason],
    detail: reason === "revenge" ? "Trades taken right after a loss" : reason === "worsthour" ? `${worstHourKey} UTC — your weakest window` : reason === "cap" ? `Beyond ${opts.maxTradesPerDay} trades/day` : `After hitting -$${opts.dailyLossStop} on the day`,
    count: v.count, net: Math.round(v.net), saved: Math.round(-v.net),
  })).sort((a, b) => b.saved - a.saved);

  const tiltTax = Math.round(cumD - cumA);
  const skipped = breaks.reduce((s, b) => s + b.count, 0);
  const headline = tiltTax > 0
    ? `Your behavior cost you ${fmt(tiltTax)}. The disciplined you made ${fmt(Math.round(cumD - cumA) + Math.round(cumA))} more by doing nothing but following your own rules.`
    : skipped === 0
    ? "You already trade your plan — no rule-breaking trades found. That's rare. Keep it up."
    : "Your rule-breaking trades roughly broke even — discipline still removes the variance.";

  return { ready: true, actualNet: Math.round(cumA), disciplinedNet: Math.round(cumD), tiltTax, total: sorted.length, kept: sorted.length - skipped, skipped, breaks, curveActual: curveA, curveDisc: curveD, headline };
}
function fmt(n: number) { return (n < 0 ? "-$" : "$") + Math.abs(n).toLocaleString(); }
