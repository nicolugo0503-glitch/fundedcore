"use client";
import { useRef, useState } from "react";
import { type Profile } from "../../lib/profile";
import { FIRMS } from "../../lib/firms";
import { assessAccount, STATUS_META, type Account } from "../../lib/risk";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, StatTile } from "./ui";
import { Icon } from "../Icon";
import type { BrokerConnector, LiveAccount, LivePosition, LiveFill, ConnStatus } from "../../lib/connectors/types";
import { MockConnector } from "../../lib/connectors/mock";
import { TradovateConnector } from "../../lib/connectors/tradovate";

const FIRM_KEYS = Object.keys(FIRMS);

export function ConnectTab({ profile }: { profile: Profile }) {
  const [provider, setProvider] = useState<"sim" | "tradovate">("sim");
  const [status, setStatus] = useState<ConnStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [acct, setAcct] = useState<LiveAccount | null>(null);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [fills, setFills] = useState<LiveFill[]>([]);
  const [firmKey, setFirmKey] = useState(profile.accounts[0]?.firmKey || FIRM_KEYS[0]);
  const [creds, setCreds] = useState({ name: "", password: "", cid: "", sec: "", live: false });
  const conn = useRef<BrokerConnector | null>(null);

  function connect() {
    conn.current?.disconnect();
    setAcct(null); setPositions([]); setFills([]); setStatusMsg("");
    const c: BrokerConnector = provider === "sim" ? new MockConnector() : new TradovateConnector(creds);
    conn.current = c;
    c.connect({
      onStatus: (s, m) => { setStatus(s); if (m) setStatusMsg(m); },
      onAccount: (a) => setAcct(a),
      onPositions: (p) => setPositions(p),
      onFill: (f) => setFills((prev) => [f, ...prev].slice(0, 20)),
    });
  }
  function disconnect() { conn.current?.disconnect(); conn.current = null; setStatus("closed"); }

  // live Distance to Breach from the connected balance + chosen firm
  const firm = FIRMS[firmKey];
  let liveRisk: ReturnType<typeof assessAccount> | null = null;
  if (acct && firm) {
    const liveBal = acct.balance + (acct.openPnl || 0);
    const a: Account = { id: "live", label: acct.name, firmKey, startBalance: firm.start, balance: liveBal, peakEquity: Math.max(liveBal, firm.start), todayPnL: acct.dayPnl + (acct.openPnl || 0), daysTraded: 1 };
    liveRisk = assessAccount(a);
  }
  const sm = liveRisk ? STATUS_META[liveRisk.status] : null;
  const live = status === "live";

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Broker link" title="Connect your funded account" sub="Stream live fills, positions and balance straight into FundedCore — so Risk and Pre-Mortem guard you in real time, not from manual entry." />

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {([["sim", "Simulated feed"], ["tradovate", "Tradovate"]] as const).map(([k, label]) => (
            <button key={k} onClick={() => setProvider(k)} className={`px-3.5 py-2 rounded-lg text-[.82rem] font-medium border transition ${provider === k ? "bg-acc/15 border-acc/40 text-t1" : "border-line2 text-t2 hover:text-t1"}`}>{label}</button>
          ))}
          <span className="ml-auto chip" style={{ color: live ? "var(--grn)" : status === "error" ? "var(--red)" : "var(--t3)" }}>
            <span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: live ? "var(--grn)" : status === "error" ? "var(--red)" : "var(--t3)" }} />
            {status === "idle" ? "not connected" : status === "connecting" ? "connecting…" : status === "live" ? "LIVE" : status}
          </span>
        </div>

        {provider === "tradovate" && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <label><span className="lbl">Username</span><input className="inp" value={creds.name} onChange={(e) => setCreds({ ...creds, name: e.target.value })} autoComplete="off" /></label>
            <label><span className="lbl">Password</span><input type="password" className="inp" value={creds.password} onChange={(e) => setCreds({ ...creds, password: e.target.value })} autoComplete="off" /></label>
            <label><span className="lbl">API Key (cid) · optional</span><input className="inp" value={creds.cid} onChange={(e) => setCreds({ ...creds, cid: e.target.value })} /></label>
            <label><span className="lbl">API Secret (sec) · optional</span><input className="inp" value={creds.sec} onChange={(e) => setCreds({ ...creds, sec: e.target.value })} /></label>
            <label className="flex items-center gap-2 text-[.82rem] text-t2 sm:col-span-2"><input type="checkbox" checked={creds.live} onChange={(e) => setCreds({ ...creds, live: e.target.checked })} /> Live account (uncheck for Tradovate demo)</label>
          </div>
        )}
        {provider === "tradovate" && <div className="text-[.74rem] text-t3 mb-3 flex items-center gap-1.5"><Icon name="shield" size={12} /> Credentials are sent once to fetch a token and are never stored. Tradovate covers Apex, Tradeify, TPT, Lucid, FundedNext, TradeDay, Alpha Futures and more.</div>}

        <div className="flex gap-2">
          {!live ? <button onClick={connect} className="btn btn-primary text-sm">{status === "connecting" ? "Connecting…" : "Connect"}</button>
            : <button onClick={disconnect} className="btn btn-ghost text-sm">Disconnect</button>}
        </div>
        {statusMsg && <p className="text-[.82rem] mt-3" style={{ color: status === "error" ? "var(--red)" : "var(--t2)" }}>{statusMsg}</p>}
      </div>

      {acct && (
        <>
          <div className="grid sm:grid-cols-3 gap-4">
            <StatTile icon={<Icon name="calc" size={15} />} label="Live balance" value={usd(acct.balance)} />
            <StatTile icon={<Icon name="up" size={15} />} label="Day P&L" value={usd(acct.dayPnl)} accent={acct.dayPnl >= 0 ? "var(--grn)" : "var(--red)"} />
            <StatTile icon={<Icon name="bolt" size={15} />} label="Open P&L" value={usd(acct.openPnl)} accent={acct.openPnl >= 0 ? "var(--grn)" : "var(--red)"} />
          </div>

          <div className="grid lg:grid-cols-3 gap-4">
            <Panel title="Live Distance to Breach" icon={<Icon name="shield" />} action={<select className="inp !py-1 text-xs !w-auto" value={firmKey} onChange={(e) => setFirmKey(e.target.value)}>{FIRM_KEYS.map((k) => <option key={k} value={k}>{FIRMS[k].firmBrand}</option>)}</select>}>
              {liveRisk && sm ? (
                <div>
                  <div className="mono text-3xl font-bold" style={{ color: sm.color }}>{usd(Math.max(0, liveRisk.distanceToBreach))}</div>
                  <div className="h-2 rounded-full mt-2" style={{ background: "var(--panel2)" }}><div className="h-full rounded-full" style={{ width: Math.max(0, Math.min(1, liveRisk.pctBuffer)) * 100 + "%", background: sm.color, transition: "width .4s" }} /></div>
                  <div className="text-[.74rem] text-t3 mt-2">updates with every live tick · {sm.label}</div>
                </div>
              ) : <div className="text-t3 text-sm">—</div>}
            </Panel>
            <Panel title="Open positions" icon={<Icon name="grid" />} className="lg:col-span-2">
              {positions.length ? <table className="tbl"><thead><tr><th>Symbol</th><th>Net</th><th>Avg</th><th className="text-right">Open P&L</th></tr></thead><tbody>{positions.map((p, i) => <tr key={i}><td className="mono">{p.symbol}</td><td className="mono" style={{ color: p.net >= 0 ? "var(--grn)" : "var(--red)" }}>{p.net > 0 ? "+" : ""}{p.net}</td><td className="mono">{p.avgPrice.toFixed(2)}</td><td className="text-right mono" style={{ color: p.openPnl >= 0 ? "var(--grn)" : "var(--red)" }}>{usd(p.openPnl)}</td></tr>)}</tbody></table> : <div className="text-t3 text-sm py-3">Flat — no open positions.</div>}
            </Panel>
          </div>

          <Panel title="Live fills" icon={<Icon name="bolt" />}>
            {fills.length ? <div className="text-[.8rem] mono">{fills.map((f) => <div key={f.id} className="flex justify-between py-1.5" style={{ borderTop: "1px solid var(--line)" }}><span style={{ color: f.side === "buy" ? "var(--grn)" : "var(--red)" }}>{f.side.toUpperCase()} {f.qty} {f.symbol}</span><span className="text-t2">@ {f.price.toFixed(2)}</span><span className="text-t3">{new Date(f.t).toLocaleTimeString("en-US", { hour12: false })}</span></div>)}</div> : <div className="text-t3 text-sm py-3">Waiting for fills…</div>}
          </Panel>
        </>
      )}
      <p className="text-[.7rem] text-t3">Tradovate adapter is built to their documented API and pending validation on a live funded account. Rithmic + ProjectX (Topstep) plug into the same connector interface next. Always confirm your firm permits third-party API connections.</p>
    </div>
  );
}
