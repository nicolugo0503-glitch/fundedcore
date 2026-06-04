// Hand-rolled SVG visuals — zero chart dependencies, deterministic, theme-aware.
import { scoreColor } from "../lib/format";

// ── Circular score gauge ─────────────────────────────────────────────────────
export function ScoreGauge({
  score,
  grade,
  size = 220,
  label = "Trader Score",
}: {
  score: number;
  grade: string;
  size?: number;
  label?: string;
}) {
  const stroke = 14;
  const r = (size - stroke) / 2 - 6;
  const c = size / 2;
  const circ = 2 * Math.PI * r;
  const sweep = 0.75; // 270° arc
  const arcLen = circ * sweep;
  const filled = arcLen * (score / 100);
  const color = scoreColor(score);
  const rot = 135; // start angle so the gap sits at the bottom
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} className="count">
      <g transform={`rotate(${rot} ${c} ${c})`}>
        <circle
          cx={c} cy={c} r={r} fill="none" stroke="rgba(255,255,255,.08)"
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${arcLen} ${circ}`}
        />
        <circle
          cx={c} cy={c} r={r} fill="none" stroke={color}
          strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={`${filled} ${circ}`}
          style={{ filter: `drop-shadow(0 0 8px ${color}88)` }}
        />
      </g>
      <text x={c} y={c - 6} textAnchor="middle" fontSize={size * 0.3} fontWeight={700}
        fill="#F0F4FF" fontFamily="Space Grotesk">{score}</text>
      <text x={c} y={c + size * 0.13} textAnchor="middle" fontSize={size * 0.085}
        fill={color} fontWeight={700} fontFamily="JetBrains Mono">{grade}</text>
      <text x={c} y={c + size * 0.21} textAnchor="middle" fontSize={size * 0.052}
        fill="#94A3B8" letterSpacing="0.1em">{label.toUpperCase()}</text>
    </svg>
  );
}

// ── Four-axis radar for sub-scores ───────────────────────────────────────────
export function Radar({
  axes,
  size = 260,
}: {
  axes: { label: string; score: number }[];
  size?: number;
}) {
  const c = size / 2;
  const r = size / 2 - 38;
  const n = axes.length;
  const angle = (i: number) => (Math.PI * 2 * i) / n - Math.PI / 2;
  const pt = (i: number, frac: number) => [c + r * frac * Math.cos(angle(i)), c + r * frac * Math.sin(angle(i))];
  const rings = [0.25, 0.5, 0.75, 1];
  const poly = axes.map((a, i) => pt(i, a.score / 100).join(",")).join(" ");
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
      {rings.map((rr, k) => (
        <polygon key={k}
          points={axes.map((_, i) => pt(i, rr).join(",")).join(" ")}
          fill="none" stroke="rgba(255,255,255,.07)" strokeWidth={1} />
      ))}
      {axes.map((_, i) => {
        const [x, y] = pt(i, 1);
        return <line key={i} x1={c} y1={c} x2={x} y2={y} stroke="rgba(255,255,255,.07)" />;
      })}
      <polygon points={poly} fill="rgba(59,130,246,.22)" stroke="#3B82F6" strokeWidth={2}
        style={{ filter: "drop-shadow(0 0 6px rgba(59,130,246,.5))" }} className="count" />
      {axes.map((a, i) => {
        const [x, y] = pt(i, a.score / 100);
        return <circle key={i} cx={x} cy={y} r={3.5} fill="#93C5FD" />;
      })}
      {axes.map((a, i) => {
        const [x, y] = pt(i, 1.2);
        return (
          <text key={i} x={x} y={y} textAnchor="middle" dominantBaseline="middle"
            fontSize={10.5} fill="#94A3B8" fontWeight={600}>
            {a.label}
          </text>
        );
      })}
    </svg>
  );
}

// ── Equity curve with drawdown shading ───────────────────────────────────────
export function EquityCurve({
  data,
  width = 720,
  height = 240,
}: {
  data: number[];
  width?: number;
  height?: number;
}) {
  if (data.length < 2) return null;
  const padX = 8, padY = 16;
  const min = Math.min(...data, 0);
  const max = Math.max(...data, 0);
  const span = max - min || 1;
  const x = (i: number) => padX + (i / (data.length - 1)) * (width - padX * 2);
  const y = (v: number) => padY + (1 - (v - min) / span) * (height - padY * 2);
  const line = data.map((v, i) => `${i === 0 ? "M" : "L"}${x(i).toFixed(1)},${y(v).toFixed(1)}`).join(" ");
  const area = `${line} L${x(data.length - 1).toFixed(1)},${y(min)} L${x(0).toFixed(1)},${y(min)} Z`;
  const zeroY = y(0);
  const last = data[data.length - 1];
  const up = last >= 0;
  const col = up ? "#10B981" : "#EF4444";
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      <defs>
        <linearGradient id="eq" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={col} stopOpacity="0.28" />
          <stop offset="100%" stopColor={col} stopOpacity="0" />
        </linearGradient>
      </defs>
      <line x1={padX} y1={zeroY} x2={width - padX} y2={zeroY} stroke="rgba(255,255,255,.14)" strokeDasharray="4 4" />
      <path d={area} fill="url(#eq)" />
      <path d={line} fill="none" stroke={col} strokeWidth={2.4} strokeLinejoin="round"
        style={{ filter: `drop-shadow(0 1px 4px ${col}66)` }} />
    </svg>
  );
}

// ── Mini sparkline (daily P&L bars) ──────────────────────────────────────────
export function PnlBars({ data, width = 720, height = 90 }: { data: number[]; width?: number; height?: number }) {
  if (!data.length) return null;
  const maxAbs = Math.max(...data.map((d) => Math.abs(d)), 1);
  const bw = (width / data.length) * 0.7;
  const gap = (width / data.length) * 0.3;
  const mid = height / 2;
  return (
    <svg width="100%" viewBox={`0 0 ${width} ${height}`} preserveAspectRatio="none" style={{ display: "block" }}>
      {data.map((d, i) => {
        const h = (Math.abs(d) / maxAbs) * (mid - 2);
        const xx = i * (bw + gap);
        return (
          <rect key={i} x={xx} y={d >= 0 ? mid - h : mid} width={bw} height={Math.max(1, h)}
            rx={1} fill={d >= 0 ? "#10B981" : "#EF4444"} opacity={0.78} />
        );
      })}
      <line x1={0} y1={mid} x2={width} y2={mid} stroke="rgba(255,255,255,.1)" />
    </svg>
  );
}

// ── Horizontal sub-score bar ─────────────────────────────────────────────────
export function ScoreBar({ score }: { score: number }) {
  const color = scoreColor(score);
  return (
    <div className="h-2 w-full rounded-full bg-white/[.06] overflow-hidden">
      <div
        className="h-full rounded-full"
        style={{ width: `${score}%`, background: color, boxShadow: `0 0 8px ${color}99`, transformOrigin: "left", animation: "grow .7s ease both" }}
      />
    </div>
  );
}
