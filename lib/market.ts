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

// ── Broad market catalog for the Markets dashboard (real Yahoo tickers) ──────
export type CatItem = { key: string; yahoo: string; label: string; cat: string; price?: boolean };
export const MARKET_CATALOG: CatItem[] = [
  // Indices
  { key: "SPX", yahoo: "^GSPC", label: "S&P 500", cat: "Indices" },
  { key: "NDX", yahoo: "^NDX", label: "Nasdaq 100", cat: "Indices" },
  { key: "DJI", yahoo: "^DJI", label: "Dow Jones", cat: "Indices" },
  { key: "RUT", yahoo: "^RUT", label: "Russell 2000", cat: "Indices" },
  { key: "VIX", yahoo: "^VIX", label: "Volatility (VIX)", cat: "Indices" },
  { key: "FTSE", yahoo: "^FTSE", label: "FTSE 100", cat: "Indices" },
  { key: "DAX", yahoo: "^GDAXI", label: "DAX", cat: "Indices" },
  { key: "N225", yahoo: "^N225", label: "Nikkei 225", cat: "Indices" },
  // Crypto
  { key: "BTC", yahoo: "BTC-USD", label: "Bitcoin", cat: "Crypto" },
  { key: "ETH", yahoo: "ETH-USD", label: "Ethereum", cat: "Crypto" },
  { key: "SOL", yahoo: "SOL-USD", label: "Solana", cat: "Crypto" },
  // Commodities
  { key: "GOLD", yahoo: "GC=F", label: "Gold", cat: "Commodities" },
  { key: "WTI", yahoo: "CL=F", label: "Crude Oil (WTI)", cat: "Commodities" },
  { key: "NGAS", yahoo: "NG=F", label: "Natural Gas", cat: "Commodities" },
  { key: "SILVER", yahoo: "SI=F", label: "Silver", cat: "Commodities" },
  // Rates & FX
  { key: "US10Y", yahoo: "^TNX", label: "US 10-Year Yield", cat: "Rates & FX" },
  { key: "DXY", yahoo: "DX-Y.NYB", label: "US Dollar Index", cat: "Rates & FX" },
  { key: "EURUSD", yahoo: "EURUSD=X", label: "EUR / USD", cat: "Rates & FX" },
];
export const CAT_ORDER = ["Indices", "Crypto", "Commodities", "Rates & FX"];
export function catYahoo(key: string): string | null {
  const c = MARKET_CATALOG.find((x) => x.key === key);
  return c ? c.yahoo : null;
}
