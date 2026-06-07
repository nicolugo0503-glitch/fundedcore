// Tradovate adapter — built to Tradovate's documented REST-auth + WebSocket
// (engine.io-style frames) + user-sync protocol. Covers Apex, Tradeify, TPT,
// Lucid, FundedNext, TradeDay, Alpha Futures, etc. NOTE: written to spec and
// pending validation against a live funded account.
import type { BrokerConnector, ConnectorEvents, LivePosition, LiveFill } from "./types";

export type TradovateCreds = { name: string; password: string; cid?: string; sec?: string; live?: boolean };

export class TradovateConnector implements BrokerConnector {
  provider = "Tradovate";
  private ws: WebSocket | null = null;
  private hb: any = null;
  private reqId = 1;
  private posBySymbol = new Map<string, LivePosition>();
  constructor(private creds: TradovateCreds) {}

  async connect(ev: ConnectorEvents) {
    ev.onStatus("connecting");
    let token = "", wsBase = "";
    try {
      const r = await fetch("/api/connect/tradovate", {
        method: "POST", headers: { "content-type": "application/json" },
        body: JSON.stringify({ name: this.creds.name, password: this.creds.password, cid: this.creds.cid, sec: this.creds.sec, live: !!this.creds.live }),
      });
      const j = await r.json();
      if (!r.ok || !j.accessToken) { ev.onStatus("error", j.error || "Auth failed."); return; }
      token = j.accessToken; wsBase = j.wsBase;
    } catch (e: any) { ev.onStatus("error", e?.message || "Auth request failed."); return; }

    const ws = new WebSocket(wsBase); this.ws = ws;
    ws.onopen = () => {/* wait for 'o' open frame before authorizing */};
    ws.onclose = () => { ev.onStatus("closed"); clearInterval(this.hb); };
    ws.onerror = () => ev.onStatus("error", "WebSocket error.");
    ws.onmessage = (m) => this.onFrame(String(m.data), token, ev);
  }

  private send(endpoint: string, query = "", body = "") {
    this.ws?.send(`${endpoint}\n${this.reqId++}\n${query}\n${body}`);
  }

  private onFrame(data: string, token: string, ev: ConnectorEvents) {
    const t = data[0]; const payload = data.slice(1);
    if (t === "o") { // socket open -> authorize then request user sync
      this.send("authorize", "", token);
      this.hb = setInterval(() => this.ws?.readyState === 1 && this.ws.send("[]"), 2500); // heartbeat
      return;
    }
    if (t === "h") return; // server heartbeat
    if (t !== "a") return;
    let arr: any[]; try { arr = JSON.parse(payload); } catch { return; }
    for (const msg of arr) {
      // auth response -> kick off user sync
      if (msg.s === 200 && msg.i === 1) { ev.onStatus("live"); this.send("user/syncrequest", "", JSON.stringify({ users: [] })); continue; }
      const d = msg.d || msg;
      this.applyEntity(d, ev);
    }
  }

  private applyEntity(d: any, ev: ConnectorEvents) {
    // cashBalance snapshots -> account
    if (d?.cashBalances || d?.cashBalance) {
      const cb = (d.cashBalances?.[0]) || d.cashBalance;
      if (cb) ev.onAccount({ name: String(cb.accountId ?? "Tradovate"), balance: cb.amount ?? cb.realizedPnL ?? 0, dayPnl: cb.realizedPnL ?? 0, openPnl: cb.openPnL ?? 0 });
    }
    // positions
    const positions = d?.positions || (d?.entityType === "position" ? [d.entity] : null);
    if (positions) {
      for (const p of positions) { if (!p) continue; this.posBySymbol.set(String(p.contractId), { symbol: String(p.contractId), net: p.netPos ?? 0, avgPrice: p.netPrice ?? 0, openPnl: p.openPnl ?? 0 }); }
      ev.onPositions([...this.posBySymbol.values()].filter((x) => x.net !== 0));
    }
    // fills
    const fills = d?.fills || (d?.entityType === "fill" ? [d.entity] : null);
    if (fills) for (const f of fills) { if (!f) continue; ev.onFill({ id: String(f.id ?? Date.now()), symbol: String(f.contractId ?? "—"), side: (f.action || "").toLowerCase() === "sell" ? "sell" : "buy", qty: f.qty ?? 0, price: f.price ?? 0, t: f.timestamp ? Date.parse(f.timestamp) : Date.now() }); }
  }

  disconnect() { clearInterval(this.hb); try { this.ws?.close(); } catch {} this.ws = null; }
}
