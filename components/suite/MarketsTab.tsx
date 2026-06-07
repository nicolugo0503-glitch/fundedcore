"use client";
import { useEffect, useState } from "react";
import { MARKET_CATALOG, CAT_ORDER, type Candle } from "../../lib/market";
import { SuiteHeader, Panel } from "./ui";

type Q = { key: string; label: string; cat: string; candles: Candle[]; last: number; chg: number; chgAbs: number; source: string };

function Spark({ data, color }: { data: number[]; color: string }) {
  if (data.length < 2) return null;
  const w = 120, h = 34, lo = Math.min(...data), hi = Math.max(...data), span = hi - lo || 1;
  const pts = data.map((v, i) => `${(i / (data.length - 1)) * w},${h - ((v - lo) / span) * h}`).join(" ");
  return (
    <svg width={w} height={h} viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="shrink-0">
      <polyline points={pts} fill="none" stroke={color} strokeWidth="1.6" />
    </svg>
  );
}

function fmtPrice(n: number) {
  if (n >= 1000) return n.toLocaleString("en-US", { maximumFractionDigits: 0 });
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
}

export function MarketsTab() {
  const [quotes, setQuotes] = useState<Record<string, Q>>({});
  const [sel, setSel] = useState("SPX");
  const [loading, setLoading] = useState(true);
  const [live, setLive] = useState(false);

  useEffect(() => {
    let dead = false;
    (async () => {
      const out: Record<string, Q> = {};
      // batch in groups of 4 to be gentle
      for (let i = 0; i < MARKET_CATALOG.length; i += 4) {
        const batch = MARKET_CATALOG.slice(i, i + 4);
        await Promise.all(batch.map(async (c) => {
          try {
            const d = await fetch(`/api/market?symbol=${c.key}&interval=1h&range=1mo`).then((r) => r.json());
            const cs: Candle[] = d.candles || [];
            if (cs.length) {
              const last = cs[cs.length - 1].c, first = cs[0].o;
              out[c.key] = { key: c.key, label: c.label, cat: c.cat, candles: cs, last, chg: (last - first) / first, chgAbs: last - first, source: d.source };
              if (d.source === "live") setLive(true);
            }
          } catch {}
        }));
        if (!dead) setQuotes({ ...out });
      }
      if (!dead) setLoading(false);
    })();
    return () => { dead = true; };
  }, []);

  const selQ = quotes[sel];

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow="Markets" title="Market summary"
        sub="Live indices, crypto, commodities and rates — real data, refreshed continuously."
        right={<span className="chip" style={{ borderColor: live ? "#34D39955" : "#FBBF2455", color: live ? "#34D399" : "#FBBF24" }}>
          <span className="w-1.5 h-1.5 rounded-full pulse" style={{ background: live ? "#34D399" : "#FBBF24" }} /> {live ? "live feed" : loading ? "loading…" : "delayed"}
        </span>} />

      {/* hero chart */}
      <Panel accent="#5B8CFF">
        {selQ ? (
          <div>
            <div className="flex items-baseline justify-between flex-wrap gap-2">
              <div>
                <div className="text-[1.1rem] font-semibold">{selQ.label}</div>
                <div className="flex items-baseline gap-3 mt-1">
                  <span className="mono text-3xl font-bold">{fmtPrice(selQ.last)}</span>
                  <span className="mono text-sm" style={{ color: selQ.chg >= 0 ? "#34D399" : "#F87171" }}>
                    {selQ.chg >= 0 ? "▲" : "▼"} {fmtPrice(Math.abs(selQ.chgAbs))} ({(selQ.chg * 100).toFixed(2)}%)
                  </span>
                </div>
              </div>
              <span className="text-[.7rem] text-t3">past month · hourly</span>
            </div>
            <HeroChart data={selQ.candles} up={selQ.chg >= 0} />
          </div>
        ) : <div className="py-16 text-center text-t3">Loading market data…</div>}
      </Panel>

      {/* category grids */}
      {CAT_ORDER.map((cat) => {
        const items = MARKET_CATALOG.filter((c) => c.cat === cat);
        return (
          <Panel key={cat} title={cat} accent="#8B5CF6">
            <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-2.5">
              {items.map((c) => {
                const q = quotes[c.key];
                const color = !q ? "#64748B" : q.chg >= 0 ? "#34D399" : "#F87171";
                return (
                  <button key={c.key} onClick={() => q && setSel(c.key)}
                    className={`rounded-xl border p-3 text-left flex items-center justify-between gap-2 transition ${sel === c.key ? "border-acc/50 bg-acc/[.06]" : "border-white/[.08] bg-white/[.02] hover:border-white/[.18]"}`}>
                    <div className="min-w-0">
                      <div className="text-[.84rem] font-medium truncate">{c.label}</div>
                      {q ? <div className="mono text-[.82rem] text-t2">{fmtPrice(q.last)}</div> : <div className="text-[.72rem] text-t3">—</div>}
                    </div>
                    {q && <Spark data={q.candles.map((x) => x.c)} color={color} />}
                    <div className="text-right shrink-0 w-16">
                      {q ? <span className="mono text-[.8rem] font-semibold" style={{ color }}>{q.chg >= 0 ? "+" : ""}{(q.chg * 100).toFixed(2)}%</span> : <span className="text-t3 text-xs">…</span>}
                    </div>
                  </button>
                );
              })}
            </div>
          </Panel>
        );
      })}
      <p className="text-[.7rem] text-t3">Data via public market feed, may be delayed. For context, not execution.</p>
    </div>
  );
}

function HeroChart({ data, up }: { data: Candle[]; up: boolean }) {
  const w = 900, h = 240, pad = 8;
  const closes = data.map((c) => c.c);
  const lo = Math.min(...closes), hi = Math.max(...closes), span = hi - lo || 1;
  const x = (i: number) => pad + (i / (closes.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / span) * (h - pad * 2);
  const line = closes.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const col = up ? "#34D399" : "#F87171";
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" className="mt-3" style={{ display: "block" }}>
      <defs><linearGradient id="mh" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stopColor={col} stopOpacity=".25" /><stop offset="100%" stopColor={col} stopOpacity="0" /></linearGradient></defs>
      <path d={`${line} L${x(closes.length - 1)},${h - pad} L${x(0)},${h - pad} Z`} fill="url(#mh)" />
      <path d={line} fill="none" stroke={col} strokeWidth="2" />
    </svg>
  );
}
