// Market data helpers: symbol mapping, indicators, and a deterministic
// synthetic candle generator used as fallback when the live feed is unreachable.
export type Candle = { t: number; o: number; h: number; l: number; c: number; v: number };

// Map our instrument keys to Yahoo Finance futures tickers (micro = same index).
export const MARKET_SYMBOLS: Record<string, { yahoo: string; label: string; base: number }> = {
  NQ:  { yahoo: "NQ=F",  label: "Nasdaq 100 (NQ/MNQ)", base: 18200 },
  ES:  { yahoo: "ES=F",  label: "S&P 500 (ES/MES)",    base: 5300 },
  YM:  { yahoo: "YM=F",  label: "Dow (YM/MYM)",        base: 40000 },
  RTY: { yahoo: "RTY=F", label: "Russell (RTY/M2K)",   base: 2100 },
  GC:  { yahoo: "GC=F",  label: "Gold (GC/MGC)",       base: 2350 },
  CL:  { yahoo: "CL=F",  label: "Crude Oil (CL/MCL)",  base: 78 },
};
export function rootSymbol(s?: string): string | null {
  if (!s) return null;
  const m: Record<string, string> = { MNQ: "NQ", NQ: "NQ", MES: "ES", ES: "ES", MYM: "YM", YM: "YM", M2K: "RTY", RTY: "RTY", MGC: "GC", GC: "GC", MCL: "CL", CL: "CL" };
  return m[s.toUpperCase()] || null;
}

export function ema(values: number[], period: number): number[] {
  const k = 2 / (period + 1);
  const out: number[] = [];
  let prev = values[0] ?? 0;
  for (let i = 0; i < values.length; i++) { prev = i ? values[i] * k + prev * (1 - k) : values[0]; out.push(prev); }
  return out;
}
export function vwap(candles: Candle[]): number[] {
  let cumPV = 0, cumV = 0;
  return candles.map((c) => {
    const tp = (c.h + c.l + c.c) / 3;
    cumPV += tp * (c.v || 1); cumV += c.v || 1;
    return cumPV / cumV;
  });
}

// Seeded synthetic intraday candles (so the chart always renders).
function mul32(a: number) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; }; }
export function syntheticCandles(symbol: string, n = 120, intervalMin = 5): Candle[] {
  const meta = MARKET_SYMBOLS[symbol] || MARKET_SYMBOLS.NQ;
  const r = mul32(symbol.split("").reduce((s, ch) => s + ch.charCodeAt(0), 7));
  const out: Candle[] = [];
  let price = meta.base;
  const now = Date.now();
  const vol = meta.base * 0.0012;
  for (let i = n - 1; i >= 0; i--) {
    const t = now - i * intervalMin * 60000;
    const drift = (r() - 0.5) * vol * 2;
    const o = price;
    const c = Math.max(1, o + drift);
    const h = Math.max(o, c) + r() * vol * 0.6;
    const l = Math.min(o, c) - r() * vol * 0.6;
    out.push({ t, o, h, l, c, v: Math.round(500 + r() * 3000) });
    price = c;
  }
  return out;
}
