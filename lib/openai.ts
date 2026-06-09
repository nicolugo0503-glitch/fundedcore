// Shared OpenAI helper for the AI features (coach, briefing, trade read).
// Uses ONE server-side key (OPENAI_API_KEY) the operator absorbs, with a usage
// cap so a few testers can't run up a bill. Falls back to rule-based when the
// key is missing, the cap is hit, or OpenAI errors — so AI features never break.
const KEY = process.env.OPENAI_API_KEY;
const MODEL = process.env.OPENAI_MODEL || "gpt-4o-mini"; // cheap + good

// In-memory limiter (per warm instance). For a beta this is a soft guard; the
// real hard cap is a monthly budget limit set in your OpenAI dashboard.
const PER_IP_PER_HOUR = Number(process.env.AI_PER_IP_HOUR || 15);
const GLOBAL_PER_DAY = Number(process.env.AI_GLOBAL_DAY || 800);
const ipHits = new Map<string, { count: number; reset: number }>();
let dayCount = 0;
let dayReset = Date.now() + 86_400_000;

export function aiEnabled() { return !!KEY; }

export function rateAllow(ip: string): boolean {
  const now = Date.now();
  if (now > dayReset) { dayCount = 0; dayReset = now + 86_400_000; }
  if (dayCount >= GLOBAL_PER_DAY) return false;
  const h = ipHits.get(ip);
  if (!h || now > h.reset) { ipHits.set(ip, { count: 1, reset: now + 3_600_000 }); }
  else { if (h.count >= PER_IP_PER_HOUR) return false; h.count++; }
  dayCount++;
  return true;
}

export function clientIp(req: Request): string {
  return (req.headers.get("x-forwarded-for") || "").split(",")[0].trim() || "anon";
}

export async function openaiChat(system: string, user: string, maxTokens = 420): Promise<string | null> {
  if (!KEY) return null;
  try {
    const r = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: { "content-type": "application/json", authorization: "Bearer " + KEY },
      body: JSON.stringify({ model: MODEL, max_tokens: maxTokens, temperature: 0.6, messages: [{ role: "system", content: system }, { role: "user", content: user }] }),
    });
    if (!r.ok) return null;
    const j = await r.json();
    return j?.choices?.[0]?.message?.content?.trim() || null;
  } catch { return null; }
}
