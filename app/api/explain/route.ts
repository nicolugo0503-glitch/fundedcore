// Generic AI interpreter — every module sends its computed facts here and gets
// a short plain-English read. Rate-limited + falls back to a templated summary.
import { NextResponse } from "next/server";
import { openaiChat, aiEnabled, rateAllow, clientIp } from "../../../lib/openai";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const { module, facts } = (await req.json().catch(() => ({}))) as { module?: string; facts?: string };
  if (!facts) return NextResponse.json({ source: "none", text: "" });

  if (aiEnabled() && rateAllow(clientIp(req))) {
    const text = await openaiChat(
      `You are FundedCore's AI analyst for funded (prop) futures traders, reading the "${module || "module"}" panel. Given the computed facts, write 2-3 sharp sentences: what it means for this trader and the single most useful thing to do about it. Specific, second person, use ONLY the facts given, no invented numbers, no disclaimers.`,
      facts, 200
    );
    if (text) return NextResponse.json({ source: "openai", text });
  }
  // fallback: surface the facts as a short read
  return NextResponse.json({ source: "rules", text: `Here's the read: ${facts.split("\n").filter(Boolean).slice(0, 2).join(" ")}` });
}
