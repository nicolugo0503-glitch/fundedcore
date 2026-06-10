// Today's news-driven trade read. OpenAI when available, else a deterministic
// read composed from the real market move + headlines + event risk.
import { NextResponse } from "next/server";
import { openaiChat, aiEnabled, rateAllow, clientIp } from "../../../lib/openai";
export const runtime = "nodejs";

type Ctx = {
  tone?: string; spxPct?: number; ndxPct?: number; vix?: number;
  mover?: { label: string; chg: number } | null;
  headlines?: string[];
  event?: { title: string; time: string } | null;
  instrument?: string;
};
const fp = (n?: number) => (n == null ? "?" : (n >= 0 ? "+" : "") + (n * 100).toFixed(2) + "%");

export async function POST(req: Request) {
  const { context } = (await req.json().catch(() => ({}))) as { context?: Ctx };
  const c = context || {};
  if (aiEnabled() && rateAllow(clientIp(req))) {
    const prompt = [
      `Market today: S&P ${fp(c.spxPct)}, Nasdaq ${fp(c.ndxPct)}, VIX ${c.vix ?? "?"} (${c.tone || "n/a"}).`,
      c.mover ? `Biggest mover: ${c.mover.label} ${fp(c.mover.chg)}.` : "",
      c.headlines?.length ? `Headlines: ${c.headlines.slice(0, 5).join(" | ")}` : "",
      c.event ? `High-impact event today: ${c.event.title} at ${c.event.time} UTC.` : "No high-impact event today.",
      `Trader's main instrument: ${c.instrument || "MNQ"}.`,
    ].filter(Boolean).join("\n");
    const text = await openaiChat(
      "You are a futures day-trading strategist for funded (prop) traders. From today's market move and news, give a concise, actionable trade read: (1) directional bias, (2) which instruments are in play, (3) what to avoid, (4) event risk. 3-4 sentences, specific, second person. Use ONLY the data given; never invent levels or numbers. Education, not financial advice.",
      prompt, 320
    );
    if (text) return NextResponse.json({ source: "openai", text });
  }
  return NextResponse.json({ source: "composed", text: compose(c) });
}

function compose(c: Ctx): string {
  const s: string[] = [];
  const tone = c.tone || "flat";
  if (tone === "risk-off") s.push(`Bias: defensive. Indices are under pressure (S&P ${fp(c.spxPct)}), so favor shorting strength and fading weak bounces over chasing longs.`);
  else if (tone === "risk-on") s.push(`Bias: constructive. Indices are bid (S&P ${fp(c.spxPct)}), so favor buying pullbacks into support over shorting into strength.`);
  else s.push(`Bias: neutral. The tape is flat (S&P ${fp(c.spxPct)}), so treat today as a range — scalp both edges and don't force a trend that isn't there.`);
  if (c.mover) s.push(`Where the move is: ${c.mover.label} (${fp(c.mover.chg)}) is the standout — that's where the volatility and the cleanest setups are likely to be today.`);
  if (c.vix != null) s.push(c.vix >= 20 ? `VIX near ${c.vix.toFixed(1)} means wider ranges — size down and give stops room.` : `VIX near ${c.vix.toFixed(1)} means contained ranges — don't expect runaway trends; take profits into moves.`);
  if (c.headlines && c.headlines.length) {
    const h = c.headlines.join(" ").toLowerCase();
    if (/rate|fed|fomc|hike|cut|powell|cpi|inflation|yield/.test(h)) s.push(`Rates/Fed are driving the headlines — expect fast two-way reversals and avoid holding through any data print.`);
    else if (/oil|crude|opec|energy/.test(h)) s.push(`Energy is in focus in the news — crude (CL/MCL) may offer the cleaner momentum than indices.`);
    else if (/gold|silver|metal/.test(h)) s.push(`Metals are in the headlines — gold (GC/MGC) is worth watching for a momentum trade.`);
    else if (/bitcoin|crypto|ether/.test(h)) s.push(`Crypto is leading the tape — if you trade it, it's where the range is widest today.`);
  }
  if (c.event) s.push(`Event risk: ${c.event.title} at ${c.event.time} UTC — flatten into it and stand aside for ~5 minutes after the print.`);
  else s.push(`No high-impact event scheduled — the risk today is your own overtrading, not the calendar.`);
  s.push(`Not financial advice — your edge and your Distance to Breach decide the trade, not the headline.`);
  return s.join(" ");
}
