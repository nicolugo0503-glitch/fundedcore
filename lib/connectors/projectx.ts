// TopStep / ProjectX adapter — authenticates via API key, then polls the user's
// account balance + open positions through our server proxy and emits them as a
// live feed. Built to ProjectX Gateway API docs; pending validation on a live key.
import type { BrokerConnector, ConnectorEvents, LivePosition } from "./types";

export type ProjectXCreds = { userName: string; apiKey: string };

export class ProjectXConnector implements BrokerConnector {
  provider = "TopStep (ProjectX)";
  private timer: any = null;
  private token = "";
  constructor(private creds: ProjectXCreds) {}

  async connect(ev: ConnectorEvents) {
    ev.onStatus("connecting");
    try {
      const r = await fetch("/api/connect/projectx", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "auth", userName: this.creds.userName, apiKey: this.creds.apiKey }) });
      const j = await r.json();
      if (!r.ok || !j.token) { ev.onStatus("error", j.error || "Auth failed."); return; }
      this.token = j.token;
    } catch (e: any) { ev.onStatus("error", e?.message || "Auth request failed."); return; }

    const poll = async () => {
      try {
        const r = await fetch("/api/connect/projectx", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ action: "snapshot", token: this.token }) });
        const j = await r.json();
        if (!r.ok) { ev.onStatus("error", j.error || "Lost connection."); return; }
        ev.onStatus("live");
        const a = (j.accounts || [])[0];
        if (a) ev.onAccount({ name: a.name || "TopStep", balance: a.balance || 0, dayPnl: 0, openPnl: (j.positions || []).reduce((s: number, p: LivePosition) => s + (p.openPnl || 0), 0) });
        ev.onPositions((j.positions || []) as LivePosition[]);
      } catch { ev.onStatus("error", "Connection error."); }
    };
    await poll();
    this.timer = setInterval(poll, 4000);
  }
  disconnect() { clearInterval(this.timer); this.timer = null; }
}
