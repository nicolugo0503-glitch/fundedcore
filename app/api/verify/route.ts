// Verified by FundedCore — mints a tamper-proof, shareable FundedScore credential.
// Values are read back from the DB by an opaque id, so a link can't be forged by
// editing URL params. Degrades gracefully when the store isn't configured.
import { NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const db = URL && KEY ? createClient(URL, KEY, { auth: { persistSession: false } }) : null;
const TABLE = "verifications";
const numOrNull = (v: any) => (typeof v === "number" && isFinite(v) ? v : null);

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  if (body.action === "mint") {
    if (!db) return NextResponse.json({ error: "Verification needs the database — create the 'verifications' table (see setup)." }, { status: 503 });
    const p = body.payload || {};
    const row = {
      handle: typeof p.handle === "string" ? p.handle.slice(0, 40) : null,
      composure: numOrNull(p.composure), grade: typeof p.grade === "string" ? p.grade.slice(0, 3) : null,
      rank_percentile: numOrNull(p.rankPercentile), sample_trades: numOrNull(p.sampleTrades),
    };
    if (row.composure == null) return NextResponse.json({ error: "Score not ready." }, { status: 400 });
    try {
      const { data, error } = await db.from(TABLE).insert(row).select("id").single();
      if (error) throw error;
      return NextResponse.json({ id: data.id });
    } catch (e: any) { return NextResponse.json({ error: e?.message || "Could not mint." }, { status: 500 }); }
  }
  if (body.action === "get") {
    if (!db || !body.id) return NextResponse.json({ record: null });
    try {
      const { data } = await db.from(TABLE).select("*").eq("id", body.id).single();
      return NextResponse.json({ record: data || null });
    } catch { return NextResponse.json({ record: null }); }
  }
  return NextResponse.json({ error: "Unknown action." }, { status: 400 });
}
