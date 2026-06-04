// ─────────────────────────────────────────────────────────────────────────────
// Seeded synthetic sample traders. Deterministic (same output every render)
// so the demo scores are stable. Each profile is engineered to showcase a
// different underwriting outcome.
// ─────────────────────────────────────────────────────────────────────────────
import type { Trade } from "./score";

// mulberry32 — tiny deterministic PRNG.
function rng(seed: number) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function gauss(r: () => number) {
  // Box–Muller
  const u = Math.max(1e-9, r()), v = r();
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}

type Profile = {
  seed: number;
  days: number;
  tradesPerDay: [number, number]; // min,max
  winRate: number;
  avgWin: number;
  avgLoss: number;
  winVar: number;     // spread on wins
  lossVar: number;    // spread on losses
  baseSize: number;
  tilt: number;       // size multiplier applied after a loss (1 = no tilt)
  drift: number;      // slow size creep over time
  spikeDay?: { at: number; pnl: number }; // single dominating lucky day
  symbol: string;
};

const SYMS = ["MNQ", "MES", "ES", "NQ", "MGC", "MCL"];

function generate(p: Profile): Trade[] {
  const r = rng(p.seed);
  const trades: Trade[] = [];
  let id = 1;
  let lastLoss = false;
  let t = Date.UTC(2025, 0, 6, 14, 30); // first trading day
  for (let d = 0; d < p.days; d++) {
    // skip weekends
    const dow = new Date(t).getUTCDay();
    if (dow === 0 || dow === 6) { t += 86400000; d--; continue; }
    const nT = Math.floor(p.tradesPerDay[0] + r() * (p.tradesPerDay[1] - p.tradesPerDay[0] + 1));
    for (let k = 0; k < nT; k++) {
      const win = r() < p.winRate;
      const drift = 1 + p.drift * (d / p.days);
      const size = Math.max(1, Math.round(p.baseSize * drift * (lastLoss ? p.tilt : 1) * (0.85 + r() * 0.3)));
      let pnl: number;
      if (win) pnl = Math.max(5, p.avgWin + gauss(r) * p.winVar);
      else pnl = -Math.max(5, p.avgLoss + gauss(r) * p.lossVar) * (lastLoss ? p.tilt : 1);
      pnl = Math.round(pnl);
      trades.push({
        id: id++,
        date: new Date(t).toISOString().slice(0, 10),
        timestamp: t + k * 600000,
        symbol: SYMS[Math.floor(r() * SYMS.length)] || p.symbol,
        side: r() < 0.5 ? "long" : "short",
        size,
        pnl,
      });
      lastLoss = pnl < 0;
    }
    if (p.spikeDay && d === p.spikeDay.at) {
      trades.push({
        id: id++,
        date: new Date(t).toISOString().slice(0, 10),
        timestamp: t + 9_000_000,
        symbol: p.symbol,
        side: "long",
        size: p.baseSize * 4,
        pnl: p.spikeDay.pnl,
      });
    }
    t += 86400000;
  }
  return trades;
}

export type SampleTrader = {
  id: string;
  name: string;
  tag: string;
  blurb: string;
  expected: "FUNDED" | "CONDITIONAL" | "DECLINED";
  trades: Trade[];
};

export const SAMPLE_TRADERS: SampleTrader[] = [
  {
    id: "maya",
    name: "Maya Chen",
    tag: "Disciplined Scalper",
    blurb: "MNQ scalper, steady size, cuts losers fast. The kind of edge we underwrite.",
    expected: "FUNDED",
    trades: generate({
      seed: 7,
      days: 64,
      tradesPerDay: [3, 7],
      winRate: 0.57,
      avgWin: 165,
      avgLoss: 105,
      winVar: 55,
      lossVar: 35,
      baseSize: 3,
      tilt: 1.0,
      drift: 0.1,
      symbol: "MNQ",
    }),
  },
  {
    id: "jordan",
    name: "Jordan Pierce",
    tag: "The Revenge Trader",
    blurb: "Genuine edge — sabotaged by tilt. Doubles size after every loss. Watch the drawdowns.",
    expected: "DECLINED",
    trades: generate({
      seed: 23,
      days: 60,
      tradesPerDay: [4, 10],
      winRate: 0.54,
      avgWin: 150,
      avgLoss: 130,
      winVar: 70,
      lossVar: 120,
      baseSize: 3,
      tilt: 2.1,
      drift: 0.2,
      symbol: "NQ",
    }),
  },
  {
    id: "sam",
    name: "Sam Okafor",
    tag: "Steady Swing",
    blurb: "Modest, real edge on ES swings. Fewer trades, decent control — a borderline case.",
    expected: "CONDITIONAL",
    trades: generate({
      seed: 51,
      days: 75,
      tradesPerDay: [1, 3],
      winRate: 0.515,
      avgWin: 220,
      avgLoss: 158,
      winVar: 92,
      lossVar: 78,
      baseSize: 2,
      tilt: 1.15,
      drift: 0.05,
      symbol: "ES",
    }),
  },
  {
    id: "priya",
    name: "Priya Nair",
    tag: "The Lucky Gambler",
    blurb: "Looks profitable — but one home-run day carries the whole account. Fails the consistency test.",
    expected: "DECLINED",
    trades: generate({
      seed: 88,
      days: 55,
      tradesPerDay: [2, 6],
      winRate: 0.46,
      avgWin: 120,
      avgLoss: 135,
      winVar: 60,
      lossVar: 80,
      baseSize: 2,
      tilt: 1.25,
      drift: 0.1,
      spikeDay: { at: 30, pnl: 9800 },
      symbol: "MGC",
    }),
  },
];

export function sampleById(id: string): SampleTrader | undefined {
  return SAMPLE_TRADERS.find((s) => s.id === id);
}
