// One-call quote basket for the live ticker tape. Parallel Yahoo fetches,
// reads regularMarketPrice + chartPreviousClose from chart meta. Cached ~30s.
import { NextResponse } from "next/server";
import { MARKET_CATALOG } from "../../../lib/market";

export const revalidate = 30;

const BASKET = ["SPX", "NDX", "DJI", "RUT", "VIX", "BTC", "ETH", "GOLD", "WTI", "US10Y", "DXY", "EURUSD"];

function synthQuote(key: string, label: string) {
  const seed = key.split("").reduce((s, c) => s + c.charCodeAt(0), 7);
  const base = 100 + (seed % 900);
  const chg = ((seed % 21) - 10) / 5; // -2%..+2%
  return { key, label, price: base * (1 + chg / 100), changePct: chg, source: "simulated" as const };
}

export async function GET() {
  const items = BASKET.map((k) => MARKET_CATALOG.find((c) => c.key === k)!).filter(Boolean);
  const out = await Promise.all(
    items.map(async (it) => {
      try {
        const y = await fetch(
          `https://query1.finance.yahoo.com/v8/finance/chart/${encodeURIComponent(it.yahoo)}?interval=5m&range=1d`,
          { next: { revalidate: 30 }, headers: { "User-Agent": "Mozilla/5.0 (FundedCore)" } }
        );
        if (y.ok) {
          const j = await y.json();
          const m = j?.chart?.result?.[0]?.meta;
          if (m && m.regularMarketPrice != null) {
            const prev = m.chartPreviousClose ?? m.previousClose ?? m.regularMarketPrice;
            const price = m.regularMarketPrice;
            const changePct = prev ? ((price - prev) / prev) * 100 : 0;
            return { key: it.key, label: it.label, price, changePct, source: "live" as const };
          }
        }
      } catch { /* fall through */ }
      return synthQuote(it.key, it.label);
    })
  );
  return NextResponse.json({ quotes: out, ts: Date.now() });
}
