// ─────────────────────────────────────────────────────────────────────────────
// FundedCore — Trader Score Engine
// The "credit score for traders." A behavioral + statistical fingerprint of edge.
//
// Input: a list of closed trades (P&L per trade + timestamp at minimum).
// Output: four sub-scores (Edge, Consistency, Discipline, Drawdown Control),
//         a composite Trader Score (0–100), a confidence factor, a grade,
//         a funding decision + capital offer, and full supporting analytics.
//
// This is a transparent, defensible underwriting model — not a black box.
// Not financial advice. Sample/illustrative scoring for the FundedCore MVP.
// ─────────────────────────────────────────────────────────────────────────────

export type Trade = {
  id: number;
  date: string;        // YYYY-MM-DD (day bucket)
  timestamp: number;   // ms epoch, used for ordering
  symbol?: string;
  side?: "long" | "short";
  size?: number;       // contracts / shares / lots
  pnl: number;         // net realized P&L in account currency
  rMultiple?: number;  // optional: P&L expressed in units of risk
  tag?: string;        // optional: setup/strategy label
};

export type SubScore = {
  key: "edge" | "consistency" | "discipline" | "drawdown";
  label: string;
  score: number;       // 0–100
  blurb: string;       // one-line plain-English read
  metrics: { label: string; value: string }[];
};

export type Decision = "FUNDED" | "CONDITIONAL" | "DECLINED";

export type Offer = {
  decision: Decision;
  accountSize: number;     // capital allocated
  profitSplit: number;     // trader's share, e.g. 0.75
  maxDrawdown: number;     // account drawdown limit ($)
  scalingTarget: number;   // profit needed to scale to next tier
  payoutCadence: string;
};

export type Analytics = {
  trades: number;
  spanDays: number;
  totalPnl: number;
  winRate: number;
  profitFactor: number;
  expectancy: number;      // avg $ per trade
  avgWin: number;
  avgLoss: number;
  payoff: number;          // avgWin / avgLoss
  sharpe: number;          // annualized, per-trade approximation
  tStat: number;           // significance of mean P&L > 0
  maxDrawdown: number;     // largest peak-to-trough on equity ($)
  recoveryFactor: number;  // net profit / max drawdown
  bestDay: number;
  worstDay: number;
  bestDayShare: number;    // best day as fraction of gross profit
  equityCurve: number[];   // cumulative P&L after each trade (starts at 0)
  dailyPnl: { date: string; pnl: number }[];
};

export type ScoreResult = {
  traderScore: number;     // 0–100 composite
  grade: string;           // A+ … F
  confidence: number;      // 0–1, data sufficiency
  subscores: SubScore[];
  decision: Decision;
  offer: Offer;
  analytics: Analytics;
  strengths: string[];
  flags: string[];
  headline: string;
};

// ── small stats helpers ──────────────────────────────────────────────────────
const sum = (a: number[]) => a.reduce((s, x) => s + x, 0);
const mean = (a: number[]) => (a.length ? sum(a) / a.length : 0);
const std = (a: number[]) => {
  if (a.length < 2) return 0;
  const m = mean(a);
  return Math.sqrt(sum(a.map((x) => (x - m) ** 2)) / (a.length - 1));
};
const clamp = (x: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, x));
const clamp01 = (x: number) => clamp(x, 0, 1);

// Linear map of v across [inLo,inHi] -> [outLo,outHi], clamped.
// Handles inverted input ranges (inLo > inHi) for "lower is better" metrics.
function mapClamp(v: number, inLo: number, inHi: number, outLo: number, outHi: number) {
  if (inLo === inHi) return (outLo + outHi) / 2;
  const t = clamp01((v - inLo) / (inHi - inLo));
  return outLo + t * (outHi - outLo);
}

const fmtUsd = (n: number) =>
  (n < 0 ? "-" : "") +
  "$" +
  Math.abs(Math.round(n)).toLocaleString("en-US");
const fmtPct = (n: number) => `${(n * 100).toFixed(0)}%`;
const fmtNum = (n: number, d = 2) => n.toFixed(d);

// ── core engine ──────────────────────────────────────────────────────────────
export function scoreTrades(input: Trade[]): ScoreResult {
  const trades = [...input].sort((a, b) => a.timestamp - b.timestamp);
  const n = trades.length;
  const pnls = trades.map((t) => t.pnl);

  // Equity curve (cumulative), starting at 0.
  const equityCurve: number[] = [0];
  let run = 0;
  for (const p of pnls) {
    run += p;
    equityCurve.push(run);
  }
  const totalPnl = run;

  // Daily aggregation.
  const byDay = new Map<string, number>();
  for (const t of trades) byDay.set(t.date, (byDay.get(t.date) || 0) + t.pnl);
  const dailyPnl = [...byDay.entries()]
    .map(([date, pnl]) => ({ date, pnl }))
    .sort((a, b) => a.date.localeCompare(b.date));
  const dayVals = dailyPnl.map((d) => d.pnl);
  const tradingDays = dailyPnl.length;
  const spanDays =
    n > 1
      ? Math.max(
          1,
          Math.round((trades[n - 1].timestamp - trades[0].timestamp) / 86400000)
        )
      : 1;

  // Win/loss decomposition.
  const wins = pnls.filter((p) => p > 0);
  const losses = pnls.filter((p) => p < 0);
  const grossProfit = sum(wins);
  const grossLoss = Math.abs(sum(losses));
  const winRate = n ? wins.length / n : 0;
  const avgWin = mean(wins);
  const avgLoss = Math.abs(mean(losses));
  const payoff = avgLoss > 0 ? avgWin / avgLoss : avgWin > 0 ? 3 : 0;
  const profitFactor =
    grossLoss > 0 ? grossProfit / grossLoss : grossProfit > 0 ? 5 : 0;
  const expectancy = mean(pnls);

  // Significance + risk-adjusted return.
  const sd = std(pnls);
  const tStat = sd > 0 ? (expectancy / sd) * Math.sqrt(n) : 0;
  // Annualized Sharpe approximation: per-trade Sharpe scaled by trade frequency.
  const tradesPerYear = (n / spanDays) * 252;
  const sharpe = sd > 0 ? (expectancy / sd) * Math.sqrt(Math.max(1, tradesPerYear)) : 0;

  // Max drawdown on equity curve (peak-to-trough).
  let peak = equityCurve[0];
  let maxDrawdown = 0;
  let underwaterPts = 0;
  for (const e of equityCurve) {
    if (e > peak) peak = e;
    const dd = peak - e;
    if (dd > maxDrawdown) maxDrawdown = dd;
    if (e < peak) underwaterPts++;
  }
  const underwaterFrac = equityCurve.length > 1 ? underwaterPts / equityCurve.length : 0;
  const recoveryFactor = maxDrawdown > 0 ? totalPnl / maxDrawdown : totalPnl > 0 ? 6 : 0;

  // Best/worst day + concentration (the classic prop "consistency rule").
  const bestDay = dayVals.length ? Math.max(...dayVals) : 0;
  const worstDay = dayVals.length ? Math.min(...dayVals) : 0;
  const bestDayShare = grossProfit > 0 ? bestDay / grossProfit : 1;

  // ── Sub-score 1: EDGE QUALITY ───────────────────────────────────────────────
  // Does a real, statistically credible edge exist?
  const pfComponent = mapClamp(profitFactor, 1.0, 2.2, 18, 94);
  const tComponent = mapClamp(tStat, 0, 3.5, 0, 100);
  const payoffWr = winRate * payoff; // expectancy ratio proxy
  const ratioComponent = mapClamp(payoffWr, 0.6, 1.8, 15, 95);
  let edge = 0.5 * pfComponent + 0.32 * tComponent + 0.18 * ratioComponent;
  if (expectancy <= 0) edge = Math.min(edge, 28);
  edge = clamp(edge, 2, 99);

  // ── Sub-score 2: CONSISTENCY ────────────────────────────────────────────────
  // Are profits broad-based and steady, or one lucky spike?
  const winningDayRate = tradingDays ? dayVals.filter((d) => d > 0).length / tradingDays : 0;
  const equityR2 = rSquaredLinear(equityCurve);
  const shareComponent = mapClamp(bestDayShare, 0.55, 0.15, 8, 96); // lower share -> higher
  const winDayComponent = mapClamp(winningDayRate, 0.35, 0.7, 18, 95);
  const r2Component = mapClamp(equityR2, 0.45, 0.96, 15, 98);
  let consistency = 0.4 * shareComponent + 0.25 * winDayComponent + 0.35 * r2Component;
  consistency = clamp(consistency, 2, 99);

  // ── Sub-score 3: DISCIPLINE ─────────────────────────────────────────────────
  // Behavioral control: stable risk, no tilt/revenge sizing, no overtrading.
  const risk = trades.map((t) => (t.size != null ? Math.abs(t.size) : Math.abs(t.pnl) || 1));
  const riskCV = mean(risk) > 0 ? std(risk) / mean(risk) : 1;
  // Revenge sizing: avg risk on the trade immediately following a loss vs baseline.
  const afterLoss: number[] = [];
  for (let i = 1; i < n; i++) if (trades[i - 1].pnl < 0) afterLoss.push(risk[i]);
  const revengeRatio = mean(risk) > 0 && afterLoss.length ? mean(afterLoss) / mean(risk) : 1;
  // Loss escalation: do losses grow within losing streaks?
  let escalations = 0, streakLen = 0, prevLoss = 0;
  for (const t of trades) {
    if (t.pnl < 0) {
      if (streakLen > 0 && Math.abs(t.pnl) > Math.abs(prevLoss) * 1.15) escalations++;
      prevLoss = t.pnl; streakLen++;
    } else { streakLen = 0; prevLoss = 0; }
  }
  const escalationRate = n ? escalations / n : 0;
  const sizeComponent = mapClamp(riskCV, 1.25, 0.28, 12, 95);
  const revengeComponent = mapClamp(revengeRatio, 1.7, 0.95, 8, 95);
  const escalationComponent = mapClamp(escalationRate, 0.22, 0.0, 20, 97);
  let discipline = 0.4 * sizeComponent + 0.35 * revengeComponent + 0.25 * escalationComponent;
  discipline = clamp(discipline, 2, 99);

  // ── Sub-score 4: DRAWDOWN CONTROL ───────────────────────────────────────────
  const maxDDShareOfProfit = totalPnl > 0 ? maxDrawdown / totalPnl : 1.5;
  const recoveryComponent = mapClamp(recoveryFactor, 1.0, 6.0, 20, 96);
  const ddDepthComponent = mapClamp(maxDDShareOfProfit, 0.85, 0.15, 10, 95);
  const durationComponent = mapClamp(underwaterFrac, 0.55, 0.1, 18, 96);
  let drawdown = 0.45 * recoveryComponent + 0.35 * ddDepthComponent + 0.2 * durationComponent;
  if (totalPnl <= 0) drawdown = Math.min(drawdown, 25);
  drawdown = clamp(drawdown, 2, 99);

  // ── Composite + confidence ──────────────────────────────────────────────────
  const W = { edge: 0.3, discipline: 0.25, drawdown: 0.25, consistency: 0.2 };
  const raw =
    W.edge * edge + W.discipline * discipline + W.drawdown * drawdown + W.consistency * consistency;

  // Confidence shrinks the score toward a neutral baseline when the sample is thin.
  // More trades + longer history => we trust the estimate more.
  const confidence = clamp(
    0.6 * clamp01(n / 80) + 0.4 * clamp01(spanDays / 90),
    0.25,
    1
  );
  const baseline = 46;
  let traderScore = Math.round(baseline + (raw - baseline) * confidence);
  traderScore = clamp(traderScore, 1, 99);

  const grade = toGrade(traderScore);

  // ── Funding decision + capital offer ────────────────────────────────────────
  const noEdge = profitFactor < 1.0 || expectancy <= 0;
  let decision: Decision;
  if (noEdge) decision = "DECLINED";
  else if (traderScore >= 78 && edge >= 62 && confidence >= 0.45) decision = "FUNDED";
  else if (traderScore >= 63) decision = "CONDITIONAL";
  else decision = "DECLINED";

  const offer = buildOffer(decision, traderScore);

  // ── Human-readable strengths / flags ────────────────────────────────────────
  const strengths: string[] = [];
  const flags: string[] = [];
  if (edge >= 70) strengths.push(`Statistically credible edge — profit factor ${fmtNum(profitFactor)}, t-stat ${fmtNum(tStat, 1)}.`);
  if (drawdown >= 70) strengths.push(`Tight drawdown control — recovers ${fmtNum(recoveryFactor, 1)}× its worst loss.`);
  if (discipline >= 72) strengths.push(`Disciplined risk — bet size stays steady, no revenge sizing after losses.`);
  if (consistency >= 72) strengths.push(`Broad-based, steady equity curve (R² ${fmtNum(equityR2)}), not one lucky day.`);

  if (edge < 50) flags.push(`Edge is thin or unproven — profit factor ${fmtNum(profitFactor)} leaves little margin.`);
  if (bestDayShare > 0.4) flags.push(`Concentration risk — ${fmtPct(bestDayShare)} of profit came from a single day.`);
  if (revengeRatio > 1.3) flags.push(`Revenge sizing — risk jumps ${fmtPct(revengeRatio - 1)} after a loss.`);
  if (riskCV > 0.9) flags.push(`Erratic position sizing (CV ${fmtNum(riskCV)}) — inconsistent risk per trade.`);
  if (maxDDShareOfProfit > 0.6 && totalPnl > 0) flags.push(`Deep drawdown — worst dip erased ${fmtPct(maxDDShareOfProfit)} of total profit.`);
  if (confidence < 0.5) flags.push(`Limited track record (${n} trades / ${spanDays}d) — score held toward neutral until more data.`);
  if (expectancy <= 0) flags.push(`Negative expectancy — the system loses money per trade on this sample.`);

  const headline = buildHeadline(decision, traderScore, grade);

  const subscores: SubScore[] = [
    {
      key: "edge",
      label: "Edge Quality",
      score: Math.round(edge),
      blurb: edge >= 65 ? "Real, statistically significant edge." : edge >= 45 ? "Edge present but unproven." : "No durable edge detected.",
      metrics: [
        { label: "Profit factor", value: fmtNum(profitFactor) },
        { label: "Expectancy / trade", value: fmtUsd(expectancy) },
        { label: "Win rate", value: fmtPct(winRate) },
        { label: "t-stat (edge sig.)", value: fmtNum(tStat, 1) },
      ],
    },
    {
      key: "consistency",
      label: "Consistency",
      score: Math.round(consistency),
      blurb: consistency >= 65 ? "Steady, broad-based returns." : consistency >= 45 ? "Somewhat uneven." : "Lumpy — concentrated in spikes.",
      metrics: [
        { label: "Best-day share", value: fmtPct(bestDayShare) },
        { label: "Winning days", value: fmtPct(winningDayRate) },
        { label: "Equity curve R²", value: fmtNum(equityR2) },
        { label: "Trading days", value: String(tradingDays) },
      ],
    },
    {
      key: "discipline",
      label: "Discipline",
      score: Math.round(discipline),
      blurb: discipline >= 65 ? "Controlled, rule-bound risk." : discipline >= 45 ? "Some behavioral leakage." : "Tilt / revenge patterns present.",
      metrics: [
        { label: "Risk-size CV", value: fmtNum(riskCV) },
        { label: "Risk after a loss", value: `${revengeRatio >= 1 ? "+" : ""}${fmtPct(revengeRatio - 1)}` },
        { label: "Loss escalation", value: fmtPct(escalationRate) },
      ],
    },
    {
      key: "drawdown",
      label: "Drawdown Control",
      score: Math.round(drawdown),
      blurb: drawdown >= 65 ? "Shallow, short drawdowns." : drawdown >= 45 ? "Manageable but notable dips." : "Deep / prolonged drawdowns.",
      metrics: [
        { label: "Max drawdown", value: fmtUsd(maxDrawdown) },
        { label: "Recovery factor", value: fmtNum(recoveryFactor, 1) },
        { label: "Time underwater", value: fmtPct(underwaterFrac) },
      ],
    },
  ];

  const analytics: Analytics = {
    trades: n,
    spanDays,
    totalPnl,
    winRate,
    profitFactor,
    expectancy,
    avgWin,
    avgLoss,
    payoff,
    sharpe,
    tStat,
    maxDrawdown,
    recoveryFactor,
    bestDay,
    worstDay,
    bestDayShare,
    equityCurve,
    dailyPnl,
  };

  return {
    traderScore,
    grade,
    confidence,
    subscores,
    decision,
    offer,
    analytics,
    strengths,
    flags,
    headline,
  };
}

// R² of the cumulative equity curve against a straight line (smoothness proxy).
function rSquaredLinear(y: number[]): number {
  const n = y.length;
  if (n < 3) return 0;
  const x = y.map((_, i) => i);
  const mx = mean(x), my = mean(y);
  let sxy = 0, sxx = 0, syy = 0;
  for (let i = 0; i < n; i++) {
    sxy += (x[i] - mx) * (y[i] - my);
    sxx += (x[i] - mx) ** 2;
    syy += (y[i] - my) ** 2;
  }
  if (sxx === 0 || syy === 0) return 0;
  const r = sxy / Math.sqrt(sxx * syy);
  return clamp01(r * r);
}

function toGrade(s: number): string {
  if (s >= 90) return "A+";
  if (s >= 83) return "A";
  if (s >= 76) return "B+";
  if (s >= 68) return "B";
  if (s >= 58) return "C";
  if (s >= 48) return "D";
  return "F";
}

function buildOffer(decision: Decision, score: number): Offer {
  if (decision === "FUNDED") {
    const accountSize = Math.round(mapClamp(score, 78, 96, 50000, 200000) / 5000) * 5000;
    const profitSplit = score >= 93 ? 0.9 : score >= 88 ? 0.8 : 0.75;
    return {
      decision,
      accountSize,
      profitSplit,
      maxDrawdown: Math.round(accountSize * 0.06),
      scalingTarget: Math.round(accountSize * 0.08),
      payoutCadence: "On-demand after first profitable cycle",
    };
  }
  if (decision === "CONDITIONAL") {
    const accountSize = Math.round(mapClamp(score, 63, 78, 15000, 50000) / 5000) * 5000;
    return {
      decision,
      accountSize,
      profitSplit: 0.7,
      maxDrawdown: Math.round(accountSize * 0.05),
      scalingTarget: Math.round(accountSize * 0.06),
      payoutCadence: "Bi-weekly after 10 funded trading days",
    };
  }
  return {
    decision,
    accountSize: 0,
    profitSplit: 0,
    maxDrawdown: 0,
    scalingTarget: 0,
    payoutCadence: "—",
  };
}

function buildHeadline(decision: Decision, score: number, grade: string): string {
  if (decision === "FUNDED")
    return `Funded. Trader Score ${score} (${grade}) clears our underwriting bar — capital is allocated.`;
  if (decision === "CONDITIONAL")
    return `Conditional offer. Score ${score} (${grade}) shows promise; we fund a smaller account and scale on proof.`;
  return `Not funded yet. Score ${score} (${grade}) doesn't show a durable, controllable edge — here's exactly why.`;
}

export const _fmt = { fmtUsd, fmtPct, fmtNum };
