"use client";
import { useEffect, useRef, useState } from "react";

// A bespoke, genuinely-live hero: a streaming equity curve that ticks in real
// time, a Distance-to-Breach counter that moves, and the guardrail FIRING on
// screen when the account nears breach. Pure presentation — but it's alive.
const W = 580, H = 168, N = 70, FLOOR = 0;

export function LiveTerminal() {
  const [pts, setPts] = useState<number[]>(() => Array(N).fill(900));
  const [dtb, setDtb] = useState(900);
  const [guard, setGuard] = useState<"ok" | "warn" | "block">("ok");
  const [equity, setEquity] = useState(2640);
  const raf = useRef<number>();
  const last = useRef(0);
  const buf = useRef<number[]>(Array(N).fill(900));
  const eq = useRef(2640);

  useEffect(() => {
    const start = performance.now();
    const LOOP = 11000;
    function val(phase: number, jitter: number) {
      // baseline cushion above the breach floor, with a scripted dip each loop
      let base = 980 + Math.sin(phase * Math.PI * 6) * 90 + jitter;
      const d = (phase % 1);
      if (d > 0.42 && d < 0.66) {
        const k = (d - 0.42) / 0.24;            // 0..1 across the dip
        const dip = Math.sin(k * Math.PI);       // smooth down-and-up
        base -= dip * 880;                        // plunges toward the floor
      }
      return Math.max(70, base);
    }
    function frame(now: number) {
      if (now - last.current > 55) {
        last.current = now;
        const phase = ((now - start) % LOOP) / LOOP;
        const v = val(phase, (Math.random() - 0.5) * 70);
        buf.current = [...buf.current.slice(1), v];
        const latest = buf.current[buf.current.length - 1];
        eq.current += (v - 900) * 0.004;
        setPts(buf.current);
        setDtb(Math.round(Math.max(0, latest - FLOOR)));
        setEquity(Math.round(eq.current));
        setGuard(latest < 240 ? "block" : latest < 460 ? "warn" : "ok");
      }
      raf.current = requestAnimationFrame(frame);
    }
    raf.current = requestAnimationFrame(frame);
    return () => { if (raf.current) cancelAnimationFrame(raf.current); };
  }, []);

  const max = 1180;
  const path = pts.map((p, i) => `${i === 0 ? "M" : "L"}${(i / (N - 1) * W).toFixed(1)},${(H - (p / max) * H).toFixed(1)}`).join(" ");
  const area = `${path} L${W},${H} L0,${H} Z`;
  const lastX = W, lastY = H - (pts[pts.length - 1] / max) * H;
  const col = guard === "block" ? "#DC2626" : guard === "warn" ? "#D97706" : "#10A37F";

  return (
    <div className="lt-wrap mt-16 max-w-4xl mx-auto px-2">
      <div className="browser lt-browser">
        <div className="browser-bar">
          <span className="browser-dot" style={{ background: "#F87171" }} />
          <span className="browser-dot" style={{ background: "#FBBF24" }} />
          <span className="browser-dot" style={{ background: "#34D399" }} />
          <span className="browser-url">fundedcore.app/suite</span>
          <span className="lt-live"><span className="lt-live-dot" /> LIVE</span>
        </div>
        <div className="lt-body">
          <div className="lt-left">
            <div className="lbl">Distance to breach</div>
            <div className="lt-dtb mono" style={{ color: col }}>${dtb.toLocaleString()}</div>
            <div className="lt-meter"><div className="lt-meter-fill" style={{ width: `${Math.min(100, dtb / 11)}%`, background: col }} /></div>
            <div className="lt-stat-row">
              <div><div className="lbl">Equity</div><div className="mono lt-eq">+${equity.toLocaleString()}</div></div>
              <div><div className="lbl">Trader score</div><div className="mono lt-eq" style={{ color: "#10A37F" }}>87 A</div></div>
            </div>
            <div className={`lt-guard lt-guard-${guard}`}>
              {guard === "block" ? "⛔ GUARDRAIL — REDUCE OR STOP" : guard === "warn" ? "⚠ Buffer thin — size down" : "✓ Cleared — within limits"}
            </div>
          </div>
          <div className="lt-right">
            <div className="lt-chart-head"><span>EQUITY · LIVE</span><span className="mono" style={{ color: col }}>{guard === "block" ? "BREACH RISK" : guard === "warn" ? "WATCH" : "HEALTHY"}</span></div>
            <svg viewBox={`0 0 ${W} ${H}`} className="lt-svg" preserveAspectRatio="none">
              <defs>
                <linearGradient id="ltfill" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0" stopColor={col} stopOpacity="0.28" />
                  <stop offset="1" stopColor={col} stopOpacity="0" />
                </linearGradient>
              </defs>
              {/* breach floor line */}
              <line x1="0" y1={H - 18} x2={W} y2={H - 18} stroke="#F87171" strokeOpacity="0.5" strokeWidth="1" strokeDasharray="4 4" />
              <path d={area} fill="url(#ltfill)" />
              <path d={path} fill="none" stroke={col} strokeWidth="2" strokeLinejoin="round" />
              <circle cx={lastX} cy={lastY} r="3.5" fill={col} />
              <circle cx={lastX} cy={lastY} r="7" fill={col} opacity="0.25">
                <animate attributeName="r" values="5;11;5" dur="1.4s" repeatCount="indefinite" />
                <animate attributeName="opacity" values="0.35;0;0.35" dur="1.4s" repeatCount="indefinite" />
              </circle>
            </svg>
            <div className="lt-accts">
              {[["Apex #1", 0.34, "#D97706"], ["TopStep XFA", 0.82, "#10A37F"], ["Apex Eval", 0.58, "#10A37F"]].map(([n, w, c]) => (
                <div key={n as string} className="lt-acct">
                  <span className="lt-acct-name">{n}</span>
                  <span className="lt-acct-bar"><span style={{ width: `${(w as number) * 100}%`, background: c as string }} /></span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
