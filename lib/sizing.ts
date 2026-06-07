// Kelly-optimal position sizing for funded futures: edge from the trader's own
// record, bankroll = breach room (not balance), fractional-Kelly for safety.
import type { Trade } from "./score";
import { INSTRUMENTS } from "./firms";
import { assessAccount, worstCaseLoss, type Account } from "./risk";

export type KellyResult = {
  ready: boolean; trades: number;
  winRate: number; payoff: number; expectancy: number;
  fullKelly: number; halfKelly: number; quarterKelly: number; // fraction of breach room to risk/trade
  edgePositive: boolean;
  riskCapital: number; recommendRiskUsd: number; recommendContracts: number; cap: number;
  verdict: string;
};

export function kellySizing(trades: Trade[], account: Account, instrumentKey: string, stopPts: number): KellyResult {
  const base: KellyResult = { ready: false, trades: trades.length, winRate: 0, payoff: 0, expectancy: 0, fullKelly: 0, halfKelly: 0, quarterKelly: 0, edgePositive: false, riskCapital: 0, recommendRiskUsd: 0, recommendContracts: 0, cap: 0, verdict: "" };
  if (trades.length < 15) return base;
  const wins = trades.filter((t) => t.pnl > 0), losses = trades.filter((t) => t.pnl < 0);
  if (!wins.length || !losses.length) return base;
  const W = wins.length / trades.length;
  const avgWin = wins.reduce((s, t) => s + t.pnl, 0) / wins.length;
  const avgLoss = Math.abs(losses.reduce((s, t) => s + t.pnl, 0) / losses.length);
  const payoff = avgLoss > 0 ? avgWin / avgLoss : 0;
  const expectancy = trades.reduce((s, t) => s + t.pnl, 0) / trades.length;
  const fullKelly = payoff > 0 ? W - (1 - W) / payoff : -1; // fraction of bankroll to risk per trade
  const halfKelly = fullKelly / 2, quarterKelly = fullKelly / 4;
  const r = assessAccount(account);
  const riskCapital = Math.max(0, r.distanceToBreach);
  const inst = INSTRUMENTS[instrumentKey];
  const perContract = inst ? worstCaseLoss(instrumentKey, 1, stopPts) : 0;
  const recFrac = Math.max(0, Math.min(0.2, halfKelly)); // half-Kelly, hard-capped at 20% of room
  const recommendRiskUsd = recFrac * riskCapital;
  const cap = inst ? r.firm.contractCap : 0;
  const recommendContracts = perContract > 0 ? Math.max(0, Math.min(cap, Math.floor(recommendRiskUsd / perContract))) : 0;
  const edgePositive = fullKelly > 0;
  const verdict = !edgePositive
    ? `Your edge is negative or unproven (Kelly ${(fullKelly * 100).toFixed(0)}%). The math says size zero — don't add risk until the edge is real.`
    : `Half-Kelly says risk ${(recFrac * 100).toFixed(1)}% of your ${"$" + Math.round(riskCapital).toLocaleString()} breach room — about ${"$" + Math.round(recommendRiskUsd).toLocaleString()} per trade, or ${recommendContracts} ${instrumentKey} at a ${stopPts}-pt stop. Full Kelly (${(fullKelly * 100).toFixed(0)}%) is mathematically optimal but too violent for a funded account — half or quarter keeps variance survivable.`;
  return { ready: true, trades: trades.length, winRate: W, payoff, expectancy, fullKelly, halfKelly, quarterKelly, edgePositive, riskCapital, recommendRiskUsd, recommendContracts, cap, verdict };
}
