"use client";
import { useEffect, useRef, useState } from "react";

type Q = { key: string; label: string; price: number; changePct: number; source: string };

function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 3 : 2 });
}
function gauss() { const u = Math.max(1e-9, Math.random()), v = Math.random(); return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v); }
// per-symbol intraday volatility (fraction per ~1.5s tick)
const VOL: Record<string, number> = { BTC: 0.0006, ETH: 0.0007, VIX: 0.0009, WTI: 0.0005, NDX: 0.0003, SPX: 0.0002, DJI: 0.0002, RUT: 0.0004, US10Y: 0.0005, DXY: 0.0002, EURUSD: 0.0002, GOLD: 0.0003 };

function Spark({ pts, up }: { pts: number[]; up: boolean }) {
  if (pts.length < 2) return <span style={{ width: 46, display: "inline-block" }} />;
  const w = 46, h = 16, min = Math.min(...pts), max = Math.max(...pts), rng = max - min || 1;
  const d = pts.map((p, i) => `${(i / (pts.length - 1)) * w},${h - ((p - min) / rng) * (h - 2) - 1}`).join(" ");
  const col = up ? "var(--grn)" : "var(--red)";
  return (
    <svg width={w} height={h} style={{ display: "inline-block", verticalAlign: "middle" }}>
      <polyline points={d} fill="none" stroke={col} strokeWidth="1.3" strokeLinejoin="round" strokeLinecap="round" opacity="0.85" />
    </svg>
  );
}

export function LiveTicker() {
  const [base, setBase] = useState<Q[]>([]);
  const [live, setLive] = useState<Record<string, number>>({});
  const [hist, setHist] = useState<Record<string, number[]>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "dn">>({});
  const baseRef = useRef<Q[]>([]);
  const liveRef = useRef<Record<string, number>>({});

  // Real data every 25s.
  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/quotes", { cache: "no-store" });
        const j = await r.json();
        if (!alive || !j?.quotes) return;
        const qs = j.quotes as Q[];
        baseRef.current = qs;
        setBase(qs);
        const lv: Record<string, number> = {};
        setHist((h) => {
          const nh = { ...h };
          for (const q of qs) { lv[q.key] = q.price; nh[q.key] = (nh[q.key] || []).concat(q.price).slice(-26); if (nh[q.key].length < 2) nh[q.key] = [q.price * 0.999, q.price]; }
          return nh;
        });
        liveRef.current = lv;
        setLive(lv);
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 25000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  // Micro-stream between refreshes: drift every 1.5s so it never sits still.
  useEffect(() => {
    const id = setInterval(() => {
      const bs = baseRef.current; if (!bs.length) return;
      const lv = { ...liveRef.current };
      const f: Record<string, "up" | "dn"> = {};
      const nh: Record<string, number[]> = {};
      setHist((prevH) => {
        for (const q of bs) {
          const cur = lv[q.key] ?? q.price;
          const vol = VOL[q.key] ?? 0.0003;
          // gentle pull back toward the real price so we never wander off
          const pull = (q.price - cur) * 0.05;
          const next = Math.max(0.0001, cur + cur * gauss() * vol + pull);
          if (Math.abs(next - cur) > cur * 1e-6) f[q.key] = next > cur ? "up" : "dn";
          lv[q.key] = next;
          nh[q.key] = (prevH[q.key] || [q.price]).concat(next).slice(-26);
        }
        return { ...prevH, ...nh };
      });
      liveRef.current = lv;
      setLive(lv);
      setFlash(f);
      setTimeout(() => setFlash({}), 600);
    }, 1500);
    return () => clearInterval(id);
  }, []);

  if (!base.length) {
    return (
      <div className="livetape"><div className="flex gap-8 px-4 py-[.42rem] opacity-50">
        {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 130, height: 14 }} />)}
      </div></div>
    );
  }

  const Row = ({ k }: { k: string }) => (
    <div className="inline-flex gap-7">
      {base.map((q) => {
        const up = q.changePct >= 0;
        const price = live[q.key] ?? q.price;
        const fl = flash[q.key];
        return (
          <span key={k + q.key} className="inline-flex items-center gap-2 text-[.74rem]">
            <span className="text-t3 font-medium">{q.label}</span>
            <Spark pts={hist[q.key] || []} up={up} />
            <span className="mono" style={{ color: fl === "up" ? "var(--grn)" : fl === "dn" ? "var(--red)" : "var(--t1)", transition: "color .2s" }}>{fmtPrice(price)}</span>
            <span className="mono" style={{ color: up ? "var(--grn)" : "var(--red)" }}>{up ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%</span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="livetape">
      <span className="livedot" title="Streaming"><span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: "var(--grn)" }} /> LIVE</span>
      <div className="ticker"><Row k="a" /><Row k="b" /></div>
    </div>
  );
}
