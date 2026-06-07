// Live candles via Yahoo Finance's public chart API (no key), cached ~60s.
// Falls back to deterministic synthetic candles so the chart never dies.
import { NextResponse } from "next/server";
import { MARKET_SYMBOLS, MARKET_CATALOG, syntheticCandles, type Candle } from "../../../lib/market";

export const revalidate = 60;

export async function GET(req: Request) {
  const url = new URL(req.url);
  const sym = (url.searchParams.get("symbol") || "NQ").toUpperCase();
  const interval = url.searchParams.get("interval") || "5m";
  const range = url.searchParams.get("range") || "1d";
  const rawY = url.searchParams.get("y");
  const cat = MARKET_CATALOG.find((c) => c.key === sym);
  const meta = MARKET_SYMBOLS[sym] || (cat ? { yahoo: cat.yahoo, label: cat.label, base: 100 } : null) || (rawY ? { yahoo: rawY, label: sym, base: 100 } : MARKET_SYMBOLS.NQ);

  try {
    const y = await fetch(
      `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(meta.yahoo)}?interval=${interval}&range=${range}`,
      { next: { revalidate: 60 }, headers: { "User-Agent": "Mozilla/5.0 (FundedCore)" } }
    );
    if (y.ok) {
      const j = await y.json();
      const res = j?.chart?.result?.[0];
      const ts: number[] = res?.timestamp || [];
      const q = res?.indicators?.quote?.[0];
      if (ts.length && q) {
        const candles: Candle[] = [];
        for (let i = 0; i < ts.length; i++) {
          const o = q.open?.[i], h = q.high?.[i], l = q.low?.[i], c = q.close?.[i];
          if (o == null || h == null || l == null || c == null) continue;
          candles.push({ t: ts[i] * 1000, o, h, l, c, v: q.volume?.[i] || 0 });
        }
        if (candles.length > 10) {
          return NextResponse.json({ source: "live", symbol: sym, label: meta.label, candles: candles.slice(-300) });
        }
      }
    }
  } catch { /* fall through */ }

  return NextResponse.json({ source: "simulated", symbol: sym, label: meta.label, candles: syntheticCandles(sym) });
}
