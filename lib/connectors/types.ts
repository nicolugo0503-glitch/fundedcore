// Broker connector abstraction — every platform (Tradovate, Rithmic, ProjectX)
// implements this one interface, so the rest of the app consumes a single
// normalized real-time feed regardless of which prop firm the trader is on.
export type LiveAccount = { name: string; balance: number; dayPnl: number; openPnl: number };
export type LivePosition = { symbol: string; net: number; avgPrice: number; openPnl: number };
export type LiveFill = { id: string; symbol: string; side: "buy" | "sell"; qty: number; price: number; t: number };
export type ConnStatus = "idle" | "connecting" | "live" | "error" | "closed";
// One row in the account picker (a trader may have several accounts on one login).
export type LiveAccountInfo = { id: string | number; name: string; balance: number; canTrade?: boolean; simulated?: boolean };

export type ConnectorEvents = {
  onStatus: (s: ConnStatus, msg?: string) => void;
  onAccount: (a: LiveAccount) => void;
  onAccounts?: (accts: LiveAccountInfo[]) => void;
  onPositions: (p: LivePosition[]) => void;
  onFill: (f: LiveFill) => void;
};

export interface BrokerConnector {
  provider: string;
  connect(events: ConnectorEvents): Promise<void> | void;
  disconnect(): void;
  selectAccount?(id: string | number): void;
  // Pull the selected account's real trade history (for syncing into the profile).
  fetchTrades?(accountId: string | number): Promise<any[]>;
  // Auto-Guardian kill-switch: flatten all open positions for the account.
  flatten?(accountId: string | number): Promise<{ flattened: number; attempted: number; errors: string[] }>;
}
