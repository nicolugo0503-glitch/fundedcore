// Daily AI briefing. Uses Anthropic when a key exists (env or header), else
// composes a personalized briefing from the structured context (never generic).
import { NextResponse } from "next/server";
export const runtime = "nodejs";

type Ctx = {
  name?: string; dow?: string; tone?: string; spxPct?: number; ndxPct?: number; vix?: number;
  headlines?: string[];
  tightest?: { firm: string; dtb: number; pctBuffer: number; status: string } | null;
  score?: { value: number; grade: string; decision: string } | null;
  topLeak?: { title: string; cost: number } | null;
  dayWinRate?: number | null; maxTrades?: number; dailyStop?: number;
};

const usd = (n: number) => (n < 0 ? "-$" : "$") + Math.abs(Math.round(n)).toLocaleString("en-US");

export async function POST(req: Request) {
  const { context } = (await req.json().catch(() => ({}))) as { context?: Ctx };
  const c = context || {};
  const key = req.headers.get("x-anthropic-key") || process.env.ANTHROPIC_API_KEY;

  if (key) {
    try {
      const prompt = [
        `Trader: ${c.name || "trader"} · ${c.dow || ""}`,
        `Market: S&P ${fmtPct(c.spxPct)}, Nasdaq ${fmtPct(c.ndxPct)}, VIX ${c.vix ?? "?"} (${c.tone || "n/a"})`,
        c.headlines?.length ? `Top headlines: ${c.headlines.slice(0, 4).join(" | ")}` : "",
        c.tightest ? `Tightest funded account: ${c.tightest.firm}, ${usd(c.tightest.dtb)} to breach (${Math.round((c.tightest.pctBuffer || 0) * 100)}% buffer, ${c.tightest.status})` : "No funded accounts connected.",
        c.score ? `Trader Score: ${c.score.value} (${c.score.grade}, ${c.score.decision})` : "",
        c.topLeak ? `Biggest leak: ${c.topLeak.title}, costing ${usd(c.topLeak.cost)}` : "",
        c.dayWinRate != null ? `Historical win rate on ${c.dow}: ${Math.round(c.dayWinRate * 100)}%` : "",
        `Limits: max ${c.maxTrades} trades, stop at ${usd(c.dailyStop || 0)}.`,
      ].filter(Boolean).join("\n");
      const r = await fetch("https://api.anthropic.com/v1/messages", {
        method: "POST",
        headers: { "content-type": "application/json", "x-api-key": key, "anthropic-version": "2023-06-01" },
        body: JSON.stringify({
          model: "claude-3-5-haiku-latest", max_tokens: 420,
          system: "You are FundedCore's pre-market briefing engine for funded futures traders. Write a sharp, specific 4-6 sentence morning briefing using ONLY the data given. Cover: market backdrop, the single most important risk today, the one behavioral thing to watch, and one concrete focus. No fluff, no disclaimers, no invented numbers. Second person.",
          messages: [{ role: "user", content: prompt }],
        }),
      });
      if (r.ok) { const j = await r.json(); const text = j?.content?.[0]?.text; if (text) return NextResponse.json({ source: "claude", text }); }
    } catch { /* fall through */ }
  }
  return NextResponse.json({ source: "composed", text: compose(c) });
}

function fmtPct(n?: number) { return n == null ? "?" : `${n >= 0 ? "+" : ""}${(n * 100).toFixed(2)}%`; }

function compose(c: Ctx): string {
  const s: string[] = [];
  const day = c.dow || "Today";
  if (c.tone) s.push(`${day}: the tape is ${c.tone}${c.spxPct != null ? ` (S&P ${fmtPct(c.spxPct)}${c.ndxPct != null ? `, Nasdaq ${fmtPct(c.ndxPct)}` : ""})` : ""}.${c.vix != null ? ` VIX near ${c.vix.toFixed(1)}.` : ""}`);
  if (c.headlines?.length) s.push(`Driving it: ${c.headlines[0]}.`);
  if (c.tightest) s.push(`Your hard ceiling today is ${usd(c.tightest.dtb)} — that's all the room ${c.tightest.firm} gives you before the account dies (${Math.round((c.tightest.pctBuffer || 0) * 100)}% buffer). Size every trade against that number, not your gut.`);
  else s.push(`No funded account is connected yet — add one so the briefing can guard your real risk.`);
  if (c.topLeak) s.push(`Behavioral watch-out: ${c.topLeak.title.toLowerCase()} has cost you ${usd(c.topLeak.cost)}. If you feel it starting today, stop.`);
  if (c.dayWinRate != null) s.push(`Historically your ${day} win rate is ${Math.round(c.dayWinRate * 100)}% — ${c.dayWinRate < 0.5 ? "trade smaller and pick your spots" : "a day your edge tends to show up"}.`);
  s.push(`Discipline: max ${c.maxTrades} trades, walk at ${usd(c.dailyStop || 0)} down. One focus — protect the account first, profit second.`);
  return s.join(" ");
}
