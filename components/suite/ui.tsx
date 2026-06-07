"use client";
import { type ReactNode } from "react";
import { Icon } from "../Icon";

// ── Premium suite primitives ────────────────────────────────────────────────

export function SuiteHeader({ eyebrow, title, sub, right }: { eyebrow?: string; title: ReactNode; sub?: string; right?: ReactNode }) {
  return (
    <div className="relative mb-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          {eyebrow && <div className="eyebrow mb-1.5">{eyebrow}</div>}
          <h1 className="display text-2xl md:text-[1.9rem] text-white leading-tight">{title}</h1>
          {sub && <p className="text-t2 text-sm mt-1.5 max-w-xl leading-relaxed">{sub}</p>}
        </div>
        {right}
      </div>
      <div className="mt-4 h-px w-full" style={{ background: "linear-gradient(90deg, rgba(91,140,255,.5), rgba(139,92,246,.2) 40%, transparent 80%)" }} />
    </div>
  );
}

export function Ring({ pct, color, size = 88, stroke = 8, children }: { pct: number; color: string; size?: number; stroke?: number; children?: ReactNode }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const off = c * (1 - Math.max(0, Math.min(1, pct)));
  return (
    <div className="relative inline-flex items-center justify-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke="rgba(148,163,184,.14)" strokeWidth={stroke} />
        <circle cx={size / 2} cy={size / 2} r={r} fill="none" stroke={color} strokeWidth={stroke} strokeLinecap="round"
          strokeDasharray={c} strokeDashoffset={off} style={{ filter: `drop-shadow(0 0 6px ${color}88)`, transition: "stroke-dashoffset .8s cubic-bezier(.21,.8,.35,1)" }} />
      </svg>
      <div className="absolute inset-0 flex flex-col items-center justify-center">{children}</div>
    </div>
  );
}

const ACCENT_BG: Record<string, string> = {
  "#5B8CFF": "rgba(91,140,255,.16)", "#34D399": "rgba(52,211,153,.16)",
  "#FBBF24": "rgba(251,191,36,.16)", "#F87171": "rgba(248,113,113,.16)", "#8B5CF6": "rgba(139,92,246,.16)",
};

export function StatTile({ icon, label, value, sub, accent = "#5B8CFF", onClick }:
  { icon?: ReactNode; label: string; value: ReactNode; sub?: string; accent?: string; onClick?: () => void }) {
  const Comp: any = onClick ? "button" : "div";
  return (
    <Comp onClick={onClick} className={`card p-5 text-left relative overflow-hidden ${onClick ? "card-hover w-full" : ""}`}>
      
      <div className="flex items-center gap-2.5 mb-3">
        {icon && <span className="w-8 h-8 rounded-[10px] flex items-center justify-center text-[.95rem]"
          style={{ background: "var(--acc-weak)", color: "var(--acc)", border: "1px solid var(--line2)" }}>{icon}</span>}
        <span className="lbl mb-0">{label}</span>
      </div>
      <div className="mono text-[1.7rem] font-bold leading-none" style={{ color: accent === "#5B8CFF" ? "#F4F7FF" : accent }}>{value}</div>
      {sub && <div className="text-[.74rem] text-t3 mt-1.5">{sub}</div>}
    </Comp>
  );
}

export function Panel({ title, icon, action, accent = "#5B8CFF", children, className = "" }:
  { title?: string; icon?: ReactNode; action?: ReactNode; accent?: string; children: ReactNode; className?: string }) {
  return (
    <section className={`card p-6 relative overflow-hidden ${className}`}>
      
      {title && (
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2 text-[1rem]">
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
