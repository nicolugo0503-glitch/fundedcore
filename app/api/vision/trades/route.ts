// Snap-to-Import — extract trades from a screenshot of a broker/journal trades table.
// Vision is fallible, so the client ALWAYS previews and the user confirms before merging.
import { NextResponse } from "next/server";
import { openaiVision, aiEnabled, rateAllow, clientIp } from "../../../../lib/openai";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const SYS = `You extract completed futures/stock trades from a screenshot of a trades/positions table (TopstepX, Tradovate, NinjaTrader, a broker, or a journal).
Return ONLY a JSON array — no prose, no code fences. Each element:
{ "date": "YYYY-MM-DD" (or ISO datetime if visible), "symbol": string, "side": "long" | "short", "size": number, "pnl": number (net realized P&L; NEGATIVE for losses), "entry": number (optional), "exit": number (optional) }
Rules: include only CLOSED trades that show a realized P&L. Read numbers exactly as shown; do NOT guess or invent rows or values. If a field isn't visible, omit it. If you cannot read any trades, return [].`;

export async function POST(req: Request) {
  if (!aiEnabled()) return NextResponse.json({ error: "Screenshot import needs the AI key (OPENAI_API_KEY) in Vercel." }, { status: 503 });
  if (!rateAllow(clientIp(req))) return NextResponse.json({ error: "Rate limit — try again in a bit." }, { status: 429 });
  const body = await req.json().catch(() => ({}));
  const image = body.image as string | undefined;
  if (!image || !/^data:image\//.test(image)) return NextResponse.json({ error: "No image provided." }, { status: 400 });

  const raw = await openaiVision(SYS, "Extract every completed trade from this screenshot as the JSON array.", image, 1500);
  if (!raw) return NextResponse.json({ error: "Vision model unavailable — try again or upload a CSV." }, { status: 502 });

  let arr: any[] = [];
  try { arr = JSON.parse(raw.replace(/^```(json)?/i, "").replace(/```$/, "").trim()); } catch { return NextResponse.json({ error: "Couldn't read that screenshot cleanly. Try a sharper crop of just the trades table, or upload a CSV.", trades: [] }); }
  if (!Array.isArray(arr)) arr = [];

  const trades = arr
    .filter((t) => t && typeof t.pnl === "number" && isFinite(t.pnl))
    .map((t: any, i: number) => {
      const ts = Date.parse(t.date) || Date.now();
      const d = new Date(ts);
      const date = /^\d{4}-\d{2}-\d{2}/.test(String(t.date)) ? String(t.date).slice(0, 10) : `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
      const side = t.side === "short" || t.side === "sell" ? "short" : t.side === "long" || t.side === "buy" ? "long" : undefined;
      return { id: Number.isFinite(+t.id) ? +t.id : ts * 100 + i, date, timestamp: ts, symbol: t.symbol ? String(t.symbol) : undefined, side, size: Number.isFinite(+t.size) ? +t.size : undefined, pnl: +t.pnl, entry: Number.isFinite(+t.entry) ? +t.entry : undefined, exit: Number.isFinite(+t.exit) ? +t.exit : undefined };
    })
    .sort((a, b) => a.timestamp - b.timestamp);

  return NextResponse.json({ trades, count: trades.length });
}
