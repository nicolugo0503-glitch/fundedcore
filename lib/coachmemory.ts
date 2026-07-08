// AI Coach memory + proactive nudges. The coach REMEMBERS this trader across sessions
// (their archetype, persistent leaks, best/worst windows, and their own goals) and gets
// PROACTIVE — the deterministic engines decide *when* to nudge (tilt, loss streak, near
// breach); the LLM only phrases free-form answers. Numbers are never invented.
import type { Profile } from "./profile";
import { analyze } from "./insights";
import { scoreTrades } from "./score";
import { assessAccount } from "./risk";
import { benchmark } from "./benchmark";
import { archetype } from "./archetype";
import { survival } from "./survival";

const usd = (n: number) => `${n < 0 ? "-" : ""}$${Math.abs(Math.round(n)).toLocaleString()}`;

export type MemoryFact = { icon: string; label: string; value: string };

export function memoryFacts(p: Profile): MemoryFact[] {
  const facts: MemoryFact[] = [];
  if (p.trades.length >= 5) {
    const acc = p.accounts[0] || null;
    const b = benchmark(p.trades, acc);
    const mv = (k: string) => b.metrics.find((m) => m.key === k)?.value;
    const arch = archetype({ composure: mv("composure") ?? 50, breachOdds: 0.2, winRate: mv("winRate") ?? 0, payoff: mv("payoff") ?? 1, tilt: 0, bufferPct: acc ? assessAccount(acc).pctBuffer : 1 });
    facts.push({ icon: "up", label: "You trade like", value: arch.name });
    const ins = analyze(p.trades);
    if (ins.leaks[0]) facts.push({ icon: "alert", label: "Your #1 recurring leak", value: ins.leaks[0].title });
    if (ins.leaks[1]) facts.push({ icon: "alert", label: "Also costing you", value: ins.leaks[1].title });
    if (ins.bestWindow) facts.push({ icon: "check", label: "Your best window", value: `${ins.bestWindow.key} UTC (+${usd(ins.bestWindow.net)})` });
    if (ins.worstWindow) facts.push({ icon: "bolt", label: "Your danger window", value: `${ins.worstWindow.key} UTC (${usd(ins.worstWindow.net)})` });
    const s = scoreTrades(p.trades);
    facts.push({ icon: "gauge", label: "Your baseline", value: `Score ${s.traderScore}/${s.grade}, ${Math.round(s.analytics.winRate * 100)}% win` });
  }
  return facts;
}

// A compact brief injected into every coach prompt so it always "knows" this trader.
export function memoryBrief(p: Profile): string {
  const lines: string[] = [];
  const facts = memoryFacts(p);
  if (facts.length) lines.push("WHAT I REMEMBER ABOUT THIS TRADER:\n" + facts.map((f) => `- ${f.label}: ${f.value}`).join("\n"));
  if (p.coachGoals && p.coachGoals.length) lines.push("THEIR GOALS/COMMITMENTS:\n" + p.coachGoals.map((g) => `- ${g}`).join("\n"));
  const n = proactiveNudge(p);
  if (n) lines.push(`RIGHT NOW: ${n.trigger} — ${n.message}`);
  return lines.join("\n\n");
}

export type Nudge = { severity: "high" | "med" | "low" | "calm"; trigger: string; message: string };

export function proactiveNudge(p: Profile): Nudge | null {
  if (p.trades.length < 5) return null;
  const acc = p.accounts[0] || null;
  const s = survival(p.trades, acc, { dailyLossStop: p.settings.dailyLossStop, maxTradesPerDay: p.settings.maxTradesPerDay });
  if (!s.ready) return null;
  const ins = analyze(p.trades);
  const leak = ins.leaks[0]?.title?.toLowerCase();

  if (s.breachOdds >= 0.55 || s.bufferPct <= 0.15)
    return { severity: "high", trigger: "Near breach", message: `You're close to the line — ${usd(s.distanceToBreach)} of buffer left and ${Math.round(s.breachOdds * 100)}% breach odds. This is not a spot to be a hero. Protect the account.` };
  if (s.consecLosses >= 2 || s.tiltIndex >= 55)
    return { severity: "med", trigger: "Tilt rising", message: `${s.consecLosses >= 2 ? `${s.consecLosses} losses in a row` : `Tilt index ${s.tiltIndex}/100`}. This is exactly where ${leak ? `your "${ins.leaks[0].title}" pattern` : "your worst pattern"} fires. Step back before the next click.` };
  if (s.breachOdds >= 0.35)
    return { severity: "low", trigger: "Watch your risk", message: `Breach odds are creeping up (${Math.round(s.breachOdds * 100)}%). Tighten up — trade only your best window and respect your stop.` };
  return { severity: "calm", trigger: "You're clear", message: `Composed and on solid ground (${s.score}/100 survival). Keep doing exactly this — discipline is the whole game.` };
}
