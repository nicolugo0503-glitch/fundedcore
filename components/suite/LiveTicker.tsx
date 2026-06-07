"use client";
import { useEffect, useRef, useState } from "react";

type Q = { key: string; label: string; price: number; changePct: number; source: string };

function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 100) return n.toLocaleString("en-US", { maximumFractionDigits: 1 });
  return n.toLocaleString("en-US", { maximumFractionDigits: n < 10 ? 3 : 2 });
}

export function LiveTicker() {
  const [quotes, setQuotes] = useState<Q[]>([]);
  const prev = useRef<Record<string, number>>({});
  const [flash, setFlash] = useState<Record<string, "up" | "dn">>({});

  useEffect(() => {
    let alive = true;
    async function load() {
      try {
        const r = await fetch("/api/quotes", { cache: "no-store" });
        const j = await r.json();
        if (!alive || !j?.quotes) return;
        const f: Record<string, "up" | "dn"> = {};
        for (const q of j.quotes as Q[]) {
          const p = prev.current[q.key];
          if (p != null && q.price !== p) f[q.key] = q.price > p ? "up" : "dn";
          prev.current[q.key] = q.price;
        }
        setQuotes(j.quotes);
        setFlash(f);
        setTimeout(() => alive && setFlash({}), 700);
      } catch { /* ignore */ }
    }
    load();
    const id = setInterval(load, 25000);
    return () => { alive = false; clearInterval(id); };
  }, []);

  if (!quotes.length) {
    return (
      <div className="livetape">
        <div className="flex gap-8 px-4 py-[.42rem] opacity-50">
          {Array.from({ length: 6 }).map((_, i) => <div key={i} className="skeleton" style={{ width: 110, height: 13 }} />)}
        </div>
      </div>
    );
  }

  const Row = ({ k }: { k: string }) => (
    <div className="inline-flex gap-8">
      {quotes.map((q) => {
        const up = q.changePct >= 0;
        const fl = flash[q.key];
        return (
          <span key={k + q.key} className="inline-flex items-center gap-2 text-[.74rem]">
            <span className="text-t3 font-medium">{q.label}</span>
            <span className="mono" style={{ color: fl === "up" ? "var(--grn)" : fl === "dn" ? "var(--red)" : "var(--t1)", transition: "color .25s" }}>
              {fmtPrice(q.price)}
            </span>
            <span className="mono" style={{ color: up ? "var(--grn)" : "var(--red)" }}>
              {up ? "▲" : "▼"} {Math.abs(q.changePct).toFixed(2)}%
            </span>
          </span>
        );
      })}
    </div>
  );

  return (
    <div className="livetape">
      <div className="ticker">
        <Row k="a" /><Row k="b" />
      </div>
    </div>
  );
}
