// Server-side Tradovate auth proxy. The browser POSTs credentials here once;
// we exchange them for a short-lived access token and return it. Credentials
// are used transiently and never stored or logged.
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const { name, password, appId, appVersion, cid, sec, live } = body as Record<string, any>;
  if (!name || !password) return NextResponse.json({ error: "Missing credentials." }, { status: 400 });
  const base = live ? "https://live.tradovateapi.com/v1" : "https://demo.tradovateapi.com/v1";
  try {
    const r = await fetch(base + "/auth/accessTokenRequest", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ name, password, appId: appId || "FundedCore", appVersion: appVersion || "1.0", cid, sec, deviceId: "fundedcore-web" }),
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || j.errorText || !j.accessToken) {
      return NextResponse.json({ error: j.errorText || "Tradovate rejected the login (check credentials / API access / live vs demo)." }, { status: 401 });
    }
    return NextResponse.json({ accessToken: j.accessToken, expirationTime: j.expirationTime, wsBase: live ? "wss://live.tradovateapi.com/v1/websocket" : "wss://demo.tradovateapi.com/v1/websocket" });
  } catch (e: any) {
    return NextResponse.json({ error: "Could not reach Tradovate: " + (e?.message || "network error") }, { status: 502 });
  }
}
