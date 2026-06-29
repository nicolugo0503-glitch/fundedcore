// TopStep / ProjectX (TopstepX) bridge. The browser sends the user's API key
// once to authenticate; we return a session token. Then it polls "snapshot"
// (token + optional accountId) which we proxy server-side to ProjectX (avoids
// CORS, keeps the key off the client). Returns ALL the trader's accounts so the
// UI can let them choose which to monitor (a login often has several).
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
      // Fetch ALL accounts (active + blown/locked) so the trader can pick; ProjectX
      // marks tradeable accounts with canTrade — blown accounts come back with canTrade:false.
      const acc = await px("/api/Account/search", { onlyActiveAccounts: false }, token);
      if (!acc.ok) return NextResponse.json({ error: "Session expired — reconnect." }, { status: 401 });
      let accounts = (acc.j?.accounts || []).map((a: any) => ({ id: a.id, name: a.name, balance: a.balance, canTrade: a.canTrade, simulated: a.simulated }));
      // sort tradeable first, then by balance desc — so the picker leads with the live account.
      accounts.sort((x: any, y: any) => (Number(!!y.canTrade) - Number(!!x.canTrade)) || ((y.balance || 0) - (x.balance || 0)));

      const wantId = body.accountId;
      const primary = accounts.find((a: any) => String(a.id) === String(wantId)) || accounts.find((a: any) => a.canTrade) || accounts[0];

      let positions: any[] = [];
      if (primary) {
        const pos = await px("/api/Position/searchOpen", { accountId: primary.id }, token);
        positions = (pos.j?.positions || []).map((p: any) => ({ symbol: String(p.contractId ?? "—"), net: (p.type === 2 ? -1 : 1) * (p.size ?? 0), avgPrice: p.averagePrice ?? 0, openPnl: p.profitAndLoss ?? p.openPnl ?? 0 }));
      }
      return NextResponse.json({ accounts, positions, primaryId: primary?.id ?? null });
    }

    if (action === "trades") {
      // Pull the account's real trade history so every FundedCore module reads it.
      const { token, accountId } = body;
      if (!token || accountId == null) return NextResponse.json({ error: "Missing token or accountId." }, { status: 400 });
      const days = Math.min(365, Math.max(1, Number(body.days) || 90));
      const end = new Date();
      const start = new Date(end.getTime() - days * 86400000);
      const tr = await px("/api/Trade/search", { accountId, startTimestamp: start.toISOString(), endTimestamp: end.toISOString() }, token);
      if (!tr.ok) return NextResponse.json({ error: "Could not fetch trades (session may have expired — reconnect)." }, { status: 401 });
      const raw = tr.j?.trades || tr.j?.data || [];
      // ProjectX returns half-turn executions; the closing half carries realized P&L.
      // Keep those (non-null P&L, not voided) as one realized trade each.
      const trades = raw
        .filter((t: any) => !t.voided && t.profitAndLoss != null)
        .map((t: any, i: number) => {
          const ts = Date.parse(t.creationTimestamp || t.timestamp || t.createdAt) || Date.now();
          const d = new Date(ts);
          const date = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}-${String(d.getUTCDate()).padStart(2, "0")}`;
          const side = (t.side === 1 || t.side === "Sell" || t.type === 1) ? "short" : "long";
          const pnl = Number(t.profitAndLoss || 0) - Number(t.fees || 0);
          return { id: Number(t.id) || ts * 100 + i, date, timestamp: ts, symbol: String(t.contractId ?? t.symbol ?? "—"), side, size: Number(t.size ?? 1), pnl, entry: t.price ?? undefined };
        })
        .sort((a: any, b: any) => a.timestamp - b.timestamp);
      return NextResponse.json({ trades, count: trades.length });
    }

    if (action === "flatten") {
      // Auto-Guardian: close every open position for the account (user-armed safety kill-switch).
      const { token, accountId } = body;
      if (!token || accountId == null) return NextResponse.json({ error: "Missing token or accountId." }, { status: 400 });
      const pos = await px("/api/Position/searchOpen", { accountId }, token);
      if (!pos.ok) return NextResponse.json({ error: "Could not read positions (reconnect)." }, { status: 401 });
      const open = (pos.j?.positions || []).filter((p: any) => (p.size ?? 0) !== 0);
      let flattened = 0; const errors: string[] = [];
      for (const p of open) {
        const r = await px("/api/Position/closeContract", { accountId, contractId: p.contractId }, token);
        if (r.ok && (r.j?.success !== false)) flattened++; else errors.push(String(p.contractId));
      }
      return NextResponse.json({ flattened, attempted: open.length, errors });
    }

    return NextResponse.json({ error: "Unknown action." }, { status: 400 });
  } catch (e: any) {
    return NextResponse.json({ error: "Could not reach ProjectX: " + (e?.message || "network error") }, { status: 502 });
  }
}
