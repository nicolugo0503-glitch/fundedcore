// Broker connector abstraction — every platform (Tradovate, Rithmic, ProjectX)
// implements this one interface, so the rest of the app consumes a single
// normalized real-time feed regardless of which prop firm the trader is on.
export type LiveAccount = { name: string; balance: number; dayPnl: number; openPnl: number };
export type LivePosition = { symbol: string; net: number; avgPrice: number; openPnl: number };
export type LiveFill = { id: string; symbol: string; side: "buy" | "sell"; qty: number; price: number; t: number };
export type ConnStatus = "idle" | "connecting" | "live" | "error" | "closed";

export type ConnectorEvents = {
  onStatus: (s: ConnStatus, msg?: string) => void;
  onAccount: (a: LiveAccount) => void;
  onPositions: (p: LivePosition[]) => void;
  onFill: (f: LiveFill) => void;
};

export interface BrokerConnector {
  provider: string;
  connect(events: ConnectorEvents): Promise<void> | void;
  disconnect(): void;
}
