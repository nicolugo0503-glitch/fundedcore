"use client";
import { useEffect, useRef, useState } from "react";
import { SuiteHeader } from "./ui";

type Trade = { id: number; price: number; qty: number; sell: boolean; t: number };
type Level = [number, number]; // [price, qty]

const SYMS: { key: string; label: string; stream: string; dp: number }[] = [
  { key: "BTC", label: "BTC / USDT", stream: "btcusdt", dp: 1 },
  { key: "ETH", label: "ETH / USDT", stream: "ethusdt", dp: 2 },
  { key: "SOL", label: "SOL / USDT", stream: "solusdt", dp: 2 },
];

function fmt(n: number, dp: number) { return n.toLocaleString("en-US", { minimumFractionDigits: dp, maximumFractionDigits: dp }); }
function qty(n: number) { return n >= 1 ? n.toFixed(3) : n.toFixed(4); }

export function LiveFlowTab() {
  const [sym, setSym] = useState(SYMS[0]);
  const [trades, setTrades] = useState<Trade[]>([]);
  const [bids, setBids] = useState<Level[]>([]);
  const [asks, setAsks] = useState<Level[]>([]);
  const [last, setLast] = useState<number | null>(null);
  const [dir, setDir] = useState<"up" | "dn" | null>(null);
  const [connected, setConnected] = useState(false);
  const idRef = useRef(0);
  const prev = useRef<number | null>(null);

  useEffect(() => {
    setTrades([]); setBids([]); setAsks([]); setLast(null); setConnected(false);
    let ws: WebSocket | null = null; let retry: any;
    const streams = `${sym.stream}@aggTrade/${sym.stream}@depth20@100ms`;
    function connect() {
      ws = new WebSocket(`wss://stream.binance.com:9443/stream?streams=${streams}`);
      ws.onopen = () => setConnected(true);
      ws.onclose = () => { setConnected(false); retry = setTimeout(connect, 4000); };
      ws.onerror = () => { try { ws?.close(); } catch {} };
      ws.onmessage = (ev) => {
        try {
          const m = JSON.parse(ev.data); const d = m?.data; if (!d) return;
          if (m.stream.endsWith("@aggTrade")) {
            const price = parseFloat(d.p), q = parseFloat(d.q), sell = !!d.m;
            setLast((p) => { if (p != null) setDir(price > p ? "up" : price < p ? "dn" : dir); return price; });
            prev.current = price;
            setTrades((t) => [{ id: idRef.current++, price, qty: q, sell, t: d.T }, ...t].slice(0, 28));
          } else {
            // depth20: partial book snapshot
            if (d.bids) setBids((d.bids as string[][]).map((b) => [parseFloat(b[0]), parseFloat(b[1])] as Level).filter((x) => x[1] > 0).slice(0, 12));
            if (d.asks) setAsks((d.asks as string[][]).map((a) => [parseFloat(a[0]), parseFloat(a[1])] as Level).filter((x) => x[1] > 0).slice(0, 12));
          }
        } catch { /* ignore */ }
      };
    }
    connect();
    return () => { clearTimeout(retry); try { ws?.close(); } catch {} };
  }, [sym]);

  // cumulative depth for bar widths
  const cum = (levels: Level[]) => { let s = 0; return levels.map((l) => { s += l[0] * l[1]; return s; }); };
  const bidCum = cum(bids), askCum = cum(asks);
  const maxCum = Math.max(bidCum[bidCum.length - 1] || 0, askCum[askCum.length - 1] || 0, 1);
  const asksView = asks.slice().reverse(); const asksCumView = askCum.slice().reverse();

  const spread = asks[0] && bids[0] ? asks[0][0] - bids[0][0] : null;

  return (
    <div>
      <SuiteHeader
        eyebrow="Real-time order flow"
        title={<>Live Order Flow {connected ? <span className="text-grn text-[.7rem] align-middle ml-1">● LIVE</span> : <span className="text-amb text-[.7rem] align-middle ml-1">○ connecting…</span>}</>}
        sub="Every print and every resting order, streaming tick-by-tick from Binance — real exchange data, no delay."
        right={
          <div className="flex gap-1.5">
            {SYMS.map((s) => (
              <button key={s.key} onClick={() => setSym(s)} className={`px-3 py-1.5 rounded-lg text-[.78rem] font-medium border transition ${sym.key === s.key ? "bg-acc/15 border-acc/40 text-t1" : "border-line2 text-t2 hover:text-t1"}`}>{s.key}</button>
            ))}
          </div>
        }
      />

      <div className="mb-5 flex items-end gap-4 flex-wrap">
        <div>
          <div className="lbl">{sym.label} · last</div>
          <div className="mono text-[2.4rem] font-bold leading-none" style={{ color: dir === "up" ? "var(--grn)" : dir === "dn" ? "var(--red)" : "var(--t1)", transition: "color .15s" }}>
            {last != null ? fmt(last, sym.dp) : "—"}
          </div>
        </div>
        {spread != null && <div className="card px-4 py-2"><div className="lbl mb-0">Spread</div><div className="mono text-[.95rem]">{fmt(spread, sym.dp)}</div></div>}
      </div>

      <div className="grid lg:grid-cols-2 gap-5">
        {/* ORDER BOOK */}
        <section className="card p-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
            <h3 className="font-semibold text-[.92rem]">Order book</h3>
            <span className="text-[.66rem] text-t3 uppercase tracking-wide">price · size · total</span>
          </div>
          <div className="p-2 text-[.76rem] mono">
            {asks.length === 0 && <div className="py-10 text-center text-t3">Waiting for book…</div>}
            {asksView.map((l, i) => {
              const w = (asksCumView[i] / maxCum) * 100;
              return (
                <div key={"a" + i} className="relative flex justify-between px-3 py-[3px]">
                  <div className="absolute inset-y-0 right-0" style={{ width: `${w}%`, background: "rgba(220,38,38,.12)" }} />
                  <span className="relative" style={{ color: "var(--red)" }}>{fmt(l[0], sym.dp)}</span>
                  <span className="relative text-t2">{qty(l[1])}</span>
                </div>
              );
            })}
            {last != null && (
              <div className="px-3 py-1.5 my-1 text-center text-[.8rem] font-bold" style={{ background: "var(--panel2)", color: dir === "dn" ? "var(--red)" : "var(--grn)" }}>
                {fmt(last, sym.dp)} {dir === "up" ? "▲" : dir === "dn" ? "▼" : ""}
              </div>
            )}
            {bids.map((l, i) => {
              const w = (bidCum[i] / maxCum) * 100;
              return (
                <div key={"b" + i} className="relative flex justify-between px-3 py-[3px]">
                  <div className="absolute inset-y-0 right-0" style={{ width: `${w}%`, background: "rgba(22,163,74,.12)" }} />
                  <span className="relative" style={{ color: "var(--grn)" }}>{fmt(l[0], sym.dp)}</span>
                  <span className="relative text-t2">{qty(l[1])}</span>
                </div>
              );
            })}
          </div>
        </section>

        {/* TIME & SALES */}
        <section className="card p-0 overflow-hidden">
          <div className="px-5 py-3 flex items-center justify-between" style={{ borderBottom: "1px solid var(--line)" }}>
            <h3 className="font-semibold text-[.92rem]">Time &amp; sales</h3>
            <span className="text-[.66rem] text-t3 uppercase tracking-wide">price · size · time</span>
          </div>
          <div className="p-2 text-[.76rem] mono">
            {trades.length === 0 && <div className="py-10 text-center text-t3">Waiting for prints…</div>}
            {trades.map((t) => (
              <div key={t.id} className="relative flex justify-between px-3 py-[3px] tradein">
                <div className="absolute inset-0" style={{ background: t.sell ? "rgba(220,38,38,.06)" : "rgba(22,163,74,.06)" }} />
                <span className="relative" style={{ color: t.sell ? "var(--red)" : "var(--grn)" }}>{fmt(t.price, sym.dp)}</span>
                <span className="relative text-t2">{qty(t.qty)}</span>
                <span className="relative text-t3">{new Date(t.t).toLocaleTimeString("en-US", { hour12: false })}</span>
              </div>
            ))}
          </div>
        </section>
      </div>
    </div>
  );
}
