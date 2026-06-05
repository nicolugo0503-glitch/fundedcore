"use client";
import { useEffect, useState } from "react";
import { MARKET_SYMBOLS } from "../lib/market";

type Q = { s: string; last: number; chg: number };

export function Ticker() {
  const [qs, setQs] = useState<Q[]>([]);
  useEffect(() => {
    let dead = false;
    (async () => {
      const out: Q[] = [];
      await Promise.all(Object.keys(MARKET_SYMBOLS).map(async (s) => {
        try {
          const d = await fetch(`/api/market?symbol=${s}&interval=5m&range=1d`).then((r) => r.json());
          const cs = d.candles;
          if (cs?.length) out.push({ s, last: cs[cs.length - 1].c, chg: (cs[cs.length - 1].c - cs[0].o) / cs[0].o });
        } catch {}
      }));
      if (!dead && out.length) setQs(out.sort((a, b) => a.s.localeCompare(b.s)));
    })();
    return () => { dead = true; };
  }, []);

  if (!qs.length) return null;
  const items = [...qs, ...qs]; // doubled for seamless loop
  return (
    <div className="ticker-wrap relative z-20">
      <div className="ticker">
        {items.map((q, i) => (
          <span key={i} className="mono text-[.78rem] inline-flex items-center gap-2">
            <span className="text-t2 font-semibold">{q.s}</span>
            <span>{q.last >= 1000 ? q.last.toFixed(2) : q.last.toFixed(2)}</span>
            <span style={{ color: q.chg >= 0 ? "#34D399" : "#F87171" }}>
              {q.chg >= 0 ? "▲" : "▼"} {Math.abs(q.chg * 100).toFixed(2)}%
            </span>
          </span>
        ))}
      </div>
    </div>
  );
}
