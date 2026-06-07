"use client";
import { useEffect, useRef, useState } from "react";

type Q = { key: string; label: string; price: number; changePct: number; source: string };

function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 3 : 2 });
}

// Crypto symbols stream live tick-by-tick from Binance's free public websocket.
const BINANCE: Record<string, string> = { BTC: "btcusdt", ETH: "ethusdt", SOL: "solusdt" };

function Spark({ pts, up }: { pts: number[]; up: boolean }) {
  if (pts.length < 2) return <span style={{ width: 46, display: "inline-block" }} />;
  const w = 46, h = 16, min = Math.min(...pts), max = Math.max(...pts), rng = max - min || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - min) / rng) * (h - 2) - 1}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points={d} fill="none" stroke={up ? "var(--grn)" : "var(--red)"} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function LiveTicker() {
  const [quotes, setQuotes] = useState<Record<string, Q>>({});
  const [order, setOrder] = useState<string[]>([]);
  const [hist, setHist] = useState<Record<string, number[]>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "dn">>({});
  const [streaming, setStreaming] = useState(false);
  const prevPrice = useRef<Record<string, number>>({});

  function ingest(key: string, label: string, price: number, changePct: number, source: string) {
    const p = prevPrice.current[key];
    if (p != null && price !== p) {
      setFlash((f) => ({ ...f, [key]: price > p ? "up" : "dn" }));
      setTimeout(() => setFlash((f) => { const n = { ...f }; delete n[key]; return n; }), 600);
    }
    prevPrice.current[key] = price;
    setQuotes((q) => ({ ...q, [key]: { key, label, price, changePct, source } }));
    setHist((h) => ({ ...h, [key]: (h[key] || []).concat(price).slice(-26) }));
  }

  // Real Yahoo snapshots every 15s (all symbols).
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/quotes", { cache: "no-store" });
        const j = await r.json();
        if (!alive || !j?.quotes) return;
        const qs = j.quotes as Q[];
        setOrder((o) => (o.length ? o : qs.map((q) => q.key)));
        for (const q of qs) {
          // crypto handled by the live websocket; don't overwrite it with the 15s snapshot
          if (BINANCE[q.key] && streamingRef.current) continue;
          ingest(q.key, q.label, q.price, q.changePct, q.source);
        }
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 15000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Live crypto stream — genuinely real-time, no API key.
  const streamingRef = useRef(false);
  useEffect(() => {
    const labels: Record<string, string> = { BTC: "Bitcoin", ETH: "Ethereum", SOL: "Solana" };
    const streams = Object.values(BINANCE).map((s) => `${s}@ticker`).join("/");
    const HOSTS = ["stream.binance.com:9443", "stream.binance.us:9443"]; // .us fallback (US geo-block)
    let hostIdx = 0;
    let ws: WebSocket | null = null;
    let retry: any;
    function connect() {
      try {
        ws = new WebSocket(`wss://${HOSTS[hostIdx]}/stream?streams=${streams}`);
        ws.onopen = () => { streamingRef.current = true; setStreaming(true); };
        ws.onmessage = (ev) => {
          try {
            const m = JSON.parse(ev.data);
            const d = m?.data; if (!d) return;
            const sym = (d.s || "").toLowerCase();
            const key = Object.keys(BINANCE).find((k) => BINANCE[k] === sym);
            if (!key) return;
            ingest(key, labels[key] || key, parseFloat(d.c), parseFloat(d.P), "live");
          } catch { /* ignore */ }
        };
        ws.onclose = () => { streamingRef.current = false; setStreaming(false); hostIdx = (hostIdx + 1) % HOSTS.length; retry = setTimeout(connect, 2000); };
        ws.onerror = () => { try { ws?.close(); } catch {} };
      } catch { /* ignore */ }
    }
    connect();
    return () => { clearTimeout(retry); streamingRef.current = false; try { ws?.close(); } catch {} };
  }, []);

  const list = order.map((k) => quotes[k]).filter(Boolean) as Q[];
  if (!list.length) {
    return (
      <div className="livetape"><div className="flex gap-8 px-4 py-[.42rem] opacity-50">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 130, height: 14 }} />)}
      </div></div>
    );
  }

  const Row = ({ k }: { k: string }) => (
    <div className="inline-flex gap-7">
      {list.map((q) => {
        const up = q.changePct >= 0;
        const fl = flash[q.key];
        const isStream = !!BINANCE[q.key] && streaming;
        return (
          <span key={k + q.key} className="inline-flex items-center gap-2 text-[.74rem]">
            <span className="text-t3 font-medium">{q.label}{isStream && <span style={{ color: "var(--grn)" }}> •</span>}</span>
            <Spark pts={hist[q.key] || []} up={up} />
            <span className="mono" style={{ color: fl === "up" ? "var(--grn)" : fl === "dn" ? "var(--red)" : "var(--t1)", transition: "color .2s" }}>{fmtPrice(q.price)}</span>
            <span className="mono" style={{ color: up ? "var(--grn)" : "var(--red)" }}>{up ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="livetape">
      <span className="livedot" title={streaming ? "Crypto streaming live · stocks 15s" : "Real snapshots every 15s"}>
        <span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: streaming ? "var(--grn)" : "var(--amb)" }} /> {streaming ? "LIVE" : "REAL"}
      </span>
      <div className="ticker"><Row k="a" /><Row k="b" /></div>
    </div>
  );
}
