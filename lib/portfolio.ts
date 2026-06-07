// Multi-account breach optimizer: copy-trading the same edge across funded
// accounts is correlation ≈ 1 — a bad day hits all of them. This sizes each
// account by its own breach room and Monte-Carlos correlated survival.
import type { Trade } from "./score";
import { INSTRUMENTS } from "./firms";
import { assessAccount, worstCaseLoss, STATUS_META, type Account } from "./risk";

export type PortAcct = { id: string; label: string; firm: string; dtb: number; pctBuffer: number; status: string; color: string; safeDay: number; maxContracts: number };
export type PortfolioResult = {
  ready: boolean; accounts: PortAcct[]; totalDeployable: number;
  weakestBuffer: number; uniformBreachCount: number; n: number;
  survival: { keepAll: number; keepHalf: number; loseAll: number } | null;
  summary: string;
};

function dailyNets(trades: Trade[]): number[] {
  const m = new Map<string, number>();
  for (const t of trades) { const d = new Date(t.timestamp).toISOString().slice(0, 10); m.set(d, (m.get(d) || 0) + t.pnl); }
  return [...m.values()];
}
function mulberry32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }

export function portfolioRisk(accounts: Account[], trades: Trade[], instrumentKey: string, stopPts: number): PortfolioResult {
  const base: PortfolioResult = { ready: false, accounts: [], totalDeployable: 0, weakestBuffer: 0, uniformBreachCount: 0, n: accounts.length, survival: null, summary: "" };
  if (accounts.length < 2) return base;
  const perContract = INSTRUMENTS[instrumentKey] ? worstCaseLoss(instrumentKey, 1, stopPts) : 0;
  const accts: PortAcct[] = accounts.map((a) => {
    const r = assessAccount(a); const sm = STATUS_META[r.status];
    const safeDay = Math.max(0, r.distanceToBreach * 0.2);
    const maxContracts = perContract > 0 ? Math.max(0, Math.min(r.firm.contractCap, Math.floor(safeDay / perContract))) : 0;
    return { id: a.id, label: a.label, firm: r.firm.firmBrand, dtb: Math.max(0, r.distanceToBreach), pctBuffer: r.pctBuffer, status: r.status, color: sm.color, safeDay, maxContracts };
  });
  const totalDeployable = accts.reduce((s, a) => s + a.maxContracts, 0);
  const buffers = accts.map((a) => a.dtb);
  const weakestBuffer = Math.min(...buffers);
  // if you size uniformly at the strongest account's size, how many weaker accounts breach on a max-loss day?
  const uniformSize = Math.max(...accts.map((a) => a.maxContracts), 1);
  const uniformLoss = uniformSize * perContract;
  const uniformBreachCount = accts.filter((a) => a.dtb < uniformLoss).length;

  // correlated survival MC: one shared 20-day path applied to all; account survives if its buffer > path max drawdown
  let survival: PortfolioResult["survival"] = null;
  const dn = dailyNets(trades);
  if (dn.length >= 5) {
    const rnd = mulberry32(99); const N = 500, DAYS = 20; let keepAll = 0, keepHalf = 0, loseAll = 0;
    for (let s = 0; s < N; s++) {
      let eq = 0, peak = 0, maxDD = 0;
      for (let d = 0; d < DAYS; d++) { eq += dn[Math.floor(rnd() * dn.length)]; if (eq > peak) peak = eq; maxDD = Math.max(maxDD, peak - eq); }
      const survivors = buffers.filter((b) => b > maxDD).length;
      if (survivors === accts.length) keepAll++;
      if (survivors >= Math.ceil(accts.length / 2)) keepHalf++;
      if (survivors === 0) loseAll++;
    }
    survival = { keepAll: keepAll / N, keepHalf: keepHalf / N, loseAll: loseAll / N };
  }
  const summary = `Because you'd trade the same edge across all ${accts.length} accounts, they move together — that's not diversification, it's ${accts.length}× the same risk. Size each account to its own room: total ${totalDeployable} ${instrumentKey} deployable. Your weakest account breaches at just ${"$" + Math.round(weakestBuffer).toLocaleString()} of drawdown.`;
  return { ready: true, accounts: accts, totalDeployable, weakestBuffer, uniformBreachCount, n: accts.length, survival, summary };
}
