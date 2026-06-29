"use client";
import { useEffect, useRef, useState } from "react";
import { type Profile } from "../../lib/profile";
import { FIRMS } from "../../lib/firms";
import { assessAccount, STATUS_META, type Account } from "../../lib/risk";
import { saveProfile } from "../../lib/profile";
import { usd } from "../../lib/format";
import { SuiteHeader, Panel, StatTile } from "./ui";
import { Icon } from "../Icon";
import type { BrokerConnector, LiveAccount, LiveAccountInfo, LivePosition, LiveFill, ConnStatus } from "../../lib/connectors/types";
import { MockConnector } from "../../lib/connectors/mock";
import { TradovateConnector } from "../../lib/connectors/tradovate";
import { RithmicConnector } from "../../lib/connectors/rithmic";
import { WebhookConnector } from "../../lib/connectors/webhook";
import { ProjectXConnector } from "../../lib/connectors/projectx";

const FIRM_KEYS = Object.keys(FIRMS);

export function ConnectTab({ profile, setProfile }: { profile: Profile; setProfile?: (p: Profile) => void }) {
  const [provider, setProvider] = useState<"sim" | "tradovate" | "rithmic" | "webhook" | "projectx">("sim");
  const [status, setStatus] = useState<ConnStatus>("idle");
  const [statusMsg, setStatusMsg] = useState("");
  const [acct, setAcct] = useState<LiveAccount | null>(null);
  const [accounts, setAccounts] = useState<LiveAccountInfo[]>([]);
  const [selId, setSelId] = useState<string>("");
  const [syncMsg, setSyncMsg] = useState<string>("");
  const [syncing, setSyncing] = useState(false);
  const [armed, setArmed] = useState(false);
  const [autoFlat, setAutoFlat] = useState(false);
  const [gMsg, setGMsg] = useState("");
  const [flattening, setFlattening] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const firedRef = useRef(false);
  const canceledRef = useRef(false);
  const [positions, setPositions] = useState<LivePosition[]>([]);
  const [fills, setFills] = useState<LiveFill[]>([]);
  const [firmKey, setFirmKey] = useState(profile.accounts[0]?.firmKey || FIRM_KEYS[0]);
  const [creds, setCreds] = useState({ name: "", password: "", cid: "", sec: "", live: false });
  const [rith, setRith] = useState({ gateway: "", systemName: "", user: "", password: "" });
  const [px, setPx] = useState({ userName: "", apiKey: "" });
  const [hookKey] = useState(() => { try { const k = localStorage.getItem("fc-hook-key"); if (k) return k; const n = "fc_" + Math.random().toString(36).slice(2, 12); localStorage.setItem("fc-hook-key", n); return n; } catch { return "fc_demo"; } });
  const conn = useRef<BrokerConnector | null>(null);

  const hookUrl = (typeof window !== "undefined" ? window.location.origin : "") + "/api/connect/hook?key=" + hookKey;
  async function sendTest() {
    try {
      await fetch("/api/connect/hook?key=" + hookKey, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "account", name: "WEBHOOK-TEST", balance: 51200, dayPnl: 200, openPnl: 0 }) });
      await fetch("/api/connect/hook?key=" + hookKey, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ kind: "fill", symbol: "MNQ", side: "buy", qty: 1, price: 18042 }) });
    } catch {}
  }
  function connect() {
    conn.current?.disconnect();
    setAcct(null); setAccounts([]); setSelId(""); setPositions([]); setFills([]); setStatusMsg("");
    const c: BrokerConnector = provider === "sim" ? new MockConnector() : provider === "projectx" ? new ProjectXConnector(px) : provider === "rithmic" ? new RithmicConnector(rith) : provider === "webhook" ? new WebhookConnector(hookKey) : new TradovateConnector(creds);
    conn.current = c;
    c.connect({
      onStatus: (s, m) => { setStatus(s); if (m) setStatusMsg(m); },
      onAccount: (a) => setAcct(a),
      onAccounts: (list) => { setAccounts(list); setSelId((prev) => prev || String((list.find((x) => x.canTrade) || list[0])?.id ?? "")); },
      onPositions: (p) => setPositions(p),
      onFill: (f) => setFills((prev) => [f, ...prev].slice(0, 20)),
    });
  }
  function disconnect() { conn.current?.disconnect(); conn.current = null; setStatus("closed"); setAccounts([]); setSelId(""); }
  function pickAccount(id: string) { setSelId(id); conn.current?.selectAccount?.(id); }
  async function syncAccount() {
    if (!setProfile || !conn.current?.fetchTrades || !acct) return;
    setSyncing(true); setSyncMsg("");
    try {
      const idForTrades = selId || (accounts.find((a) => a.canTrade) || accounts[0])?.id;
      const trades = await conn.current.fetchTrades(idForTrades as any);
      const liveBal = acct.balance + (acct.openPnl || 0);
      const f = FIRMS[firmKey];
      const days = new Set(trades.map((t: any) => t.date)).size || 1;
      const account: Account = { id: "live-" + String(idForTrades), label: acct.name, firmKey, startBalance: f?.start ?? liveBal, balance: liveBal, peakEquity: Math.max(liveBal, f?.start ?? liveBal), todayPnL: acct.dayPnl + (acct.openPnl || 0), daysTraded: days };
      const next = { ...profile, trades: trades as any, accounts: [account], demo: false };
      setProfile(next); saveProfile(next);
      setSyncMsg(`Synced ${trades.length} trades from ${acct.name}. Every module now reads this account.`);
    } catch (e: any) { setSyncMsg(e?.message || "Sync failed — reconnect and try again."); }
    finally { setSyncing(false); }
  }
  async function flattenNow() {
    if (!conn.current?.flatten || !acct) return;
    setFlattening(true); setCountdown(null);
    try { const r = await conn.current.flatten((selId || accounts[0]?.id) as any); setGMsg(`Auto-Guardian flattened ${r.flattened}/${r.attempted} position(s).` + (r.errors?.length ? ` Couldn't close: ${r.errors.join(", ")} — check your platform.` : "")); }
    catch (e: any) { setGMsg(e?.message || "Flatten failed — close your positions manually in your platform NOW."); }
    finally { setFlattening(false); }
  }

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

  // ── Auto-Guardian: derive whether we are at the breach/daily-stop line ──
  const liveEquity = acct ? acct.balance + (acct.openPnl || 0) : 0;
  const dailyNet = acct ? acct.dayPnl + (acct.openPnl || 0) : 0;
  const dailyStopHit = !!acct && profile.settings.dailyLossStop > 0 && dailyNet <= -profile.settings.dailyLossStop;
  const breachDanger = !!liveRisk && (liveRisk.status === "danger" || liveRisk.status === "breached" || liveRisk.pctBuffer <= 0.15);
  const guardianDanger = !!acct && live && (dailyStopHit || breachDanger);
  const guardianReason = dailyStopHit
    ? `Daily loss stop hit — ${usd(dailyNet)} on the day.`
    : (liveRisk ? `Distance to breach critical — ${usd(Math.max(0, liveRisk.distanceToBreach))} of buffer left.` : "Risk line crossed.");

  useEffect(() => { if (!guardianDanger) { firedRef.current = false; canceledRef.current = false; setCountdown(null); } }, [guardianDanger]);
  useEffect(() => {
    if (!(armed && autoFlat && guardianDanger && positions.length)) return;
    if (firedRef.current) return;
    firedRef.current = true; canceledRef.current = false;
    let n = 8; setCountdown(n);
    const iv = setInterval(() => {
      if (canceledRef.current) { clearInterval(iv); setCountdown(null); return; }
      n -= 1; setCountdown(n);
      if (n <= 0) { clearInterval(iv); if (!canceledRef.current) flattenNow(); }
    }, 1000);
    return () => clearInterval(iv);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [armed, autoFlat, guardianDanger, positions.length]);

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Broker link" title="Connect your funded account" sub="Stream live fills, positions and balance straight into FundedCore — so Risk and Pre-Mortem guard you in real time, not from manual entry." />

      <div className="card p-5">
        <div className="flex flex-wrap items-center gap-2 mb-4">
          {([["sim", "Simulated feed"], ["projectx", "TopStep"], ["webhook", "Webhook (any firm)"], ["tradovate", "Tradovate"], ["rithmic", "Rithmic"]] as const).map(([k, label]) => (
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
        {provider === "projectx" && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <label><span className="lbl">TopstepX username</span><input className="inp" value={px.userName} onChange={(e) => setPx({ ...px, userName: e.target.value })} autoComplete="off" /></label>
            <label><span className="lbl">API key</span><input type="password" className="inp" value={px.apiKey} onChange={(e) => setPx({ ...px, apiKey: e.target.value })} autoComplete="off" /></label>
            <div className="sm:col-span-2 text-[.74rem] text-t3 flex items-center gap-1.5"><Icon name="shield" size={12} /> Get your key in TopstepX: Settings → API → Link Account → generate. Requires the ProjectX API subscription. Your key is sent once for a token and never stored.</div>
          </div>
        )}
        {provider === "webhook" && (
          <div className="mb-4">
            <span className="lbl">Your inbox URL — point any bridge (TradersPost, PickMyTrade) or script here</span>
            <div className="flex gap-2 mt-1">
              <input readOnly className="inp mono text-[.78rem]" value={hookUrl} onClick={(e) => (e.target as HTMLInputElement).select()} />
              <button onClick={() => { try { navigator.clipboard.writeText(hookUrl); } catch {} }} className="btn btn-ghost text-sm shrink-0">Copy</button>
              <button onClick={sendTest} className="btn btn-ghost text-sm shrink-0">Send test event</button>
            </div>
            <div className="text-[.74rem] text-t3 mt-2 flex items-center gap-1.5"><Icon name="bolt" size={12} /> POST JSON like {"{ kind:'fill', symbol:'MNQ', side:'buy', qty:1, price:18000 }"} or {"{ kind:'account', balance, dayPnl, openPnl }"}. Connect, then events stream in live.</div>
          </div>
        )}
        {provider === "rithmic" && (
          <div className="grid sm:grid-cols-2 gap-3 mb-4">
            <label><span className="lbl">Gateway URL (wss)</span><input className="inp" value={rith.gateway} onChange={(e) => setRith({ ...rith, gateway: e.target.value })} placeholder="wss://rituz00100.rithmic.com:443" /></label>
            <label><span className="lbl">System name</span><input className="inp" value={rith.systemName} onChange={(e) => setRith({ ...rith, systemName: e.target.value })} /></label>
            <label><span className="lbl">User</span><input className="inp" value={rith.user} onChange={(e) => setRith({ ...rith, user: e.target.value })} autoComplete="off" /></label>
            <label><span className="lbl">Password</span><input type="password" className="inp" value={rith.password} onChange={(e) => setRith({ ...rith, password: e.target.value })} autoComplete="off" /></label>
            <div className="sm:col-span-2 text-[.74rem] text-t3 flex items-center gap-1.5"><Icon name="alert" size={12} /> Rithmic API requires an approved system via their conformance process + protobuf templates. This adapter is ready for them; it won&apos;t stream until those are in place.</div>
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
          {accounts.length > 1 && (
            <div className="card p-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="lbl !mb-0">Account ({accounts.length} found)</span>
                <select className="inp !py-1.5 text-sm !w-auto min-w-[260px]" value={selId} onChange={(e) => pickAccount(e.target.value)}>
                  {accounts.map((a) => (
                    <option key={String(a.id)} value={String(a.id)}>{a.name} — {usd(a.balance)}{a.canTrade ? "" : " · blown/locked"}</option>
                  ))}
                </select>
                {(() => { const cur = accounts.find((a) => String(a.id) === selId); return cur ? (
                  <span className="chip" style={{ color: cur.canTrade ? "var(--grn)" : "var(--red)" }}>
                    <span className="w-1.5 h-1.5 rounded-full" style={{ background: cur.canTrade ? "var(--grn)" : "var(--red)" }} />
                    {cur.canTrade ? "active" : "blown / locked"}
                  </span>
                ) : null; })()}
                <span className="text-[.74rem] text-t3 ml-auto">Switch which funded account FundedCore monitors.</span>
              </div>
            </div>
          )}
          {provider === "projectx" && setProfile && (
            <div className="card p-4 flex flex-wrap items-center gap-3">
              <div>
                <div className="font-semibold text-t1 text-[.95rem]">Make the whole app read this account</div>
                <div className="text-[.78rem] text-t3">Pulls your real trade history into FundedCore so Score, Mirror, Edge, Gate, Insights & Risk all read your account — not demo data.</div>
              </div>
              <button onClick={syncAccount} disabled={syncing} className="btn btn-primary text-sm ml-auto shrink-0">{syncing ? "Syncing…" : "Sync my account →"}</button>
              {syncMsg && <div className="w-full text-[.82rem]" style={{ color: syncMsg.startsWith("Synced") ? "var(--grn)" : "var(--red)" }}>{syncMsg}</div>}
            </div>
          )}
          {provider === "projectx" && (
            <div className="card p-5" style={{ borderColor: armed ? (guardianDanger ? "rgba(239,68,68,.5)" : "rgba(52,211,153,.4)") : undefined }}>
              <div className="flex flex-wrap items-center gap-3">
                <Icon name="shield" size={18} />
                <div>
                  <div className="font-semibold text-t1">Auto-Guardian <span className="text-[.7rem] font-bold ml-1" style={{ color: "var(--acc)" }}>KILL-SWITCH</span></div>
                  <div className="text-[.78rem] text-t3">Watches your live breach line + daily stop. When you cross it, it flattens you out — before the account does.</div>
                </div>
                <label className="ml-auto flex items-center gap-2 text-[.82rem] text-t2 cursor-pointer">
                  <input type="checkbox" checked={armed} onChange={(e) => { setArmed(e.target.checked); setGMsg(""); }} /> {armed ? "Armed" : "Arm"}
                </label>
              </div>
              {armed && (
                <div className="mt-3 flex flex-wrap items-center gap-4">
                  <label className="flex items-center gap-2 text-[.8rem] text-t2 cursor-pointer"><input type="checkbox" checked={autoFlat} onChange={(e) => setAutoFlat(e.target.checked)} /> Auto-flatten when I cross the line (8s countdown to cancel)</label>
                  {!guardianDanger && <span className="chip" style={{ color: "var(--grn)" }}><span className="w-1.5 h-1.5 rounded-full" style={{ background: "var(--grn)" }} /> watching · you're clear</span>}
                </div>
              )}
              {armed && guardianDanger && (
                <div className="mt-4 rounded-xl p-4" style={{ background: "rgba(239,68,68,.10)", border: "1px solid rgba(239,68,68,.4)" }}>
                  <div className="font-bold text-[1.05rem]" style={{ color: "var(--red)" }}>⛔ LOCKDOWN — {guardianReason}</div>
                  <div className="text-[.82rem] text-t2 mt-1">{positions.length ? `${positions.length} open position(s).` : "No open positions."} Stop trading now.</div>
                  <div className="flex items-center gap-2 mt-3">
                    {positions.length > 0 && <button onClick={flattenNow} disabled={flattening} className="btn text-sm" style={{ background: "var(--red)", color: "#fff" }}>{flattening ? "Flattening…" : countdown != null ? `Flatten in ${countdown}s` : "Flatten all now"}</button>}
                    {countdown != null && <button onClick={() => { canceledRef.current = true; setCountdown(null); }} className="btn btn-ghost text-sm">Cancel</button>}
                  </div>
                </div>
              )}
              {gMsg && <div className="mt-3 text-[.82rem]" style={{ color: gMsg.includes("flattened") ? "var(--grn)" : "var(--red)" }}>{gMsg}</div>}
              <div className="text-[.68rem] text-t3 mt-3">Flatten places real closing orders through your broker. Pending live validation — always confirm in your platform. FundedCore never opens trades, only closes to protect the account.</div>
            </div>
          )}
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
              {positions.length ? <div className="overflow-x-auto"><table className="tbl"><thead><tr><th>Symbol</th><th>Net</th><th>Avg</th><th className="text-right">Open P&L</th></tr></thead><tbody>{positions.map((p, i) => <tr key={i}><td className="mono">{p.symbol}</td><td className="mono" style={{ color: p.net >= 0 ? "var(--grn)" : "var(--red)" }}>{p.net > 0 ? "+" : ""}{p.net}</td><td className="mono">{p.avgPrice.toFixed(2)}</td><td className="text-right mono" style={{ color: p.openPnl >= 0 ? "var(--grn)" : "var(--red)" }}>{usd(p.openPnl)}</td></tr>)}</tbody></table></div> : <div className="text-t3 text-sm py-3">Flat — no open positions.</div>}
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
