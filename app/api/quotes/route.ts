// Real quotes only. Parallel Yahoo fetches, reads regularMarketPrice +
// chartPreviousClose from chart meta. Failed symbols are dropped (never faked).
import { NextResponse } from "next/server";
import { MARKET_CATALOG } from "../../../lib/market";

export const revalidate = 15;

const BASKET = ["SPX", "NDX", "DJI", "RUT", "VIX", "BTC", "ETH", "GOLD", "WTI", "US10Y", "DXY", "EURUSD"];

export async function GET() {
  const items = BASKET.map((k) => MARKET_CATALOG.find((c) => c.key === k)!).filter(Boolean);
  const settled = await Promise.all(
    items.map(async (it) => {
      try {
        const y = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(it.yahoo)}?interval=5m&range=1d`,
          { next: { revalidate: 15 }, headers: { "User-Agent": "Mozilla/5.0 (FundedCore)" } }
        );
        if (!y.ok) return null;
        const j = await y.json();
        const m = j?.chart?.result?.[0]?.meta;
        if (!m || m.regularMarketPrice == null) return null;
        const prev = m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice;
        const price = m.regularMarketPrice;
        const changePct = prev ? ((price - prev) / prev) * 100 : 0;
        return { key: it.key, label: it.label, price, changePct, source: "live" as const };
      } catch {
        return null;
      }
    })
  );
  const quotes = settled.filter(Boolean);
  return NextResponse.json({ quotes, ts: Date.now() }, { headers: { "Cache-Control": "s-maxage=15, stale-while-revalidate=30" } });
}
