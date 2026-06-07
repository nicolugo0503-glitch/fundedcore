// Execution analytics — the tier that needs entry/exit/high/low per trade.
// (1) Exit efficiency: how much of the available move you actually captured,
//     and how much heat you took. (2) Edge decay: which setups are dying.
import type { Trade } from "./score";

export type ExecMetrics = {
  hasPrices: boolean;
  priced: number;
  winnersCaptured: number;     // avg % of MFE captured on winners (0..1)
  avgGivebackUsd: number;      // avg $ left on the table per winner
  totalLeftOnTable: number;    // total $ left on the table across winners
  avgHeatPts: number;          // avg adverse excursion (points) before exit
  loserMfeRate: number;        // share of losers that were green first
  loserMfeGiveupUsd: number;   // $ that was on the table on losers that reversed to red
  verdict: string;
  leaks: { title: string; detail: string; cost: number }[];
};

export type DecaySetup = {
  key: string; nEarly: number; nRecent: number;
  earlyExp: number; recentExp: number;
  status: "improving" | "stable" | "decaying" | "dead";
  delta: number;
};
export type DecayResult = { ready: boolean; setups: DecaySetup[]; overall: DecaySetup | null; summary: string };

function priced(t: Trade) { return t.entry != null && t.exit != null && t.high != null && t.low != null; }

export function execMetrics(trades: Trade[]): ExecMetrics {
  const P = trades.filter(priced);
  const base: ExecMetrics = { hasPrices: false, priced: P.length, winnersCaptured: 0, avgGivebackUsd: 0, totalLeftOnTable: 0, avgHeatPts: 0, loserMfeRate: 0, loserMfeGiveupUsd: 0, verdict: "", leaks: [] };
  if (P.length < 8) return base;

  let effSum = 0, effN = 0, give = 0, heatSum = 0, heatN = 0;
  let loserMfeN = 0, loserN = 0, loserGiveUsd = 0;
  for (const t of P) {
    const long = t.side !== "short";
    const entry = t.entry!, exit = t.exit!, hi = t.high!, lo = t.low!;
    const mfe = long ? hi - entry : entry - lo;         // best favorable excursion (pts)
    const mae = long ? entry - lo : hi - entry;         // worst adverse excursion (pts)
    const captured = long ? exit - entry : entry - exit; // realized move (pts, signed)
    const dpp = captured !== 0 ? t.pnl / captured : 0;   // $ per point (unit-free)
    if (mae > 0) { heatSum += mae; heatN++; }
    if (t.pnl >= 0 && mfe > 0) {
      const eff = Math.max(0, Math.min(1, captured / mfe));
      effSum += eff; effN++;
      give += Math.max(0, (mfe - captured)) * Math.abs(dpp);
    }
    if (t.pnl < 0) {
      loserN++;
      if (mfe > 0) { loserMfeN++; loserGiveUsd += mfe * Math.abs(dpp); }
    }
  }
  const winnersCaptured = effN ? effSum / effN : 0;
  const avgGivebackUsd = effN ? give / effN : 0;
  const avgHeatPts = heatN ? heatSum / heatN : 0;
  const loserMfeRate = loserN ? loserMfeN / loserN : 0;

  const leaks: ExecMetrics["leaks"] = [];
  if (winnersCaptured < 0.55 && effN >= 5) leaks.push({ title: "You cut winners early", detail: `On winning trades you capture only ${Math.round(winnersCaptured * 100)}% of the move that was available — you're leaving roughly ${money(give)} on the table across these trades.`, cost: give });
  if (loserMfeRate > 0.45 && loserN >= 5) leaks.push({ title: "Green trades turning red", detail: `${Math.round(loserMfeRate * 100)}% of your losers were in profit first, then reversed — about ${money(loserGiveUsd)} of open profit handed back. Consider a break-even stop once a trade goes your way.`, cost: loserGiveUsd });

  const verdict = winnersCaptured >= 0.65
    ? `Strong exits — you capture ${Math.round(winnersCaptured * 100)}% of the available move on winners.`
    : `Your exits are the leak: you capture only ${Math.round(winnersCaptured * 100)}% of the move on winners while taking ${avgHeatPts.toFixed(0)} pts of average heat. Tightening entries and letting winners run is your highest-ROI fix.`;

  return { hasPrices: true, priced: P.length, winnersCaptured, avgGivebackUsd, totalLeftOnTable: give, avgHeatPts, loserMfeRate, loserMfeGiveupUsd: loserGiveUsd, verdict, leaks };
}
function money(n: number) { return (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US"); }

export function edgeDecay(trades: Trade[]): DecayResult {
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  if (sorted.length < 20) return { ready: false, setups: [], overall: null, summary: "" };

  function halfExp(ts: Trade[]): DecaySetup | null {
    if (ts.length < 10) return null;
    const mid = Math.floor(ts.length / 2);
    const early = ts.slice(0, mid), recent = ts.slice(mid);
    const exp = (a: Trade[]) => a.reduce((s, t) => s + t.pnl, 0) / a.length;
    const earlyExp = exp(early), recentExp = exp(recent), delta = recentExp - earlyExp;
    let status: DecaySetup["status"];
    if (earlyExp > 0 && recentExp <= 0) status = "dead";
    else if (recentExp < earlyExp * 0.5 && earlyExp > 0) status = "decaying";
    else if (recentExp > earlyExp * 1.2) status = "improving";
    else status = "stable";
    return { key: "", nEarly: early.length, nRecent: recent.length, earlyExp, recentExp, status, delta };
  }

  const overall = halfExp(sorted);
  if (overall) overall.key = "Overall edge";

  const byTag = new Map<string, Trade[]>();
  for (const t of sorted) if (t.tag) (byTag.get(t.tag) || byTag.set(t.tag, []).get(t.tag)!).push(t);
  const setups: DecaySetup[] = [];
  for (const [tag, ts] of byTag.entries()) { const d = halfExp(ts); if (d) { d.key = tag; setups.push(d); } }
  const order = { dead: 0, decaying: 1, stable: 2, improving: 3 };
  setups.sort((a, b) => order[a.status] - order[b.status] || a.delta - b.delta);

  const dead = setups.filter((s) => s.status === "dead");
  const dec = setups.filter((s) => s.status === "decaying");
  let summary = "";
  if (dead.length) summary = `“${dead[0].key}” has died — it made money early and now loses. Stop trading it until it proves itself again.`;
  else if (dec.length) summary = `“${dec[0].key}” is decaying — recent expectancy is down ${Math.round((1 - dec[0].recentExp / (dec[0].earlyExp || 1)) * 100)}% from earlier.`;
  else if (overall && overall.status === "improving") summary = "Your overall edge is improving — recent trades outperform your earlier ones.";
  else summary = "No setup is clearly decaying — your edges are holding.";

  return { ready: true, setups, overall, summary };
}
