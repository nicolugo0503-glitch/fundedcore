// The Standard — FundedCore's data moat.
// Every synced/uploaded account contributes anonymized, no-PII behavioral metrics
// to a growing cohort. This engine ranks a trader against that cohort (percentile +
// grade) and gets sharper with every account that joins. Until enough real data
// exists, it ranks against a realistic baseline distribution of funded futures
// traders, then blends in (and ultimately is replaced by) the live cohort.
import type { Trade } from "./score";
import type { Account } from "./risk";
import { computeFundedScore } from "./fundedscore";

export type MetricKey = "composure" | "winRate" | "payoff" | "profitFactor" | "breachProb";
export type Anchors = [number, number, number, number, number];
const PCTS = [10, 25, 50, 75, 90];

export const METRICS: { key: MetricKey; label: string; higherBetter: boolean; weight: number; fmt: (v: number) => string }[] = [
  { key: "composure", label: "Composure", higherBetter: true, weight: 0.35, fmt: (v) => Math.round(v).toString() },
  { key: "profitFactor", label: "Profit factor", higherBetter: true, weight: 0.20, fmt: (v) => v.toFixed(2) },
  { key: "payoff", label: "Payoff (win/loss)", higherBetter: true, weight: 0.15, fmt: (v) => v.toFixed(2) + "x" },
  { key: "winRate", label: "Win rate", higherBetter: true, weight: 0.15, fmt: (v) => Math.round(v * 100) + "%" },
  { key: "breachProb", label: "Breach risk (5d)", higherBetter: false, weight: 0.15, fmt: (v) => Math.round(v * 100) + "%" },
];

export const BASELINE: Record<MetricKey, Anchors> = {
  composure: [38, 50, 62, 73, 84],
  winRate: [0.40, 0.47, 0.54, 0.61, 0.68],
  payoff: [0.70, 0.90, 1.10, 1.40, 1.90],
  profitFactor: [0.82, 0.96, 1.15, 1.42, 1.85],
  breachProb: [0.45, 0.28, 0.14, 0.06, 0.02],
};

export type UserMetrics = Record<MetricKey, number | null>;

export function userMetrics(trades: Trade[], account: Account | null): UserMetrics {
  const pnls = trades.map((t) => t.pnl);
  const n = pnls.length;
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const winRate = n ? wins.length / n : 0;
  const grossWin = wins.reduce((a, b) => a + b, 0);
  const grossLoss = Math.abs(losses.reduce((a, b) => a + b, 0));
  const avgWin = wins.length ? grossWin / wins.length : 0;
  const avgLoss = losses.length ? grossLoss / losses.length : 0;
  const payoff = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3 : 0;
  const profitFactor = grossLoss > 0 ? grossWin / grossLoss : grossWin > 0 ? 3 : 0;
  let composure: number | null = null;
  let breachProb: number | null = null;
  if (n >= 5) {
    const fs = computeFundedScore(trades, account, {});
    composure = fs.ready ? fs.composure : null;
    breachProb = fs.breach ? fs.breach.probability : null;
  }
  return { composure, winRate: n ? winRate : null, payoff: n ? payoff : null, profitFactor: n ? profitFactor : null, breachProb };
}

function goodness(v: number, higherBetter: boolean) { return higherBetter ? v : -v; }

function interpPct(anchorsAsc: number[], gv: number): number {
  if (gv <= anchorsAsc[0]) {
    const span = Math.abs(anchorsAsc[1] - anchorsAsc[0]) || 1;
    return Math.max(2, PCTS[0] - ((anchorsAsc[0] - gv) / span) * (PCTS[1] - PCTS[0]));
  }
  if (gv >= anchorsAsc[4]) {
    const span = Math.abs(anchorsAsc[4] - anchorsAsc[3]) || 1;
    return Math.min(99, PCTS[4] + ((gv - anchorsAsc[4]) / span) * (PCTS[4] - PCTS[3]));
  }
  for (let i = 0; i < 4; i++) {
    if (gv <= anchorsAsc[i + 1]) {
      const f = (gv - anchorsAsc[i]) / ((anchorsAsc[i + 1] - anchorsAsc[i]) || 1);
      return PCTS[i] + f * (PCTS[i + 1] - PCTS[i]);
    }
  }
  return 50;
}

export function percentileOf(anchors: Anchors, value: number, higherBetter: boolean): number {
  const anchorsAsc = higherBetter ? [...anchors] : anchors.map((a) => -a);
  return Math.round(interpPct(anchorsAsc, goodness(value, higherBetter)));
}

export type Cohort = { count: number; anchors: Partial<Record<MetricKey, Anchors>> } | null;
const MIN_REAL = 30;

export type MetricResult = { key: MetricKey; label: string; value: number; percentile: number; median: number; top10: number; fmt: (v: number) => string; higherBetter: boolean };
export type Benchmark = { composite: number; grade: string; rankLabel: string; metrics: MetricResult[]; cohortCount: number; baseline: boolean };

function grade(p: number) { return p >= 90 ? "A+" : p >= 75 ? "A" : p >= 60 ? "B" : p >= 45 ? "C" : p >= 30 ? "D" : "F"; }

export function benchmark(trades: Trade[], account: Account | null, cohort?: Cohort): Benchmark {
  const um = userMetrics(trades, account);
  const useReal = !!(cohort && cohort.count >= MIN_REAL);
  const results: MetricResult[] = [];
  let wsum = 0, psum = 0;
  for (const m of METRICS) {
    const v = um[m.key];
    if (v == null) continue;
    const anchors = (useReal && cohort!.anchors[m.key]) ? cohort!.anchors[m.key]! : BASELINE[m.key];
    const p = percentileOf(anchors, v, m.higherBetter);
    results.push({ key: m.key, label: m.label, value: v, percentile: p, median: anchors[2], top10: anchors[4], fmt: m.fmt, higherBetter: m.higherBetter });
    psum += p * m.weight; wsum += m.weight;
  }
  const composite = wsum ? Math.round(psum / wsum) : 0;
  const top = 100 - composite;
  return {
    composite, grade: grade(composite),
    rankLabel: composite >= 50 ? `Top ${Math.max(1, top)}%` : `Bottom ${Math.max(1, composite)}%`,
    metrics: results, cohortCount: cohort?.count ?? 0, baseline: !useReal,
  };
}

export function submission(trades: Trade[], account: Account | null) {
  const um = userMetrics(trades, account);
  return { composure: um.composure, winRate: um.winRate, payoff: um.payoff, profitFactor: um.profitFactor, breachProb: um.breachProb, trades: trades.length, firmKey: account?.firmKey ?? null };
}
