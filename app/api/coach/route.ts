import { NextRequest, NextResponse } from "next/server";

export const runtime = "nodejs";

function buildSystemPrompt(ctx: {
  firmName: string; accountSize: number; trailingDD: number;
  drawdownType: string; dailyLoss: number | null; contractCap: number;
  trailingRoom: number; todayPnL: number; totalTrades: number;
  winRate: number; expectancy: number; netPnL: number; fundedScore: number;
  revengeTrades: number; revengePct: number; signatures: string;
  setups: string; hourBuckets: string;
}): string {
  return `You are an elite trading coach specializing in funded futures accounts. You have deep expertise in prop firm rules, behavioral finance, and what separates consistently funded traders from account-blowers.

TRADER'S FUNDED ACCOUNT — ${ctx.firmName}:
- Account size: $${ctx.accountSize.toLocaleString()}
- Max trailing drawdown: $${ctx.trailingDD.toLocaleString()} (${ctx.drawdownType === "eod_trailing" ? "EOD — floor only moves at end of day. Intraday dips don't trail" : "INTRADAY — trails live equity high. One intraday wick to the floor ends the account, even if the day closes green"})
- Daily loss limit: ${ctx.dailyLoss === null ? "NONE — all risk managed by trailing drawdown" : "$" + ctx.dailyLoss.toLocaleString() + " — hitting it auto-liquidates the rest of the session"}
- Contract cap: ${ctx.contractCap}
- Trailing room REMAINING right now: $${ctx.trailingRoom.toLocaleString()}
- Today's realized P&L: $${ctx.todayPnL.toLocaleString()}

JOURNAL STATISTICS — ${ctx.totalTrades} trades:
- Win rate: ${ctx.winRate}%
- Expectancy per trade: $${ctx.expectancy}
- Total net P&L: $${ctx.netPnL.toLocaleString()}
- FundedScore™ (0–100 composite): ${ctx.fundedScore}
- Revenge / tilt trades: ${ctx.revengeTrades} (${ctx.revengePct}% of all trades)

PERFORMANCE BY SETUP:
${ctx.setups}

PERFORMANCE BY TIME WINDOW:
${ctx.hourBuckets}

BEHAVIORAL SIGNALS DETECTED:
${ctx.signatures || "None detected in current data"}

COACHING MANDATE:
- Be brutally honest. No fluff, no cheerleading.
- Use the trader's exact dollar amounts and percentages.
- Identify the highest-cost single behavior and what to change NOW.
- Reference specific setups, time windows, and patterns by name.
- Keep responses tight: 4-6 bullet points or 3-4 focused paragraphs.
- If their expectancy is positive, say so — most funded traders don't have one.
- End every response with one concrete action for the NEXT trading session.
- Never give generic trading advice. Every sentence must reference their specific data.`;
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { messages, context } = body;

    // Prefer server-side env var — user key as fallback
    const apiKey = process.env.ANTHROPIC_API_KEY || body.apiKey;
    if (!apiKey) {
      return NextResponse.json(
        { error: "No API key. Set ANTHROPIC_API_KEY in Vercel env vars, or provide your own key in the dashboard." },
        { status: 401 }
      );
    }

    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
      },
      body: JSON.stringify({
        model: "claude-opus-4-6",
        max_tokens: 1500,
        system: buildSystemPrompt(context),
        messages: messages.map((m: { role: string; content: string }) => ({
          role: m.role,
          content: m.content,
        })),
      }),
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      const msg = (err as { error?: { message?: string } }).error?.message || `Anthropic returned ${res.status}`;
      return NextResponse.json({ error: msg }, { status: res.status });
    }

    const data = await res.json() as { content: { text: string }[] };
    return NextResponse.json({ content: data.content[0]?.text ?? "" });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "Unknown server error";
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}
