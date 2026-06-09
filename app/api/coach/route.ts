// AI Coach. Uses OpenAI (one operator key + usage cap) when available; otherwise
// returns a solid rule-based answer so the feature always responds.
import { NextResponse } from "next/server";
import { openaiChat, aiEnabled, rateAllow, clientIp } from "../../../lib/openai";
export const runtime = "nodejs";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { message, context } = body as { message?: string; context?: string };

  if (aiEnabled() && rateAllow(clientIp(req))) {
    const text = await openaiChat(
      "You are FundedCore's trading coach for prop-firm (funded) futures traders. Be concise, direct, specific. Use ONLY the trader's stats in the context — never invent numbers. Focus on risk, discipline, and keeping the funded account alive. Not financial advice.",
      `My stats:\n${context || "(none provided)"}\n\nQuestion: ${message || ""}`,
      600
    );
    if (text) return NextResponse.json({ source: "openai", text });
  }
  return NextResponse.json({ source: "rules", text: ruleBased(message || "") });
}

function ruleBased(message: string): string {
  const q = message.toLowerCase();
  if (/blow|breach|risk|lose the account/.test(q))
    return "Your account dies one way: a rule breach. Before each trade, check your Distance to Breach in the Risk tab and never let a single trade's worst case exceed it. The Risk tab gives you the exact max contracts you can take right now.";
  if (/flaw|biggest|wrong|fix|leak/.test(q))
    return "Open the Insights tab — it ranks the patterns costing you the most money (revenge trades, worst hour, worst day) with the $ each one costs. Fix the top one first; that's your highest-ROI change.";
  if (/news|cpi|fomc/.test(q))
    return "Check the News tab for today's high-impact events. Don't hold or enter through a high-impact release — spreads blow out and slippage can breach you. Wait 2–5 minutes after the number prints.";
  if (/size|how many|contracts/.test(q))
    return "Position size off your stop and your remaining room, not your gut. The Risk tab's guardrail gives you the largest safe size for your chosen instrument and stop on the selected account.";
  return "Here's the disciplined default: trade only your best window (see Insights), size off your Distance to Breach (Risk tab), avoid high-impact news (News tab), and stop at your daily loss limit.";
}
