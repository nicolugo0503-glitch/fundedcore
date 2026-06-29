// The Standard — data-moat API. Collects anonymized, no-PII behavioral metrics from
// every synced account and returns live cohort percentile anchors. The more accounts
// that join, the sharper the benchmark. Degrades gracefully to the baseline when the
// store isn't configured or there isn't enough data yet.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
const TABLE = "benchmarks";

function q(sorted: number[], p: number) {
  if (!sorted.length) return 0;
  const i = (sorted.length - 1) * p;
  const lo = Math.floor(i), hi = Math.ceil(i);
  return lo === hi ? sorted[lo] : sorted[lo] + (sorted[hi] - sorted[lo]) * (i - lo);
}
const num = (v: any) => (typeof v === "number" && isFinite(v) ? v : null);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  if (action === "submit") {
    if (!db) return NextResponse.json({ stored: false, reason: "not-configured" });
    const m = body.metrics || {};
    const row = {
      composure: num(m.composure), win_rate: num(m.winRate), payoff: num(m.payoff),
      profit_factor: num(m.profitFactor), breach_prob: num(m.breachProb),
      trades: num(m.trades), firm_key: typeof m.firmKey === "string" ? m.firmKey.slice(0, 40) : null,
    };
    if (row.composure == null && row.profit_factor == null) return NextResponse.json({ stored: false, reason: "empty" });
    try { const { error } = await db.from(TABLE).insert(row); if (error) throw error; return NextResponse.json({ stored: true }); }
    catch (e: any) { return NextResponse.json({ stored: false, reason: e?.message || "insert-failed" }); }
  }

  // default: cohort anchors
  if (!db) return NextResponse.json({ count: 0, anchors: {} });
  try {
    const { data, error } = await db.from(TABLE).select("composure,win_rate,payoff,profit_factor,breach_prob").limit(20000);
    if (error) throw error;
    const rows = data || [];
    const col = (k: string) => rows.map((r: any) => r[k]).filter((v: any) => typeof v === "number" && isFinite(v)).sort((a: number, b: number) => a - b);
    const anchorsHi = (k: string) => { const s = col(k); return s.length ? [q(s, .1), q(s, .25), q(s, .5), q(s, .75), q(s, .9)] : null; };
    const anchorsLo = (k: string) => { const s = col(k); return s.length ? [q(s, .9), q(s, .75), q(s, .5), q(s, .25), q(s, .1)] : null; };
    const anchors: any = {};
    const c = anchorsHi("composure"); if (c) anchors.composure = c;
    const w = anchorsHi("win_rate"); if (w) anchors.winRate = w;
    const p = anchorsHi("payoff"); if (p) anchors.payoff = p;
    const pf = anchorsHi("profit_factor"); if (pf) anchors.profitFactor = pf;
    const b = anchorsLo("breach_prob"); if (b) anchors.breachProb = b;
    return NextResponse.json({ count: rows.length, anchors });
  } catch (e: any) {
    return NextResponse.json({ count: 0, anchors: {}, error: e?.message || "read-failed" });
  }
}
