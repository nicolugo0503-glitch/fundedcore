// FundedCore — live risk engine.
// Turns an account's state + its firm's rules into the only two numbers that
// matter to a funded trader in real time: Distance to Breach and Max Size Now.
import { FIRMS, INSTRUMENTS, preTradeCheck, type Firm, type AcctState, type CheckResult } from "./firms";

export type Account = {
  id: string;
  label: string;          // e.g. "Apex #1"
  firmKey: string;        // key into FIRMS
  startBalance: number;   // account starting size
  balance: number;        // current equity
  peakEquity: number;     // highest equity reached (drives trailing DD)
  todayPnL: number;       // realized P&L so far today
  daysTraded: number;
};

export type RiskStatus = "healthy" | "caution" | "danger" | "breached";

export type AccountRisk = {
  firm: Firm;
  floor: number;          // equity level that ends the account
  trailingRoom: number;   // balance - floor
  dailyRoom: number;      // remaining daily-loss allowance (Infinity if none)
  distanceToBreach: number; // the binding constraint — THE number
  bindingConstraint: "trailing" | "daily";
  pctBuffer: number;      // distanceToBreach / trailingDD (0..1+)
  status: RiskStatus;
  netPnL: number;         // balance - startBalance
  toProfitTarget: number; // remaining to pass (0 if funded / no target)
  targetPct: number;      // progress 0..1 toward profit target
};

const slip = 1.0;

export function firmFor(a: Account): Firm {
  return FIRMS[a.firmKey];
}

// The drawdown floor depends on how the firm trails.
export function computeFloor(a: Account, firm: Firm): number {
  switch (firm.drawdownType) {
    case "static":
      return a.startBalance - firm.trailingDD;
    case "eod_trailing":
    case "intraday_trailing":
    default: {
      // Trailing floor follows the peak, but most funded plans lock the floor
      // once it reaches the starting balance (can't trail above breakeven).
      const trailed = a.peakEquity - firm.trailingDD;
      return Math.min(trailed, a.startBalance);
    }
  }
}

export function assessAccount(a: Account): AccountRisk {
  const firm = firmFor(a);
  const floor = computeFloor(a, firm);
  const trailingRoom = a.balance - floor;
  const dailyRoom = firm.dailyLoss == null
    ? Infinity
    : Math.max(0, firm.dailyLoss - Math.max(0, -a.todayPnL));
  const distanceToBreach = Math.min(trailingRoom, dailyRoom);
  const bindingConstraint: "trailing" | "daily" = dailyRoom < trailingRoom ? "daily" : "trailing";
  const pctBuffer = firm.trailingDD > 0 ? distanceToBreach / firm.trailingDD : 1;

  let status: RiskStatus;
  if (distanceToBreach <= 0) status = "breached";
  else if (pctBuffer < 0.2) status = "danger";
  else if (pctBuffer < 0.45) status = "caution";
  else status = "healthy";

  const netPnL = a.balance - a.startBalance;
  const toProfitTarget = firm.profitTarget > 0 ? Math.max(0, firm.profitTarget - netPnL) : 0;
  const targetPct = firm.profitTarget > 0 ? Math.min(1, Math.max(0, netPnL / firm.profitTarget)) : 1;

  return {
    firm, floor, trailingRoom, dailyRoom, distanceToBreach, bindingConstraint,
    pctBuffer, status, netPnL, toProfitTarget, targetPct,
  };
}

// Worst-case dollar loss for a position.
export function worstCaseLoss(instrumentKey: string, size: number, stopPts: number): number {
  const inst = INSTRUMENTS[instrumentKey];
  if (!inst) return 0;
  return Math.round(size * inst.perPoint * (stopPts + slip));
}

// Largest size that still survives the binding constraint, capped by the firm.
export function maxSizeNow(a: Account, instrumentKey: string, stopPts: number): number {
  const inst = INSTRUMENTS[instrumentKey];
  if (!inst) return 0;
  const { distanceToBreach, firm } = assessAccount(a);
  if (distanceToBreach <= 0) return 0;
  const perContract = inst.perPoint * (stopPts + slip);
  if (perContract <= 0) return firm.contractCap;
  const byRoom = Math.floor(distanceToBreach / perContract);
  return Math.max(0, Math.min(byRoom, firm.contractCap));
}

// Bridge an Account into the firewall's AcctState and run the full pre-trade check.
export function guardrail(
  a: Account,
  trade: { instrument: string; size: number; stop: number; news?: boolean; tilt?: boolean }
): CheckResult {
  const r = assessAccount(a);
  const acct: AcctState = {
    todayPnL: a.todayPnL,
    trailingRoom: r.trailingRoom,
    daysTraded: a.daysTraded,
  };
  return preTradeCheck(r.firm, acct, {
    instrument: trade.instrument,
    size: trade.size,
    stop: trade.stop,
    news: !!trade.news,
    tilt: !!trade.tilt,
  });
}

export const STATUS_META: Record<RiskStatus, { label: string; color: string }> = {
  healthy: { label: "Healthy", color: "#10B981" },
  caution: { label: "Caution", color: "#F59E0B" },
  danger: { label: "Danger", color: "#EF4444" },
  breached: { label: "Breached", color: "#7F1D1D" },
};

// Convenience: a few realistic starter accounts for the cockpit demo.
export function demoAccounts(): Account[] {
  return [
    { id: "a1", label: "Apex #1", firmKey: "apex50", startBalance: 50000, balance: 51850, peakEquity: 52400, todayPnL: -180, daysTraded: 8 },
    { id: "a2", label: "TopStep XFA", firmKey: "topstep_xfa50", startBalance: 50000, balance: 52600, peakEquity: 52600, todayPnL: 240, daysTraded: 14 },
    { id: "a3", label: "Apex Eval", firmKey: "apex25", startBalance: 25000, balance: 24720, peakEquity: 25380, todayPnL: -410, daysTraded: 3 },
  ];
}
