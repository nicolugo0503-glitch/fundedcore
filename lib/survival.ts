// The Survival Score — FundedCore's flagship predictive engine.
// Fuses (1) forward breach probability from the trader's own P&L, (2) live behavioral
// state (tilt / loss-streak) from the Guard, and (3) the account's exact rule math
// (distance-to-breach, buffer) into ONE forward-looking number — plus a dollarized
// pre-trade check: "this trade lifts your breach odds X%->Y% and risks $A of your $B buffer."
// Honest: it's a probability estimate, never a guarantee. Deterministic; no AI invents numbers.
import type { Trade } from "./score";
import type { Account } from "./risk";
import { assessAccount } from "./risk";
import { computeFundedScore } from "./fundedscore";
import { guardState } from "./guard";
import { INSTRUMENTS } from "./firms";
import { BASELINE } from "./benchmark";

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));
function grade(s: number) { return s >= 85 ? "A" : s >= 70 ? "B" : s >= 55 ? "C" : s >= 40 ? "D" : "F"; }

export type SurvivalDriver = { label: string; detail: string; dir: "up" | "down" };
export type SurvivalSim = {
  riskDollars: number; bufferBefore: number; bufferAfter: number;
  oddsBefore: number; oddsAfter: number; pctOfBuffer: number;
  verdict: "GO" | "CAUTION" | "SKIP"; line: string;
};
export type Survival = {
  ready: boolean; headline: string;
  score: number;        // 0..100, higher = safer
  grade: string;
  breachOdds: number;   // 0..1 forward probability over horizon
  horizonDays: number;
  distanceToBreach: number;
  bufferPct: number;    // 0..1+
  tiltIndex: number;    // 0..100
  consecLosses: number;
  drivers: SurvivalDriver[];
  runway: { toTarget: number; greenDays: number | null } | null;
  sim: SurvivalSim | null;
};

export type SurvivalOpts = {
  dailyLossStop?: number;
  maxTradesPerDay?: number;
  proposed?: { instrument: string; contracts: number; stopPts: number } | null;
};

export function survival(trades: Trade[], account: Account | null, opts: SurvivalOpts = {}): Survival {
  const horizonDays = 5;
  const fs = computeFundedScore(trades, account, { horizonDays });
  const ar = account ? assessAccount(account) : null;
  let gs: any = null;
  try { gs = guardState(trades, account as any, { dailyLossStop: opts.dailyLossStop ?? 500, maxTradesPerDay: opts.maxTradesPerDay ?? 4 }); } catch {}
  const tiltIndex = gs?.tiltIndex ?? 0;
  const consecLosses = gs?.today?.consecLosses ?? 0;

  if (trades.length < 5) {
    return { ready: false, headline: "Upload or sync a handful of trades — the Survival Score needs your behavior to read your odds.", score: 0, grade: "—", breachOdds: 0, horizonDays, distanceToBreach: ar?.distanceToBreach ?? 0, bufferPct: ar?.pctBuffer ?? 1, tiltIndex, consecLosses, drivers: [], runway: null, sim: null };
  }

  // ── forward breach odds: base (own P&L, else cohort median) × live behavior × buffer ──
  const baseP = fs.breach ? fs.breach.probability : BASELINE.breachProb[2]; // cohort median fallback
  const tiltMult = 1 + (tiltIndex / 100) * 1.2;                              // full tilt ~2.2x near-term
  const bufferPct = ar ? ar.pctBuffer : 1;
  const bufferMult = clamp(1 + (0.4 - Math.min(0.4, bufferPct)) * 2, 1, 1.8); // <40% buffer escalates
  const lossBump = consecLosses >= 3 ? 0.15 : consecLosses === 2 ? 0.08 : 0;
  const breachOdds = clamp(baseP * tiltMult * bufferMult + lossBump, 0.01, 0.98);
  const score = Math.round(100 * (1 - breachOdds));

  const drivers: SurvivalDriver[] = [];
  if (tiltIndex >= 45) drivers.push({ label: "Tilt is elevated", detail: `Behavioral tilt index ${tiltIndex}/100 is raising your near-term breach odds.`, dir: "up" });
  else if (tiltIndex < 20) drivers.push({ label: "Calm & composed", detail: "No active tilt signals — behavior is working for you.", dir: "down" });
  if (consecLosses >= 2) drivers.push({ label: `${consecLosses} losses in a row`, detail: "Loss streaks are where revenge trades — and breaches — happen.", dir: "up" });
  if (ar && bufferPct <= 0.25) drivers.push({ label: "Thin buffer", detail: `Only ${Math.round(bufferPct * 100)}% of your drawdown room left — one bad day is close to a breach.`, dir: "up" });
  else if (ar && bufferPct >= 0.6) drivers.push({ label: "Healthy buffer", detail: `${Math.round(bufferPct * 100)}% of your drawdown room intact — you have room to navigate.`, dir: "down" });
  if (fs.breach && fs.breach.worstDayPnl < 0 && ar && Math.abs(fs.breach.worstDayPnl) > ar.distanceToBreach) drivers.push({ label: "A normal-bad day breaches you", detail: `Your worst day (${Math.round(fs.breach.worstDayPnl)}) is bigger than your buffer.`, dir: "up" });

  let runway: Survival["runway"] = null;
  if (ar && ar.toProfitTarget > 0) {
    const med = fs.breach?.medianDailyPnl ?? 0;
    runway = { toTarget: ar.toProfitTarget, greenDays: med > 0 ? Math.ceil(ar.toProfitTarget / med) : null };
  }

  // ── pre-trade simulator ──
  let sim: SurvivalSim | null = null;
  if (opts.proposed && ar && ar.distanceToBreach > 0) {
    const p = opts.proposed;
    const inst = INSTRUMENTS[p.instrument];
    const riskDollars = Math.round((inst?.perPoint ?? 1) * Math.max(0, p.contracts) * Math.max(0, p.stopPts));
    const dtb = ar.distanceToBreach;
    const bufferAfter = dtb - riskDollars;
    const pctOfBuffer = clamp(riskDollars / dtb, 0, 1);
    const oddsBefore = breachOdds;
    const oddsAfter = riskDollars >= dtb ? 0.99 : clamp(oddsBefore + pctOfBuffer * (1 - oddsBefore) + (consecLosses >= 2 ? 0.12 : 0), 0.01, 0.99);
    const revenge = consecLosses >= 2;
    let verdict: SurvivalSim["verdict"] = "GO";
    if (riskDollars >= dtb || oddsAfter >= 0.6 || (revenge && pctOfBuffer > 0.25)) verdict = "SKIP";
    else if (oddsAfter >= 0.35 || pctOfBuffer > 0.4 || revenge) verdict = "CAUTION";
    const line = riskDollars >= dtb
      ? `Worst case, this trade breaches the account outright — it risks $${riskDollars.toLocaleString()} against a $${Math.round(dtb).toLocaleString()} buffer.`
      : `This trade risks $${riskDollars.toLocaleString()} of your $${Math.round(dtb).toLocaleString()} buffer and lifts your breach odds ${Math.round(oddsBefore * 100)}% → ${Math.round(oddsAfter * 100)}%.`;
    sim = { riskDollars, bufferBefore: dtb, bufferAfter, oddsBefore, oddsAfter, pctOfBuffer, verdict, line };
  }

  const headline =
    score >= 80 ? "You're on solid ground — protect it."
    : score >= 60 ? "Survivable, with clear risks to respect today."
    : score >= 40 ? "Fragile. Your behavior — not the market — is the threat right now."
    : "Critical. One tilt trade from a breach. Step back.";

  return { ready: true, headline, score, grade: grade(score), breachOdds, horizonDays, distanceToBreach: ar?.distanceToBreach ?? 0, bufferPct, tiltIndex, consecLosses, drivers, runway, sim };
}
