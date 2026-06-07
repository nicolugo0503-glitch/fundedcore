// Rithmic adapter (R|API+ / RProtocol). Rithmic is supported at nearly every
// futures prop firm, but its API is gated: you need (1) an approved API "system"
// via Rithmic's conformance process and (2) their Protocol-Buffer templates,
// both issued under a licensing agreement. This adapter implements the documented
// connection FLOW and fits the BrokerConnector interface, but cannot stream until
// those prerequisites + the protobuf schema are in place. It is intentionally
// honest: it will not fabricate data.
import type { BrokerConnector, ConnectorEvents } from "./types";

export type RithmicCreds = { gateway: string; systemName: string; user: string; password: string };

// Documented RProtocol request/response template ids (for when the .proto layer is added):
//  10  RequestLogin / 11 ResponseLogin
//  300 RequestSubscribeForOrderUpdates
//  400 RequestPnLPositionUpdates / 450 PnLPositionUpdate (account + position + open P&L)
//  351 RithmicOrderNotification (fills)
export class RithmicConnector implements BrokerConnector {
  provider = "Rithmic";
  private ws: WebSocket | null = null;
  constructor(private creds: RithmicCreds) {}

  connect(ev: ConnectorEvents) {
    ev.onStatus("connecting");
    if (!this.creds.gateway || !this.creds.systemName || !this.creds.user || !this.creds.password) {
      ev.onStatus("error", "Rithmic needs an approved API system + gateway, user and password (issued via Rithmic conformance). Enter them to proceed.");
      return;
    }
    // The websocket itself opens, but messages must be Protocol-Buffer encoded
    // using Rithmic's templates (provided under their API agreement). Without
    // that schema we cannot encode RequestLogin, so we stop here honestly.
    try {
      this.ws = new WebSocket(this.creds.gateway);
      this.ws.onopen = () => {
        ev.onStatus("error", "Connected to the Rithmic gateway, but RProtocol requires Rithmic's protobuf templates to log in. Add the licensed .proto schema to enable streaming.");
        try { this.ws?.close(); } catch {}
      };
      this.ws.onerror = () => ev.onStatus("error", "Could not reach the Rithmic gateway URL.");
    } catch (e: any) {
      ev.onStatus("error", e?.message || "Invalid gateway URL.");
    }
  }
  disconnect() { try { this.ws?.close(); } catch {} this.ws = null; }
}
