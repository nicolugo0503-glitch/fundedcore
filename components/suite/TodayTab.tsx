"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { assessAccount, STATUS_META } from "../../lib/risk";
import { usd } from "../../lib/format";
import type { Trade } from "../../lib/score";
import { SuiteHeader } from "./ui";

// Live session logger: log each trade as you take it. The suite enforces your
// discipline rules in real time — cooldowns, trade caps, daily stop.
export function TodayTab({ profile, setProfile }: { profile: Profile; setProfile: (p: Profile) => void }) {
  const [accId, setAccId] = useState(profile.accounts[0]?.id || "");
  const [pnl, setPnl] = useState<string>("");
  const [setup, setSetup] = useState<string>("");

  const today = new Date().toISOString().slice(0, 10);
  const todayTrades = profile.trades.filter((t) => t.date === today);
  const acc = profile.accounts.find((a) => a.id === accId) || profile.accounts[0];

  // live discipline state
  let consecLosses = 0;
  for (let i = todayTrades.length - 1; i >= 0; i--) {
    if (todayTrades[i].pnl < 0) consecLosses++; else break;
  }
  const todayNet = todayTrades.reduce((s, t) => s + t.pnl, 0);
  const overTradeCap = todayTrades.length >= profile.settings.maxTradesPerDay;
  const hitDailyStop = profile.settings.dailyLossStop > 0 && todayNet <= -profile.settings.dailyLossStop;
  const onCooldown = consecLosses >= 2;

  function log(sign: 1 | -1) {
    const v = Math.abs(parseFloat(pnl));
    if (!v || !acc) return;
    const p = sign * v;
    const now = Date.now();
    const t: Trade = { id: now, date: today, timestamp: now, symbol: profile.settings.instrument, pnl: p, tag: setup.trim() || undefined };
    const accounts = profile.accounts.map((a) => a.id === acc.id
      ? { ...a, balance: a.balance + p, todayPnL: a.todayPnL + p, peakEquity: Math.max(a.peakEquity, a.balance + p) }
      : a);
    setProfile({ ...profile, trades: [...profile.trades, t], accounts });
    setPnl("");
  }
  function undo() {
    const last = [...profile.trades].reverse().find((t) => t.date === today);
    if (!last || !acc) return;
    const accounts = profile.accounts.map((a) => a.id === acc.id
      ? { ...a, balance: a.balance - last.pnl, todayPnL: a.todayPnL - last.pnl }
      : a);
    setProfile({ ...profile, trades: profile.trades.filter((t) => t.id !== last.id), accounts });
  }

  if (!profile.accounts.length) return <div className="card p-8 text-center text-t3">Add an account in Settings first.</div>;
  const r = acc ? assessAccount(acc) : null;

  return (
    <div className="space-y-5 fade">
      <SuiteHeader eyebrow="Today · live session" title="Log every trade. We hold the line." sub="Each trade updates your breach distance instantly — and we call the cooldowns for you." />

      {/* hard stops */}
      {hitDailyStop && <Banner color="#EF4444">■ DAILY STOP HIT ({usd(todayNet)}). You agreed to stop here. Close the platform.</Banner>}
      {!hitDailyStop && onCooldown && <Banner color="#F59E0B">⏸ {consecLosses} losses in a row — 10-minute cooldown. No revenge trade.</Banner>}
      {!hitDailyStop && overTradeCap && <Banner color="#F59E0B">⚠ Trade cap reached ({todayTrades.length}/{profile.settings.maxTradesPerDay}). Only A+ setups from here.</Banner>}

      {/* logger */}
      <section className="card p-6">
        <div className="grid sm:grid-cols-[1fr_auto] gap-3 items-end">
          <div className="grid grid-cols-3 gap-3">
            <label><span className="lbl">Account</span>
              <select className="inp" value={accId} onChange={(e) => setAccId(e.target.value)}>
                {profile.accounts.map((a) => <option key={a.id} value={a.id}>{a.label}</option>)}
              </select></label>
            <label><span className="lbl">P&L of the trade ($)</span>
              <input className="inp" type="number" placeholder="150" value={pnl} onChange={(e) => setPnl(e.target.value)}
                onKeyDown={(e) => { if (e.key === "Enter") log(1); }} /></label>
            <label><span className="lbl">Setup (optional)</span>
              <input className="inp" placeholder="ORB, reversal…" value={setup} onChange={(e) => setSetup(e.target.value)} /></label>
          </div>
          <div className="flex gap-2">
            <button className="btn btn-ghost" style={{ borderColor: "#10B98155", color: "#10B981" }} onClick={() => log(1)}>+ Win</button>
            <button className="btn btn-ghost" style={{ borderColor: "#EF444455", color: "#EF4444" }} onClick={() => log(-1)}>− Loss</button>
            <button className="btn btn-ghost text-xs" onClick={undo}>undo</button>
          </div>
        </div>
      </section>

      {/* live state */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <Stat label="Trades today" value={`${todayTrades.length}/${profile.settings.maxTradesPerDay}`} color={overTradeCap ? "#F59E0B" : undefined} />
        <Stat label="Today net" value={usd(todayNet)} color={todayNet >= 0 ? "#10B981" : "#EF4444"} />
        <Stat label="Consecutive losses" value={String(consecLosses)} color={onCooldown ? "#F59E0B" : undefined} />
        {r && <Stat label="Distance to breach" value={usd(Math.max(0, r.distanceToBreach))} color={STATUS_META[r.status].color} />}
      </div>

      {todayTrades.length > 0 && (
        <div className="card p-5">
          <h3 className="font-semibold mb-3">Today's trades</h3>
          <div className="flex flex-wrap gap-2">
            {todayTrades.map((t) => (
              <span key={t.id} className="chip mono" style={{ borderColor: t.pnl >= 0 ? "#10B98155" : "#EF444455", color: t.pnl >= 0 ? "#10B981" : "#EF4444" }}>
                {t.pnl >= 0 ? "+" : ""}{usd(t.pnl)}
              </span>
            ))}
          </div>
        </div>
      )}
      <p className="text-[.72rem] text-t3">Logged trades feed your Journal, Score, and Insights automatically.</p>
    </div>
  );
}

function Banner({ color, children }: { color: string; children: React.ReactNode }) {
  return <div className="rounded-xl px-4 py-3 font-medium" style={{ background: color + "1a", border: `1px solid ${color}66`, color }}>{children}</div>;
}
function Stat({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="card p-4">
      <div className="lbl">{label}</div>
      <div className="text-xl font-bold mono" style={{ color: color || "#F0F4FF" }}>{value}</div>
    </div>
  );
}
