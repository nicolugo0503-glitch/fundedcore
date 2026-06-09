"use client";
import { useEffect, useRef, useState } from "react";
import { type Profile } from "../../lib/profile";
import type { Trade } from "../../lib/score";
import { guardState, type GuardLevel } from "../../lib/guard";
import { usd } from "../../lib/format";
import { SuiteHeader, Ring, Panel, EmptyState } from "./ui";
import { AIRead } from "./AIRead";
import { Icon } from "../Icon";

const LVL: Record<GuardLevel, { color: string; ring: number }> = {
  calm: { color: "var(--grn)", ring: 0.15 },
  watch: { color: "var(--amb,#f5a623)", ring: 0.4 },
  elevated: { color: "#f5872a", ring: 0.7 },
  stop: { color: "var(--red)", ring: 1 },
};

export function GuardTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [accId, setAccId] = useState(profile.accounts[0]?.id || "");
  const [pnl, setPnl] = useState("");
  const [size, setSize] = useState("");
  const [notify, setNotify] = useState(false);
  const lastLevel = useRef<GuardLevel | null>(null);

  const acc = profile.accounts.find((a) => a.id === accId) || profile.accounts[0] || null;
  const g = guardState(profile.trades, acc, {
    dailyLossStop: profile.settings.dailyLossStop,
    maxTradesPerDay: profile.settings.maxTradesPerDay,
  });
  const meta = LVL[g.level];

  // Best-effort desktop notification when we escalate into stop/elevated.
  useEffect(() => {
    if (!notify) { lastLevel.current = g.level; return; }
    if (lastLevel.current && lastLevel.current !== g.level && (g.level === "stop" || g.level === "elevated")) {
      try {
        if (typeof Notification !== "undefined" && Notification.permission === "granted") {
          new Notification(`FundedCore Guard — ${g.level.toUpperCase()}`, { body: g.intervention });
        }
      } catch {}
    }
    lastLevel.current = g.level;
  }, [g.level, notify, g.intervention]);

  function enableNotify() {
    try {
      if (typeof Notification === "undefined") return;
      Notification.requestPermission().then((p) => setNotify(p === "granted"));
    } catch {}
  }

  const today = new Date().toISOString().slice(0, 10);
  function log(sign: 1 | -1) {
    const v = Math.abs(parseFloat(pnl));
    if (!v || !acc) return;
    const p = sign * v;
    const now = Date.now();
    const t: Trade = { id: now, date: today, timestamp: now, symbol: profile.settings.instrument, pnl: p, size: size ? Math.abs(+size) : undefined };
    const accounts = profile.accounts.map((a) => a.id === acc.id
      ? { ...a, balance: a.balance + p, todayPnL: a.todayPnL + p, peakEquity: Math.max(a.peakEquity, a.balance + p) }
      : a);
    setProfile({ ...profile, trades: [...profile.trades, t], accounts });
    setPnl("");
  }
  function undo() {
    const last = [...profile.trades].reverse().find((t) => t.date === today);
    if (!last) return;
    const accounts = acc ? profile.accounts.map((a) => a.id === acc.id
      ? { ...a, balance: a.balance - last.pnl, todayPnL: a.todayPnL - last.pnl } : a) : profile.accounts;
    setProfile({ ...profile, trades: profile.trades.filter((t) => t.id !== last.id), accounts });
  }

  if (!profile.trades.length && !profile.accounts.length) {
    return (
      <div className="fade space-y-5">
        <SuiteHeader eyebrow="Live guard" title="Tilt & breach circuit-breaker" sub="Watches your session in real time and pulls you off the wheel before you blow the account." />
        <EmptyState icon="shield" title="Nothing to guard yet" body="Add a funded account (Settings) or upload trades, then log your session here and the guard goes live." />
      </div>
    );
  }

  return (
    <div className="fade space-y-5">
      <SuiteHeader eyebrow="Live guard" title="Tilt & breach circuit-breaker"
        sub="A continuous tilt score from your behavior + always-on breach and daily-stop meters. It escalates from calm to hard-stop and tells you exactly when to walk away — running off your own logging, no broker session needed."
        right={typeof Notification !== "undefined" ? (
          notify ? <span className="chip" style={{ color: "var(--grn)" }}>Alerts on</span>
          : <button onClick={enableNotify} className="btn btn-ghost !py-1 !px-3 text-[.74rem]">Enable desktop alerts</button>
        ) : undefined} />

      {/* Live state banner */}
      <div className="card p-6" style={{ boxShadow: `0 0 0 1px color-mix(in srgb, ${meta.color} 30%, transparent), 0 18px 50px -22px ${meta.color}` }}>
        <div className="grid md:grid-cols-[auto_1fr] gap-6 items-center">
          <div className="flex items-center gap-5">
            <Ring pct={meta.ring} color={meta.color} size={132} stroke={11}>
              <div className="text-center">
                <div className="mono font-bold leading-none" style={{ fontSize: "1.9rem", color: meta.color }}>{g.tiltIndex}</div>
                <div className="text-[.55rem] text-t3 mt-0.5 uppercase tracking-wide">tilt index</div>
              </div>
            </Ring>
          </div>
          <div>
            <div className="mono font-bold uppercase tracking-wide" style={{ color: meta.color, fontSize: "1.05rem" }}>{g.headline}</div>
            <p className="text-[.95rem] text-t1 leading-relaxed mt-2">{g.intervention}</p>
            <div className="mt-3 flex flex-wrap gap-2 text-[.74rem]">
              <span className="chip">{g.today.trades} trades today</span>
              <span className="chip" style={{ color: g.today.net >= 0 ? "var(--grn)" : "var(--red)" }}>{usd(g.today.net)} today</span>
              {g.today.consecLosses >= 1 && <span className="chip" style={{ color: "var(--red)" }}>{g.today.consecLosses} in a row</span>}
            </div>
          </div>
        </div>
      </div>

      {/* Meters */}
      <div className="grid sm:grid-cols-2 gap-4">
        {g.breach && (
          <Meter label="Breach buffer" value={usd(g.breach.distance)} pct={g.breach.pct}
            color={g.breach.status === "healthy" ? "var(--grn)" : g.breach.status === "caution" ? "var(--amb,#f5a623)" : "var(--red)"}
            sub={`${g.breach.binding} constraint · ${g.breach.status}`} invert />
        )}
        {g.dailyStop && (
          <Meter label="Daily-stop used" value={`${usd(g.dailyStop.used)} / ${usd(g.dailyStop.limit)}`} pct={g.dailyStop.pct}
            color={g.dailyStop.pct < 0.6 ? "var(--grn)" : g.dailyStop.pct < 1 ? "var(--amb,#f5a623)" : "var(--red)"}
            sub={g.dailyStop.pct >= 1 ? "Stop hit — done for the day" : `${Math.round(g.dailyStop.pct * 100)}% of your stop`} />
        )}
      </div>

      {/* Signals */}
      <Panel title="Live tilt signals" icon="spark">
        <div className="grid sm:grid-cols-2 gap-2.5">
          {g.signals.map((s) => (
            <div key={s.key} className="flex gap-2.5 items-start rounded-lg p-2.5"
              style={{ background: "color-mix(in srgb, var(--bg2,#111) 55%, transparent)", opacity: s.active ? 1 : 0.5 }}>
              <span className="mt-0.5 shrink-0" style={{ color: s.active ? "var(--red)" : "var(--grn)" }}>
                <Icon name={s.active ? "alert" : "check"} size={14} />
              </span>
              <div>
                <div className="text-[.84rem] font-semibold" style={{ color: s.active ? "var(--t1)" : "var(--t2)" }}>
                  {s.label}{s.active && s.points > 0 ? <span className="text-t3 font-normal"> · +{s.points}</span> : null}
                </div>
                <div className="text-[.78rem] text-t2 leading-snug">{s.detail}</div>
              </div>
            </div>
          ))}
        </div>
      </Panel>

      {/* Quick log */}
      {profile.accounts.length > 0 && (
        <Panel title="Log this session live" icon="bolt">
          <div className="grid sm:grid-cols-[1fr_auto_auto_auto_auto] gap-2 items-end">
            <label><span className="lbl">Account</span>
              <select className="inp" value={acc?.id || ""} onChange={(e) => setAccId(e.target.value)}>
                {profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select></label>
            <label><span className="lbl">P&L ($)</span><input className="inp !w-24" value={pnl} onChange={(e) => setPnl(e.target.value)} placeholder="120" /></label>
            <label><span className="lbl">Size</span><input className="inp !w-16" value={size} onChange={(e) => setSize(e.target.value)} placeholder="2" /></label>
            <button onClick={() => log(1)} className="btn !py-2 !px-4" style={{ background: "color-mix(in srgb, var(--grn) 18%, transparent)", color: "var(--grn)" }}>+ Win</button>
            <button onClick={() => log(-1)} className="btn !py-2 !px-4" style={{ background: "color-mix(in srgb, var(--red) 18%, transparent)", color: "var(--red)" }}>− Loss</button>
          </div>
          {g.today.trades > 0 && <button onClick={undo} className="btn btn-ghost !py-1 !px-3 text-[.74rem] mt-2">Undo last</button>}
          {g.locked && <p className="text-[.8rem] mt-3" style={{ color: "var(--red)" }}>The guard says stop. Logging more is on you — but the data says this is where accounts die.</p>}
        </Panel>
      )}

      <AIRead module="Live Guard" facts={`Tilt index ${g.tiltIndex}/100 (${g.level}). Today: ${g.today.trades} trades, ${usd(g.today.net)}, ${g.today.consecLosses} losses in a row. Active signals: ${g.signals.filter(s => s.active).map(s => s.label).join(", ") || "none"}. ${g.breach ? `Breach buffer ${usd(g.breach.distance)}.` : ""}`} />
      <p className="text-[.7rem] text-t3">The tilt index weights loss streaks, revenge sizing, rapid re-entry, daily-stop and breach proximity, trade-cap and your worst-hour window. It's a behavioral circuit breaker — it can't place or block orders, it tells you when to stop yourself.</p>
    </div>
  );
}

function Meter({ label, value, pct, color, sub, invert }: { label: string; value: string; pct: number; color: string; sub: string; invert?: boolean }) {
  const fill = invert ? Math.max(0, Math.min(1, pct)) : Math.max(0, Math.min(1, pct));
  return (
    <div className="card p-4">
      <div className="flex items-baseline justify-between">
        <span className="lbl">{label}</span>
        <span className="mono text-[.95rem] font-bold" style={{ color }}>{value}</span>
      </div>
      <div className="mt-2 h-2 rounded-full overflow-hidden" style={{ background: "color-mix(in srgb, var(--t3) 18%, transparent)" }}>
        <div className="h-full rounded-full transition-all" style={{ width: `${Math.round(fill * 100)}%`, background: color }} />
      </div>
      <div className="text-[.72rem] text-t3 mt-1.5">{sub}</div>
    </div>
  );
}
