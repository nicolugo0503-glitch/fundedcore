// Monte Carlo: resample the trader's own P&L distribution to estimate
// probability of blowing the trailing drawdown vs finishing green / passing.
import type { Trade } from "./score";

function mulberry32(a: number) {
  return function () {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export type MonteCarloResult = {
  blow: number; survive: number; pass: number;
  paths: number[][];
  p10: number[]; p25: number[]; p50: number[]; p75: number[]; p90: number[];
  nTrades: number;
};

export function monteCarlo(trades: Trade[], trailingDD: number, nSim = 500, nTrades = 80, nSamplePaths = 60): MonteCarloResult {
  const empty = (): number[] => new Array(nTrades).fill(0);
  if (trades.length < 3) return { blow: 0, survive: 1, pass: 0, paths: [], p10: empty(), p25: empty(), p50: empty(), p75: empty(), p90: empty(), nTrades };
  const rnd = mulberry32(42);
  const pnls = trades.map((t) => t.pnl);
  const n = pnls.length;
  const matrix: number[][] = [];
  let blowCount = 0, passCount = 0;
  for (let s = 0; s < nSim; s++) {
    let eq = 0, peak = 0, blown = false;
    const row: number[] = new Array(nTrades).fill(0);
    for (let t = 0; t < nTrades; t++) {
      eq += pnls[Math.floor(rnd() * n)];
      if (eq > peak) peak = eq;
      if (!blown && peak - eq >= trailingDD) blown = true;
      row[t] = eq;
    }
    if (blown) blowCount++;
    else if (eq > 0) passCount++;
    matrix.push(row);
  }
  const blow = blowCount / nSim, pass = passCount / nSim, survive = 1 - blow;
  const p10: number[] = empty(), p25: number[] = empty(), p50: number[] = empty(), p75: number[] = empty(), p90: number[] = empty();
  for (let t = 0; t < nTrades; t++) {
    const col = matrix.map((r) => r[t]).sort((a, b) => a - b);
    p10[t] = col[Math.floor(nSim * 0.10)];
    p25[t] = col[Math.floor(nSim * 0.25)];
    p50[t] = col[Math.floor(nSim * 0.50)];
    p75[t] = col[Math.floor(nSim * 0.75)];
    p90[t] = col[Math.floor(nSim * 0.90)];
  }
  const step = Math.max(1, Math.floor(nSim / nSamplePaths));
  const paths: number[][] = [];
  for (let i = 0; i < nSim && paths.length < nSamplePaths; i += step) paths.push(matrix[i]);
  return { blow, survive, pass, paths, p10, p25, p50, p75, p90, nTrades };
}

// ────────────────────────────────────────────────────────────────────────────
