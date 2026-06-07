// Pre-Mortem — learns a trader's personal blow-up fingerprint from their own
// worst sessions, then scores TODAY against it. The behavioral moat.
import type { Trade } from "./score";

export type Signal = {
  key: string; label: string;
  badRate: number; baseRate: number; lift: number;
  support: number; badSupport: number;
  kind: "static" | "live";
  activeToday: boolean | null;   // true=triggered, false=clear, null=only knowable mid-session
  weight: number;
};
export type PreMortem = {
  ready: boolean; sessions: number; badDays: number; threshold: number;
  fingerprint: Signal[]; riskToday: number; riskBand: "low" | "elevated" | "high";
  summary: string; active: Signal[]; watch: Signal[];
};

const DOW = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const iso = (ms: number) => new Date(ms).toISOString().slice(0, 10);
function quantile(arr: number[], p: number) { const a = [...arr].sort((x, y) => x - y); return a[Math.floor((a.length - 1) * p)]; }

type Day = { date: string; ts: Trade[]; net: number; trades: number; avgSize: number; dow: number };

export function preMortem(trades: Trade[], now: Date = new Date()): PreMortem {
  const sorted = [...trades].sort((a, b) => a.timestamp - b.timestamp);
  const map = new Map<string, Trade[]>();
  for (const t of sorted) { const d = iso(t.timestamp); (map.get(d) || map.set(d, []).get(d)!).push(t); }
  const days: Day[] = [...map.entries()].map(([date, ts]) => {
    const net = ts.reduce((s, t) => s + t.pnl, 0);
    const sizes = ts.map((t) => t.size || 1);
    return { date, ts, net, trades: ts.length, avgSize: sizes.reduce((s, x) => s + x, 0) / sizes.length, dow: new Date(ts[0].timestamp).getUTCDay() };
  }).sort((a, b) => (a.date < b.date ? -1 : 1));

  const base: PreMortem = { ready: false, sessions: days.length, badDays: 0, threshold: 0, fingerprint: [], riskToday: 0, riskBand: "low", summary: "", active: [], watch: [] };
  if (days.length < 12) return base;

  const nets = days.map((d) => d.net);
  const threshold = Math.min(0, quantile(nets, 0.25));
  const bad = new Set(days.filter((d) => d.net <= threshold).map((d) => d.date));
  if (bad.size < 3) return base;

  const overallAvgSize = days.reduce((s, d) => s + d.avgSize * d.trades, 0) / sorted.length;
  const medTrades = quantile(days.map((d) => d.trades), 0.5);
  const baseRate = bad.size / days.length;

  function priorLosing(i: number, k: number): boolean { for (let j = 1; j <= k; j++) { const p = days[i - j]; if (!p || p.net >= 0) return false; } return true; }
  function live(d: Day, key: string): boolean {
    if (key === "overtrade") return d.trades > medTrades * 1.3 && d.trades >= 4;
    if (key === "sizeup") return d.avgSize > overallAvgSize * 1.2;
    if (key === "earlyhole") { const f = d.ts.slice(0, 3); return f.length >= 3 && f.reduce((s, t) => s + t.pnl, 0) < 0; }
    if (key === "afterloss") { let esc = 0, n = 0; for (let i = 1; i < d.ts.length; i++) { if (d.ts[i - 1].pnl < 0) { n++; if ((d.ts[i].size || 1) > (d.ts[i - 1].size || 1) * 1.15) esc++; } } return n >= 2 && esc / n >= 0.5; }
    return false;
  }
  const candidates: { key: string; label: string; kind: "static" | "live"; test: (d: Day, i: number) => boolean }[] = [
    ...[0, 1, 2, 3, 4, 5, 6].map((dw) => ({ key: "dow" + dw, label: DOW[dw] + " sessions", kind: "static" as const, test: (d: Day) => d.dow === dw })),
    { key: "prior1", label: "Trading after a red day", kind: "static", test: (_d: Day, i: number) => priorLosing(i, 1) },
    { key: "prior2", label: "Trading after 2+ red days", kind: "static", test: (_d: Day, i: number) => priorLosing(i, 2) },
    { key: "overtrade", label: "Over-trading the session", kind: "live", test: (d: Day) => live(d, "overtrade") },
    { key: "sizeup", label: "Sizing up vs your norm", kind: "live", test: (d: Day) => live(d, "sizeup") },
    { key: "earlyhole", label: "Digging an early hole", kind: "live", test: (d: Day) => live(d, "earlyhole") },
    { key: "afterloss", label: "Revenge-sizing after losses", kind: "live", test: (d: Day) => live(d, "afterloss") },
  ];

  const signals: Signal[] = [];
  for (const c of candidates) {
    let withSig = 0, badWith = 0;
    days.forEach((d, i) => { if (c.test(d, i)) { withSig++; if (bad.has(d.date)) badWith++; } });
    if (withSig < 3 || badWith < 2) continue;
    const badRate = badWith / withSig;
    const lift = baseRate > 0 ? badRate / baseRate : 0;
    if (lift < 1.25) continue;
    signals.push({ key: c.key, label: c.label, badRate, baseRate, lift, support: withSig, badSupport: badWith, kind: c.kind, activeToday: null, weight: 0 });
  }
  signals.sort((a, b) => b.lift - a.lift);
  const fp = signals.slice(0, 5);
  const wsum = fp.reduce((s, x) => s + x.lift, 0) || 1;
  fp.forEach((s) => (s.weight = s.lift / wsum));

  const todayDow = now.getUTCDay();
  const todayISO = iso(now.getTime());
  const completed = days.filter((d) => d.date < todayISO);
  const lastLosing1 = completed.length >= 1 && completed[completed.length - 1].net < 0;
  const lastLosing2 = lastLosing1 && completed.length >= 2 && completed[completed.length - 2].net < 0;
  const todays = days.find((d) => d.date === todayISO);

  for (const s of fp) {
    if (s.key.startsWith("dow")) s.activeToday = s.key === "dow" + todayDow;
    else if (s.key === "prior1") s.activeToday = lastLosing1;
    else if (s.key === "prior2") s.activeToday = lastLosing2;
    else { const cand = candidates.find((c) => c.key === s.key)!; s.activeToday = todays ? cand.test(todays, days.indexOf(todays)) : null; }
  }
  const riskToday = fp.filter((s) => s.activeToday === true).reduce((sum, s) => sum + s.weight, 0);
  const riskBand: "low" | "elevated" | "high" = riskToday >= 0.6 ? "high" : riskToday >= 0.3 ? "elevated" : "low";
  const active = fp.filter((s) => s.activeToday === true);
  const watch = fp.filter((s) => s.activeToday !== true);
  const top = active[0] || fp[0];
  const summary = active.length
    ? `Today trips ${active.length} of your ${fp.length} blow-up signals — led by “${top.label.toLowerCase()}” (${top.lift.toFixed(1)}× your normal bad-day rate).`
    : fp.length ? `Your blow-up pattern centers on “${fp[0].label.toLowerCase()}” — none of your danger signals are active today.` : "Not enough signal yet.";

  return { ready: true, sessions: days.length, badDays: bad.size, threshold, fingerprint: fp, riskToday, riskBand, summary, active, watch };
}
