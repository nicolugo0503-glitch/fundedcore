// Get Backed — allocation-readiness engine (the software front-end of the capital play).
// Scores whether a trader's OWN data proves they're disciplined enough to be backed with
// real capital. Honest: this is selection + a waitlist, not an offer of funding; no money
// moves. It rides The Standard/FundedScore engines so it compounds with the data moat.
import type { Trade } from "./score";
import type { Account } from "./risk";
import { benchmark } from "./benchmark";

const clamp = (n: number, lo = 0, hi = 1) => Math.max(lo, Math.min(hi, n));

export type Requirement = { label: string; met: boolean; detail: string };
export type Backed = {
  ready: boolean;
  score: number;                 // 0..100 allocation-readiness
  tier: "Building" | "Watchlist" | "Backable";
  headline: string;
  requirements: Requirement[];
  qualifies: boolean;            // meets all CORE gates
};

export function allocationReadiness(trades: Trade[], account: Account | null): Backed {
  if (trades.length < 5) return { ready: false, score: 0, tier: "Building", headline: "Sync your trades — we can only back what your data proves.", requirements: [], qualifies: false };
  const b = benchmark(trades, account);
  const mv = (k: string) => b.metrics.find((m) => m.key === k)?.value ?? 0;
  const composure = mv("composure");
  const pf = mv("profitFactor");
  const breach = b.metrics.find((m) => m.key === "breachProb")?.value ?? 1; // 0..1 lower better
  const winRate = mv("winRate");
  const days = new Set(trades.map((t) => t.date)).size;
  const n = trades.length;

  const cComp = clamp(composure / 85);
  const cPf = clamp((pf - 0.9) / (1.8 - 0.9));
  const cBreach = clamp(1 - breach / 0.35);
  const cSample = clamp(days / 40) * clamp(n / 100);
  const cWin = clamp((winRate - 0.4) / (0.65 - 0.4));
  const score = Math.round(100 * (0.30 * cComp + 0.25 * cPf + 0.20 * cBreach + 0.15 * cSample + 0.10 * cWin));

  const requirements: Requirement[] = [
    { label: "Composure ≥ 70", met: composure >= 70, detail: `You're at ${Math.round(composure)}/100.` },
    { label: "Profit factor ≥ 1.3", met: pf >= 1.3, detail: `You're at ${pf.toFixed(2)}.` },
    { label: "Breach risk < 15%", met: breach < 0.15, detail: `You're at ${Math.round(breach * 100)}%.` },
    { label: "40+ trading days", met: days >= 40, detail: `${days} days logged.` },
    { label: "100+ trades", met: n >= 100, detail: `${n} trades logged.` },
    { label: "Win rate ≥ 45%", met: winRate >= 0.45, detail: `You're at ${Math.round(winRate * 100)}%.` },
  ];
  const coreMet = composure >= 70 && pf >= 1.3 && breach < 0.15 && days >= 40;
  const tier: Backed["tier"] = coreMet ? "Backable" : score >= 60 ? "Watchlist" : "Building";
  const headline =
    tier === "Backable" ? "Your data qualifies you. This is the top few percent."
    : tier === "Watchlist" ? "Close. Keep the discipline up — you're on the watchlist."
    : "Not yet — build the track record below and the door opens.";
  return { ready: true, score, tier, headline, requirements, qualifies: coreMet };
}
