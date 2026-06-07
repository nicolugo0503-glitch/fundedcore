// Payout-timing optimizer: are you eligible, what's blocking, and the largest
// compliant withdrawal that still keeps a safe buffer above breach.
import type { Trade } from "./score";
import { firmFor, type Account } from "./risk";

export type PayoutPlan = {
  ready: boolean; eligible: boolean; blockers: string[];
  daysTraded: number; minDays: number;
  profit: number; profitTarget: number; targetMet: boolean;
  bestDay: number; consistencyLimit: number; consistencyPct: number; consistencyOk: boolean; needForConsistency: number;
  split: number; keepBuffer: number; recommendedWithdrawal: number; netToTrader: number;
  summary: string;
};

function dailyNets(trades: Trade[]): number[] {
  const m = new Map<string, number>();
  for (const t of trades) { const d = new Date(t.timestamp).toISOString().slice(0, 10); m.set(d, (m.get(d) || 0) + t.pnl); }
  return [...m.values()];
}

export function payoutPlan(account: Account, trades: Trade[], split = 0.9): PayoutPlan {
  const firm = firmFor(account);
  const nets = dailyNets(trades);
  const daysTraded = Math.max(account.daysTraded || 0, nets.length);
  const profit = account.balance - account.startBalance;
  const totalProfit = Math.max(0, profit);
  const bestDay = nets.length ? Math.max(...nets, 0) : 0;
  const consistencyLimit = firm.consistency || 0; // 0 = no rule
  const consistencyPct = totalProfit > 0 ? bestDay / totalProfit : 0;
  const consistencyOk = consistencyLimit === 0 || consistencyPct <= consistencyLimit;
  // profit needed so that bestDay <= consistencyLimit * total
  const needForConsistency = consistencyLimit > 0 && !consistencyOk ? Math.max(0, bestDay / consistencyLimit - totalProfit) : 0;
  const targetMet = firm.profitTarget === 0 || profit >= firm.profitTarget;

  const blockers: string[] = [];
  if (daysTraded < firm.minDays) blockers.push(`${firm.minDays - daysTraded} more trading day(s) needed (min ${firm.minDays}).`);
  if (!targetMet) blockers.push(`${"$" + Math.round(firm.profitTarget - profit).toLocaleString()} more profit to hit the $${firm.profitTarget.toLocaleString()} target.`);
  if (!consistencyOk) blockers.push(`Consistency: your best day is ${Math.round(consistencyPct * 100)}% of profit (limit ${Math.round(consistencyLimit * 100)}%). Earn ${"$" + Math.round(needForConsistency).toLocaleString()} more on other days to comply.`);
  if (totalProfit <= 0) blockers.push(`Account isn't in profit yet.`);

  const keepBuffer = firm.trailingDD; // keep one full drawdown cushion above breach
  const recommendedWithdrawal = blockers.length === 0 ? Math.max(0, Math.floor((totalProfit - keepBuffer) / 100) * 100) : 0;
  const netToTrader = recommendedWithdrawal * split;
  const eligible = blockers.length === 0 && recommendedWithdrawal > 0;

  const summary = eligible
    ? `You're clear to withdraw. Taking ${"$" + recommendedWithdrawal.toLocaleString()} leaves a ${"$" + keepBuffer.toLocaleString()} cushion above breach — you keep ${"$" + Math.round(netToTrader).toLocaleString()} after the ${Math.round(split * 100)}% split.`
    : blockers.length ? `Not payout-ready yet: ${blockers.length} requirement(s) to clear first.` : `In profit, but withdrawing now would leave too little cushion above breach — let it build past ${"$" + keepBuffer.toLocaleString()}.`;
  return { ready: true, eligible, blockers, daysTraded, minDays: firm.minDays, profit, profitTarget: firm.profitTarget, targetMet, bestDay, consistencyLimit, consistencyPct, consistencyOk, needForConsistency, split, keepBuffer, recommendedWithdrawal, netToTrader, summary };
}
