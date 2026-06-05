"use client";
import { useEffect, useRef, useState, useCallback } from "react";
import { type Profile } from "../../lib/profile";
import { MARKET_SYMBOLS, rootSymbol, ema, vwap, type Candle } from "../../lib/market";
import { analyze } from "../../lib/insights";

type Feed = { source: string; symbol: string; label: string; candles: Candle[] };
type NewsEv = { title: string; date: string };

const INTERVALS = [["5m", "1d"], ["15m", "5d"], ["1h", "1mo"], ["1d", "6mo"]] as const;

export function ChartsTab({ profile }: { profile: Profile }) {
  const [symbol, setSymbol] = useState("NQ");
  const [iv, setIv] = useState(0);
  const [feed, setFeed] = useState<Feed | null>(null);
  const [quotes, setQuotes] = useState<Record<string, { last: number; chg: number }>>({});
  const [news, setNews] = useState<NewsEv[]>([]);
  const [overlays, setOverlays] = useState({ trades: true, hours: true, news: true, vwap: true, emas: true });
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [hover, setHover] = useState<number | null>(null);

  // load chart + quotes + news
  useEffect(() => {
    const [interval, range] = INTERVALS[iv];
    setFeed(null);
    fetch(`/api/market?symbol=${symbol}&interval=${interval}&range=${range}`)
      .then((r) => r.json()).then(setFeed).catch(() => setFeed(null));
  }, [symbol, iv]);
  useEffect(() => {
    let dead = false;
    (async () => {
      const out: Record<string, { last: number; chg: number }> = {};
      await Promise.all(Object.keys(MARKET_SYMBOLS).map(async (s) => {
        try {
          const d: Feed = await fetch(`/api/market?symbol=${s}&interval=5m&range=1d`).then((r) => r.json());
          const cs = d.candles;
          if (cs?.length) out[s] = { last: cs[cs.length - 1].c, chg: (cs[cs.length - 1].c - cs[0].o) / cs[0].o };
        } catch {}
      }));
      if (!dead) setQuotes(out);
    })();
    fetch("/api/news").then((r) => r.json()).then((d) => setNews(d.events || [])).catch(() => {});
    return () => { dead = true; };
  }, []);

  const ins = profile.trades.length >= 10 ? analyze(profile.trades) : null;
  const myTrades = profile.trades.filter((t) => rootSymbol(t.symbol) === symbol);

  // ── canvas renderer ────────────────────────────────────────────────────────
  const draw = useCallback(() => {
    const cv = canvasRef.current; if (!cv || !feed?.candles?.length) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.clientWidth, H = cv.clientHeight;
    cv.width = W * dpr; cv.height = H * dpr;
    const g = cv.getContext("2d"); if (!g) return;
    g.scale(dpr, dpr); g.clearRect(0, 0, W, H);

    const cs = feed.candles;
    const padL = 8, padR = 56, padT = 10, volH = 42, padB = 22;
    const chartH = H - padT - volH - padB;
    const n = cs.length;
    const bw = (W - padL - padR) / n;
    const lo = Math.min(...cs.map((c) => c.l));
    const hi = Math.max(...cs.map((c) => c.h));
    const span = hi - lo || 1;
    const x = (i: number) => padL + i * bw + bw / 2;
    const y = (p: number) => padT + (1 - (p - lo) / span) * chartH;
    const maxV = Math.max(...cs.map((c) => c.v), 1);

    // grid + price axis
    g.strokeStyle = "rgba(255,255,255,.05)"; g.fillStyle = "#64748B"; g.font = "10px JetBrains Mono, monospace"; g.textAlign = "left";
    for (let k = 0; k <= 4; k++) {
      const p = lo + (span * k) / 4; const yy = y(p);
      g.beginPath(); g.moveTo(padL, yy); g.lineTo(W - padR, yy); g.stroke();
      g.fillText(p >= 1000 ? p.toFixed(0) : p.toFixed(2), W - padR + 6, yy + 3);
    }

    // worst/best hour shading (your behavior on the chart)
    if (overlays.hours && ins) {
      const shade = (bucket: { key: string } | null, color: string) => {
        if (!bucket) return;
        const hr = parseInt(bucket.key);
        for (let i = 0; i < n; i++) {
          if (new Date(cs[i].t).getUTCHours() === hr) {
            g.fillStyle = color;
            g.fillRect(padL + i * bw, padT, bw, chartH);
          }
        }
      };
      shade(ins.worstWindow, "rgba(239,68,68,.07)");
      shade(ins.bestWindow, "rgba(16,185,129,.06)");
    }

    // news lines
    if (overlays.news) {
      g.strokeStyle = "rgba(245,158,11,.55)"; g.setLineDash([4, 4]);
      for (const e of news) {
        const t = +new Date(e.date);
        if (t < cs[0].t || t > cs[n - 1].t) continue;
        let idx = 0; for (let i = 0; i < n; i++) if (cs[i].t <= t) idx = i;
        g.beginPath(); g.moveTo(x(idx), padT); g.lineTo(x(idx), padT + chartH); g.stroke();
      }
      g.setLineDash([]);
    }

    // volume
    for (let i = 0; i < n; i++) {
      const c = cs[i];
      g.fillStyle = c.c >= c.o ? "rgba(16,185,129,.35)" : "rgba(239,68,68,.35)";
      const vh = (c.v / maxV) * volH;
      g.fillRect(padL + i * bw + bw * 0.18, padT + chartH + (volH - vh), bw * 0.64, vh);
    }

    // candles
    for (let i = 0; i < n; i++) {
      const c = cs[i];
      const up = c.c >= c.o;
      g.strokeStyle = up ? "#10B981" : "#EF4444"; g.fillStyle = up ? "#10B981" : "#EF4444";
      g.beginPath(); g.moveTo(x(i), y(c.h)); g.lineTo(x(i), y(c.l)); g.stroke();
      const top = y(Math.max(c.o, c.c)), bh = Math.max(1, Math.abs(y(c.o) - y(c.c)));
      g.fillRect(padL + i * bw + bw * 0.18, top, bw * 0.64, bh);
    }

    // EMA 9/21 + VWAP
    const closes = cs.map((c) => c.c);
    const line = (vals: number[], color: string, width = 1.4) => {
      g.strokeStyle = color; g.lineWidth = width; g.beginPath();
      vals.forEach((v, i) => { const yy = y(v); i ? g.lineTo(x(i), yy) : g.moveTo(x(i), yy); });
      g.stroke(); g.lineWidth = 1;
    };
    if (overlays.emas) { line(ema(closes, 9), "#60A5FA"); line(ema(closes, 21), "#8B5CF6"); }
    if (overlays.vwap) line(vwap(cs), "#F59E0B", 1.2);

    // your trades on the timeline
    if (overlays.trades && myTrades.length) {
      for (const t of myTrades) {
        if (t.timestamp < cs[0].t || t.timestamp > cs[n - 1].t + 5 * 60000) continue;
        let idx = 0; for (let i = 0; i < n; i++) if (cs[i].t <= t.timestamp) idx = i;
        g.fillStyle = t.pnl >= 0 ? "#10B981" : "#EF4444";
        g.beginPath();
        const yy = padT + chartH + volH + 10;
        g.moveTo(x(idx), yy - 5); g.lineTo(x(idx) - 4, yy + 3); g.lineTo(x(idx) + 4, yy + 3); g.closePath(); g.fill();
      }
    }

    // crosshair
    if (hover != null && hover >= 0 && hover < n) {
      const c = cs[hover];
      g.strokeStyle = "rgba(255,255,255,.25)"; g.setLineDash([3, 3]);
      g.beginPath(); g.moveTo(x(hover), padT); g.lineTo(x(hover), padT + chartH + volH); g.stroke();
      g.setLineDash([]);
      g.fillStyle = "rgba(10,22,40,.95)"; g.strokeStyle = "rgba(255,255,255,.15)";
      const txt = `O ${c.o.toFixed(2)}  H ${c.h.toFixed(2)}  L ${c.l.toFixed(2)}  C ${c.c.toFixed(2)}`;
      g.font = "11px JetBrains Mono, monospace";
      const tw = g.measureText(txt).width + 16;
      g.fillRect(padL, 2, tw, 18); g.strokeRect(padL, 2, tw, 18);
      g.fillStyle = c.c >= c.o ? "#10B981" : "#EF4444";
      g.fillText(txt, padL + 8, 15);
    }
  }, [feed, hover, overlays, ins, myTrades, news]);

  useEffect(() => { draw(); }, [draw]);
  useEffect(() => {
    const onR = () => draw();
    window.addEventListener("resize", onR);
    return () => window.removeEventListener("resize", onR);
  }, [draw]);

  function onMove(e: React.MouseEvent) {
    const cv = canvasRef.current; if (!cv || !feed?.candles?.length) return;
    const rect = cv.getBoundingClientRect();
    const i = Math.floor(((e.clientX - rect.left - 8) / (rect.width - 64)) * feed.candles.length);
    setHover(Math.max(0, Math.min(feed.candles.length - 1, i)));
  }

  const last = feed?.candles?.[feed.candles.length - 1];
  const first = feed?.candles?.[0];
  const chg = last && first ? (last.c - first.o) / first.o : 0;

  return (
    <div className="space-y-4 fade">
      <div className="flex items-end justify-between flex-wrap gap-3">
        <div><div className="eyebrow">Charts · your trading on the market</div>
          <h1 className="text-2xl font-bold mt-1">{MARKET_SYMBOLS[symbol]?.label}</h1></div>
        {feed && <span className="chip text-[.7rem]" style={feed.source === "live" ? { borderColor: "#10B98155", color: "#10B981" } : {}}>{feed.source === "live" ? "● live (delayed feed)" : "simulated — live feed unreachable"}</span>}
      </div>

      <div className="grid lg:grid-cols-[170px_1fr] gap-4">
        {/* watchlist */}
        <div className="flex lg:flex-col gap-1.5 overflow-x-auto">
          {Object.keys(MARKET_SYMBOLS).map((s) => {
            const q = quotes[s];
            return (
              <button key={s} onClick={() => setSymbol(s)}
                className={`card px-3 py-2.5 text-left shrink-0 lg:shrink ${symbol === s ? "ring-1 ring-acc/60" : "card-hover"}`}>
                <div className="flex justify-between items-center gap-3">
                  <span className="font-semibold text-sm">{s}</span>
                  {q && <span className="mono text-[.72rem]" style={{ color: q.chg >= 0 ? "#10B981" : "#EF4444" }}>{(q.chg * 100).toFixed(2)}%</span>}
                </div>
                {q && <div className="mono text-[.78rem] text-t2">{q.last >= 1000 ? q.last.toFixed(0) : q.last.toFixed(2)}</div>}
              </button>
            );
          })}
        </div>

        {/* chart */}
        <div className="card p-4">
          <div className="flex items-center justify-between flex-wrap gap-2 mb-2">
            <div className="flex gap-1.5">
              {INTERVALS.map(([i, r], k) => (
                <button key={i} onClick={() => setIv(k)} className={`px-2.5 py-1 rounded-md text-xs transition ${iv === k ? "bg-acc/20 text-t1 border border-acc/40" : "text-t3 hover:text-t1 border border-transparent"}`}>{i}</button>
              ))}
            </div>
            {last && <div className="mono text-sm" style={{ color: chg >= 0 ? "#10B981" : "#EF4444" }}>{last.c >= 1000 ? last.c.toFixed(2) : last.c.toFixed(2)} ({chg >= 0 ? "+" : ""}{(chg * 100).toFixed(2)}%)</div>}
            <div className="flex gap-2 text-[.7rem] text-t3">
              {([["trades", "my trades"], ["hours", "my hours"], ["news", "news"], ["vwap", "vwap"], ["emas", "ema 9/21"]] as const).map(([k, l]) => (
                <button key={k} onClick={() => setOverlays((o) => ({ ...o, [k]: !o[k] }))}
                  className={overlays[k] ? "text-acc" : "text-t3 line-through"}>{l}</button>
              ))}
            </div>
          </div>
          <canvas ref={canvasRef} className="w-full h-[380px] cursor-crosshair" onMouseMove={onMove} onMouseLeave={() => setHover(null)} />
          <div className="flex items-center justify-between mt-2 text-[.7rem] text-t3">
            <span>▲ markers = your {myTrades.length} {symbol}-family trades · red band = your worst hour · green band = your best · amber line = news</span>
          </div>
        </div>
      </div>
      <p className="text-[.7rem] text-t3">Market data delayed/unofficial; for context, not execution. Overlays computed from your own journal.</p>
    </div>
  );
}
