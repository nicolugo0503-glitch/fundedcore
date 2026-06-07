// Webhook connector — polls the universal inbox for events pushed by any bridge.
import type { BrokerConnector, ConnectorEvents, LivePosition } from "./types";

export class WebhookConnector implements BrokerConnector {
  provider = "Webhook";
  private timer: any = null;
  private since = 0;
  constructor(private key: string) {}

  connect(ev: ConnectorEvents) {
    ev.onStatus("connecting");
    const poll = async () => {
      try {
        const r = await fetch(`/api/connect/hook?key=${encodeURIComponent(this.key)}&since=${this.since}`, { cache: "no-store" });
        const j = await r.json();
        ev.onStatus("live");
        for (const e of (j.events || [])) {
          this.since = Math.max(this.since, e.t);
          if (e.kind === "account") ev.onAccount({ name: e.name || "Account", balance: +e.balance || 0, dayPnl: +e.dayPnl || 0, openPnl: +e.openPnl || 0 });
          else if (e.kind === "position") ev.onPositions((e.positions as LivePosition[]) || [{ symbol: e.symbol || "—", net: +e.net || 0, avgPrice: +e.avgPrice || 0, openPnl: +e.openPnl || 0 }]);
          else if (e.kind === "fill") ev.onFill({ id: String(e.id || e.t), symbol: e.symbol || "—", side: (e.side || "buy").toLowerCase() === "sell" ? "sell" : "buy", qty: +e.qty || 0, price: +e.price || 0, t: e.t });
        }
      } catch { ev.onStatus("error", "Inbox unreachable."); }
    };
    poll();
    this.timer = setInterval(poll, 2000);
  }
  disconnect() { clearInterval(this.timer); this.timer = null; }
}
