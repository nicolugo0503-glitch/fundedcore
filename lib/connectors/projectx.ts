// TopStep / ProjectX adapter — authenticates via API key, then polls the user's
// accounts + open positions through our server proxy and emits them as a live
// feed. Supports MULTIPLE accounts on one login: it surfaces the full list and
// lets the UI pick which one to monitor (defaulting to a tradeable/active one).
import type { BrokerConnector, ConnectorEvents, LivePosition, LiveAccountInfo } from "./types";

export type ProjectXCreds = { userName: string; apiKey: string };

export class ProjectXConnector implements BrokerConnector {
  provider = "TopStep (ProjectX)";
  private timer: any = null;
  private token = "";
  private ev: ConnectorEvents | null = null;
  private accounts: LiveAccountInfo[] = [];
  private selectedId: string | number | null = null;
  constructor(private creds: ProjectXCreds) {}

  async connect(ev: ConnectorEvents) {
    this.ev = ev;
    ev.onStatus("connecting");
    try {
      const r = await fetch("/api/connect/projectx", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "auth", userName: this.creds.userName, apiKey: this.creds.apiKey }) });
      const j = await r.json();
      if (!r.ok || !j.token) { ev.onStatus("error", j.error || "Auth failed."); return; }
      this.token = j.token;
    } catch (e: any) { ev.onStatus("error", e?.message || "Auth request failed."); return; }
    await this.poll();
    this.timer = setInterval(() => this.poll(), 4000);
  }

  // pick a sensible default: prefer a tradeable (non-blown) account, else first.
  private defaultId(): string | number | null {
    const tradeable = this.accounts.find((a) => a.canTrade);
    return (tradeable || this.accounts[0])?.id ?? null;
  }

  selectAccount(id: string | number) {
    this.selectedId = id;
    this.poll();
  }

  private poll = async () => {
    const ev = this.ev; if (!ev) return;
    try {
      const r = await fetch("/api/connect/projectx", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "snapshot", token: this.token, accountId: this.selectedId }) });
      const j = await r.json();
      if (!r.ok) { ev.onStatus("error", j.error || "Lost connection."); return; }
      ev.onStatus("live");
      this.accounts = (j.accounts || []) as LiveAccountInfo[];
      if (this.selectedId == null) this.selectedId = this.defaultId();
      ev.onAccounts?.(this.accounts);
      const sel = this.accounts.find((a) => String(a.id) === String(this.selectedId)) || this.accounts[0];
      const openPnl = (j.positions || []).reduce((s: number, p: LivePosition) => s + (p.openPnl || 0), 0);
      if (sel) ev.onAccount({ name: sel.name || "TopStep", balance: sel.balance || 0, dayPnl: 0, openPnl });
      ev.onPositions((j.positions || []) as LivePosition[]);
    } catch { ev.onStatus("error", "Connection error."); }
  };

  disconnect() { clearInterval(this.timer); this.timer = null; this.ev = null; this.selectedId = null; this.accounts = []; }
}
