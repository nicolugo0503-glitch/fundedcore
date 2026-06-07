// Universal webhook inbox. Any bridge (TradersPost, PickMyTrade, a custom
// script) POSTs normalized account/position/fill events here keyed by a secret
// inbox key; the browser polls them back out. Because bridges already connect to
// every firm's platform, this gives multi-firm coverage without a per-platform API.
// NOTE: in-memory store (per warm instance) — fine for personal/beta use; swap
// for a DB/Redis for production durability.
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type Ev = { t: number; kind: string; [k: string]: any };
const inbox = new Map<string, Ev[]>();
const CAP = 300;
const CORS = { "Access-Control-Allow-Origin": "*", "Access-Control-Allow-Methods": "GET,POST,OPTIONS", "Access-Control-Allow-Headers": "content-type" };

export async function OPTIONS() { return new NextResponse(null, { headers: CORS }); }

export async function POST(req: Request) {
  const url = new URL(req.url);
  const body = await req.json().catch(() => ({}));
  const key = url.searchParams.get("key") || body.key;
  if (!key) return NextResponse.json({ error: "Missing inbox key." }, { status: 400, headers: CORS });
  const kind = body.kind || (body.positions ? "position" : body.price != null ? "fill" : body.balance != null ? "account" : "event");
  const ev: Ev = { t: Date.now(), kind, ...body };
  const arr = inbox.get(key) || [];
  arr.push(ev);
  if (arr.length > CAP) arr.splice(0, arr.length - CAP);
  inbox.set(key, arr);
  return NextResponse.json({ ok: true, stored: kind }, { headers: CORS });
}

export async function GET(req: Request) {
  const url = new URL(req.url);
  const key = url.searchParams.get("key");
  const since = Number(url.searchParams.get("since") || 0);
  if (!key) return NextResponse.json({ error: "Missing key." }, { status: 400, headers: CORS });
  const events = (inbox.get(key) || []).filter((e) => e.t > since);
  return NextResponse.json({ events, now: Date.now() }, { headers: CORS });
}
