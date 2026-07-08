// Trader archetype — the "16Personalities for traders" identity object that powers
// the share loop. Deterministic mapping from the trader's own behavioral metrics to
// a memorable type + tagline. Honest, tough-love, never insulting.
export type ArchetypeInput = {
  composure: number;   // 0..100
  breachOdds: number;  // 0..1 forward breach probability
  winRate: number;     // 0..1
  payoff: number;      // avgWin/avgLoss
  tilt: number;        // 0..100 live tilt index
  bufferPct: number;   // 0..1
};
export type Archetype = { key: string; name: string; tagline: string; accent: "green" | "amber" | "red" };

export function archetype(m: ArchetypeInput): Archetype {
  const { composure, breachOdds, winRate, payoff, tilt, bufferPct } = m;
  // danger states first (behavior is the threat)
  if (bufferPct <= 0.18 || breachOdds >= 0.5)
    return { key: "tightrope", name: "The Tightrope Walker", tagline: "One bad day from the edge. Every trade matters now.", accent: "red" };
  if (composure < 45 && (tilt >= 45 || breachOdds >= 0.35))
    return { key: "revenge", name: "The Revenge Trader", tagline: "Talented — but tilt is quietly taxing your account.", accent: "red" };
  if (composure < 50)
    return { key: "overtrader", name: "The Over-Trader", tagline: "Too many trades, too little edge. Discipline is the fix.", accent: "amber" };
  // healthy states
  if (composure >= 78 && winRate >= 0.6)
    return { key: "sniper", name: "The Sniper", tagline: "Patient, precise, lethal in your window.", accent: "green" };
  if (composure >= 72)
    return { key: "grinder", name: "The Disciplined Grinder", tagline: "You win by not losing. Rules over impulse.", accent: "green" };
  if (composure >= 58 && payoff >= 1.5)
    return { key: "runner", name: "The Runner", tagline: "You let winners run — and mostly stay in your lane.", accent: "green" };
  return { key: "steady", name: "The Steady Hand", tagline: "Consistent, with a couple of leaks worth plugging.", accent: "amber" };
}
