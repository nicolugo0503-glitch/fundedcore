// Firm Simulator: replay the trader's actual trade history against each firm's
// rules to answer the Discord-argument question — "which firm would I survive?"
import { FIRMS, type Firm } from "./firms";
import type { Trade } from "./score";

export type SimResult = {
  firmKey: string;
  firm: Firm;
  outcome: "passed" | "survived" | "breached";
  passOnDay?: number;        // trading day # when target hit
  breachOnDay?: number;      // trading day # when account died
  finalPnl: number;
  maxDD: number;             // worst equity-to-floor squeeze observed
  dailyLossHits: number;     // days the daily loss limit cut the session short
  tradingDays: number;
};

export function simulateFirm(trades: Trade[], firm: Firm): SimResult {
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const start = firm.start;
  let equity = start;
  let peak = start;        // intraday peak (for intraday trailing)
  let eodPeak = start;     // end-of-day peak (for EOD trailing)
  let curDay = "";
  let dayPnl = 0;
  let dayIdx = 0;
  let suspended = false;   // daily loss hit — sit out rest of day
  let dailyLossHits = 0;
  let breached = false, breachOnDay: number | undefined;
  let passed = false, passOnDay: number | undefined;
  let minRoom = Infinity;

  const floorNow = () => {
    if (firm.drawdownType === "static") return start - firm.trailingDD;
    const p = firm.drawdownType === "intraday_trailing" ? peak : eodPeak;
    return Math.min(p - firm.trailingDD, start); // lock at breakeven
  };

  for (const t of sorted) {
    if (breached) break;
    if (t.date !== curDay) {
      // close previous day
      if (curDay) eodPeak = Math.max(eodPeak, equity);
      curDay = t.date; dayPnl = 0; suspended = false; dayIdx++;
    }
    if (suspended) continue;

    equity += t.pnl;
    dayPnl += t.pnl;
    if (firm.drawdownType === "intraday_trailing") peak = Math.max(peak, equity);

    const room = equity - floorNow();
    if (room < minRoom) minRoom = room;
    if (room <= 0) { breached = true; breachOnDay = dayIdx; break; }

    if (firm.dailyLoss != null && dayPnl <= -firm.dailyLoss) { suspended = true; dailyLossHits++; }

    if (!passed && firm.profitTarget > 0 && equity - start >= firm.profitTarget) {
      passed = true; passOnDay = dayIdx;
    }
  }

  const outcome: SimResult["outcome"] = breached ? "breached" : passed ? "passed" : "survived";
  return {
    firmKey: firm.key, firm, outcome, passOnDay, breachOnDay,
    finalPnl: Math.round(equity - start),
    maxDD: Math.round(firm.trailingDD - Math.min(minRoom, firm.trailingDD)),
    dailyLossHits, tradingDays: dayIdx,
  };
}

export function simulateAll(trades: Trade[]): SimResult[] {
  const res = Object.values(FIRMS).map((f) => simulateFirm(trades, f));
  const rank = (r: SimResult) => (r.outcome === "passed" ? 0 : r.outcome === "survived" ? 1 : 2);
  return res.sort((a, b) => rank(a) - rank(b) || (a.passOnDay ?? 99) - (b.passOnDay ?? 99) || b.finalPnl - a.finalPnl);
}
