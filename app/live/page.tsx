"use client";
import { useEffect, useRef, useState } from "react";
import { Nav, Footer } from "../../components/Nav";
import { FIRMS, INSTRUMENTS } from "../../lib/firms";
import { assessAccount, STATUS_META, maxSizeNow, type Account } from "../../lib/risk";
import { usd } from "../../lib/format";

const FIRM_KEY = "topstep50"; // intraday trailing + daily loss = maximum drama
const INST = "MNQ";
const START = 18250;

type Pos = { side: 1 | -1; size: number; entry: number } | null;

export default function Live() {
  const firm = FIRMS[FIRM_KEY];
  const perPoint = INSTRUMENTS[INST].perPoint;

  const [price, setPrice] = useState(START);
  const [prices, setPrices] = useState<number[]>([START]);
  const [pos, setPos] = useState<Pos>(null);
  const [realized, setRealized] = useState(0);     // closed P&L today
  const [peak, setPeak] = useState(firm.start);    // equity peak (intraday trailing)
  const [breached, setBreached] = useState(false);
  const [running, setRunning] = useState(true);

  const driftRef = useRef(0);
  const stateRef = useRef({ price: START, pos: pos as Pos, realized: 0, peak: firm.start });

  // keep a ref of live values for the interval
  useEffect(() => { stateRef.current = { price, pos, realized, peak }; });

  useEffect(() => {
    if (!running || breached) return;
    const t = setInterval(() => {
      setPrice((p) => {
        const drift = driftRef.current;
        const step = (Math.random() - 0.5) * 14 + drift;
        driftRef.current *= 0.6; // decay nudges
        const np = Math.max(17000, Math.round((p + step) * 4) / 4);
        setPrices((xs) => [...xs.slice(-79), np]);
        return np;
      });
    }, 700);
    return () => clearInterval(t);
  }, [running, breached]);

  // recompute equity / peak / breach whenever price moves
  const unreal = pos ? pos.side * (price - pos.entry) * perPoint * pos.size : 0;
  const equity = firm.start + realized + unreal;

  useEffect(() => {
    if (equity > peak) setPeak(equity);
  }, [equity, peak]);

  const account: Account = {
    id: "live", label: "Live", firmKey: FIRM_KEY,
    startBalance: firm.start, balance: equity, peakEquity: Math.max(peak, equity),
    todayPnL: realized + unreal, daysTraded: 1,
  };
  const r = assessAccount(account);
  const sm = STATUS_META[r.status];
  const maxNow = maxSizeNow(account, INST, 20);

  useEffect(() => {
    if (r.distanceToBreach <= 0 && !breached) { setBreached(true); setRunning(false); }
  }, [r.distanceToBreach, breached]);

  function open(side: 1 | -1) {
    if (breached) return;
    setPos((cur) => {
      if (cur && cur.side === side) return { ...cur, size: Math.min(firm.contractCap, cur.size + 1) };
      // flatten opposite first
      if (cur) setRealized((x) => x + cur.side * (price - cur.entry) * perPoint * cur.size);
      return { side, size: 1, entry: price };
    });
  }
  function flatten() {
    setPos((cur) => {
      if (cur) setRealized((x) => x + cur.side * (price - cur.entry) * perPoint * cur.size);
      return null;
    });
  }
  function nudge(dir: 1 | -1) { driftRef.current += dir * 22; }
  function reset() {
    setPrice(START); setPrices([START]); setPos(null); setRealized(0);
    setPeak(firm.start); setBreached(false); setRunning(true); driftRef.current = 0;
  }

  return (
    <>
      <Nav />
      <main className="max-w-6xl mx-auto px-5 py-8">
        <div className="text-center mb-6">
          <div className="eyebrow">Live demo · simulated</div>
          <h1 className="text-3xl font-bold mt-1">Watch the Guardian work.</h1>
          <p className="text-t2 text-sm mt-1.5 max-w-xl mx-auto">
            A simulated {firm.name} account. Trade it. The Guardian tracks your Distance to Breach
            every tick — and screams before the account dies. Try to blow it up.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1.4fr_1fr] gap-5">
          {/* Chart + controls */}
          <div className="card p-5">
            <div className="flex items-center justify-between mb-2">
              <div className="font-semibold">{INST} · {INSTRUMENTS[INST].name.split("·")[1]}</div>
              <div className="mono text-lg" style={{ color: pos ? (unreal >= 0 ? "#10B981" : "#EF4444") : "#F0F4FF" }}>
                {price.toFixed(2)}
              </div>
            </div>
            <PriceChart data={prices} entry={pos?.entry} />

            <div className="grid grid-cols-2 gap-3 mt-4 text-center">
              <Mini label="Position" value={pos ? `${pos.side > 0 ? "LONG" : "SHORT"} ${pos.size}` : "flat"}
                color={pos ? (pos.side > 0 ? "#10B981" : "#EF4444") : "#94A3B8"} />
              <Mini label="Open P&L" value={usd(unreal)} color={unreal >= 0 ? "#10B981" : "#EF4444"} />
            </div>

            <div className="flex flex-wrap gap-2 mt-4">
              <button onClick={() => open(1)} className="btn btn-ghost flex-1 !py-2" style={{ borderColor: "#10B98155", color: "#10B981" }}>Buy +1</button>
              <button onClick={() => open(-1)} className="btn btn-ghost flex-1 !py-2" style={{ borderColor: "#EF444455", color: "#EF4444" }}>Sell +1</button>
              <button onClick={flatten} className="btn btn-ghost flex-1 !py-2">Flatten</button>
            </div>
            <div className="flex gap-2 mt-2">
              <button onClick={() => nudge(1)} className="btn btn-ghost flex-1 !py-1.5 text-xs">↑ pump price</button>
              <button onClick={() => nudge(-1)} className="btn btn-ghost flex-1 !py-1.5 text-xs">↓ dump price</button>
              <button onClick={reset} className="btn btn-ghost !py-1.5 text-xs">reset</button>
            </div>
          </div>

          {/* Guardian HUD */}
          <div className="card p-6 relative overflow-hidden" style={{ borderColor: sm.color + "55" }}>
            {(r.status === "danger" || breached) && (
              <div className="absolute inset-0 pointer-events-none" style={{ background: `radial-gradient(circle at 50% 0%, ${sm.color}22, transparent 60%)`, animation: "pulse 1s infinite" }} />
            )}
            <div className="relative">
              <div className="flex items-center justify-between">
                <div className="eyebrow">Breach Guardian</div>
                <span className="chip" style={{ borderColor: sm.color + "66", color: sm.color }}>● {sm.label.toUpperCase()}</span>
              </div>

              <div className="text-center my-5">
                <div className="text-[.72rem] uppercase tracking-wide text-t3">Distance to breach</div>
                <div className="text-5xl font-bold mono mt-1" style={{ color: sm.color, textShadow: `0 0 22px ${sm.color}66` }}>
                  {usd(Math.max(0, r.distanceToBreach))}
                </div>
                <div className="text-[.74rem] text-t3 mt-1">
                  via {r.bindingConstraint === "daily" ? "daily loss limit" : "trailing drawdown"} · floor {usd(r.floor)}
                </div>
              </div>

              <div className="h-3 w-full rounded-full bg-white/[.06] overflow-hidden">
                <div className="h-full rounded-full transition-all duration-300"
                  style={{ width: `${Math.max(0, Math.min(1, r.pctBuffer)) * 100}%`, background: sm.color, boxShadow: `0 0 12px ${sm.color}` }} />
              </div>

              <div className="grid grid-cols-3 gap-2 mt-5 text-center">
                <Mini label="Equity" value={usd(equity)} />
                <Mini label="Today P&L" value={usd(realized + unreal)} color={realized + unreal >= 0 ? "#10B981" : "#EF4444"} />
                <Mini label={`Max ${INST} now`} value={breached ? "0" : String(maxNow)} color={sm.color} />
              </div>

              {r.status === "caution" && !breached && (
                <Banner color="#F59E0B">⚠ Buffer under 45%. Tighten up — one bad trade from danger.</Banner>
              )}
              {r.status === "danger" && !breached && (
                <Banner color="#EF4444">🚨 BREACH IMMINENT — {usd(Math.max(0, r.distanceToBreach))} left. Flatten now.</Banner>
              )}
              {breached && (
                <Banner color="#7F1D1D">✕ ACCOUNT BREACHED. This is the moment the Guardian exists to prevent.</Banner>
              )}
            </div>
          </div>
        </div>
        <p className="text-[.72rem] text-t3 mt-5 text-center">Simulated for demonstration. In production the Guardian reads your live account and platform.</p>
      </main>
      <Footer />
    </>
  );
}

function Banner({ color, children }: { color: string; children: React.ReactNode }) {
  return (
    <div className="mt-4 rounded-xl px-4 py-3 text-sm font-medium" style={{ background: color + "1a", border: `1px solid ${color}55`, color }}>
      {children}
    </div>
  );
}
function Mini({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[.03] py-2">
      <div className="text-[.62rem] uppercase text-t3">{label}</div>
      <div className="mono text-[.92rem] font-semibold" style={{ color: color || "#F0F4FF" }}>{value}</div>
    </div>
  );
}

function PriceChart({ data, entry }: { data: number[]; entry?: number }) {
  const w = 600, h = 220, pad = 6;
  const lo = Math.min(...data, entry ?? Infinity);
  const hi = Math.max(...data, entry ?? -Infinity);
  const span = hi - lo || 1;
  const x = (i: number) => pad + (i / Math.max(1, data.length - 1)) * (w - pad * 2);
  const y = (v: number) => pad + (1 - (v - lo) / span) * (h - pad * 2);
  const line = data.map((v, i) => `${i ? "L" : "M"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const last = data[data.length - 1];
  const up = data.length < 2 || last >= data[0];
  const col = up ? "#10B981" : "#EF4444";
  return (
    <svg width="100%" viewBox={`0 0 ${w} ${h}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="pg" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.22" /><stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <path d={`${line} L${x(data.length - 1)},${h - pad} L${x(0)},${h - pad} Z`} fill="url(#pg)" />
      <path d={line} fill="none" stroke={col} strokeWidth={2} />
      {entry != null && (
        <line x1={pad} x2={w - pad} y1={y(entry)} y2={y(entry)} stroke="#94A3B8" strokeDasharray="4 4" strokeWidth={1} />
      )}
    </svg>
  );
}
