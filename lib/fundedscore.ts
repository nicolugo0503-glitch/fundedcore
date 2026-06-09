// FundedScore + Breach Probability
// The predictive / actuarial core. Two honest numbers from the trader's REAL data:
//   1. Composure (0-100): a behavioral discipline score from weighted sub-scores.
//   2. Breach probability: bootstrapped from the trader's own daily-P&L distribution
//      simulated forward against the firm's real floor + daily-loss rule.
// Both sharpen as more data arrives; we label confidence honestly and never fabricate
// precision when the sample is thin.
import type { Trade } from "./score";
import type { Account } from "./risk";
import { analyze } from "./insights";
import { firmFor, computeFloor, assessAccount } from "./risk";

export type ScoreDriver = {
  label: string;
  impact: "helps" | "hurts";
  detail: string;
  weight: number;     // 0..1 contribution to composure
};

export type BreachEstimate = {
  horizonDays: number;
  probability: number;       // 0..1
  distanceToBreach: number;
  medianDailyPnl: number;
  worstDayPnl: number;
  paths: number;
  confidence: "low" | "medium" | "high";
};

export type FundedScore = {
  composure: number;          // 0-100
  grade: string;
  drivers: ScoreDriver[];
  breach: BreachEstimate | null;
  sampleDays: number;
  sampleTrades: number;
  confidence: "low" | "medium" | "high";
  ready: boolean;
  headline: string;
};

function clamp(n: number, lo = 0, hi = 100) { return Math.max(lo, Math.min(hi, n)); }
function grade(s: number) {
  return s >= 90 ? "A" : s >= 80 ? "B" : s >= 70 ? "C" : s >= 60 ? "D" : "F";
}
function dailySeries(trades: Trade[]): { date: string; net: number }[] {
  const m = new Map<string, number>();
  for (const t of trades) m.set(t.date, (m.get(t.date) || 0) + t.pnl);
  return [...m.entries()].map(([date, net]) => ({ date, net })).sort((a, b) => a.date.localeCompare(b.date));
}

export function computeFundedScore(
  trades: Trade[],
  account: Account | null,
  opts: { horizonDays?: number } = {},
): FundedScore {
  const horizon = opts.horizonDays ?? 5;
  const ins = analyze(trades);
  const days = dailySeries(trades);
  const sampleTrades = trades.length;
  const sampleDays = days.length;
  const confidence: FundedScore["confidence"] = sampleDays >= 40 ? "high" : sampleDays >= 15 ? "medium" : "low";

  if (sampleTrades < 5) {
    return {
      composure: 0, grade: "—", drivers: [], breach: null, sampleDays, sampleTrades,
      confidence: "low", ready: false,
      headline: "Upload more trades — the score needs at least a handful to read your behavior.",
    };
  }

  const drivers: ScoreDriver[] = [];

  // 1. After-loss control (revenge) — heaviest weight.
  const al = ins.afterLoss;
  let afterLossScore = 80;
  if (al.trades >= 3) {
    if (al.net < 0) afterLossScore -= Math.min(55, Math.round((-al.net / (Math.abs(ins.totals.net) + 1)) * 60));
    if (al.avgSizeMult > 1.15) afterLossScore -= Math.min(25, Math.round((al.avgSizeMult - 1) * 60));
    afterLossScore = clamp(afterLossScore);
    const steady = al.net >= 0 && al.avgSizeMult <= 1.1;
    drivers.push({
      label: "After-loss control",
      impact: steady ? "helps" : "hurts",
      detail: steady
        ? "You stay steady after losses — no revenge bleed."
        : al.net < 0
          ? `Trades after a loss net ${Math.round(al.net)}` + (al.avgSizeMult > 1.15 ? ` and you size them ${Math.round((al.avgSizeMult - 1) * 100)}% bigger.` : ".")
          : `You stay net-positive after losses but size them ${Math.round((al.avgSizeMult - 1) * 100)}% bigger — a revenge habit waiting to bite.`,
      weight: 0.30,
    });
  } else {
    afterLossScore = 75;
    drivers.push({ label: "After-loss control", impact: "helps", detail: "Too few post-loss trades to flag a revenge pattern.", weight: 0.30 });
  }

  // 2. Overtrading control.
  const byDate = days;
  const counts = trades.reduce((m, t) => m.set(t.date, (m.get(t.date) || 0) + 1), new Map<string, number>());
  const countArr = [...counts.values()].sort((a, b) => a - b);
  const median = countArr.length ? countArr[Math.floor(countArr.length / 2)] : 0;
  const heavy = [...counts.entries()].filter(([, c]) => c > median * 2 && c >= 6).map(([d]) => d);
  const heavyNet = byDate.filter((d) => heavy.includes(d.date)).reduce((s, d) => s + d.net, 0);
  let overtradeScore = 85;
  if (heavy.length >= 2 && heavyNet < 0) overtradeScore = clamp(85 - Math.min(45, Math.round((-heavyNet / (Math.abs(ins.totals.net) + 1)) * 50)));
  drivers.push({
    label: "Overtrading control",
    impact: heavy.length >= 2 && heavyNet < 0 ? "hurts" : "helps",
    detail: heavy.length >= 2 && heavyNet < 0
      ? `Your highest-volume days netted ${Math.round(heavyNet)} — more trades, worse results.`
      : "No volume-driven blowups in your history.",
    weight: 0.20,
  });

  // 3. Window discipline (do they keep trading losing hours/days?).
  let windowScore = 85;
  const wW = ins.worstWindow;
  const wD = ins.byDay.filter((b) => b.trades >= 4).sort((a, b) => a.net - b.net)[0];
  const losingWindowNet = (wW && wW.net < 0 ? wW.net : 0) + (wD && wD.net < 0 ? wD.net : 0);
  if (losingWindowNet < 0) windowScore = clamp(85 - Math.min(40, Math.round((-losingWindowNet / (Math.abs(ins.totals.net) + 1)) * 45)));
  drivers.push({
    label: "Window discipline",
    impact: losingWindowNet < 0 ? "hurts" : "helps",
    detail: losingWindowNet < 0
      ? `You keep trading windows that lose — ${wW && wW.net < 0 ? wW.key + " UTC" : ""}${wW && wW.net < 0 && wD && wD.net < 0 ? " and " : ""}${wD && wD.net < 0 ? wD.key + "s" : ""}.`
      : "You avoid your weak windows.",
    weight: 0.18,
  });

  // 4. Consistency of daily P&L (lower downside dispersion = more disciplined).
  const nets = days.map((d) => d.net);
  const mean = nets.reduce((s, x) => s + x, 0) / (nets.length || 1);
  const downside = nets.filter((x) => x < 0);
  const dnStd = downside.length ? Math.sqrt(downside.reduce((s, x) => s + (x - 0) * (x - 0), 0) / downside.length) : 0;
  const avgAbsDay = nets.reduce((s, x) => s + Math.abs(x), 0) / (nets.length || 1);
  const dispersion = avgAbsDay > 0 ? dnStd / avgAbsDay : 0; // ~spread of bad days
  let consistencyScore = clamp(100 - Math.round(Math.min(1.5, dispersion) / 1.5 * 55));
  drivers.push({
    label: "Loss consistency",
    impact: consistencyScore >= 70 ? "helps" : "hurts",
    detail: consistencyScore >= 70
      ? "Your losing days are controlled and similar-sized."
      : "Your bad days vary wildly — a sign stops aren't holding.",
    weight: 0.17,
  });

  // 5. Sizing vs breach room (only when an account is present).
  let sizingScore = 80;
  if (account) {
    const ar = assessAccount(account);
    const worstDay = Math.min(0, ...nets);
    if (ar.distanceToBreach > 0) {
      const ratio = -worstDay / ar.distanceToBreach; // worst day vs current buffer
      sizingScore = clamp(100 - Math.round(Math.min(1, ratio) * 70));
      drivers.push({
        label: "Sizing vs breach room",
        impact: sizingScore >= 65 ? "helps" : "hurts",
        detail: sizingScore >= 65
          ? "A normal bad day is small relative to your breach buffer."
          : `A bad day like your worst (${Math.round(worstDay)}) is large vs your ${Math.round(ar.distanceToBreach)} buffer.`,
        weight: 0.15,
      });
    }
  }

  // Weighted composure.
  const totW = drivers.reduce((s, d) => s + d.weight, 0);
  const subScores = [afterLossScore, overtradeScore, windowScore, consistencyScore, sizingScore];
  const weights = drivers.map((d) => d.weight);
  let composure = 0;
  for (let i = 0; i < drivers.length; i++) composure += subScores[i] * weights[i];
  composure = clamp(Math.round(composure / (totW || 1)));

  // ── Breach probability via bootstrap of daily P&L vs the firm floor ──
  let breach: BreachEstimate | null = null;
  if (account && nets.length >= 5) {
    const firm = firmFor(account);
    const paths = 5000;
    let breached = 0;
    const dailyLimit = firm.dailyLoss;
    for (let p = 0; p < paths; p++) {
      let equity = account.balance;
      let peak = account.peakEquity;
      let didBreach = false;
      for (let d = 0; d < horizon; d++) {
        const day = nets[Math.floor(Math.random() * nets.length)];
        if (dailyLimit != null && -day >= dailyLimit) { didBreach = true; break; }
        equity += day;
        peak = Math.max(peak, equity);
        const floor = Math.min(peak - firm.trailingDD, account.startBalance);
        if (equity <= floor) { didBreach = true; break; }
      }
      if (didBreach) breached++;
    }
    const ar = assessAccount(account);
    breach = {
      horizonDays: horizon,
      probability: breached / paths,
      distanceToBreach: ar.distanceToBreach,
      medianDailyPnl: [...nets].sort((a, b) => a - b)[Math.floor(nets.length / 2)],
      worstDayPnl: Math.min(...nets),
      paths,
      confidence,
    };
  }

  const headline =
    composure >= 80 ? "Disciplined. Your behavior is funded-trader grade."
    : composure >= 65 ? "Solid base with clear leaks to plug."
    : composure >= 50 ? "Fragile — discipline is what's costing you, not strategy."
    : "High blow-up risk. Behavior, not the market, is the threat.";

  return {
    composure, grade: grade(composure), drivers, breach,
    sampleDays, sampleTrades, confidence, ready: true, headline,
  };
}
