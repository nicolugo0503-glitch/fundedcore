// TopStep / ProjectX (TopstepX) bridge. The browser sends the user's API key
// once to authenticate; we return a session token. Then it polls "snapshot"
// (token only) which we proxy server-side to ProjectX (avoids CORS, keeps the
// key off the client). Built to ProjectX Gateway API docs; pending live validation.
import { NextResponse } from "next/server";
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const BASE = "https://api.topstepx.com";

async function px(path: string, body: any, token?: string) {
  const r = await fetch(BASE + path, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: "Bearer " + token } : {}) },
    body: JSON.stringify(body || {}),
  });
  const j = await r.json().catch(() => ({}));
  return { ok: r.ok, status: r.status, j };
}

export async function POST(req: Request) {
  const body = await req.json().catch(() => ({}));
  const action = body.action;

  try {
    if (action === "auth") {
      const { userName, apiKey } = body;
      if (!userName || !apiKey) return NextResponse.json({ error: "Username and API key required." }, { status: 400 });
      const { ok, j } = await px("/api/Auth/loginKey", { userName, apiKey });
      if (!ok || !j?.token) return NextResponse.json({ error: j?.errorMessage || "ProjectX rejected the login (check your username + API key, and that your API subscription is active)." }, { status: 401 });
      return NextResponse.json({ token: j.token });
    }

    if (action === "snapshot") {
      const { token } = body;
      if (!token) return NextResponse.json({ error: "Missing token." }, { status: 400 });
      const acc = await px("/api/Account/search", { onlyActiveAccounts: true }, token);
      if (!acc.ok) return NextResponse.json({ error: "Session expired — reconnect." }, { status: 401 });
      const accounts = (acc.j?.accounts || []).map((a: any) => ({ id: a.id, name: a.name, balance: a.balance, canTrade: a.canTrade, simulated: a.simulated }));
      const primary = accounts[0];
      let positions: any[] = [];
      if (primary) {
        const pos = await px("/api/Position/searchOpen", { accountId: primary.id }, token);
        positions = (pos.j?.positions || []).map((p: any) => ({ symbol: String(p.contractId ?? "—"), net: (p.type === 2 ? -1 : 1) * (p.size ?? 0), avgPrice: p.averagePrice ?? 0, openPnl: p.profitAndLoss ?? p.openPnl ?? 0 }));
      }
      return NextResponse.json({ accounts, positions });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Could not reach ProjectX: " + (e?.message || "network error") }, { status: 502 });
  }
}
