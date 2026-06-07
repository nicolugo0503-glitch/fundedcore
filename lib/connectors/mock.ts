import type { BrokerConnector, ConnectorEvents, LivePosition } from "./types";

// Simulated live feed: streams a realistic intraday account so the live UI,
// the real-time Distance-to-Breach, and the wiring can be verified end-to-end.
export class MockConnector implements BrokerConnector {
  provider = "Simulated";
  private timers: any[] = [];
  private balance = 51500;
  private dayPnl = 0;
  private pos: LivePosition = { symbol: "MNQ", net: 0, avgPrice: 0, openPnl: 0 };
  private id = 0;

  connect(ev: ConnectorEvents) {
    ev.onStatus("connecting");
    setTimeout(() => {
      ev.onStatus("live");
      ev.onAccount({ name: "SIM-50K-1", balance: this.balance, dayPnl: this.dayPnl, openPnl: 0 });
    }, 600);

    // price + open-pnl tick
    this.timers.push(setInterval(() => {
      if (this.pos.net !== 0) {
        const drift = (Math.random() - 0.48) * 6; // points
        this.pos.openPnl = Math.round(this.pos.net * drift * 2);
        ev.onPositions([{ ...this.pos }]);
        ev.onAccount({ name: "SIM-50K-1", balance: this.balance, dayPnl: this.dayPnl, openPnl: this.pos.openPnl });
      }
    }, 1500));

    // fills
    this.timers.push(setInterval(() => {
      const side = Math.random() < 0.5 ? "buy" : "sell";
      const qty = 1 + Math.floor(Math.random() * 2);
      const price = 18000 + Math.round((Math.random() - 0.5) * 60);
      // close existing or open
      if (this.pos.net !== 0 && Math.random() < 0.6) {
        this.dayPnl += this.pos.openPnl; this.balance += this.pos.openPnl;
        this.pos = { symbol: "MNQ", net: 0, avgPrice: 0, openPnl: 0 };
      } else {
        const dir = side === "buy" ? qty : -qty;
        this.pos = { symbol: "MNQ", net: dir, avgPrice: price, openPnl: 0 };
      }
      ev.onFill({ id: String(++this.id), symbol: "MNQ", side, qty, price, t: Date.now() });
      ev.onAccount({ name: "SIM-50K-1", balance: this.balance, dayPnl: this.dayPnl, openPnl: this.pos.openPnl });
      ev.onPositions(this.pos.net ? [{ ...this.pos }] : []);
    }, 4500));
  }
  disconnect() { this.timers.forEach(clearInterval); this.timers = []; }
}
