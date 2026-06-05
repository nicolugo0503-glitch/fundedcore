"use client";
import { useState } from "react";
import { type Profile } from "../../lib/profile";
import { analyze } from "../../lib/insights";
import { usd, pct } from "../../lib/format";

export function ToolsTab({ profile }: { profile: Profile }) {
  return (
    <div className="space-y-5 fade">
      <div><div className="eyebrow">Calculators</div>
        <h1 className="text-2xl font-bold mt-1">The math traders do on napkins — done right.</h1></div>
      <div className="grid lg:grid-cols-2 gap-5">
        <Payout />
        <RiskOfRuin profile={profile} />
        <Recovery profile={profile} />
        <WhatIf profile={profile} />
      </div>
    </div>
  );
}

function Card({ title, sub, children }: { title: string; sub: string; children: React.ReactNode }) {
  return (
    <section className="card p-6">
      <h2 className="font-semibold">{title}</h2>
      <p className="text-[.8rem] text-t3 mb-4">{sub}</p>
      {children}
    </section>
  );
}
function Out({ label, value, color }: { label: string; value: string; color?: string }) {
  return (
    <div className="rounded-lg bg-white/[.03] px-3 py-2">
      <div className="lbl">{label}</div>
      <div className="mono text-lg font-semibold" style={{ color: color || "#F0F4FF" }}>{value}</div>
    </div>
  );
}
function Field({ label, v, set, step = 1 }: { label: string; v: number; set: (n: number) => void; step?: number }) {
  return <label className="block"><span className="lbl">{label}</span><input type="number" step={step} className="inp" value={v} onChange={(e) => set(+e.target.value)} /></label>;
}

// ── 1. Payout: what you actually keep ───────────────────────────────────────
function Payout() {
  const [gross, setGross] = useState(3000);
  const [split, setSplit] = useState(90);
  const [monthly, setMonthly] = useState(165);
  const [accounts, setAccounts] = useState(2);
  const yours = gross * (split / 100) - monthly * accounts;
  const firmCut = gross - gross * (split / 100);
  return (
    <Card title="Real payout calculator" sub="Split sounds generous until fees eat it. What lands in your bank:">
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Gross profit ($/mo)" v={gross} set={setGross} />
        <Field label="Your split (%)" v={split} set={setSplit} />
        <Field label="Fees per account ($/mo)" v={monthly} set={setMonthly} />
        <Field label="Accounts paying fees" v={accounts} set={setAccounts} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Out label="You keep" value={usd(yours)} color={yours >= 0 ? "#10B981" : "#EF4444"} />
        <Out label="Firm keeps" value={usd(firmCut + monthly * accounts)} />
        <Out label="Effective split" value={gross > 0 ? pct(Math.max(0, yours) / gross) : "—"} />
      </div>
    </Card>
  );
}

// ── 2. Risk of ruin ──────────────────────────────────────────────────────────
function RiskOfRuin({ profile }: { profile: Profile }) {
  const ins = profile.trades.length >= 10 ? analyze(profile.trades) : null;
  const [winRate, setWinRate] = useState(ins ? Math.round(ins.totals.winRate * 100) : 50);
  const [payoff, setPayoff] = useState(ins && ins.totals.avgLoss > 0 ? +(ins.totals.avgWin / ins.totals.avgLoss).toFixed(2) : 1.5);
  const [riskPer, setRiskPer] = useState(ins ? Math.max(50, Math.round(ins.totals.avgLoss)) : 150);
  const [room, setRoom] = useState(2000);

  const p = winRate / 100;
  const edge = p - (1 - p) / Math.max(0.01, payoff); // expectancy per $ risked
  const units = Math.max(1, room / Math.max(1, riskPer));
  const ror = edge <= 0 ? 1 : Math.min(1, Math.pow((1 - edge) / (1 + edge), units));
  const col = ror > 0.3 ? "#EF4444" : ror > 0.1 ? "#F59E0B" : "#10B981";
  return (
    <Card title="Risk of ruin" sub={"Odds your current sizing blows the drawdown before your edge saves you." + (ins ? " Pre-filled from your trades." : "")}>
      <div className="grid grid-cols-2 gap-3 mb-4">
        <Field label="Win rate (%)" v={winRate} set={setWinRate} />
        <Field label="Avg win / avg loss" v={payoff} set={setPayoff} step={0.1} />
        <Field label="Risk per trade ($)" v={riskPer} set={setRiskPer} />
        <Field label="Drawdown room ($)" v={room} set={setRoom} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Out label="Risk of ruin" value={pct(ror)} color={col} />
        <Out label="Loss-streak buffer" value={`${Math.floor(units)} losers`} />
      </div>
      <p className="text-[.7rem] text-t3 mt-3">Approximation (gambler's-ruin model). Above 10%: cut size.</p>
    </Card>
  );
}

// ── 3. Drawdown recovery planner ────────────────────────────────────────────
function Recovery({ profile }: { profile: Profile }) {
  const ins = profile.trades.length >= 10 ? analyze(profile.trades) : null;
  const [down, setDown] = useState(800);
  const [exp, setExp] = useState(ins ? Math.round(ins.totals.net / Math.max(1, ins.totals.trades)) : 25);
  const [perDay, setPerDay] = useState(3);
  const days = exp > 0 ? Math.ceil(down / (exp * perDay)) : Infinity;
  return (
    <Card title="Drawdown recovery planner" sub={"How long the hole really takes to climb out of — at your actual expectancy." + (ins ? " Pre-filled from your trades." : "")}>
      <div className="grid grid-cols-3 gap-3 mb-4">
        <Field label="Drawdown ($)" v={down} set={setDown} />
        <Field label="Expectancy ($/trade)" v={exp} set={setExp} />
        <Field label="Trades / day" v={perDay} set={setPerDay} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <Out label="Days to recover" value={days === Infinity ? "never (neg. edge)" : `~${days} days`} color={days === Infinity ? "#EF4444" : days > 20 ? "#F59E0B" : "#10B981"} />
        <Out label="Trades needed" value={exp > 0 ? String(Math.ceil(down / exp)) : "—"} />
      </div>
      <p className="text-[.7rem] text-t3 mt-3">If this number shocks you, that's the point — don't dig the hole.</p>
    </Card>
  );
}

// ── 4. What-if: cap your losses, replay your history ────────────────────────
function WhatIf({ profile }: { profile: Profile }) {
  const [cap, setCap] = useState(150);
  if (profile.trades.length < 10) return <Card title="What-if loss cap" sub="Add 10+ trades in the Journal to replay your history with a hard loss cap."><div className="text-t3 text-sm">—</div></Card>;
  const real = profile.trades.reduce((s, t) => s + t.pnl, 0);
  const capped = profile.trades.reduce((s, t) => s + (t.pnl < -cap ? -cap : t.pnl), 0);
  const diff = capped - real;
  const affected = profile.trades.filter((t) => t.pnl < -cap).length;
  return (
    <Card title="What-if loss cap" sub="Your exact history, replayed with one rule added: no loss bigger than the cap.">
      <div className="grid grid-cols-1 gap-3 mb-4">
        <Field label="Hard loss cap per trade ($)" v={cap} set={setCap} />
      </div>
      <div className="grid grid-cols-3 gap-3">
        <Out label="Your real net" value={usd(real)} color={real >= 0 ? "#10B981" : "#EF4444"} />
        <Out label="With the cap" value={usd(capped)} color={capped >= 0 ? "#10B981" : "#EF4444"} />
        <Out label="Difference" value={(diff >= 0 ? "+" : "") + usd(diff)} color={diff >= 0 ? "#10B981" : "#EF4444"} />
      </div>
      <p className="text-[.7rem] text-t3 mt-3">{affected} of your trades broke this cap. {diff > 0 ? "That one rule would have paid you " + usd(diff) + "." : "Your big losses weren't the problem at this cap."}</p>
    </Card>
  );
}
