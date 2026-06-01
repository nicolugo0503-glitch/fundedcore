"use client";
import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import EquityChart from "@/components/EquityChart";
import MonteCarloChart from "@/components/MonteCarloChart";
import {
  FIRMS, INSTRUMENTS, generateJournal, parseCSV, CSV_TEMPLATE,
  expectancy, groupBy, hourBucket, equitySeries, behaviorSignatures,
  preTradeCheck, fmtMoney, monteCarlo, fundedScore,
  type Trade, type CheckResult, type Verdict,
} from "@/lib/engine";

// ─── useCountUp ────────────────────────────────────────────────────────────────
function useCountUp(target: number, duration = 700): number {
  const [val, setVal] = useState(target);
  const fromRef = useRef(target);
  const rafRef = useRef(0);
  useEffect(() => {
    const from = fromRef.current;
    const diff = target - from;
    if (Math.abs(diff) < 0.5) { setVal(target); return; }
    const startTime = performance.now();
    const tick = (ts: number) => {
      const t = Math.min(1, (ts - startTime) / duration);
      const ease = 1 - Math.pow(1 - t, 3);
      setVal(Math.round(from + diff * ease));
      if (t < 1) { rafRef.current = requestAnimationFrame(tick); }
      else { fromRef.current = target; setVal(target); }
    };
    cancelAnimationFrame(rafRef.current);
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [target, duration]);
  return val;
}

// ─── Constants ─────────────────────────────────────────────────────────────────
const SCENARIOS: Record<string, { todayPnL: number; trailingRoom: number; daysTraded: number }> = {
  topstep50: { todayPnL: -420, trailingRoom: 640, daysTraded: 3 },
  apex100: { todayPnL: -180, trailingRoom: 1450, daysTraded: 1 },
  tpt50: { todayPnL: -90, trailingRoom: 980, daysTraded: 4 },
};
const VCOLOR: Record<Verdict, string> = {
  APPROVE: "#059669", REDUCE: "#B45309", WAIT: "#B45309", BLOCK: "#DC2626",
};
const VSUB: Record<Verdict, string> = {
  APPROVE: "Cleared to take", REDUCE: "Cut size to stay safe",
  WAIT: "Hold — condition active", BLOCK: "Do not take this trade",
};
const TABS = [
  ["check", "01 · Pre-Trade Firewall"],
  ["behavior", "02 · Behavioral Engine"],
  ["edge", "03 · Edge Analytics"],
  ["journal", "04 · Journal"],
  ["mc", "05 · Monte Carlo"],
] as const;

// ─── Boot Screen ──────────────────────────────────────────────────────────────
function BootLine({ text, delay }: { text: string; delay: number }) {
  const [done, setDone] = useState(false);
  useEffect(() => {
    const t = setTimeout(() => setDone(true), delay);
    return () => clearTimeout(t);
  }, [delay]);
  return (
    <div className="flex items-center gap-4 font-mono text-[9px] tracking-widest">
      <span className="h-1.5 w-1.5 flex-shrink-0 rounded-full"
        style={{ background: done ? "#059669" : "rgba(3,105,161,.15)", boxShadow: done ? "0 0 8px #2ADB8A" : "none", transition: "all .3s" }} />
      <span style={{ color: done ? "rgba(15,23,42,.80)" : "rgba(71,85,105,.35)", transition: "color .3s" }}>
        LOADING {text}
      </span>
      <span className="ml-auto font-semibold" style={{ color: done ? "#059669" : "rgba(71,85,105,.22)", transition: "color .3s" }}>
        {done ? "OK" : "—"}
      </span>
    </div>
  );
}
function BootScreen({ onDone }: { onDone: () => void }) {
  const [sweep, setSweep] = useState(false);
  const onDoneRef = useRef(onDone);
  onDoneRef.current = onDone;
  useEffect(() => {
    const t1 = setTimeout(() => setSweep(true), 1400);
    const t2 = setTimeout(() => onDoneRef.current(), 1850);
    return () => { clearTimeout(t1); clearTimeout(t2); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);
  return (
    <div className="fixed inset-0 z-[70] flex flex-col items-center justify-center"
      style={{ background: "rgba(248,250,252,.98)", transition: "opacity .5s ease-out,transform .5s ease-out",
        opacity: sweep ? 0 : 1, transform: sweep ? "scale(1.04)" : "scale(1)", pointerEvents: sweep ? "none" : "all" }}>
      <div aria-hidden className="fc-scanlines pointer-events-none absolute inset-0 z-10" />
      <div className="relative z-20 text-center w-full max-w-xs px-8">
        <div className="mb-1 font-mono text-[7.5px] uppercase tracking-[0.45em] text-t3">FUNDED.CORE INTELLIGENCE</div>
        <div className="mb-8 font-sans text-[56px] font-bold leading-none tracking-tight text-acc fc-glow">v2.0</div>
        <div className="space-y-3 text-left">
          <BootLine text="RISK ENGINE" delay={120} />
          <BootLine text="BEHAVIORAL PROFILES" delay={420} />
          <BootLine text="MONTE CARLO ENGINE" delay={720} />
          <BootLine text="SYSTEM READY" delay={1020} />
        </div>
        <div className="mt-8 font-mono text-[7px] tracking-[0.3em] text-t3 opacity-40">PRESS ⌘K FOR COMMAND PALETTE</div>
      </div>
    </div>
  );
}

// ─── Particle Canvas ──────────────────────────────────────────────────────────
type Particle = { x: number; y: number; vx: number; vy: number; r: number };
function ParticleCanvas() {
  const ref = useRef<HTMLCanvasElement>(null);
  const mouseRef = useRef({ x: -9999, y: -9999 });
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    let w = window.innerWidth, h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
    };
    resize();
    window.addEventListener("resize", resize);
    const onMouse = (e: MouseEvent) => { mouseRef.current = { x: e.clientX, y: e.clientY }; };
    const onLeave = () => { mouseRef.current = { x: -9999, y: -9999 }; };
    window.addEventListener("mousemove", onMouse);
    document.documentElement.addEventListener("mouseleave", onLeave);
    const ctx = cv.getContext("2d");
    if (!ctx) { window.removeEventListener("resize", resize); return; }
    const N = 75, D_CONNECT = 148, MAX_SPD = 2.0, REPEL_R = 130;
    const particles: Particle[] = Array.from({ length: N }, () => ({
      x: Math.random() * w, y: Math.random() * h,
      vx: (Math.random() - 0.5) * 0.3, vy: (Math.random() - 0.5) * 0.3,
      r: 1.0 + Math.random() * 1.5,
    }));
    let raf = 0;
    const tick = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.clearRect(0, 0, w, h);
      const mx = mouseRef.current.x, my = mouseRef.current.y;
      for (const p of particles) {
        const dx = p.x - mx, dy = p.y - my;
        const dist = Math.sqrt(dx * dx + dy * dy);
        if (dist < REPEL_R && dist > 0) {
          const force = (1 - dist / REPEL_R) * 0.72;
          p.vx += (dx / dist) * force; p.vy += (dy / dist) * force;
        }
        const spd = Math.sqrt(p.vx * p.vx + p.vy * p.vy);
        if (spd > MAX_SPD) { p.vx = (p.vx / spd) * MAX_SPD; p.vy = (p.vy / spd) * MAX_SPD; }
        p.x += p.vx; p.y += p.vy;
        if (p.x < 0) { p.x = 0; p.vx = Math.abs(p.vx); } else if (p.x > w) { p.x = w; p.vx = -Math.abs(p.vx); }
        if (p.y < 0) { p.y = 0; p.vy = Math.abs(p.vy); } else if (p.y > h) { p.y = h; p.vy = -Math.abs(p.vy); }
      }
      for (let i = 0; i < N; i++) {
        for (let j = i + 1; j < N; j++) {
          const dx = particles[i].x - particles[j].x, dy = particles[i].y - particles[j].y;
          const dist = Math.sqrt(dx * dx + dy * dy);
          if (dist < D_CONNECT) {
            ctx.beginPath(); ctx.moveTo(particles[i].x, particles[i].y); ctx.lineTo(particles[j].x, particles[j].y);
            ctx.strokeStyle = `rgba(3,105,161,${(1 - dist / D_CONNECT) * 0.11})`; ctx.lineWidth = 0.7; ctx.stroke();
          }
        }
      }
      for (const p of particles) {
        ctx.beginPath(); ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fillStyle = "rgba(3,105,161,0.22)"; ctx.fill();
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => {
      cancelAnimationFrame(raf); window.removeEventListener("resize", resize);
      window.removeEventListener("mousemove", onMouse);
      document.documentElement.removeEventListener("mouseleave", onLeave);
    };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0 z-0" />;
}

// ─── Data Rain ────────────────────────────────────────────────────────────────
function DataRain() {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv) return;
    const dpr = window.devicePixelRatio || 1;
    let w = window.innerWidth, h = window.innerHeight;
    const resize = () => {
      w = window.innerWidth; h = window.innerHeight;
      cv.width = w * dpr; cv.height = h * dpr;
      cv.style.width = w + "px"; cv.style.height = h + "px";
    };
    resize();
    window.addEventListener("resize", resize);
    const ctx = cv.getContext("2d");
    if (!ctx) { window.removeEventListener("resize", resize); return; }
    const CHARS = "0123456789.+-$ESNQGCR";
    const COL = 22;
    let cols = Math.floor(w / COL);
    let drops = Array.from({ length: cols }, () => -(Math.random() * h));
    let raf = 0;
    const tick = () => {
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
      ctx.fillStyle = "rgba(248,250,252,.22)";
      ctx.fillRect(0, 0, w, h);
      ctx.font = '10px "JetBrains Mono",monospace';
      for (let i = 0; i < cols; i++) {
        const bright = Math.random() > 0.94;
        ctx.fillStyle = bright ? "rgba(3,105,161,.35)" : "rgba(3,105,161,.13)";
        ctx.fillText(CHARS[Math.floor(Math.random() * CHARS.length)], i * COL, drops[i]);
        drops[i] += 15;
        if (drops[i] > h && Math.random() > 0.975) drops[i] = -30;
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} className="pointer-events-none fixed inset-0" style={{ zIndex: 0 }} />;
}

// ─── Market Ticker ─────────────────────────────────────────────────────────────
const BASE_TICKS = [
  { sym: "ES", px: 5347.25, d: +12.50 }, { sym: "NQ", px: 19284.50, d: -38.25 },
  { sym: "MES", px: 5347.25, d: +12.50 }, { sym: "MNQ", px: 19284.50, d: -38.25 },
  { sym: "GC", px: 2411.80, d: +8.40 }, { sym: "CL", px: 78.45, d: -0.32 },
  { sym: "RTY", px: 2108.60, d: +4.10 }, { sym: "YM", px: 39842.00, d: +85.00 },
];
function MarketTicker() {
  const [ticks, setTicks] = useState(BASE_TICKS);
  useEffect(() => {
    const id = setInterval(() => {
      setTicks((prev) => prev.map((p) => {
        const move = (Math.random() - 0.49) * p.px * 0.0007;
        return { ...p, px: +(p.px + move).toFixed(2), d: +(p.d + move * 0.6).toFixed(2) };
      }));
    }, 3200);
    return () => clearInterval(id);
  }, []);
  const items = [...ticks, ...ticks];
  return (
    <div className="overflow-hidden whitespace-nowrap" style={{ maxWidth: 340 }}>
      <div className="ticker-scroll inline-flex gap-6 font-mono text-[10px]">
        {items.map((p, i) => (
          <span key={i} className="inline-flex items-center gap-1.5">
            <span className="text-t2">{p.sym}</span>
            <span className="tabnum text-t1">{p.px.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</span>
            <span className="tabnum" style={{ color: p.d >= 0 ? "#059669" : "#DC2626" }}>{p.d >= 0 ? "+" : ""}{p.d.toFixed(2)}</span>
          </span>
        ))}
      </div>
    </div>
  );
}

// ─── BigGauge ─────────────────────────────────────────────────────────────────
function BigGauge({ label, value, pct, color, sub }: {
  label: string; value: string; pct: number; color: string; sub: string;
}) {
  return (
    <div className="bg-panel p-5 flex flex-col gap-3">
      <div className="flex items-baseline justify-between gap-3">
        <span className="font-mono text-[8.5px] uppercase tracking-[0.2em] text-t2">{label}</span>
        <span className="tabnum font-mono text-[38px] font-bold leading-none" style={{ color, textShadow: `0 0 30px ${color}66` }}>{value}</span>
      </div>
      <div className="relative h-[3px] rounded-full overflow-hidden" style={{ background: "rgba(3,105,161,.08)" }}>
        <div className="absolute left-0 top-0 h-full rounded-full"
          style={{ width: Math.max(2, Math.min(100, pct)) + "%", background: color, boxShadow: `0 0 12px ${color}aa`, transition: "width 0.8s cubic-bezier(.4,0,.2,1)" }} />
      </div>
      <span className="font-mono text-[8px] tracking-wide text-t3">{sub}</span>
    </div>
  );
}

// ─── MiniSparkline ────────────────────────────────────────────────────────────
function MiniSparkline({ data }: { data: number[] }) {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const cv = ref.current;
    if (!cv || data.length < 2) return;
    const dpr = window.devicePixelRatio || 1;
    const W = cv.offsetWidth || 160, H = cv.offsetHeight || 36;
    cv.width = W * dpr; cv.height = H * dpr;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    ctx.scale(dpr, dpr);
    const min = Math.min(...data), max = Math.max(...data);
    const range = max - min || 1;
    const px = (i: number) => (i / (data.length - 1)) * W;
    const py = (v: number) => H - ((v - min) / range) * (H * 0.82) - H * 0.09;
    const grad = ctx.createLinearGradient(0, 0, 0, H);
    grad.addColorStop(0, "rgba(3,105,161,.15)");
    grad.addColorStop(1, "rgba(3,105,161,.01)");
    ctx.beginPath();
    data.forEach((v, i) => i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)));
    ctx.lineTo(px(data.length - 1), H); ctx.lineTo(px(0), H); ctx.closePath();
    ctx.fillStyle = grad; ctx.fill();
    ctx.beginPath();
    data.forEach((v, i) => i === 0 ? ctx.moveTo(px(i), py(v)) : ctx.lineTo(px(i), py(v)));
    ctx.strokeStyle = "#0369A1"; ctx.lineWidth = 1.5; ctx.stroke();
    const lx = px(data.length - 1), ly = py(data[data.length - 1]);
    ctx.shadowColor = "#0369A1"; ctx.shadowBlur = 6;
    ctx.beginPath(); ctx.arc(lx, ly, 2.5, 0, Math.PI * 2);
    ctx.fillStyle = "#0369A1"; ctx.fill();
  }, [data]);
  return <canvas ref={ref} style={{ width: "100%", height: "36px", display: "block" }} className="rounded" />;
}

// ─── TiltCard ─────────────────────────────────────────────────────────────────
function TiltCard({ children, className, style }: {
  children: React.ReactNode; className?: string; style?: React.CSSProperties;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ rx: 0, ry: 0, mx: 50, my: 50 });
  const active = tilt.rx !== 0 || tilt.ry !== 0;
  const onMove = (e: React.MouseEvent) => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const x = (e.clientX - r.left) / r.width, y = (e.clientY - r.top) / r.height;
    setTilt({ rx: (y - 0.5) * -12, ry: (x - 0.5) * 12, mx: x * 100, my: y * 100 });
  };
  return (
    <div ref={ref} className={`relative ${className || ""}`}
      style={{ ...style, transform: `perspective(900px) rotateX(${tilt.rx}deg) rotateY(${tilt.ry}deg)`,
        transition: active ? "transform 0.1s linear" : "transform 0.5s ease", transformStyle: "preserve-3d" }}
      onMouseMove={onMove} onMouseLeave={() => setTilt({ rx: 0, ry: 0, mx: 50, my: 50 })}>
      {active && (
        <div className="pointer-events-none absolute inset-0 rounded-lg z-[1]"
          style={{ background: `radial-gradient(circle at ${tilt.mx}% ${tilt.my}%, rgba(3,105,161,.06) 0%, transparent 65%)` }} />
      )}
      {children}
    </div>
  );
}

// ─── Circular Gauge ───────────────────────────────────────────────────────────
function CircularGauge({ label, value, pct, color, sub, size = 108 }: {
  label: string; value: string; pct: number; color: string; sub: string; size?: number;
}) {
  const S = size, cx = S / 2, cy = S / 2, R = S * 0.365;
  const startDeg = 215, totalDeg = 290;
  const deg2rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const pt = (deg: number) => ({ x: cx + R * Math.cos(deg2rad(deg)), y: cy + R * Math.sin(deg2rad(deg)) });
  const lf = (d: number) => (d > 180 ? 1 : 0);
  const sp = pt(startDeg), ef = pt(startDeg + totalDeg);
  const sweepDeg = Math.min(totalDeg, Math.max(0, Math.min(100, pct) / 100) * totalDeg);
  const ea = pt(startDeg + sweepDeg);
  const sw = S * 0.063;
  const trackD = `M${sp.x.toFixed(2)} ${sp.y.toFixed(2)} A${R.toFixed(2)} ${R.toFixed(2)} 0 ${lf(totalDeg)} 1 ${ef.x.toFixed(2)} ${ef.y.toFixed(2)}`;
  const activeD = sweepDeg > 2
    ? `M${sp.x.toFixed(2)} ${sp.y.toFixed(2)} A${R.toFixed(2)} ${R.toFixed(2)} 0 ${lf(sweepDeg)} 1 ${ea.x.toFixed(2)} ${ea.y.toFixed(2)}`
    : "";
  const fs = value.length > 6 ? S * 0.1 : value.length > 4 ? S * 0.12 : S * 0.145;
  return (
    <div className="flex flex-col items-center justify-center gap-0.5 bg-panel p-4">
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
        <circle cx={cx} cy={cy} r={R + sw + 3} fill="none" stroke="rgba(3,105,161,.06)" strokeWidth="1.5" />
        <path d={trackD} fill="none" stroke="rgba(3,105,161,.09)" strokeWidth={sw} strokeLinecap="round" />
        {activeD && (
          <path d={activeD} fill="none" stroke={color} strokeWidth={sw} strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 6px ${color}aa)` }} />
        )}
        <text x={cx} y={cy + 5} textAnchor="middle" fill={color} fontSize={fs.toFixed(1)} fontWeight="700"
          fontFamily='"JetBrains Mono", monospace'>{value}</text>
      </svg>
      <div className="text-center font-mono text-[7.5px] uppercase tracking-wider text-t2 leading-tight">{label}</div>
      <div className="font-mono text-[7px] text-t3">{sub}</div>
    </div>
  );
}

// ─── FundedScore Radial ───────────────────────────────────────────────────────
function ScoreRadial({ score }: { score: number }) {
  const S = 160, cx = 80, cy = 82, R = 58;
  const totalDeg = 270, startDeg = 225;
  const pct = Math.min(1, Math.max(0, score / 100));
  const sweepDeg = pct * totalDeg;
  const deg2rad = (d: number) => ((d - 90) * Math.PI) / 180;
  const pt = (deg: number) => ({ x: cx + R * Math.cos(deg2rad(deg)), y: cy + R * Math.sin(deg2rad(deg)) });
  const lf = (d: number) => (d > 180 ? 1 : 0);
  const sp = pt(startDeg), ef = pt(startDeg + totalDeg), ea = pt(startDeg + sweepDeg);
  const trackD = `M${sp.x.toFixed(2)} ${sp.y.toFixed(2)} A${R} ${R} 0 ${lf(totalDeg)} 1 ${ef.x.toFixed(2)} ${ef.y.toFixed(2)}`;
  const activeD = sweepDeg > 2 ? `M${sp.x.toFixed(2)} ${sp.y.toFixed(2)} A${R} ${R} 0 ${lf(sweepDeg)} 1 ${ea.x.toFixed(2)} ${ea.y.toFixed(2)}` : "";
  const col = score >= 70 ? "#059669" : score >= 42 ? "#B45309" : "#DC2626";
  const label = score >= 70 ? "STRONG EDGE" : score >= 42 ? "BUILDING" : "NEEDS WORK";
  const tickPcts = [0, 0.25, 0.5, 0.75, 1.0];
  const RI = R - 8, RO = R + 2, RL = R + 17;
  return (
    <div className="flex flex-col items-center gap-1">
      <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`}>
        <circle cx={cx} cy={cy} r={R + 14} fill="none" stroke="rgba(3,105,161,.06)" strokeWidth="1" />
        <circle cx={cx} cy={cy} r={R + 11} fill="none" stroke="rgba(3,105,161,.04)" strokeWidth="0.5" />
        <path d={trackD} fill="none" stroke="rgba(3,105,161,.12)" strokeWidth="8" strokeLinecap="round" />
        {activeD && (
          <path d={activeD} fill="none" stroke={col} strokeWidth="8" strokeLinecap="round"
            style={{ filter: `drop-shadow(0 0 9px ${col}aa)` }} />
        )}
        {tickPcts.map((tp, i) => {
          const deg = startDeg + tp * totalDeg;
          const inner = { x: cx + RI * Math.cos(deg2rad(deg)), y: cy + RI * Math.sin(deg2rad(deg)) };
          const outer = { x: cx + RO * Math.cos(deg2rad(deg)), y: cy + RO * Math.sin(deg2rad(deg)) };
          const lbl = { x: cx + RL * Math.cos(deg2rad(deg)), y: cy + RL * Math.sin(deg2rad(deg)) };
          return (
            <g key={i}>
              <line x1={inner.x.toFixed(1)} y1={inner.y.toFixed(1)} x2={outer.x.toFixed(1)} y2={outer.y.toFixed(1)}
                stroke="rgba(3,105,161,.30)" strokeWidth="1.5" />
              <text x={lbl.x.toFixed(1)} y={lbl.y.toFixed(1)} textAnchor="middle" dominantBaseline="central"
                fill="rgba(71,85,105,.50)" fontSize="6.5" fontFamily='"JetBrains Mono", monospace'>{Math.round(tp * 100)}</text>
            </g>
          );
        })}
        <text x={cx} y={cy + 6} textAnchor="middle" fill={col} fontSize="36" fontWeight="700"
          fontFamily='"JetBrains Mono", monospace'>{score}</text>
        <text x={cx} y={cy + 22} textAnchor="middle" fill="rgba(71,85,105,.35)" fontSize="7.5"
          fontFamily='"JetBrains Mono", monospace' letterSpacing="3">SCORE</text>
      </svg>
      <div className="font-mono text-[8px] uppercase tracking-[0.18em]" style={{ color: col }}>{label}</div>
      <div className="font-mono text-[7px] tracking-wide text-t3">FUNDED SCORE</div>
    </div>
  );
}

// ─── Radar Chart ──────────────────────────────────────────────────────────────
function RadarChart({ edgePts, winPts, discPts, samplePts, total }: {
  edgePts: number; winPts: number; discPts: number; samplePts: number; total: number;
}) {
  const S = 170, cx = 85, cy = 88, R = 55;
  const axes = [
    { label: "EDGE", max: 40, val: edgePts },
    { label: "WIN RATE", max: 25, val: winPts },
    { label: "DISCIPLINE", max: 25, val: discPts },
    { label: "SAMPLE", max: 10, val: samplePts },
  ];
  const N = 4;
  const ang = (i: number) => (i / N) * 2 * Math.PI - Math.PI / 2;
  const px = (i: number, r: number) => cx + r * Math.cos(ang(i));
  const py = (i: number, r: number) => cy + r * Math.sin(ang(i));
  const grids = [0.25, 0.5, 0.75, 1.0];
  const col = total >= 70 ? "#059669" : total >= 42 ? "#B45309" : "#DC2626";
  const valPath = axes.map((a, i) => {
    const r = R * Math.max(0.04, a.val / a.max);
    return `${i === 0 ? "M" : "L"}${px(i, r).toFixed(1)},${py(i, r).toFixed(1)}`;
  }).join(" ") + " Z";
  const LR = R + 24;
  return (
    <svg width={S} height={S} viewBox={`0 0 ${S} ${S}`} className="flex-shrink-0">
      {grids.map((g, gi) => {
        const d = axes.map((_, i) => `${i === 0 ? "M" : "L"}${px(i, R * g).toFixed(1)},${py(i, R * g).toFixed(1)}`).join(" ") + " Z";
        return <path key={gi} d={d} fill="none"
          stroke={gi === 3 ? "rgba(3,105,161,.18)" : "rgba(3,105,161,.08)"}
          strokeWidth={gi === 3 ? "0.8" : "0.5"} />;
      })}
      {axes.map((_, i) => (
        <line key={i} x1={cx} y1={cy} x2={px(i, R).toFixed(1)} y2={py(i, R).toFixed(1)}
          stroke="rgba(3,105,161,.14)" strokeWidth="0.6" />
      ))}
      <path d={valPath} fill={col} fillOpacity="0.14" stroke={col} strokeWidth="1.5"
        style={{ filter: `drop-shadow(0 0 6px ${col}88)` }} />
      {axes.map((a, i) => {
        const r = R * Math.max(0.04, a.val / a.max);
        return <circle key={i} cx={px(i, r).toFixed(1)} cy={py(i, r).toFixed(1)} r="2.5"
          fill={col} style={{ filter: `drop-shadow(0 0 4px ${col})` }} />;
      })}
      {axes.map((a, i) => (
        <text key={i} x={px(i, LR).toFixed(1)} y={py(i, LR).toFixed(1)}
          textAnchor="middle" dominantBaseline="central"
          fill="rgba(71,85,105,.55)" fontSize="6.5"
          fontFamily='"JetBrains Mono", monospace'>{a.label}</text>
      ))}
    </svg>
  );
}

// ─── Kill Zone Alert ──────────────────────────────────────────────────────────
function KillZoneAlert({ level, color, msg }: { level: string; color: string; msg: string }) {
  if (level === "nominal") return null;
  return (
    <div className="mb-5 rounded-lg px-5 py-3 dangerpulse"
      style={{ background: `repeating-linear-gradient(45deg,${color}12,${color}12 5px,transparent 5px,transparent 14px)`,
        border: `1px solid ${color}55`, color }}>
      <div className="flex items-center gap-3 font-mono text-[10px] uppercase tracking-wider">
        <span className="text-[16px]">&#9888;</span>
        <span className="font-semibold">Threat Level {level.toUpperCase()}</span>
        <span className="opacity-40 mx-1">|</span>
        <span className="opacity-75 normal-case tracking-normal text-[11px]">{msg}</span>
      </div>
    </div>
  );
}

// ─── Command Palette ──────────────────────────────────────────────────────────
type Cmd = { label: string; hint: string; action: () => void };
function CommandPalette({ open, close, setTab, setAcct, resetJournal }: {
  open: boolean; close: () => void;
  setTab: (t: string) => void; setAcct: (a: string) => void; resetJournal: () => void;
}) {
  const [q, setQ] = useState("");
  const [sel, setSel] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const cmds: Cmd[] = useMemo(() => [
    { label: "→ Pre-Trade Firewall", hint: "firewall check", action: () => { setTab("check"); close(); } },
    { label: "→ Behavioral Engine", hint: "behavior patterns", action: () => { setTab("behavior"); close(); } },
    { label: "→ Edge Analytics", hint: "edge expectancy", action: () => { setTab("edge"); close(); } },
    { label: "→ Journal", hint: "journal csv trades", action: () => { setTab("journal"); close(); } },
    { label: "→ Monte Carlo", hint: "monte carlo mc simulation fan", action: () => { setTab("mc"); close(); } },
    ...Object.keys(FIRMS).map((k) => ({
      label: "Firm: " + FIRMS[k].name, hint: k + " firm", action: () => { setAcct(k); close(); },
    })),
    { label: "Reset to sample journal", hint: "reset sample clear", action: () => { resetJournal(); close(); } },
  ], [close, setTab, setAcct, resetJournal]);
  const filtered = q ? cmds.filter((c) => (c.label + " " + c.hint).toLowerCase().includes(q.toLowerCase())) : cmds;
  useEffect(() => { if (open) { setQ(""); setSel(0); setTimeout(() => inputRef.current?.focus(), 40); } }, [open]);
  useEffect(() => { setSel(0); }, [q]);
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-[14vh] px-4"
      style={{ background: "rgba(248,250,252,.88)", backdropFilter: "blur(4px)" }} onClick={close}>
      <div className="w-full max-w-md overflow-hidden rounded-xl border shadow-2xl"
        style={{ borderColor: "rgba(3,105,161,.20)", background: "rgba(255,255,255,.98)" }}
        onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center gap-3 border-b px-4 py-3" style={{ borderColor: "rgba(3,105,161,.12)" }}>
          <span className="font-mono text-xs text-t2">⌘</span>
          <input ref={inputRef} value={q} onChange={(e) => setQ(e.target.value)}
            placeholder="Type a command or search…"
            className="flex-1 bg-transparent font-mono text-sm text-t1 outline-none placeholder-t3"
            onKeyDown={(e) => {
              if (e.key === "Escape") close();
              else if (e.key === "ArrowDown") { e.preventDefault(); setSel((s) => Math.min(s + 1, filtered.length - 1)); }
              else if (e.key === "ArrowUp") { e.preventDefault(); setSel((s) => Math.max(s - 1, 0)); }
              else if (e.key === "Enter" && filtered[sel]) filtered[sel].action();
            }} />
          <kbd className="rounded border px-1.5 py-0.5 font-mono text-[9px] text-t3"
            style={{ borderColor: "rgba(3,105,161,.15)" }}>ESC</kbd>
        </div>
        <div className="max-h-72 overflow-auto py-1">
          {filtered.map((c, i) => (
            <button key={i} onClick={c.action} onMouseEnter={() => setSel(i)}
              className={`flex w-full items-center px-4 py-2.5 text-left font-mono text-[11.5px] transition ${i === sel ? "text-t1" : "text-t2 hover:text-t1"}`}
              style={i === sel ? { background: "rgba(3,105,161,.09)" } : {}}>
              {c.label}
            </button>
          ))}
          {!filtered.length && <p className="px-4 py-5 text-center font-mono text-xs text-t3">No commands match.</p>}
        </div>
        <div className="border-t px-4 py-2 font-mono text-[9px] text-t3" style={{ borderColor: "rgba(3,105,161,.08)" }}>
          ↑↓ navigate · ⏎ run · ESC dismiss
        </div>
      </div>
    </div>
  );
}

// ─── Helpers ──────────────────────────────────────────────────────────────────
function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="mb-4">
      <label className="mb-1.5 block font-mono text-[9px] uppercase tracking-wider text-t2">{label}</label>
      {children}
    </div>
  );
}
function Toggle({ on, set, children }: { on: boolean; set: (v: boolean) => void; children: React.ReactNode }) {
  return (
    <div onClick={() => set(!on)}
      className={`cursor-pointer select-none rounded-full border px-3.5 py-2 font-mono text-[10px] transition ${on ? "border-amb bg-amb font-semibold text-bg" : "border-bd text-t2"}`}>
      {children}
    </div>
  );
}
function EdgeTable({ title, rows, actOf, actCls }: {
  title: string;
  rows: { key: string; n: number; winRate: number; exp: number }[];
  actOf: (e: number) => string;
  actCls: Record<string, string>;
}) {
  return (
    <div className="rounded-lg border border-bd bg-panel">
      <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
        <h3 className="font-sans text-[15px] font-semibold">{title}</h3>
        <span className="font-mono text-[8px] uppercase tracking-wider text-t2">Expectancy / trade</span>
      </div>
      <table className="w-full font-mono text-xs">
        <thead>
          <tr className="text-left text-t2">
            {["Group", "N", "Win%", "Exp/trade", "Action"].map((h) => (
              <th key={h} className="border-b border-bd px-3 py-2.5 text-[8.5px] uppercase tracking-wider font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((s) => {
            const a = actOf(s.exp);
            return (
              <tr key={s.key}>
                <td className="border-b border-white/5 px-3 py-2.5 text-t1">{s.key}</td>
                <td className="border-b border-white/5 px-3 py-2.5 text-t2">{s.n}</td>
                <td className="border-b border-white/5 px-3 py-2.5 text-t2">{(s.winRate * 100).toFixed(0)}%</td>
                <td className={`border-b border-white/5 px-3 py-2.5 ${s.exp >= 0 ? "text-grn" : "text-red"}`}>{fmtMoney(s.exp)}</td>
                <td className="border-b border-white/5 px-3 py-2.5">
                  <span className={`rounded px-2 py-0.5 text-[8.5px] uppercase ${actCls[a]}`}>{a}</span>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

// ─── CursorGlow — isolated so mousemove doesn't re-render Dashboard ────────────
function CursorGlow() {
  const [pos, setPos] = useState({ x: -999, y: -999 });
  useEffect(() => {
    const h = (e: MouseEvent) => setPos({ x: e.clientX, y: e.clientY });
    window.addEventListener("mousemove", h);
    return () => window.removeEventListener("mousemove", h);
  }, []);
  return (
    <div aria-hidden className="pointer-events-none fixed z-[4]"
      style={{ left: pos.x - 180, top: pos.y - 180, width: 360, height: 360,
        background: "radial-gradient(circle, rgba(3,105,161,.042) 0%, transparent 70%)",
        borderRadius: "50%", transition: "left .1s linear,top .1s linear" }} />
  );
}

// ─── Dashboard ─────────────────────────────────────────────────────────────────
export default function Dashboard() {
  const [journal, setJournal] = useState<Trade[]>(() => generateJournal());
  const [acct, setAcct] = useState<string>("topstep50");
  const [tab, setTab] = useState<string>("check");
  const [inst, setInst] = useState<string>("NQ");
  const [size, setSize] = useState<number>(3);
  const [stop, setStop] = useState<number>(14);
  const [dir, setDir] = useState<string>("Long");
  const [news, setNews] = useState<boolean>(false);
  const [tilt, setTilt] = useState<boolean>(false);
  const [result, setResult] = useState<CheckResult | null>(null);
  const [acctState, setAcctState] = useState<{ todayPnL: number; trailingRoom: number; daysTraded: number }>(
    () => SCENARIOS.topstep50
  );
  const [csvName, setCsvName] = useState<string>("");
  const [kOpen, setKOpen] = useState(false);
  const [mouse, setMouse] = useState({ x: 0, y: 0 });
  const [flash, setFlash] = useState<string | null>(null);
  const [confettiKey, setConfettiKey] = useState(0);
  const confettiRef = useRef<HTMLCanvasElement>(null);
  const [booting, setBooting] = useState(() => {
    try { return !sessionStorage.getItem("fc_booted"); } catch { return false; }
  });

  // persistence
  useEffect(() => {
    try {
      const j = localStorage.getItem("fc_journal");
      if (j) { const rows = JSON.parse(j); if (Array.isArray(rows) && rows.length) { setJournal(rows); setCsvName("(your imported journal)"); } }
      const a = localStorage.getItem("fc_acct");
      if (a && FIRMS[a]) setAcct(a);
      const st = localStorage.getItem("fc_state");
      if (st) { const o = JSON.parse(st); if (o && typeof o.todayPnL === "number") setAcctState(o); }
    } catch {}
  }, []);

  // ⌘K
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") { e.preventDefault(); setKOpen((o) => !o); }
      if (e.key === "Escape") setKOpen(false);
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);


  // confetti burst on APPROVE
  useEffect(() => {
    if (confettiKey === 0) return;
    const cv = confettiRef.current;
    if (!cv) return;
    cv.width = window.innerWidth; cv.height = window.innerHeight;
    const ctx = cv.getContext("2d");
    if (!ctx) return;
    const COLS = ["#059669", "#0369A1", "#B45309", "#0F172A", "#059669", "#0369A1"];
    const pts = Array.from({ length: 90 }, () => ({
      x: window.innerWidth / 2 + (Math.random() - 0.5) * 300,
      y: window.innerHeight * 0.38,
      vx: (Math.random() - 0.5) * 18, vy: -(Math.random() * 22 + 8),
      col: COLS[Math.floor(Math.random() * COLS.length)],
      w: 5 + Math.random() * 9, h: 3 + Math.random() * 5,
      rot: Math.random() * Math.PI * 2, rv: (Math.random() - 0.5) * 0.25,
      life: 1,
    }));
    let raf = 0;
    const tick = () => {
      ctx.clearRect(0, 0, cv.width, cv.height);
      let alive = false;
      for (const p of pts) {
        p.x += p.vx; p.y += p.vy; p.vy += 0.65; p.vx *= 0.985;
        p.rot += p.rv; p.life -= 0.015;
        if (p.life <= 0) continue;
        alive = true;
        ctx.save();
        ctx.globalAlpha = Math.min(1, p.life * 1.5);
        ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.col;
        ctx.fillRect(-p.w / 2, -p.h / 2, p.w, p.h);
        ctx.restore();
      }
      if (alive) raf = requestAnimationFrame(tick);
      else ctx.clearRect(0, 0, cv.width, cv.height);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [confettiKey]);

  const firm = FIRMS[acct];
  const sc = acctState;

  function updState(k: "todayPnL" | "trailingRoom" | "daysTraded", v: number) {
    setAcctState((s) => {
      const n = { ...s, [k]: v };
      try { localStorage.setItem("fc_state", JSON.stringify(n)); } catch {}
      return n;
    });
  }
  function resetJournal() {
    setJournal(generateJournal()); setCsvName("");
    try { localStorage.removeItem("fc_journal"); } catch {}
  }

  const all = useMemo(() => expectancy(journal), [journal]);
  const setups = useMemo(() => groupBy(journal, (t) => t.setup).sort((a, b) => b.exp - a.exp), [journal]);
  const hours = useMemo(() => groupBy(journal, (t) => hourBucket(t.hour)).sort((a, b) => b.exp - a.exp), [journal]);
  const sigs = useMemo(() => behaviorSignatures(journal), [journal]);
  const eq = useMemo(() => equitySeries(journal), [journal]);
  const score = useMemo(() => fundedScore(journal), [journal]);
  const mc = useMemo(() => monteCarlo(journal, firm.trailingDD), [journal, firm.trailingDD]);
  const discJournal = useMemo(() => {
    const negSetups = new Set(setups.filter((s) => s.exp < 0).map((s) => s.key));
    return journal.filter((t) => !negSetups.has(t.setup));
  }, [journal, setups]);
  const mcDisc = useMemo(() => monteCarlo(discJournal, firm.trailingDD), [discJournal, firm.trailingDD]);

  const scoreBreakdown = useMemo(() => {
    const edgePts = Math.min(40, Math.max(0, (all.exp / 50) * 40));
    const winPts = Math.min(25, all.winRate * 25);
    const negCount = setups.filter((s) => s.exp < 0).length;
    const discPts = Math.min(25, Math.max(0, 25 - negCount * 6));
    const samplePts = Math.min(10, (journal.length / 100) * 10);
    return { edgePts: +edgePts.toFixed(1), winPts: +winPts.toFixed(1), discPts: +discPts.toFixed(1), samplePts: +samplePts.toFixed(1) };
  }, [all, setups, journal.length]);

  const dailyRoom = firm.dailyLoss == null ? null : Math.max(0, firm.dailyLoss - Math.max(0, -sc.todayPnL));
  const dailyPct = firm.dailyLoss == null ? 100 : (dailyRoom! / firm.dailyLoss) * 100;
  const trailPct = (sc.trailingRoom / firm.trailingDD) * 100;
  const minPct = firm.minDays === 0 ? 100 : Math.min(100, (sc.daysTraded / firm.minDays) * 100);
  const col = (p: number) => (p > 50 ? "#059669" : p > 25 ? "#B45309" : "#DC2626");

  const threatLevel = useMemo(() => {
    const p = Math.min(dailyPct, trailPct);
    if (p < 15) return { level: "critical", color: "#DC2626", msg: "BREACH IMMINENT — reduce exposure immediately" };
    if (p < 30) return { level: "critical", color: "#DC2626", msg: "CRITICAL RISK — drawdown limit approaching fast" };
    if (p < 50) return { level: "elevated", color: "#B45309", msg: "Elevated risk — monitor drawdown closely" };
    return { level: "nominal", color: "#059669", msg: "All limits healthy" };
  }, [dailyPct, trailPct]);

  // SystemStatusBar (with session timer)
  const fmtClock = () => new Date().toLocaleTimeString("en-US", { hour12: false, hour: "2-digit", minute: "2-digit", second: "2-digit" });
  const [clock, setClock] = useState(fmtClock);
  const [elapsed, setElapsed] = useState(0);
  useEffect(() => {
    const id = setInterval(() => { setClock(fmtClock()); setElapsed((e) => e + 1); }, 1000);
    return () => clearInterval(id);
  }, []);
  const hh = String(Math.floor(elapsed / 3600)).padStart(2, "0");
  const mm = String(Math.floor((elapsed % 3600) / 60)).padStart(2, "0");
  const ss = String(elapsed % 60).padStart(2, "0");

  // animated hero counters
  const animTrades = useCountUp(all.n);
  const animNetRaw = useCountUp(Math.round(all.sum));
  const animWinRate = useCountUp(Math.round(all.winRate * 100));
  const animExp = useCountUp(Math.round(all.exp));

  const smallGauges = [
    { l: "Today P&L", v: (sc.todayPnL >= 0 ? "+" : "") + "$" + sc.todayPnL, p: 50, c: sc.todayPnL >= 0 ? "#059669" : "#DC2626", s: "realized" },
    { l: "Min Days", v: sc.daysTraded + "/" + firm.minDays, p: minPct, c: minPct >= 100 ? "#059669" : "#0369A1", s: firm.minDays === 0 ? "no minimum" : Math.max(0, firm.minDays - sc.daysTraded) + " left" },
    { l: "Account", v: "ALIVE", p: 100, c: "#059669", s: firm.name.split(" ")[0] + " · funded" },
  ];

  const disciplined = eq.B[eq.B.length - 1] || 0;
  let edge: { icon: string; col: string; bg: string; title: string; msg: string };
  if (all.exp > 15) edge = { icon: "✓", col: "#059669", bg: "rgba(5,150,105,.10)", title: "Demonstrated edge: YES", msg: `Across ${all.n} trades your overall expectancy is <b style="color:#059669">${fmtMoney(all.exp)}/trade</b>. The edge is real — protect it by cutting the red rows below.` };
  else if (all.exp > 0) edge = { icon: "≈", col: "#B45309", bg: "rgba(180,83,9,.09)", title: "Demonstrated edge: MARGINAL", msg: `Overall expectancy is only <b style="color:#B45309">${fmtMoney(all.exp)}/trade</b> across ${all.n} trades.` };
  else if (disciplined > 0) edge = { icon: "!", col: "#B45309", bg: "rgba(180,83,9,.09)", title: "Demonstrated edge: BURIED", msg: `Net <b style="color:#DC2626">${fmtMoney(all.sum)}</b> — but cutting <b>${eq.negSetups.join(" &amp; ")}</b> flips it to <b style="color:#059669">${fmtMoney(disciplined)}</b>.` };
  else edge = { icon: "✗", col: "#DC2626", bg: "rgba(220,38,38,.09)", title: "Demonstrated edge: NONE YET", msg: `Overall expectancy is <b style="color:#DC2626">${fmtMoney(all.exp)}/trade</b>. Priority: find one positive-expectancy setup.` };

  const actOf = (e: number) => (e > 10 ? "scale" : e < 0 ? "cut" : "hold");
  const actCls: Record<string, string> = { scale: "text-grn bg-grn/10", cut: "text-red bg-red/10", hold: "text-t2 bg-white/5" };

  function runCheck() {
    const r = preTradeCheck(firm, sc, { instrument: inst, size: Math.max(1, size || 1), stop: Math.max(1, stop || 1), news, tilt });
    setResult(r);
    setFlash(VCOLOR[r.verdict]);
    setTimeout(() => setFlash(null), 860);
    if (r.verdict === "APPROVE") setConfettiKey((k) => k + 1);
  }
  function onCSV(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0]; if (!f) return;
    const r = new FileReader();
    r.onload = () => {
      const rows = parseCSV(String(r.result || ""));
      if (rows.length) { setJournal(rows); setCsvName(f.name); try { localStorage.setItem("fc_journal", JSON.stringify(rows)); } catch {} }
    };
    r.readAsText(f);
  }

  return (
    <>
      {booting && <BootScreen onDone={() => { setBooting(false); try { sessionStorage.setItem("fc_booted", "1"); } catch {} }} />}

      <ParticleCanvas />
      <DataRain />

      <CommandPalette open={kOpen} close={() => setKOpen(false)} setTab={setTab}
        setAcct={(a) => { setAcct(a); setResult(null); try { localStorage.setItem("fc_acct", a); } catch {} }}
        resetJournal={resetJournal} />

      {/* verdict flash */}
      {flash && <div className="pointer-events-none fixed inset-0 z-40" style={{ background: flash, animation: "verdictFlash 0.86s ease-out forwards" }} />}

      {/* confetti canvas */}
      <canvas ref={confettiRef} className="pointer-events-none fixed inset-0 z-[45]" />

      {/* cursor glow — isolated component so mousemove state doesn't re-render Dashboard */}
      <CursorGlow />

      {/* atmospheric glow */}
      <div aria-hidden className="pointer-events-none fixed inset-0 z-[1]"
        style={{
          background: threatLevel.level === "critical"
            ? "radial-gradient(ellipse 90% 50% at 50% 110%,rgba(220,38,38,.05) 0%,transparent 70%)"
            : threatLevel.level === "elevated"
            ? "radial-gradient(ellipse 90% 50% at 50% 110%,rgba(180,83,9,.035) 0%,transparent 70%)"
            : "radial-gradient(ellipse 90% 50% at 50% 110%,rgba(5,150,105,.025) 0%,transparent 70%)",
          transition: "background 1.5s ease",
        }} />

      <div aria-hidden className="fc-scanlines pointer-events-none fixed inset-0 z-[2]" />
      <div aria-hidden className="fc-vignette pointer-events-none fixed inset-0 z-[2]" />

      <main className="relative z-10 font-body text-t1">
        <div aria-hidden className="fc-scan" />

        {/* system status bar */}
        <div className="sticky top-0 z-[41] flex h-[26px] items-center justify-between px-6 font-mono text-[9px] uppercase tracking-[0.18em]"
          style={{ background: "rgba(248,250,252,.97)", borderBottom: "1px solid rgba(3,105,161,.06)" }}>
          <div className="flex items-center gap-6">
            <span className="text-acc tabnum">{clock}</span>
            <span className="flex items-center gap-1.5 text-grn">
              <span className="inline-block h-1 w-1 rounded-full bg-grn pulse" />SYSTEM ONLINE
            </span>
            <span className="hidden text-t3 md:inline">{journal.length} TRADES LOADED</span>
            <span className="hidden tabnum text-t3 lg:inline">SESSION {hh}:{mm}:{ss}</span>
          </div>
          <div className="flex items-center gap-6">
            <span className="hidden text-t2 md:inline">{firm.name}</span>
            <span className="font-semibold" style={{ color: threatLevel.color }}>THREAT: {threatLevel.level.toUpperCase()}</span>
          </div>
        </div>

        {/* header */}
        <header className="sticky top-[26px] z-40 border-b border-bd bg-bg/85 backdrop-blur">
          <div className="mx-auto flex h-[62px] max-w-6xl items-center justify-between px-6">
            <Link href="/" className="font-sans text-[17px] font-bold tracking-wide">
              FUNDED<span className="text-acc">.</span>CORE
              <span className="ml-2 font-mono text-[8.5px] uppercase tracking-[0.22em] text-t2">Intelligence</span>
            </Link>
            <div className="hidden flex-1 items-center justify-center px-8 md:flex">
              <MarketTicker />
            </div>
            <div className="flex items-center gap-3 font-mono text-[11px]">
              <button onClick={() => setKOpen(true)}
                className="hidden items-center gap-1.5 rounded border border-bd px-2.5 py-1.5 font-mono text-[10px] text-t2 transition hover:border-acc/50 hover:text-t1 md:flex">
                ⌘K
              </button>
              <span className="flex items-center gap-1.5 uppercase tracking-[0.16em] text-grn">
                <span className="h-1.5 w-1.5 rounded-full bg-grn pulse" />Live
              </span>
              <select value={acct}
                onChange={(e) => { setAcct(e.target.value); setResult(null); try { localStorage.setItem("fc_acct", e.target.value); } catch {} }}
                className="rounded border border-bd bg-panel px-3 py-2 font-mono text-[11px] text-t1 outline-none">
                {Object.keys(FIRMS).map((k) => (<option key={k} value={k}>{FIRMS[k].name}</option>))}
              </select>
            </div>
          </div>
        </header>

        <div className="mx-auto max-w-6xl px-6">

          {/* hero */}
          <div className="py-10"
            onMouseMove={(e) => {
              const r = e.currentTarget.getBoundingClientRect();
              setMouse({ x: (e.clientX - r.left - r.width / 2) / r.width, y: (e.clientY - r.top - r.height / 2) / r.height });
            }}
            onMouseLeave={() => setMouse({ x: 0, y: 0 })}>
            <div className="flex items-start justify-between gap-6">
              <div style={{ transform: `translate(${mouse.x * -9}px,${mouse.y * -7}px)`, transition: "transform .15s ease-out" }}>
                <div className="mb-3 flex items-center gap-2.5 font-mono text-[9px] uppercase tracking-[0.3em] text-acc">
                  <span className="h-px w-6 bg-acc" />Trader Operating System
                </div>
                <h1 className="font-sans text-3xl font-bold leading-tight tracking-tight sm:text-4xl">
                  Keep the account alive.<br />
                  <span className="fc-glow bg-gradient-to-r from-t1 to-acc bg-clip-text text-transparent">
                    Then make it profitable.
                  </span>
                </h1>
                <div className="mt-6 flex flex-wrap items-end gap-x-7 gap-y-3">
                  {[
                    { l: "TRADES", v: String(animTrades), c: "#0F172A" },
                    { l: "NET P&L", v: (animNetRaw >= 0 ? "+" : "") + "$" + Math.abs(animNetRaw).toLocaleString(), c: all.sum >= 0 ? "#059669" : "#DC2626" },
                    { l: "WIN RATE", v: animWinRate + "%", c: all.winRate >= 0.5 ? "#059669" : "#B45309" },
                    { l: "EXP / TRADE", v: (animExp >= 0 ? "+" : "") + "$" + Math.abs(animExp), c: all.exp >= 0 ? "#059669" : "#DC2626" },
                  ].map((s) => (
                    <div key={s.l} className="flex flex-col">
                      <span className="tabnum font-mono text-[22px] font-semibold leading-none" style={{ color: s.c }}>{s.v}</span>
                      <span className="mt-1 font-mono text-[7.5px] uppercase tracking-[0.22em] text-t3">{s.l}</span>
                    </div>
                  ))}
                </div>
                <div className="mt-4 w-48 opacity-60">
                  <MiniSparkline data={eq.A} />
                </div>
              </div>
              <div className="hidden flex-shrink-0 md:block"
                style={{ transform: `translate(${mouse.x * 13}px,${mouse.y * 10}px)`, transition: "transform .15s ease-out" }}>
                <ScoreRadial score={score} />
              </div>
            </div>
          </div>

          <KillZoneAlert level={threatLevel.level} color={threatLevel.color} msg={threatLevel.msg} />

          {/* cockpit: BigGauge top 2 */}
          <div className="mb-[2px] grid grid-cols-1 gap-[2px] border border-b-0 border-bd bg-bd md:grid-cols-2">
            <BigGauge label="Trailing Drawdown Room"
              value={"$" + sc.trailingRoom.toLocaleString()} pct={trailPct} color={col(trailPct)}
              sub={`$${sc.trailingRoom.toLocaleString()} of $${firm.trailingDD.toLocaleString()} remaining`} />
            <BigGauge label="Daily Loss Room"
              value={firm.dailyLoss == null ? "N/A" : "$" + (dailyRoom ?? 0).toLocaleString()} pct={dailyPct} color={col(dailyPct)}
              sub={firm.dailyLoss == null ? "no daily limit" : `$${(dailyRoom ?? 0).toLocaleString()} of $${firm.dailyLoss.toLocaleString()} remaining`} />
          </div>
          {/* cockpit: 3 circular gauges */}
          <div className="grid grid-cols-2 gap-[2px] border border-bd bg-bd md:grid-cols-3 mb-2">
            {smallGauges.map((g) => (
              <CircularGauge key={g.l} label={g.l} value={String(g.v)} pct={g.p} color={g.c} sub={g.s} />
            ))}
          </div>
          <p className="font-mono text-[10px] text-t3">
            Live account snapshot · firewall evaluates every trade against this state.
          </p>

          <div className="mt-3 rounded-lg border border-bd bg-panel p-4">
            <div className="mb-3 font-mono text-[9px] uppercase tracking-wider text-acc">Your account snapshot — edit to match your real account</div>
            <div className="grid grid-cols-2 gap-3 md:grid-cols-3">
              <Field label="Today P/L ($)"><input type="number" className="fcin" value={sc.todayPnL} onChange={(e) => updState("todayPnL", +e.target.value)} /></Field>
              <Field label="Trailing room ($)"><input type="number" className="fcin" value={sc.trailingRoom} onChange={(e) => updState("trailingRoom", +e.target.value)} /></Field>
              <Field label="Days traded"><input type="number" className="fcin" value={sc.daysTraded} onChange={(e) => updState("daysTraded", +e.target.value)} /></Field>
            </div>
          </div>

          {/* tabs */}
          <div className="mt-8 flex flex-wrap gap-[2px] border-b border-bd">
            {TABS.map(([id, label]) => (
              <button key={id} onClick={() => setTab(id)}
                className={`-mb-px border-b-2 px-5 py-3.5 font-mono text-[11px] uppercase tracking-wider transition ${tab === id ? "border-acc text-white tabglow" : "border-transparent text-t2 hover:text-t1"}`}>
                {label}
              </button>
            ))}
          </div>

          {/* tab: check */}
          {tab === "check" && (
            <div className="fade py-8">
              <p className="mb-6 max-w-2xl text-sm leading-relaxed text-t2">
                Enter the trade you&apos;re about to take. FundedCore checks it against your firm&apos;s rules and live account state, then returns a verdict.
              </p>
              <div className="grid gap-5 md:grid-cols-[420px_1fr]">
                <div className="rounded-lg border border-bd bg-panel">
                  <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                    <h3 className="font-sans text-[15px] font-semibold">Proposed Trade</h3>
                    <span className="font-mono text-[8px] uppercase tracking-wider text-t2">{firm.name}</span>
                  </div>
                  <div className="p-5">
                    <Field label="Instrument">
                      <select value={inst} onChange={(e) => setInst(e.target.value)} className="fcin">
                        {Object.keys(INSTRUMENTS).map((k) => (<option key={k} value={k}>{INSTRUMENTS[k].name}</option>))}
                      </select>
                    </Field>
                    <div className="grid grid-cols-2 gap-3">
                      <Field label="Size (contracts)"><input type="number" value={size} min={1} onChange={(e) => setSize(+e.target.value)} className="fcin" /></Field>
                      <Field label="Stop (points)"><input type="number" value={stop} min={1} onChange={(e) => setStop(+e.target.value)} className="fcin" /></Field>
                    </div>
                    <Field label="Direction">
                      <select value={dir} onChange={(e) => setDir(e.target.value)} className="fcin">
                        <option>Long</option><option>Short</option>
                      </select>
                    </Field>
                    <div className="mb-4 flex flex-wrap gap-2.5">
                      <Toggle on={news} set={setNews}>News window</Toggle>
                      <Toggle on={tilt} set={setTilt}>After 2 losses today</Toggle>
                    </div>
                    <button onClick={runCheck}
                      className="w-full rounded-md bg-acc py-3.5 font-mono text-xs font-semibold uppercase tracking-wider text-bg transition hover:bg-[#0284C7]">
                      Run Pre-Trade Check
                    </button>
                  </div>
                </div>
                <TiltCard className="overflow-hidden rounded-lg border"
                  style={{ borderColor: result ? VCOLOR[result.verdict] : "rgba(3,105,161,0.09)" }}>
                  {!result ? (
                    <div className="px-6 py-20 text-center font-mono text-xs tracking-wide text-t3">Run a check to see the verdict.</div>
                  ) : (
                    <>
                      <div className="px-6 py-6 text-center" style={{ background: VCOLOR[result.verdict], color: "#F8FAFC" }}>
                        <div key={result.verdict} className="verdict-type font-sans text-4xl font-bold">{result.verdict}</div>
                        <div className="mt-2 font-mono text-[11px] tracking-wide opacity-80">{VSUB[result.verdict]}</div>
                      </div>
                      <div className="px-6 py-5">
                        <p className="mb-4 text-sm leading-relaxed" dangerouslySetInnerHTML={{ __html: result.reason }} />
                        {result.verdict === "REDUCE" && (
                          <div className="flex justify-between border-b border-white/5 py-2.5 font-mono text-[11.5px]">
                            <span className="text-t2">recommended_size</span>
                            <span className="text-white">{result.safeSize} contracts</span>
                          </div>
                        )}
                        {result.checks.map((c, i) => (
                          <div key={i} className="flex items-center justify-between border-b border-white/5 py-2.5 font-mono text-[11.5px] last:border-0">
                            <span className="text-t2">{c.l}</span>
                            <span className="flex items-center gap-2">
                              <span className={`rounded px-2 py-0.5 text-[8.5px] uppercase ${c.s === "ok" ? "bg-grn/10 text-grn" : c.s === "warn" ? "bg-amb/10 text-amb" : "bg-red/10 text-red"}`}>
                                {c.s === "ok" ? "pass" : c.s === "warn" ? "hold" : "fail"}
                              </span>
                              <span className="text-t1">{c.v}</span>
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  )}
                </TiltCard>
              </div>
            </div>
          )}

          {/* tab: behavior */}
          {tab === "behavior" && (
            <div className="fade py-8">
              <p className="mb-6 max-w-2xl text-sm leading-relaxed text-t2">
                From your journal, the behavioral engine finds your failure signature — ranked by what they actually cost you.
              </p>
              {sigs.map((s, i) => (
                <div key={i} className="relative mb-3.5 overflow-hidden rounded-lg border border-bd bg-panel p-6">
                  <div className="absolute left-0 top-0 h-full w-[3px]"
                    style={{ background: s.sev === "high" ? "#DC2626" : s.sev === "med" ? "#B45309" : "#059669" }} />
                  <div className="mb-2.5 flex items-start justify-between gap-4">
                    <div className="font-sans text-base font-semibold">{s.name}</div>
                    <div className={`whitespace-nowrap rounded px-2.5 py-1 font-mono text-[8.5px] uppercase tracking-wider ${s.sev === "high" ? "bg-red/10 text-red" : s.sev === "med" ? "bg-amb/10 text-amb" : "bg-grn/10 text-grn"}`}>
                      {s.sev} severity
                    </div>
                  </div>
                  <p className="mb-3.5 text-sm leading-relaxed text-t2" dangerouslySetInnerHTML={{ __html: s.desc }} />
                  <div className="flex flex-wrap gap-7">
                    {s.stats.map((st, j) => (
                      <div key={j}>
                        <div className="font-mono text-xl font-medium text-white">{st[0]}</div>
                        <div className="mt-0.5 font-mono text-[8px] uppercase tracking-wider text-t3">{st[1]}</div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
              {!sigs.length && <div className="py-16 text-center font-mono text-xs text-t3">No destructive patterns detected.</div>}
            </div>
          )}

          {/* tab: edge */}
          {tab === "edge" && (
            <div className="fade py-8">
              <p className="mb-6 max-w-2xl text-sm leading-relaxed text-t2">
                Discipline keeps you alive; edge makes you money. Your real expectancy by setup and time.
              </p>
              <div className="mb-5 flex items-center gap-5 rounded-lg border p-6" style={{ borderColor: edge.col + "55" }}>
                <div className="flex h-16 w-16 flex-shrink-0 items-center justify-center rounded-full font-sans text-3xl font-bold"
                  style={{ background: edge.bg, color: edge.col }} dangerouslySetInnerHTML={{ __html: edge.icon }} />
                <div>
                  <h4 className="mb-1 font-sans text-lg font-semibold">{edge.title}</h4>
                  <p className="text-sm leading-relaxed text-t2" dangerouslySetInnerHTML={{ __html: edge.msg }} />
                </div>
              </div>

              {/* FundedScore Breakdown — radar + bars */}
              <div className="mb-5 rounded-lg border border-bd bg-panel p-5">
                <div className="flex items-center justify-between border-b border-white/5 pb-4 mb-5">
                  <h3 className="font-sans text-[15px] font-semibold">FundedScore Breakdown</h3>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-t2">4 components · total {score}/100</span>
                </div>
                <div className="flex flex-col items-center gap-6 md:flex-row md:items-start">
                  <RadarChart {...scoreBreakdown} total={score} />
                  <div className="flex-1 w-full space-y-4">
                    {[
                      { l: "Edge Quality", v: scoreBreakdown.edgePts, max: 40, desc: "Expectancy depth" },
                      { l: "Win Rate", v: scoreBreakdown.winPts, max: 25, desc: "Hit rate quality" },
                      { l: "Discipline", v: scoreBreakdown.discPts, max: 25, desc: "Negative setup avoidance" },
                      { l: "Sample Size", v: scoreBreakdown.samplePts, max: 10, desc: "Statistical confidence" },
                    ].map((b) => {
                      const bCol = b.v / b.max > 0.66 ? "#059669" : b.v / b.max > 0.33 ? "#B45309" : "#DC2626";
                      return (
                        <div key={b.l}>
                          <div className="flex justify-between font-mono text-[9px] mb-1.5">
                            <span className="uppercase tracking-wider text-t2">{b.l}</span>
                            <span className="flex items-center gap-3">
                              <span className="text-t3 normal-case tracking-normal">{b.desc}</span>
                              <span className="tabnum font-semibold" style={{ color: bCol }}>{b.v}<span className="opacity-40 font-normal">/{b.max}</span></span>
                            </span>
                          </div>
                          <div className="h-[2px] rounded-full" style={{ background: "rgba(3,105,161,.08)" }}>
                            <div className="h-full rounded-full"
                              style={{ width: (b.v / b.max * 100).toFixed(1) + "%", background: bCol, boxShadow: `0 0 8px ${bCol}88`, transition: "width .9s cubic-bezier(.4,0,.2,1)" }} />
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>

              <div className="mb-5 grid grid-cols-2 gap-[2px] border border-bd bg-bd md:grid-cols-4">
                {[
                  ["Trades analyzed", String(all.n), "#0F172A"],
                  ["Win rate", (all.winRate * 100).toFixed(0) + "%", "#0F172A"],
                  ["Expectancy / trade", fmtMoney(all.exp), all.exp >= 0 ? "#059669" : "#DC2626"],
                  ["Net P&L", fmtMoney(all.sum), all.sum >= 0 ? "#059669" : "#DC2626"],
                ].map((b) => (
                  <div key={b[0]} className="bg-panel p-4">
                    <div className="tabnum font-mono text-2xl font-medium" style={{ color: b[2] }}>{b[1]}</div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-t2">{b[0]}</div>
                  </div>
                ))}
              </div>
              <div className="mb-5 rounded-lg border border-bd bg-panel">
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                  <h3 className="font-sans text-[15px] font-semibold">Equity — actual vs. discipline</h3>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-t2">Counterfactual</span>
                </div>
                <div className="p-5">
                  <EquityChart trades={journal} />
                  <div className="mt-3.5 flex flex-wrap gap-5 font-mono text-[10px] text-t2">
                    <span className="flex items-center gap-1.5"><i className="inline-block h-[3px] w-3.5 rounded" style={{ background: "#475569" }} />Actual equity</span>
                    <span className="flex items-center gap-1.5"><i className="inline-block h-[3px] w-3.5 rounded" style={{ background: "#059669" }} />If you cut negative-expectancy trades</span>
                  </div>
                </div>
              </div>
              <div className="grid gap-5 md:grid-cols-2">
                <EdgeTable title="Edge by Setup" rows={setups} actOf={actOf} actCls={actCls} />
                <EdgeTable title="Edge by Time of Day" rows={hours} actOf={actOf} actCls={actCls} />
              </div>
            </div>
          )}

          {/* tab: journal */}
          {tab === "journal" && (
            <div className="fade py-8">
              <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
                <p className="max-w-xl text-sm text-t2">The journal powering the analytics. Import your own to run it on real trades.</p>
                <div className="flex items-center gap-3">
                  <a href={"data:text/csv;charset=utf-8," + encodeURIComponent(CSV_TEMPLATE)}
                    download="fundedcore-template.csv"
                    className="font-mono text-[10px] uppercase tracking-wider text-acc hover:underline">Download template</a>
                  <label className="cursor-pointer rounded-md border border-bd px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-t1 hover:border-acc">
                    Import CSV<input type="file" accept=".csv" className="hidden" onChange={onCSV} />
                  </label>
                  {csvName && <span className="font-mono text-[10px] text-grn">&#10003; {csvName}</span>}
                  {csvName && <button onClick={resetJournal} className="font-mono text-[10px] text-t2 hover:text-t1">reset sample</button>}
                </div>
              </div>
              <div className="max-h-[560px] overflow-auto rounded-lg border border-bd bg-panel">
                <table className="w-full font-mono text-xs">
                  <thead className="sticky top-0 bg-panel">
                    <tr className="text-left text-t2">
                      {["ID", "Date", "Time", "Inst", "Setup", "Dir", "Size", "R", "P&L"].map((h) => (
                        <th key={h} className="border-b border-bd px-3 py-2.5 text-[8.5px] uppercase tracking-wider font-medium">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {journal.slice().reverse().map((t) => (
                      <tr key={t.id}>
                        <td className="border-b border-white/5 px-3 py-2.5 text-t2">#{t.id}</td>
                        <td className="border-b border-white/5 px-3 py-2.5 text-t2">{t.date}</td>
                        <td className="border-b border-white/5 px-3 py-2.5 text-t2">{String(t.hour).padStart(2, "0")}:00</td>
                        <td className="border-b border-white/5 px-3 py-2.5">{t.instrument}</td>
                        <td className="border-b border-white/5 px-3 py-2.5">
                          {t.setup}
                          {t.revenge && <span className="ml-1.5 rounded bg-red/10 px-1.5 py-0.5 text-[8px] uppercase text-red">revenge</span>}
                        </td>
                        <td className="border-b border-white/5 px-3 py-2.5 text-t2">{t.dir}</td>
                        <td className="border-b border-white/5 px-3 py-2.5 text-right text-t2">{t.size}</td>
                        <td className={`border-b border-white/5 px-3 py-2.5 text-right tabnum ${t.R >= 0 ? "text-grn" : "text-red"}`}>{t.R > 0 ? "+" : ""}{t.R}R</td>
                        <td className={`border-b border-white/5 px-3 py-2.5 text-right tabnum ${t.pnl >= 0 ? "text-grn" : "text-red"}`}>{fmtMoney(t.pnl)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* tab: monte carlo */}
          {tab === "mc" && (
            <div className="fade py-8">
              <p className="mb-6 max-w-2xl text-sm leading-relaxed text-t2">
                Bootstrap resampling — 500 simulated 80-trade runs. Each line is a possible future. The red line is your trailing drawdown limit.
              </p>
              <div className="mb-6 grid grid-cols-2 gap-[2px] border border-bd bg-bd md:grid-cols-3">
                {[
                  { l: "Blow rate · base", v: (mc.blow * 100).toFixed(0) + "%", c: mc.blow > 0.5 ? "#DC2626" : "#B45309", s: "hit trailing DD" },
                  { l: "Survive rate · base", v: (mc.survive * 100).toFixed(0) + "%", c: mc.survive > 0.5 ? "#059669" : "#B45309", s: "avoid DD breach" },
                  { l: "Pass rate · base", v: (mc.pass * 100).toFixed(0) + "%", c: mc.pass > 0.5 ? "#059669" : "#B45309", s: "survive + profitable" },
                  { l: "Blow rate · disciplined", v: (mcDisc.blow * 100).toFixed(0) + "%", c: mcDisc.blow < mc.blow ? "#059669" : "#DC2626", s: "after cutting leaks" },
                  { l: "Survive rate · disciplined", v: (mcDisc.survive * 100).toFixed(0) + "%", c: mcDisc.survive > mc.survive ? "#059669" : "#B45309", s: "after cutting leaks" },
                  { l: "Pass rate · disciplined", v: (mcDisc.pass * 100).toFixed(0) + "%", c: mcDisc.pass > mc.pass ? "#059669" : "#B45309", s: "after cutting leaks" },
                ].map((s) => (
                  <div key={s.l} className="bg-panel p-5">
                    <div className="tabnum font-mono text-2xl font-medium" style={{ color: s.c }}>{s.v}</div>
                    <div className="mt-1 font-mono text-[8px] uppercase tracking-wider text-t2">{s.l}</div>
                    <div className="mt-0.5 font-mono text-[8px] text-t3">{s.s}</div>
                  </div>
                ))}
              </div>
              <div className="mb-5 rounded-lg border border-bd bg-panel">
                <div className="flex items-center justify-between border-b border-white/5 px-5 py-4">
                  <h3 className="font-sans text-[15px] font-semibold">Account Path Fan Chart — Base Journal</h3>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-t2">500 sims · 80 trades each</span>
                </div>
                <div className="p-5">
                  <MonteCarloChart key={"base-" + acct + journal.length} result={mc} trailingDD={firm.trailingDD} />
                </div>
              </div>
              <div className="rounded-lg border border-bd bg-panel">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-white/5 px-5 py-4">
                  <h3 className="font-sans text-[15px] font-semibold">Account Path Fan Chart — After Discipline</h3>
                  <span className="font-mono text-[8px] uppercase tracking-wider text-t2">
                    {journal.length - discJournal.length} trades removed
                  </span>
                </div>
                <div className="p-5">
                  <MonteCarloChart key={"disc-" + acct + discJournal.length} result={mcDisc} trailingDD={firm.trailingDD} />
                  <p className="mt-3 font-mono text-[10px] text-t3">
                    Same journal, same methodology. Removing negative-expectancy setups reveals the path your account would have taken.
                  </p>
                </div>
              </div>
            </div>
          )}
        </div>

        <footer className="mt-12 border-t border-bd py-7">
          <div className="mx-auto max-w-6xl px-6 font-mono text-[10px] leading-relaxed text-t3">
            FundedCore is decision-support software — not a broker, no trade execution, no financial advice. Rule values and the sample journal are illustrative. Trading leveraged products carries substantial risk of loss.
          </div>
        </footer>

        <style>{`
          .ticker-scroll{animation:tickerMove 28s linear infinite}
          @keyframes tickerMove{from{transform:translateX(0)}to{transform:translateX(-50%)}}
          .fcin{width:100%;background:rgba(255,255,255,.95);color:#0F172A;border:1px solid rgba(3,105,161,.15);border-radius:6px;padding:11px 12px;font-family:"JetBrains Mono",monospace;font-size:13px;outline:none;transition:border-color .2s,box-shadow .2s}
          .fcin:focus{border-color:#0369A1;box-shadow:0 0 0 3px rgba(3,105,161,.12)}
          .bg-panel{background:rgba(255,255,255,.96)!important;backdrop-filter:blur(10px);-webkit-backdrop-filter:blur(10px);box-shadow:0 1px 3px rgba(0,0,0,.06)}
          .border-bd{border-color:rgba(3,105,161,.12)!important}
          header.sticky{background:rgba(248,250,252,.94)!important;box-shadow:0 1px 0 rgba(3,105,161,.1),0 4px 20px rgba(0,0,0,.06)}
          .rounded-lg.border,.rounded-xl.border{transition:transform .25s cubic-bezier(.4,0,.2,1),border-color .25s,box-shadow .25s}
          .rounded-lg.border:hover,.rounded-xl.border:hover{border-color:rgba(3,105,161,.30)!important;box-shadow:0 8px 30px rgba(0,0,0,.08),0 0 0 1px rgba(3,105,161,.10)}
          .fc-glow{filter:drop-shadow(0 0 18px rgba(3,105,161,.35))}
          .tabglow{text-shadow:0 0 12px rgba(3,105,161,.40)}
          .tabnum{font-variant-numeric:tabular-nums}
          .fc-scan{position:fixed;left:0;right:0;height:1px;z-index:5;pointer-events:none;opacity:.45;background:linear-gradient(90deg,transparent,rgba(3,105,161,0) 8%,rgba(3,105,161,.3) 50%,rgba(186,230,253,.4) 50%,rgba(3,105,161,0) 92%,transparent);animation:fcScan 11s ease-in-out infinite}
          @keyframes fcScan{0%{top:-2px;opacity:0}4%{opacity:.45}48%{top:100vh;opacity:.22}50%{opacity:0}100%{top:100vh;opacity:0}}
          .fc-scanlines{background:repeating-linear-gradient(0deg,transparent,transparent 1px,rgba(3,105,161,.022) 1px,rgba(3,105,161,.022) 2px)}
          .fc-vignette{background:radial-gradient(ellipse at 50% 50%,transparent 55%,rgba(186,230,253,.25) 100%)}
          .fc-dotgrid{background-image:radial-gradient(circle,rgba(3,105,161,.08) 1px,transparent 1px);background-size:28px 28px}
          @keyframes verdictFlash{0%{opacity:.6}100%{opacity:0}}
          @keyframes dangerpulse{0%,100%{box-shadow:0 0 0 0 transparent}50%{box-shadow:0 0 24px 3px rgba(220,38,38,.15)}}
          .dangerpulse{animation:dangerpulse 2.5s ease-in-out infinite}
          @keyframes fade{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
          .fade{animation:fade .