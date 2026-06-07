"use client";
import { type ReactNode, useEffect, useRef, useState } from "react";
import { Icon } from "../Icon";

// ── Premium suite primitives ────────────────────────────────────────────────

export function SuiteHeader({ eyebrow, title, sub, right }: { eyebrow?: string; title: ReactNode; sub?: string; right?: ReactNode }) {
  return (
    <div className="relative mb-6 rise">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="display text-[1.4rem] md:text-[1.62rem] text-t1 leading-tight">{title}</h1>
          {sub && <p className="text-t2 text-[.86rem] mt-1 max-w-xl leading-relaxed">{sub}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4 suitebar-underline w-full" />
    </div>
  );
}

// Animated count-up — makes every dashboard number feel alive.
function useCountUp(target: number | null, dur = 900) {
  const [v, setV] = useState(0);
  const prefersReduced = typeof window !== "undefined" && window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
  useEffect(() => {
    if (target == null) return;
    if (prefersReduced) { setV(target); return; }
    const start = performance.now();
    let raf = 0;
    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / dur);
      const e = 1 - Math.pow(1 - t, 3);
      setV(target * e);
      if (t < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [target, dur, prefersReduced]);
  return v;
}

function parseValue(value: ReactNode) {
  if (typeof value === "number") return { prefix: "", num: value, suffix: "", decimals: 0, commas: false };
  if (typeof value === "string") {
    const m = value.match(/^([^\d-]*)(-?[\d,]*\.?\d+)(.*)$/);
    if (m) {
      const numStr = m[2];
      const decimals = (numStr.split(".")[1] || "").length;
      return { prefix: m[1], num: parseFloat(numStr.replace(/,/g, "")), suffix: m[3], decimals, commas: numStr.includes(",") };
    }
  }
  return null;
}
function fmt(n: number, decimals: number, commas: boolean) {
  const s = n.toLocaleString("en-US", { minimumFractionDigits: decimals, maximumFractionDigits: decimals });
  return commas ? s : s.replace(/,/g, "");
}

export function AnimatedNumber({ value, className, style }: { value: ReactNode; className?: string; style?: React.CSSProperties }) {
  const parsed = parseValue(value);
  const v = useCountUp(parsed ? parsed.num : null);
  if (!parsed || !isFinite(parsed.num)) return <span className={className} style={style}>{value}</span>;
  return <span className={className} style={style}>{parsed.prefix}{fmt(v, parsed.decimals, parsed.commas)}{parsed.suffix}</span>;
}

export function Ring({ pct, color, size = 88, stroke = 8, children }: { pct: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const [shown, setShown] = useState(0);
  useEffect(() => { const id = requestAnimationFrame(() => setShown(Math.max(0, Math.min(1, pct)))); return () => cancelAnimationFrame(id); }, [pct]);
  const off = c * (1 - shown);
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,.18)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ filter: `drop-shadow(0 0 5px ${color}66)`, transition: "stroke-dashoffset 1s cubic-bezier(.21,.8,.35,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

export function StatTile({ icon, label, value, sub, accent = "var(--acc)", onClick }:
  { icon?: ReactNode; label: string; value: ReactNode; sub?: string; accent?: string; onClick?: () => void }) {
  const Comp: any = onClick ? "button" : "div";
  const isAccentDefault = accent === "var(--acc)" || accent === "#5B8CFF";
  return (
    <Comp onClick={onClick} className={`card p-5 text-left relative overflow-hidden rise ${onClick ? "card-hover w-full" : ""}`}>
      <div className="flex items-center gap-2.5 mb-3">
        {icon && <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[.95rem]"
          style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}>{icon}</span>}
        <span className="lbl mb-0">{label}</span>
      </div>
      <AnimatedNumber value={value} className="mono text-[1.7rem] font-bold leading-none block"
        style={{ color: isAccentDefault ? "var(--t1)" : accent }} />
      {sub && <div className="text-[.74rem] text-t3 mt-1.5">{sub}</div>}
    </Comp>
  );
}

export function Panel({ title, icon, action, accent = "var(--acc)", children, className = "" }:
  { title?: string; icon?: ReactNode; action?: ReactNode; accent?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-5 relative overflow-hidden rise ${className}`}>
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 text-[.92rem]">
            {icon && <span style={{ color: accent }}>{icon}</span>}{title}
          </h3>
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function EmptyState({ icon, title, body, cta }: { icon: string; title: string; body: string; cta?: ReactNode }) {
  return (
    <div className="flex flex-col items-center text-center py-10 px-6">
      <div className="w-12 h-12 rounded-xl flex items-center justify-center mb-4"
        style={{ background: "var(--acc-weak)", border: "1px solid var(--line2)", color: "var(--acc)" }}><Icon name={icon} size={20} /></div>
      <div className="font-semibold text-t1">{title}</div>
      <p className="text-[.85rem] text-t2 mt-1.5 max-w-sm leading-relaxed">{body}</p>
      {cta && <div className="mt-4">{cta}</div>}
    </div>
  );
}

export function Skeleton({ className = "" }: { className?: string }) {
  return <div className={`skeleton ${className}`} />;
}
